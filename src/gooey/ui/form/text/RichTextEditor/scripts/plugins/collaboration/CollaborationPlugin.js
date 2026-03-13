import Plugin from '../Plugin.js';
import RichTextEditorEvent from '../../../../../../../events/form/text/RichTextEditorEvent.js';
import { Step, Mapping } from '../../state/Transaction.js';
import URLSanitizer from '../../../../../../../util/URLSanitizer.js';

/**
 * CollaborationPlugin provides editor-side infrastructure for real-time
 * collaboration. External bindings (Yjs, WebSocket, etc.) subclass or
 * compose with it to enable multi-user editing with visible cursor presence.
 *
 * Features:
 * - Remote cursor rendering with position, color, and name label
 * - Remote selection highlights
 * - Peer position mapping through local changes
 * - Inbound step deserialization and application
 * - Outbound step serialization and awareness broadcast
 * - Collaboration event firing (PEER_JOINED, PEER_LEFT, PEER_CURSOR_MOVED, REMOTE_CHANGE)
 */
export default class CollaborationPlugin extends Plugin {

    /**
     * Unique plugin name for registry lookup.
     * @returns {string}
     */
    static get pluginName() { return 'collaboration'; }

    /** Maximum number of concurrent remote peers. */
    static MAX_PEERS = 50;

    /** Maximum character length for peer display names. */
    static _MAX_NAME_LENGTH = 100;

    /** Upper bound for cursor position values. */
    static _MAX_POSITION = 10_000_000;

    /** Default color when a peer provides an invalid color value. */
    static _DEFAULT_COLOR = '#888888';

    /** Regex for valid hex color values (3-8 hex digits). */
    static _HEX_COLOR_RE = /^#[0-9a-fA-F]{3,8}$/;

    /** Regex for valid rgb/rgba color values. */
    static _RGB_COLOR_RE = /^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(,\s*(0|1|0?\.\d+))?\s*\)$/;

    /** Regex for valid hsl/hsla color values. */
    static _HSL_COLOR_RE = /^hsla?\(\s*\d{1,3}\s*,\s*\d{1,3}%\s*,\s*\d{1,3}%\s*(,\s*(0|1|0?\.\d+))?\s*\)$/;

    /**
     * @param {Object} [options]
     * @param {string} [options.clientId] - Local client identifier (defaults to crypto.randomUUID())
     * @param {Function} [options.onSendSteps] - Callback(serializedSteps, clientId) for outbound steps
     * @param {Function} [options.onSendAwareness] - Callback(awareness) for outbound cursor/selection
     */
    constructor(options = {}) {
        super();
        this._peers = new Map();
        this._localClientId = options.clientId || crypto.randomUUID();
        this._onSendSteps = options.onSendSteps || null;
        this._onSendAwareness = options.onSendAwareness || null;
        this._cursorLayer = null;
        this._pendingAwarenessUpdates = [];
        this._rafId = 0;
        this._rafScheduled = false;
    }

    // =========================================================================
    // Lifecycle
    // =========================================================================

    /**
     * Called when plugin is registered with the editor.
     * Registers collaboration events and creates the cursor overlay layer.
     * @param {object} editor - RichTextEditor instance
     */
    init(editor) {
        super.init(editor);
        this._editor = editor;

        editor.addValidEvent(RichTextEditorEvent.PEER_JOINED);
        editor.addValidEvent(RichTextEditorEvent.PEER_LEFT);
        editor.addValidEvent(RichTextEditorEvent.PEER_CURSOR_MOVED);
        editor.addValidEvent(RichTextEditorEvent.REMOTE_CHANGE);

        this._createCursorLayer();
    }

    /**
     * Cleanup when plugin is unregistered.
     */
    destroy() {
        if (this._rafScheduled) {
            cancelAnimationFrame(this._rafId);
            this._rafScheduled = false;
        }
        this._pendingAwarenessUpdates = [];
        this._removeCursorLayer();
        this._peers.clear();
        super.destroy();
    }

    // =========================================================================
    // State Update Hook
    // =========================================================================

    /**
     * React after a new state is applied.
     *
     * For local changes: maps peer positions through the change mapping,
     * re-renders remote cursors, and broadcasts steps/awareness outbound.
     *
     * For remote changes: fires REMOTE_CHANGE event.
     *
     * @param {object} newState - New EditorState
     * @param {object} oldState - Previous EditorState
     * @param {Array} steps - The steps that produced the new state
     * @param {object} transaction - The full transaction
     */
    stateDidUpdate(newState, oldState, steps, transaction) {
        if (transaction._origin !== 'remote' && steps.length > 0) {
            // Map peer positions through local changes
            const mapping = new Mapping(steps.map(s => s.getMap()));
            this._mapPeerPositions(mapping);
            this._scheduleOverlayRebuild();

            // Send steps to collaboration backend
            if (this._onSendSteps) {
                const serialized = steps.map(s => s.toJSON());
                this._onSendSteps(serialized, this._localClientId);
            }

            // Send cursor/selection awareness
            if (this._onSendAwareness) {
                this._onSendAwareness({
                    clientId: this._localClientId,
                    cursor: newState.selection.head,
                    anchor: newState.selection.anchor,
                    head: newState.selection.head
                });
            }
        }

        if (transaction._origin === 'remote') {
            this._editor.fireEvent(RichTextEditorEvent.REMOTE_CHANGE, {
                steps,
                clientId: transaction.getMeta('remoteClientId')
            });
        }
    }

    // =========================================================================
    // Inbound: Remote Changes
    // =========================================================================

    /**
     * Receive steps from a remote peer and apply them.
     * Called by the collaboration binding (Yjs adapter, WebSocket handler, etc.)
     *
     * @param {Object[]} stepJSONs - Serialized steps
     * @param {string} clientId - Remote peer ID
     */
    /**
     * URL-bearing attribute names to sanitize in remote steps.
     * @type {Set<string>}
     */
    static _URL_ATTRS = new Set(['href', 'src', 'poster', 'action', 'data', 'cite', 'background', 'url']);

    receiveSteps(stepJSONs, clientId) {
        const schema = this._editor.state.schema;
        const tr = this._editor.createTransaction();

        // Sanitize URL-bearing attributes in remote step data before applying
        const sanitizedStepJSONs = stepJSONs.map(json => CollaborationPlugin._sanitizeStepJSON(json));

        for (const json of sanitizedStepJSONs) {
            const step = Step.fromJSON(schema, json);
            tr._applyStep(step);
        }

        tr._origin = 'remote';
        tr.setMeta('remoteClientId', clientId);
        tr.setMeta('addToHistory', false);

        this._editor.applyRemoteTransaction(tr, { origin: 'remote' });
    }

    /**
     * Receive awareness update from a remote peer.
     * Called by the collaboration binding.
     *
     * @param {string} clientId
     * @param {Object} awareness - { name, color, cursor, anchor, head }
     */
    receiveAwareness(clientId, awareness) {
        if (clientId === this._localClientId) return;

        const validated = this._validateAwareness(clientId, awareness);
        this._queueOverlayUpdate(clientId, validated);
    }

    /**
     * Remove a peer (disconnected).
     * @param {string} clientId
     */
    removePeer(clientId) {
        const peer = this._peers.get(clientId);
        this._peers.delete(clientId);
        this._scheduleOverlayRebuild();

        if (peer) {
            this._editor.fireEvent(RichTextEditorEvent.PEER_LEFT, {
                clientId,
                name: peer.name
            });
        }
    }

    // =========================================================================
    // Awareness Validation
    // =========================================================================

    /**
     * Validate and sanitize an incoming awareness payload.
     * Clamps cursor positions, caps name length, validates color format.
     *
     * @param {string} clientId - Remote peer ID
     * @param {Object} awareness - Raw awareness data
     * @returns {Object} Sanitized peer data
     * @private
     */
    _validateAwareness(clientId, awareness) {
        return {
            name: CollaborationPlugin._sanitizeName(
                awareness.name || `User ${clientId.slice(0, 4)}`
            ),
            color: CollaborationPlugin._validateColor(
                awareness.color
            ) || this._assignColor(clientId),
            cursor: CollaborationPlugin._clampPosition(awareness.cursor),
            anchor: CollaborationPlugin._clampPosition(awareness.anchor),
            head: CollaborationPlugin._clampPosition(awareness.head),
            _lastUpdate: Date.now()
        };
    }

    /**
     * Clamp a cursor position to a safe numeric range.
     * @param {*} pos - Raw position value
     * @returns {number} Clamped integer position
     * @static
     */
    static _clampPosition(pos) {
        const n = Number(pos);
        if (!Number.isFinite(n) || n < 0) return 0;
        return Math.min(Math.floor(n), CollaborationPlugin._MAX_POSITION);
    }

    /**
     * Sanitize a peer display name: strip control characters, cap length.
     * @param {string} name - Raw name
     * @returns {string} Sanitized name
     * @static
     */
    static _sanitizeName(name) {
        if (typeof name !== 'string') return 'Anonymous';
        // Strip null bytes and control characters (0x00-0x1F) except tab (0x09) and newline (0x0A)
        let cleaned = name.replace(/[\x00-\x08\x0B-\x1F]/g, '');
        cleaned = cleaned.slice(0, CollaborationPlugin._MAX_NAME_LENGTH).trim();
        return cleaned || 'Anonymous';
    }

    /**
     * Validate a CSS color string against safe patterns.
     * Returns the color if valid, or null if invalid.
     * @param {*} color - Raw color value
     * @returns {string|null} Valid color or null
     * @static
     */
    static _validateColor(color) {
        if (typeof color !== 'string') return null;
        const trimmed = color.trim();
        if (CollaborationPlugin._HEX_COLOR_RE.test(trimmed)) return trimmed;
        if (CollaborationPlugin._RGB_COLOR_RE.test(trimmed)) return trimmed;
        if (CollaborationPlugin._HSL_COLOR_RE.test(trimmed)) return trimmed;
        return null;
    }

    /**
     * Enforce peer count limit. If the map is at MAX_PEERS, evict the peer
     * with the oldest _lastUpdate timestamp.
     * @private
     */
    _evictOldestPeerIfNeeded() {
        if (this._peers.size < CollaborationPlugin.MAX_PEERS) return;

        let oldestId = null;
        let oldestTime = Infinity;
        for (const [id, peer] of this._peers) {
            const t = peer._lastUpdate || 0;
            if (t < oldestTime) {
                oldestTime = t;
                oldestId = id;
            }
        }
        if (oldestId !== null) {
            const evicted = this._peers.get(oldestId);
            this._peers.delete(oldestId);
            if (evicted) {
                this._editor.fireEvent(RichTextEditorEvent.PEER_LEFT, {
                    clientId: oldestId,
                    name: evicted.name
                });
            }
        }
    }

    // =========================================================================
    // RAF-Batched Overlay Updates
    // =========================================================================

    /**
     * Queue an awareness update for batched overlay rendering.
     * @param {string} peerId - Remote peer ID
     * @param {Object} data - Validated peer data
     * @private
     */
    _queueOverlayUpdate(peerId, data) {
        this._pendingAwarenessUpdates.push({ peerId, data });
        this._scheduleOverlayRebuild();
    }

    /**
     * Schedule a single overlay rebuild on the next animation frame.
     * Coalesces multiple calls into one RAF callback.
     * @private
     */
    _scheduleOverlayRebuild() {
        if (!this._rafScheduled) {
            this._rafScheduled = true;
            this._rafId = requestAnimationFrame(() => this._flushOverlayUpdates());
        }
    }

    /**
     * Process all queued awareness updates and rebuild the overlay once.
     * @private
     */
    _flushOverlayUpdates() {
        this._rafScheduled = false;
        const updates = this._pendingAwarenessUpdates;
        this._pendingAwarenessUpdates = [];

        for (const { peerId, data } of updates) {
            const isNew = !this._peers.has(peerId);

            // Enforce peer count limit before adding a new peer
            if (isNew) {
                this._evictOldestPeerIfNeeded();
            }

            this._peers.set(peerId, data);

            if (isNew) {
                this._editor.fireEvent(RichTextEditorEvent.PEER_JOINED, {
                    clientId: peerId,
                    name: data.name
                });
            }

            this._editor.fireEvent(RichTextEditorEvent.PEER_CURSOR_MOVED, {
                clientId: peerId,
                cursor: data.cursor
            });
        }

        this._rebuildOverlay();
    }

    /**
     * Single entry point for rebuilding the cursor/selection overlay.
     * Delegates to _renderRemoteCursors.
     * @private
     */
    _rebuildOverlay() {
        this._renderRemoteCursors();
    }

    // =========================================================================
    // Cursor Rendering
    // =========================================================================

    /**
     * Create the cursor overlay layer inside the editor's content area.
     * @private
     */
    _createCursorLayer() {
        this._cursorLayer = document.createElement('div');
        this._cursorLayer.classList.add('rte-collab-cursors');
        this._cursorLayer.setAttribute('aria-hidden', 'true');

        const contentEl = this._editor.shadowRoot.querySelector('.rte-content');
        if (contentEl) {
            contentEl.style.position = 'relative';
            contentEl.appendChild(this._cursorLayer);
        }
    }

    /**
     * Remove the cursor overlay layer from the DOM.
     * @private
     */
    _removeCursorLayer() {
        if (this._cursorLayer && this._cursorLayer.parentNode) {
            this._cursorLayer.parentNode.removeChild(this._cursorLayer);
        }
        this._cursorLayer = null;
    }

    /**
     * Re-render all remote peer cursors and selections.
     * @private
     */
    _renderRemoteCursors() {
        if (!this._cursorLayer || !this._editor._view) return;

        this._cursorLayer.innerHTML = '';

        for (const [clientId, peer] of this._peers) {
            const coords = this._editor._view.coordsAtPos(peer.cursor);
            if (!coords) continue;

            // Cursor caret
            const cursorEl = document.createElement('div');
            cursorEl.classList.add('rte-remote-cursor');
            cursorEl.style.cssText = `
                position: absolute;
                left: ${coords.left}px;
                top: ${coords.top}px;
                width: 2px;
                height: ${coords.bottom - coords.top}px;
                background: ${peer.color};
                pointer-events: none;
                z-index: 10;
            `;

            // Name label
            const labelEl = document.createElement('div');
            labelEl.classList.add('rte-remote-cursor-label');
            labelEl.textContent = peer.name;
            labelEl.style.cssText = `
                position: absolute;
                top: -18px;
                left: 0;
                background: ${peer.color};
                color: white;
                font-size: 11px;
                padding: 1px 4px;
                border-radius: 2px;
                white-space: nowrap;
                pointer-events: none;
            `;
            cursorEl.appendChild(labelEl);

            // Selection highlight (if non-collapsed)
            if (peer.anchor !== peer.head) {
                this._renderRemoteSelection(peer, cursorEl);
            }

            this._cursorLayer.appendChild(cursorEl);
        }
    }

    /**
     * Render a remote peer's selection highlight.
     * @param {Object} peer - Peer data with anchor, head, color
     * @param {HTMLElement} container - Parent element to append to
     * @private
     */
    _renderRemoteSelection(peer, container) {
        const from = Math.min(peer.anchor, peer.head);
        const to = Math.max(peer.anchor, peer.head);
        const view = this._editor._view;

        const fromCoords = view.coordsAtPos(from);
        const toCoords = view.coordsAtPos(to);
        if (!fromCoords || !toCoords) return;

        const highlightEl = document.createElement('div');
        highlightEl.classList.add('rte-remote-selection');
        highlightEl.style.cssText = `
            position: absolute;
            left: ${fromCoords.left}px;
            top: ${fromCoords.top}px;
            width: ${toCoords.left - fromCoords.left}px;
            height: ${fromCoords.bottom - fromCoords.top}px;
            background: ${peer.color}33;
            pointer-events: none;
            z-index: 5;
        `;
        container.appendChild(highlightEl);
    }

    // =========================================================================
    // Peer Position Mapping
    // =========================================================================

    /**
     * Map all remote peer positions through a mapping from local changes.
     * Called after local transactions so remote cursors stay accurate.
     *
     * @param {Mapping} mapping
     * @private
     */
    _mapPeerPositions(mapping) {
        for (const [clientId, peer] of this._peers) {
            peer.cursor = mapping.map(peer.cursor);
            peer.anchor = mapping.map(peer.anchor);
            peer.head = mapping.map(peer.head);
        }
    }

    // =========================================================================
    // Remote Step Sanitization
    // =========================================================================

    /**
     * Recursively sanitize URL-bearing attributes in a step JSON object.
     * Walks the JSON tree and replaces unsafe URL values with empty strings.
     *
     * @param {Object} json - Serialized step JSON
     * @returns {Object} Sanitized copy of the step JSON
     * @static
     */
    static _sanitizeStepJSON(json) {
        if (!json || typeof json !== 'object') return json;

        // Deep clone to avoid mutating the input
        const clone = Array.isArray(json) ? [...json] : { ...json };

        for (const key of Object.keys(clone)) {
            const value = clone[key];

            if (value && typeof value === 'object') {
                clone[key] = CollaborationPlugin._sanitizeStepJSON(value);
            } else if (typeof value === 'string' && CollaborationPlugin._URL_ATTRS.has(key.toLowerCase())) {
                const sanitized = URLSanitizer.sanitizeURL(value, { allowDataMedia: true });
                if (sanitized === null) {
                    clone[key] = ''; // Strip unsafe URL
                } else {
                    clone[key] = sanitized;
                }
            }
        }

        return clone;
    }

    // =========================================================================
    // Color Assignment
    // =========================================================================

    /**
     * Deterministically assign a color to a client ID using a hash.
     * @param {string} clientId
     * @returns {string} CSS color hex value
     * @private
     */
    _assignColor(clientId) {
        const COLORS = [
            '#e06c75', '#61afef', '#98c379', '#d19a66',
            '#c678dd', '#56b6c2', '#e5c07b', '#be5046'
        ];
        let hash = 0;
        for (let i = 0; i < clientId.length; i++) {
            hash = ((hash << 5) - hash) + clientId.charCodeAt(i);
            hash |= 0;
        }
        return COLORS[Math.abs(hash) % COLORS.length];
    }
}
