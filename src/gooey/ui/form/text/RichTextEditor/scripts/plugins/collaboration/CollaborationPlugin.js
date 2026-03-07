import Plugin from '../Plugin.js';
import RichTextEditorEvent from '../../../../../../../events/form/text/RichTextEditorEvent.js';
import { Step, Mapping } from '../../state/Transaction.js';

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
            this._renderRemoteCursors();

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
    receiveSteps(stepJSONs, clientId) {
        const schema = this._editor.state.schema;
        const tr = this._editor.createTransaction();

        for (const json of stepJSONs) {
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

        const isNew = !this._peers.has(clientId);

        this._peers.set(clientId, {
            name: awareness.name || `User ${clientId.slice(0, 4)}`,
            color: awareness.color || this._assignColor(clientId),
            cursor: awareness.cursor,
            anchor: awareness.anchor,
            head: awareness.head
        });

        this._renderRemoteCursors();

        if (isNew) {
            this._editor.fireEvent(RichTextEditorEvent.PEER_JOINED, {
                clientId,
                name: awareness.name
            });
        }

        this._editor.fireEvent(RichTextEditorEvent.PEER_CURSOR_MOVED, {
            clientId,
            cursor: awareness.cursor
        });
    }

    /**
     * Remove a peer (disconnected).
     * @param {string} clientId
     */
    removePeer(clientId) {
        const peer = this._peers.get(clientId);
        this._peers.delete(clientId);
        this._renderRemoteCursors();

        if (peer) {
            this._editor.fireEvent(RichTextEditorEvent.PEER_LEFT, {
                clientId,
                name: peer.name
            });
        }
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
