import TextElement from '../../TextElement.js';
import RichTextEditorEvent from '../../../../../events/form/text/RichTextEditorEvent.js';
import TextElementEvent from '../../../../../events/form/text/TextElementEvent.js';
import FormElementEvent from '../../../../../events/form/FormElementEvent.js';
import Template from '../../../../../util/Template.js';
import Logger from '../../../../../logging/Logger.js';

import Schema from './model/Schema.js';
import Node, { Mark } from './model/Node.js';
import { Selection } from './model/Position.js';
import EditorState from './state/EditorState.js';
import { baseKeymap, keymap, insertText, toggleMark, setMark, toggleLink, clearFormatting, markActive, getActiveMarks, setBlockType, heading, paragraph, wrapInBlockquote, toggleCodeBlock, insertHorizontalRule, setAlignment, increaseIndent, decreaseIndent, setLineHeight } from './state/Commands.js';
import EditorView from './view/EditorView.js';
import InputHandler from './view/InputHandler.js';
import SelectionManager from './view/SelectionManager.js';
import HistoryPlugin, { historyKeymap } from './plugins/HistoryPlugin.js';

/**
 * Sanitize HTML to prevent XSS attacks.
 * Removes script tags, event handlers, and javascript: URLs.
 * @param {string} html - Raw HTML string
 * @returns {string} Sanitized HTML
 */
function sanitizeHTML(html) {
    if (!html) return '';

    // Create temporary element to parse HTML
    const temp = document.createElement('div');
    temp.textContent = html; // First escape as text
    const escaped = temp.innerHTML;

    // Parse as HTML
    temp.innerHTML = escaped;

    // Remove dangerous elements
    const scripts = temp.querySelectorAll('script, iframe, object, embed');
    scripts.forEach(el => el.remove());

    // Remove event handlers and javascript: URLs
    const allElements = temp.querySelectorAll('*');
    allElements.forEach(el => {
        // Remove on* event attributes
        Array.from(el.attributes).forEach(attr => {
            if (attr.name.startsWith('on')) {
                el.removeAttribute(attr.name);
            }
            // Remove javascript: URLs
            if (attr.value && attr.value.trim().toLowerCase().startsWith('javascript:')) {
                el.removeAttribute(attr.name);
            }
        });
    });

    return temp.innerHTML;
}

/**
 * Mark mapping from tag names to mark types for HTML parsing.
 */
const TAG_TO_MARK = {
    strong: 'bold',
    b: 'bold',
    em: 'italic',
    i: 'italic',
    u: 'underline',
    s: 'strikethrough',
    del: 'strikethrough',
    code: 'code',
    sub: 'subscript',
    sup: 'superscript'
};

/**
 * Block-level tag names for HTML parsing.
 */
const BLOCK_TAGS = new Set([
    'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'blockquote', 'pre', 'ul', 'ol', 'li',
    'table', 'tr', 'td', 'th', 'hr', 'div'
]);

/**
 * RichTextEditor component - model-driven architecture.
 *
 * Uses EditorView for DOM rendering, hidden textarea for keyboard input,
 * and custom selection overlays for cursor/highlight display. Replaces
 * the previous contenteditable/execCommand approach entirely.
 *
 * Extends TextElement, preserving the component hierarchy and public API.
 */
export default class RichTextEditor extends TextElement {
    constructor() {
        super();

        Template.activate("ui-RichTextEditor", this.shadowRoot);

        this._previousValue = '';

        // Query new template DOM elements
        this._shell = this.shadowRoot.querySelector('.rte-shell');
        this._toolbar = this.shadowRoot.querySelector('.rte-toolbar');
        this._editorArea = this.shadowRoot.querySelector('.rte-editor-area');
        this._inputSink = this.shadowRoot.querySelector('.rte-input-sink');
        this._content = this.shadowRoot.querySelector('.rte-content');
        this._selectionLayer = this.shadowRoot.querySelector('.rte-selection');

        // Set up TextElement compatibility
        this.textElement = this._content;
        this.formElement = this._content;

        // Create Schema
        this._schema = Schema.default();

        // Create initial EditorState
        this._state = EditorState.create(this._schema, null);

        // Create HistoryPlugin
        this._history = new HistoryPlugin();

        // Build the resolved keymap (platform-aware Mod- resolution)
        // Merge history keymap (Mod-z, Mod-Shift-z, Mod-y) with base keymap
        const resolvedKeymap = keymap({
            ...baseKeymap,
            // Inline formatting
            'Mod-b': toggleMark('bold'),
            'Mod-i': toggleMark('italic'),
            'Mod-u': toggleMark('underline'),
            'Mod-Shift-s': toggleMark('strikethrough'),
            'Mod-e': toggleMark('code'),
            'Mod-\\': clearFormatting,
            'Mod-k': (state, dispatch) => this._handleLinkCommand(state, dispatch),
            // Block type commands
            'Mod-Alt-0': paragraph,
            'Mod-Alt-1': heading(1),
            'Mod-Alt-2': heading(2),
            'Mod-Alt-3': heading(3),
            'Mod-Alt-4': heading(4),
            'Mod-Alt-5': heading(5),
            'Mod-Alt-6': heading(6),
            'Mod-Shift-B': wrapInBlockquote,
            // Indentation
            'Mod-]': increaseIndent,
            'Mod-[': decreaseIndent,
            ...historyKeymap(this._history)
        });

        // Create EditorView
        this._view = new EditorView(this._content, this._state, this._schema);

        // Create InputHandler
        this._inputHandler = new InputHandler(this._inputSink, this._view, resolvedKeymap);

        // Create SelectionManager
        this._selectionManager = new SelectionManager(this._selectionLayer, this._view);

        // Wire dispatch: view dispatches transactions through the component
        this._view.dispatch = (tr) => this._dispatch(tr);

        // Register events
        this._registerEvents();

        // Handle focus via click on editor area or content
        this._handleEditorClickBound = this._handleEditorClick.bind(this);
        this._handleInputFocusBound = this._handleInputFocus.bind(this);
        this._handleInputBlurBound = this._handleInputBlur.bind(this);

        this._editorArea.addEventListener('mousedown', this._handleEditorClickBound);
        this._inputSink.addEventListener('focus', this._handleInputFocusBound);
        this._inputSink.addEventListener('blur', this._handleInputBlurBound);

        // Initialize from value attribute if present
        if (this.hasAttribute('value')) {
            this.value = this.getAttribute('value');
        }

        this._previousValue = this.value;
        this._syncDisabledState();
        this._updateRequiredIndicator();
    }

    connectedCallback() {
        if (super.connectedCallback) {
            super.connectedCallback();
        }

        if (!this._richTextEditorInit) {
            this._richTextEditorInit = true;
            this.classList.add('ui-RichTextEditor');
        }

        this._syncDisabledState();

        // Render initial state if view exists
        if (this._view && this._state) {
            this._view.updateState(this._state);
            this._selectionManager.update(this._state.selection);
        }
    }

    disconnectedCallback() {
        if (super.disconnectedCallback) {
            super.disconnectedCallback();
        }

        // Clean up view layer
        if (this._view) {
            this._view.destroy();
        }
        if (this._inputHandler) {
            this._inputHandler.destroy();
        }
        if (this._selectionManager) {
            this._selectionManager.destroy();
        }

        // Remove event listeners
        if (this._editorArea) {
            this._editorArea.removeEventListener('mousedown', this._handleEditorClickBound);
        }
        if (this._inputSink) {
            this._inputSink.removeEventListener('focus', this._handleInputFocusBound);
            this._inputSink.removeEventListener('blur', this._handleInputBlurBound);
        }
    }

    attributeChangedCallback(name, oldValue, newValue) {
        super.attributeChangedCallback?.(name, oldValue, newValue);

        if (name === 'disabled') {
            this._syncDisabledState();
        }

        if (name === 'readonly') {
            this._syncReadOnlyState();
        }

        if (name === 'value' && newValue !== oldValue && newValue !== this.value) {
            this.value = newValue ?? '';
        }
    }

    // =========================================================================
    // Public API
    // =========================================================================

    /**
     * Get the editor content as an HTML string.
     * Serializes the document model to HTML.
     * @returns {string}
     */
    get value() {
        if (!this._state || !this._state.doc) {
            return '';
        }
        return this._serializeToHTML(this._state.doc);
    }

    /**
     * Set the editor content from an HTML string.
     * Parses HTML into a document model and updates the view.
     * @param {string} val
     */
    set value(val) {
        if (!this._schema) return;

        const doc = this._parseHTML(val);
        const selection = Selection.cursor(1);
        this._state = new EditorState(doc, selection, [], [], this._schema);

        if (this._view) {
            this._view.updateState(this._state);
        }
        if (this._selectionManager) {
            this._selectionManager.update(this._state.selection);
        }
    }

    /**
     * Get disabled state.
     * @returns {boolean}
     */
    get disabled() {
        return super.disabled;
    }

    /**
     * Set disabled state.
     * @param {boolean} val
     */
    set disabled(val) {
        super.disabled = val;
        this._syncDisabledState();
    }

    /**
     * Get the current EditorState (for programmatic access).
     * @returns {import('./state/EditorState.js').default}
     */
    get editorState() {
        return this._state;
    }

    /**
     * Get the EditorView (for programmatic access).
     * @returns {import('./view/EditorView.js').default}
     */
    get editorView() {
        return this._view;
    }

    /**
     * Get the Schema (for programmatic access).
     * @returns {import('./model/Schema.js').default}
     */
    get schema() {
        return this._schema;
    }

    // =========================================================================
    // Formatting API
    // =========================================================================

    /**
     * Apply a mark to the current selection.
     *
     * For simple marks (no attrs): toggles the mark on/off.
     * For attribute marks (attrs provided): applies/replaces the mark.
     *
     * @param {string} markType - Mark type name (e.g., "bold", "textColor")
     * @param {object} [attrs] - Optional mark attributes (e.g., { color: '#FF0000' })
     * @returns {boolean} Whether the command executed successfully
     */
    formatText(markType, attrs) {
        if (attrs) {
            return setMark(markType, attrs)(this._state, (tr) => this._dispatch(tr));
        }
        return toggleMark(markType)(this._state, (tr) => this._dispatch(tr));
    }

    /**
     * Remove mark(s) from the current selection.
     *
     * If markType is provided: removes that specific mark type.
     * If markType is null/undefined: removes ALL marks (clear formatting).
     *
     * @param {string} [markType] - Optional mark type to remove
     * @returns {boolean} Whether the command executed successfully
     */
    removeFormat(markType) {
        if (markType) {
            const { from, to, empty } = this._state.selection;
            if (empty) {
                // Cursor: remove from stored marks
                const tr = this._state.transaction;
                const newMarks = this._state.marks.filter(m => m.type !== markType);
                tr.setStoredMarks(newMarks);
                this._dispatch(tr);
                return true;
            }
            // Range: remove mark from range
            const tr = this._state.transaction;
            tr.removeMark(from, to, Mark.create(markType));
            this._dispatch(tr);
            return true;
        }
        // No markType: clear all formatting
        return clearFormatting(this._state, (tr) => this._dispatch(tr));
    }

    /**
     * Check if a mark is active at the current selection/cursor.
     *
     * @param {string} markType - Mark type name (e.g., "bold", "link")
     * @returns {boolean}
     */
    isMarkActive(markType) {
        return markActive(this._state, markType);
    }

    /**
     * Get all active marks at the current selection/cursor.
     *
     * @returns {object[]} Array of active mark objects
     */
    getActiveMarks() {
        return getActiveMarks(this._state);
    }

    // =========================================================================
    // Block Type API
    // =========================================================================

    /**
     * Change the block type of the current selection.
     *
     * @param {string} type - Block type name (e.g., "heading", "paragraph")
     * @param {object} [attrs] - Optional attributes (e.g., { level: 2 })
     * @returns {boolean} Whether the command executed successfully
     */
    setBlockType(type, attrs) {
        return setBlockType(type, attrs)(this._state, (tr) => this._dispatch(tr));
    }

    /**
     * Get the block type name at the current selection position.
     *
     * @returns {string} Block type name (e.g., "paragraph", "heading")
     */
    getBlockType() {
        const { from } = this._state.selection;
        const $from = this._state.doc.resolve(from);
        return $from.parent.type;
    }

    /**
     * Get the block attributes at the current selection position.
     *
     * @returns {object} Block attributes (e.g., { level: 2 } for heading)
     */
    getBlockAttrs() {
        const { from } = this._state.selection;
        const $from = this._state.doc.resolve(from);
        return { ...$from.parent.attrs };
    }

    /**
     * Insert a horizontal rule at the current cursor position.
     *
     * @returns {boolean} Whether the command executed successfully
     */
    insertHorizontalRule() {
        return insertHorizontalRule(this._state, (tr) => this._dispatch(tr));
    }

    /**
     * Toggle the current block between code block and paragraph.
     *
     * @param {string} [language] - Optional language for syntax highlighting
     * @returns {boolean} Whether the command executed successfully
     */
    toggleCodeBlock(language) {
        // If language is provided and we're converting to code block,
        // we handle it by first toggling then setting language attr
        const result = toggleCodeBlock(this._state, (tr) => this._dispatch(tr));
        if (result && language && this.getBlockType() === "codeBlock") {
            const tr = this._state.transaction;
            const { from } = this._state.selection;
            const blockInfo = this._state.doc.resolve(from);
            // Find block pos and set language attr
            const doc = this._state.doc;
            let accum = 0;
            for (let i = 0; i < doc.children.length; i++) {
                const child = doc.children[i];
                const childEnd = accum + child.nodeSize;
                if (from >= accum && from <= childEnd) {
                    tr.setNodeAttrs(accum, { language });
                    this._dispatch(tr);
                    break;
                }
                accum = childEnd;
            }
        }
        return result;
    }

    /**
     * Toggle blockquote wrapping on the current block.
     *
     * @returns {boolean} Whether the command executed successfully
     */
    toggleBlockquote() {
        return wrapInBlockquote(this._state, (tr) => this._dispatch(tr));
    }

    // =========================================================================
    // Alignment, Indentation & Line Height API
    // =========================================================================

    /**
     * Set text alignment on the current block.
     *
     * @param {string|null} align - "left", "center", "right", "justify", or null to reset
     * @returns {boolean} Whether the command executed successfully
     */
    setAlignment(align) {
        return setAlignment(align)(this._state, (tr) => this._dispatch(tr));
    }

    /**
     * Get the current block's text alignment.
     *
     * @returns {string} Alignment value ("left" if not set)
     */
    getAlignment() {
        const { from } = this._state.selection;
        const $from = this._state.doc.resolve(from);
        return $from.parent.attrs.align || "left";
    }

    /**
     * Set the indent level on the current block.
     *
     * @param {number} level - Indent level (>= 0)
     * @returns {boolean} Whether the command executed successfully
     */
    setIndent(level) {
        if (level < 0) return false;
        const { from } = this._state.selection;
        const blockInfo = this._findBlockInfo(from);
        if (!blockInfo) return false;

        const tr = this._state.transaction;
        tr.setNodeAttrs(blockInfo.blockPos, { indent: level });
        this._dispatch(tr);
        return true;
    }

    /**
     * Get the current block's indent level.
     *
     * @returns {number} Indent level (default 0)
     */
    getIndent() {
        const { from } = this._state.selection;
        const $from = this._state.doc.resolve(from);
        return $from.parent.attrs.indent || 0;
    }

    /**
     * Increase the indentation of the current block.
     *
     * @returns {boolean} Whether the command executed successfully
     */
    increaseIndent() {
        return increaseIndent(this._state, (tr) => this._dispatch(tr));
    }

    /**
     * Decrease the indentation of the current block.
     *
     * @returns {boolean} Whether the command executed successfully
     */
    decreaseIndent() {
        return decreaseIndent(this._state, (tr) => this._dispatch(tr));
    }

    /**
     * Set line height on the current block.
     *
     * @param {string|null} value - CSS line-height value (e.g., "1.5", "2") or null to reset
     * @returns {boolean} Whether the command executed successfully
     */
    setLineHeight(value) {
        return setLineHeight(value)(this._state, (tr) => this._dispatch(tr));
    }

    /**
     * Get the current block's line height.
     *
     * @returns {string|null} Line height value or null
     */
    getLineHeight() {
        const { from } = this._state.selection;
        const $from = this._state.doc.resolve(from);
        return $from.parent.attrs.lineHeight || null;
    }

    // =========================================================================
    // History (undo/redo)
    // =========================================================================

    /**
     * Undo the last edit (or batch of edits).
     * Restores the editor state from before the edit and updates the view.
     */
    undo() {
        if (!this._history) return;

        const restored = this._history.undo(this._state);
        if (restored) {
            this._state = restored;
            if (this._view) {
                this._view.updateState(this._state);
            }
            if (this._selectionManager) {
                this._selectionManager.update(this._state.selection);
            }
        }
    }

    /**
     * Redo a previously undone edit.
     * Restores the editor state to after the edit and updates the view.
     */
    redo() {
        if (!this._history) return;

        const restored = this._history.redo(this._state);
        if (restored) {
            this._state = restored;
            if (this._view) {
                this._view.updateState(this._state);
            }
            if (this._selectionManager) {
                this._selectionManager.update(this._state.selection);
            }
        }
    }

    /**
     * Check whether undo is available.
     * @returns {boolean}
     */
    canUndo() {
        return this._history ? this._history.canUndo() : false;
    }

    /**
     * Check whether redo is available.
     * @returns {boolean}
     */
    canRedo() {
        return this._history ? this._history.canRedo() : false;
    }

    /**
     * Clear all undo/redo history.
     */
    clearHistory() {
        if (this._history) {
            this._history.clear();
        }
    }

    // =========================================================================
    // Dispatch
    // =========================================================================

    /**
     * Apply a transaction to produce a new state and update the view.
     *
     * Supports two paths:
     * - Normal: applies transaction steps to produce new state, records
     *   pre-edit state for undo (if transaction has content-changing steps).
     * - Force state: if `tr._forceState` is set (undo/redo), uses that
     *   state directly instead of applying the transaction.
     *
     * @param {import('./state/Transaction.js').default} tr - Transaction to apply
     * @private
     */
    _dispatch(tr) {
        const oldState = this._state;

        if (tr._forceState) {
            // Undo/redo path: restore the state directly
            this._state = tr._forceState;
        } else {
            // Normal path: record state for undo before applying
            // Only push to history if the transaction has content-changing steps
            if (tr.steps.length > 0 && this._history) {
                this._history.pushState(this._state);
            }
            this._state = this._state.apply(tr);
        }

        // Update view with new state
        if (this._view) {
            this._view.updateState(this._state);
        }

        // Update selection overlays
        if (this._selectionManager) {
            this._selectionManager.update(this._state.selection);
        }

        // Update hidden textarea position near cursor for IME
        if (this._inputHandler && this._view) {
            const coords = this._view.coordsAtPos(this._state.selection.head);
            if (coords) {
                this._inputHandler.updatePosition(coords);
            }
        }

        // Fire events
        this.fireEvent(RichTextEditorEvent.MODEL_CHANGED, {
            value: this.value,
            state: this._state
        });

        this.fireEvent(TextElementEvent.INPUT, {
            value: this.value,
            state: this._state
        });

        // Track selection changes
        if (!oldState.selection.eq(this._state.selection)) {
            const $head = this._state.doc.resolve(this._state.selection.head);
            const parentAttrs = $head.parent.attrs;
            this.fireEvent(RichTextEditorEvent.TEXT_CURSOR_MOVE, {
                value: this.value,
                anchor: this._state.selection.anchor,
                head: this._state.selection.head,
                marks: getActiveMarks(this._state),
                blockType: $head.parent.type,
                blockAttrs: { ...parentAttrs },
                align: parentAttrs.align || "left",
                indent: parentAttrs.indent || 0,
                lineHeight: parentAttrs.lineHeight || null
            });
        }
    }

    // =========================================================================
    // Link handling
    // =========================================================================

    /**
     * Handle the Mod-K link command.
     *
     * If link is active on selection: removes the link (unlink).
     * If no selection (cursor): prompts for URL and link text, inserts linked text.
     * If selection exists without link: prompts for URL, wraps selection in link.
     *
     * @param {object} state - EditorState
     * @param {function} dispatch - Dispatch function
     * @returns {boolean}
     * @private
     */
    _handleLinkCommand(state, dispatch) {
        const { from, to, empty } = state.selection;
        const isActive = markActive(state, 'link');

        if (isActive && !empty) {
            // Unlink: remove link mark from selection range
            if (dispatch) {
                const tr = state.transaction;
                tr.removeMark(from, to, Mark.create('link'));
                dispatch(tr);
            }
            return true;
        }

        if (isActive && empty) {
            // Cursor inside a link -- for now, treat as unlink is not possible
            // without knowing the link boundaries. Return false.
            return false;
        }

        // Link NOT active -- prompt for URL
        const url = window.prompt('Enter URL:');
        if (url === null) return false; // User cancelled

        // XSS prevention: reject dangerous URL schemes
        const trimmedUrl = url.trim().toLowerCase();
        if (trimmedUrl.startsWith('javascript:') ||
            trimmedUrl.startsWith('vbscript:') ||
            trimmedUrl.startsWith('data:text/html')) {
            window.alert('Invalid URL scheme');
            return false;
        }

        if (empty) {
            // No selection: prompt for link text, insert linked text
            const text = window.prompt('Enter link text:', url);
            if (text === null || text.length === 0) return false;

            if (dispatch) {
                const tr = state.transaction;
                const linkMark = Mark.create('link', { href: url, title: null, target: null });
                tr.insertText(text, from);
                tr.addMark(from, from + text.length, linkMark);
                tr.setSelection(Selection.cursor(from + text.length));
                dispatch(tr);
            }
            return true;
        }

        // Selection exists: wrap in link
        if (dispatch) {
            const tr = state.transaction;
            const linkMark = Mark.create('link', { href: url, title: null, target: null });
            tr.addMark(from, to, linkMark);
            dispatch(tr);
        }
        return true;
    }

    // =========================================================================
    // Events
    // =========================================================================

    /**
     * Register all valid events for the Observable system.
     * @private
     */
    _registerEvents() {
        this.addValidEvent(TextElementEvent.INPUT);
        this.addValidEvent(TextElementEvent.CHANGE);
        this.addValidEvent(FormElementEvent.FOCUS);
        this.addValidEvent(FormElementEvent.BLUR);
        this.addValidEvent(RichTextEditorEvent.MODEL_CHANGED);
        this.addValidEvent(RichTextEditorEvent.EDITOR_ACTION);
        this.addValidEvent(RichTextEditorEvent.TEXT_CURSOR_MOVE);
    }

    // =========================================================================
    // Focus handling
    // =========================================================================

    /**
     * Handle clicks on the editor area to focus the hidden textarea.
     *
     * @param {MouseEvent} event
     * @private
     */
    _handleEditorClick(event) {
        // Only focus if clicking directly on the editor area or content
        // (not on selection layer which has pointer-events: none)
        if (this.disabled) return;

        this._inputHandler.focus();
    }

    /**
     * Handle focus on the hidden textarea.
     *
     * @param {FocusEvent} event
     * @private
     */
    _handleInputFocus(event) {
        this._previousValue = this.value;
        this._shell.classList.add('rte-focused');

        this.fireEvent(FormElementEvent.FOCUS, {
            value: this.value,
            originalEvent: event
        });
    }

    /**
     * Handle blur on the hidden textarea.
     *
     * @param {FocusEvent} event
     * @private
     */
    _handleInputBlur(event) {
        this._shell.classList.remove('rte-focused');

        this.fireEvent(FormElementEvent.BLUR, {
            value: this.value,
            originalEvent: event
        });

        // Fire CHANGE event if value changed since focus
        if (this.value !== this._previousValue) {
            this.fireEvent(TextElementEvent.CHANGE, {
                value: this.value,
                previousValue: this._previousValue,
                originalEvent: event
            });
            this._previousValue = this.value;
        }
    }

    // =========================================================================
    // Internal helpers
    // =========================================================================

    /**
     * Find the top-level block info for a given position.
     *
     * @param {number} pos - Position in the document
     * @returns {{ blockIndex: number, blockPos: number }|null}
     * @private
     */
    _findBlockInfo(pos) {
        const doc = this._state.doc;
        if (!doc.children) return null;

        let accum = 0;
        for (let i = 0; i < doc.children.length; i++) {
            const child = doc.children[i];
            const childEnd = accum + child.nodeSize;
            if (pos >= accum && pos <= childEnd) {
                return { blockIndex: i, blockPos: accum };
            }
            accum = childEnd;
        }
        return null;
    }

    // =========================================================================
    // State synchronization
    // =========================================================================

    /**
     * Synchronize disabled state with the view layer.
     * @private
     */
    _syncDisabledState() {
        const disabled = this.disabled;
        if (!this._content) return;

        this._content.setAttribute('aria-disabled', disabled ? 'true' : 'false');

        if (this._inputHandler) {
            this._inputHandler.disabled = disabled;
        }

        if (disabled && this._inputSink) {
            this._inputSink.setAttribute('disabled', '');
        } else if (this._inputSink) {
            this._inputSink.removeAttribute('disabled');
        }
    }

    /**
     * Synchronize read-only state with the input handler.
     * @private
     */
    _syncReadOnlyState() {
        const readOnly = this.readOnly;

        if (this._inputHandler) {
            this._inputHandler.readOnly = readOnly;
        }

        if (this._content) {
            this._content.setAttribute('aria-readonly', readOnly ? 'true' : 'false');
        }
    }

    // =========================================================================
    // HTML serialization (model -> HTML)
    // =========================================================================

    /**
     * Serialize a document model to an HTML string.
     *
     * @param {import('./model/Node.js').default} doc - Document root node
     * @returns {string}
     * @private
     */
    _serializeToHTML(doc) {
        if (!doc.children || doc.children.length === 0) {
            return '';
        }

        return doc.children.map(child => this._serializeNode(child)).join('');
    }

    /**
     * Serialize a single node to HTML.
     *
     * @param {import('./model/Node.js').default} node
     * @returns {string}
     * @private
     */
    _serializeNode(node) {
        if (node.type === 'text') {
            return this._serializeTextNode(node);
        }

        const spec = this._schema.nodes[node.type];
        if (!spec || !spec.toDOM) {
            // Unknown node type — serialize children only
            if (node.children) {
                return node.children.map(c => this._serializeNode(c)).join('');
            }
            return '';
        }

        const domSpec = spec.toDOM(node);
        return this._specToHTML(domSpec, node);
    }

    /**
     * Convert a toDOM spec to an HTML string.
     *
     * @param {Array} spec - DOM spec from schema
     * @param {import('./model/Node.js').default} node - Source model node
     * @returns {string}
     * @private
     */
    _specToHTML(spec, node) {
        if (!Array.isArray(spec)) return '';

        const tagName = spec[0];
        let attrs = '';
        let startIdx = 1;

        // Check if second element is attrs object
        if (spec.length > 1 && spec[1] !== null && typeof spec[1] === 'object' && !Array.isArray(spec[1]) && spec[1] !== 0) {
            for (const [key, value] of Object.entries(spec[1])) {
                if (value !== undefined && value !== null) {
                    attrs += ` ${key}="${this._escapeAttr(String(value))}"`;
                }
            }
            startIdx = 2;
        }

        // Void elements (no closing tag)
        const voidElements = new Set(['br', 'hr', 'img', 'input']);
        if (voidElements.has(tagName)) {
            return `<${tagName}${attrs}>`;
        }

        let inner = '';

        for (let i = startIdx; i < spec.length; i++) {
            const entry = spec[i];

            if (entry === 0) {
                // Render children
                if (node && node.children) {
                    inner += node.children.map(c => this._serializeNode(c)).join('');
                }
            } else if (Array.isArray(entry)) {
                // Nested spec
                inner += this._specToHTML(entry, node);
            }
        }

        return `<${tagName}${attrs}>${inner}</${tagName}>`;
    }

    /**
     * Serialize a text node with mark wrapping.
     *
     * @param {import('./model/Node.js').default} textNode
     * @returns {string}
     * @private
     */
    _serializeTextNode(textNode) {
        let html = this._escapeHTML(textNode.text);

        // Wrap in mark elements from innermost to outermost
        for (const mark of textNode.marks) {
            const markSpec = this._schema.marks[mark.type];
            if (markSpec && markSpec.toDOM) {
                const domSpec = markSpec.toDOM(mark);
                html = this._wrapInSpec(domSpec, html);
            }
        }

        return html;
    }

    /**
     * Wrap content in a mark's DOM spec.
     *
     * @param {Array} spec - Mark DOM spec
     * @param {string} content - Inner HTML content
     * @returns {string}
     * @private
     */
    _wrapInSpec(spec, content) {
        if (!Array.isArray(spec)) return content;

        const tagName = spec[0];
        let attrs = '';

        if (spec.length > 1 && spec[1] !== null && typeof spec[1] === 'object' && !Array.isArray(spec[1]) && spec[1] !== 0) {
            for (const [key, value] of Object.entries(spec[1])) {
                if (value !== undefined && value !== null) {
                    attrs += ` ${key}="${this._escapeAttr(String(value))}"`;
                }
            }
        }

        return `<${tagName}${attrs}>${content}</${tagName}>`;
    }

    /**
     * Escape HTML special characters.
     *
     * @param {string} str
     * @returns {string}
     * @private
     */
    _escapeHTML(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    /**
     * Escape an attribute value.
     *
     * @param {string} str
     * @returns {string}
     * @private
     */
    _escapeAttr(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    // =========================================================================
    // HTML parsing (HTML -> model)
    // =========================================================================

    /**
     * Parse an HTML string into a document model.
     *
     * @param {string} html - HTML string
     * @returns {import('./model/Node.js').default} Document node
     * @private
     */
    _parseHTML(html) {
        if (!html) {
            // Empty document with one empty paragraph
            const para = this._schema.node('paragraph', null, []);
            return this._schema.node('document', null, [para]);
        }

        const sanitized = sanitizeHTML(html);

        // Parse into a temporary DOM element
        const temp = document.createElement('div');
        temp.innerHTML = sanitized;

        // Walk the DOM to build the model tree
        const blocks = this._parseDOMChildren(temp, 'block');

        if (blocks.length === 0) {
            // No block content — wrap any inline content in a paragraph
            const inlines = this._parseDOMChildren(temp, 'inline');
            if (inlines.length > 0) {
                const para = this._schema.node('paragraph', null, inlines);
                return this._schema.node('document', null, [para]);
            }
            // Truly empty
            const para = this._schema.node('paragraph', null, []);
            return this._schema.node('document', null, [para]);
        }

        return this._schema.node('document', null, blocks);
    }

    /**
     * Parse DOM children into model nodes.
     *
     * @param {Element} el - Parent DOM element
     * @param {string} context - 'block' or 'inline'
     * @returns {import('./model/Node.js').default[]}
     * @private
     */
    _parseDOMChildren(el, context) {
        const nodes = [];
        let pendingInlines = [];

        const flushInlines = () => {
            if (pendingInlines.length > 0 && context === 'block') {
                // Wrap loose inline content in a paragraph
                try {
                    const para = this._schema.node('paragraph', null, pendingInlines);
                    nodes.push(para);
                } catch (e) {
                    // Skip invalid content
                }
                pendingInlines = [];
            } else if (pendingInlines.length > 0) {
                nodes.push(...pendingInlines);
                pendingInlines = [];
            }
        };

        for (const child of el.childNodes) {
            if (child.nodeType === 3) {
                // Text node
                const text = child.textContent;
                if (text && text.trim().length > 0) {
                    try {
                        const textNode = this._schema.text(text);
                        pendingInlines.push(textNode);
                    } catch (e) {
                        // Skip empty text
                    }
                }
                continue;
            }

            if (child.nodeType !== 1) continue; // Only process element nodes

            const tag = child.tagName.toLowerCase();

            if (BLOCK_TAGS.has(tag)) {
                flushInlines();
                const blockNode = this._parseDOMElement(child);
                if (blockNode) {
                    nodes.push(blockNode);
                }
            } else {
                // Inline element — parse and add to pending
                const inlineNodes = this._parseInlineElement(child, []);
                pendingInlines.push(...inlineNodes);
            }
        }

        flushInlines();
        return nodes;
    }

    /**
     * Parse a block-level DOM element into a model node.
     *
     * @param {Element} el
     * @returns {import('./model/Node.js').default|null}
     * @private
     */
    _parseDOMElement(el) {
        const tag = el.tagName.toLowerCase();

        try {
            switch (tag) {
                case 'p':
                case 'div': {
                    const children = this._parseInlineChildren(el, []);
                    return this._schema.node('paragraph', null, children);
                }
                case 'h1': case 'h2': case 'h3':
                case 'h4': case 'h5': case 'h6': {
                    const level = parseInt(tag.charAt(1), 10);
                    const children = this._parseInlineChildren(el, []);
                    return this._schema.node('heading', { level }, children);
                }
                case 'blockquote': {
                    const blocks = this._parseDOMChildren(el, 'block');
                    if (blocks.length === 0) {
                        const para = this._schema.node('paragraph', null, []);
                        return this._schema.node('blockquote', null, [para]);
                    }
                    return this._schema.node('blockquote', null, blocks);
                }
                case 'ul': {
                    const items = this._parseListItems(el);
                    if (items.length === 0) return null;
                    return this._schema.node('bulletList', null, items);
                }
                case 'ol': {
                    const items = this._parseListItems(el);
                    if (items.length === 0) return null;
                    const start = el.getAttribute('start');
                    return this._schema.node('orderedList',
                        { start: start ? parseInt(start, 10) : 1 }, items);
                }
                case 'li': {
                    const blocks = this._parseDOMChildren(el, 'block');
                    if (blocks.length === 0) {
                        const inlines = this._parseInlineChildren(el, []);
                        const para = this._schema.node('paragraph', null, inlines);
                        return this._schema.node('listItem', null, [para]);
                    }
                    return this._schema.node('listItem', null, blocks);
                }
                case 'pre': {
                    const text = el.textContent || '';
                    const codeEl = el.querySelector('code');
                    let language = null;
                    if (codeEl) {
                        const langClass = Array.from(codeEl.classList)
                            .find(c => c.startsWith('language-'));
                        if (langClass) {
                            language = langClass.replace('language-', '');
                        }
                    }
                    if (text) {
                        const textNode = this._schema.text(text);
                        return this._schema.node('codeBlock', { language }, [textNode]);
                    }
                    return this._schema.node('codeBlock', { language }, []);
                }
                case 'hr':
                    return this._schema.node('horizontalRule', null, null);
                default:
                    // Fallback: treat as paragraph
                    const children = this._parseInlineChildren(el, []);
                    return this._schema.node('paragraph', null, children);
            }
        } catch (e) {
            Logger.warn({ code: "RTE_PARSE_ERROR", tag, err: e },
                "Failed to parse element: %s", tag);
            return null;
        }
    }

    /**
     * Parse list item children.
     *
     * @param {Element} listEl
     * @returns {import('./model/Node.js').default[]}
     * @private
     */
    _parseListItems(listEl) {
        const items = [];
        for (const child of listEl.children) {
            if (child.tagName.toLowerCase() === 'li') {
                const item = this._parseDOMElement(child);
                if (item) items.push(item);
            }
        }
        return items;
    }

    /**
     * Parse inline children of an element.
     *
     * @param {Element} el
     * @param {object[]} marks - Active marks from parent elements
     * @returns {import('./model/Node.js').default[]}
     * @private
     */
    _parseInlineChildren(el, marks) {
        const nodes = [];

        for (const child of el.childNodes) {
            if (child.nodeType === 3) {
                const text = child.textContent;
                if (text && text.length > 0) {
                    try {
                        const textNode = this._schema.text(text, marks.length > 0 ? marks : null);
                        nodes.push(textNode);
                    } catch (e) {
                        // Skip empty text
                    }
                }
            } else if (child.nodeType === 1) {
                const inlineNodes = this._parseInlineElement(child, marks);
                nodes.push(...inlineNodes);
            }
        }

        return nodes;
    }

    /**
     * Parse an inline DOM element, accumulating marks.
     *
     * @param {Element} el
     * @param {object[]} parentMarks - Marks from ancestor elements
     * @returns {import('./model/Node.js').default[]}
     * @private
     */
    _parseInlineElement(el, parentMarks) {
        const tag = el.tagName.toLowerCase();

        // Check if this tag represents a mark
        const markType = TAG_TO_MARK[tag];
        let marks = [...parentMarks];

        if (markType) {
            marks.push(Mark.create(markType));
        } else if (tag === 'a') {
            const href = el.getAttribute('href');
            if (href) {
                marks.push(Mark.create('link', {
                    href,
                    title: el.getAttribute('title') || null,
                    target: el.getAttribute('target') || null
                }));
            }
        } else if (tag === 'span') {
            // Check for style-based marks
            const style = el.getAttribute('style') || '';
            if (style.includes('color:') && !style.includes('background-color:')) {
                const colorMatch = style.match(/(?:^|;)\s*color:\s*([^;]+)/);
                if (colorMatch) {
                    marks.push(Mark.create('textColor', { color: colorMatch[1].trim() }));
                }
            }
            if (style.includes('background-color:')) {
                const bgMatch = style.match(/background-color:\s*([^;]+)/);
                if (bgMatch) {
                    marks.push(Mark.create('backgroundColor', { color: bgMatch[1].trim() }));
                }
            }
            if (style.includes('font-size:')) {
                const sizeMatch = style.match(/font-size:\s*([^;]+)/);
                if (sizeMatch) {
                    marks.push(Mark.create('fontSize', { size: sizeMatch[1].trim() }));
                }
            }
            if (style.includes('font-family:')) {
                const familyMatch = style.match(/font-family:\s*([^;]+)/);
                if (familyMatch) {
                    marks.push(Mark.create('fontFamily', { family: familyMatch[1].trim() }));
                }
            }
        } else if (tag === 'br') {
            // Hard break — return as a hardBreak node
            try {
                return [this._schema.node('hardBreak', null, null)];
            } catch (e) {
                return [];
            }
        }

        // Parse children with accumulated marks
        return this._parseInlineChildren(el, marks);
    }
}
