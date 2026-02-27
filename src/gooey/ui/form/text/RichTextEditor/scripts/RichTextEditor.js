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
import { baseKeymap, keymap, toggleMark, setMark, clearFormatting, markActive, getActiveMarks, setBlockType, heading, paragraph, wrapInBlockquote, toggleCodeBlock, insertHorizontalRule, setAlignment, increaseIndent, decreaseIndent, setLineHeight, toggleBulletList, toggleOrderedList, toggleChecklist, listIndent, listOutdent, _isInTable } from './state/Commands.js';
import { ICONS } from './Icons.js';
import EditorView from './view/EditorView.js';
import InputHandler from './view/InputHandler.js';
import SelectionManager from './view/SelectionManager.js';
import PluginManager from './plugins/PluginManager.js';
import { DEFAULT_PLUGINS } from './plugins/DefaultPlugins.js';
import { insertTable as insertTableCmd, addRowBefore as addRowBeforeCmd, addRowAfter as addRowAfterCmd, addColumnBefore as addColumnBeforeCmd, addColumnAfter as addColumnAfterCmd, deleteRow as deleteRowCmd, deleteColumn as deleteColumnCmd, deleteTable as deleteTableCmd, mergeCells as mergeCellsCmd, splitCell as splitCellCmd, toggleHeaderRow as toggleHeaderRowCmd, toggleHeaderColumn as toggleHeaderColumnCmd } from './commands/TableCommands.js';
import { insertImage as insertImageCmd, insertVideo as insertVideoCmd, insertEmbed as insertEmbedCmd, setMediaAlignment as setMediaAlignmentCmd, setImageAlt as setImageAltCmd, setImageCaption as setImageCaptionCmd, updateMediaAttrs as updateMediaAttrsCmd, deleteMedia as deleteMediaCmd, _findMediaNodeAtPos } from './commands/MediaCommands.js';

/**
 * Elements that must be stripped entirely (with all descendants).
 * @type {Set<string>}
 */
const FORBIDDEN_ELEMENTS = new Set([
    'script', 'iframe', 'object', 'embed', 'form', 'input',
    'button', 'select', 'textarea', 'link', 'meta', 'base', 'applet'
]);

/**
 * Allowed CSS properties in style attributes for input sanitization.
 * @type {Set<string>}
 */
const ALLOWED_STYLE_PROPERTIES = new Set([
    'color', 'background-color', 'font-size', 'font-family',
    'text-align', 'line-height', 'text-decoration', 'font-weight',
    'font-style', 'vertical-align', 'margin-left'
]);

/**
 * URL attributes that may contain dangerous schemes.
 * @type {Set<string>}
 */
const URL_ATTRIBUTES = new Set([
    'href', 'src', 'action', 'formaction', 'data', 'codebase'
]);

/**
 * Regex matching dangerous URL schemes including HTML-entity-encoded variants.
 * @type {RegExp}
 */
const DANGEROUS_URL_RE = /^\s*(javascript|vbscript|data\s*:\s*text\/html)\s*:/i;

/**
 * Decode HTML entities to detect obfuscated URL schemes.
 * @param {string} str
 * @returns {string}
 */
function _decodeHTMLEntities(str) {
    if (!str) return '';
    // Handle numeric entities (&#106; &#x6A;) and named entities
    return str
        .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
        .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)));
}

/**
 * Sanitize HTML input to prevent XSS attacks.
 *
 * Parses HTML via DOMParser and walks the DOM tree, removing:
 * - Dangerous elements (script, iframe, object, embed, form, input, etc.)
 * - All on* event handler attributes
 * - javascript:, vbscript:, data:text/html URLs in URL-bearing attributes
 * - Inline styles not in the allow-list
 *
 * @param {string} html - Raw HTML string
 * @returns {string} Sanitized HTML
 */
function _sanitizeInput(html) {
    if (!html) return '';

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const body = doc.body;
    if (!body) return '';

    // Collect nodes to remove/unwrap (snapshot to avoid mutation during iteration)
    const walker = document.createTreeWalker(body, NodeFilter.SHOW_ELEMENT, null);
    const toRemove = [];

    let node;
    while ((node = walker.nextNode())) {
        const tag = node.tagName.toLowerCase();

        // Strip forbidden elements entirely
        if (FORBIDDEN_ELEMENTS.has(tag)) {
            toRemove.push(node);
            continue;
        }

        // Clean attributes on allowed elements
        _cleanInputAttributes(node);
    }

    // Remove forbidden elements (and all descendants)
    for (const el of toRemove) {
        if (el.parentNode) {
            el.parentNode.removeChild(el);
        }
    }

    return body.innerHTML;
}

/**
 * Clean attributes on an element for input sanitization.
 * Removes on* handlers, dangerous URLs, and filters style properties.
 *
 * @param {Element} el
 */
function _cleanInputAttributes(el) {
    const attrsToRemove = [];

    for (const attr of Array.from(el.attributes)) {
        const name = attr.name.toLowerCase();

        // Strip on* event handler attributes
        if (name.startsWith('on')) {
            attrsToRemove.push(attr.name);
            continue;
        }

        // Check URL attributes for dangerous schemes
        if (URL_ATTRIBUTES.has(name)) {
            const decoded = _decodeHTMLEntities(attr.value);
            if (DANGEROUS_URL_RE.test(decoded)) {
                // For images, allow data:image/* but strip data:text/html
                if (name === 'src' && /^\s*data\s*:\s*image\//i.test(decoded)) {
                    // Safe data URI for images — keep it
                    continue;
                }
                attrsToRemove.push(attr.name);
                continue;
            }
        }

        // Filter style attribute
        if (name === 'style') {
            const filtered = _filterStyleProperties(attr.value);
            if (filtered) {
                el.setAttribute('style', filtered);
            } else {
                attrsToRemove.push(attr.name);
            }
        }
    }

    for (const name of attrsToRemove) {
        el.removeAttribute(name);
    }
}

/**
 * Filter a CSS style string to only allowed properties.
 *
 * @param {string} styleStr - Raw style attribute value
 * @returns {string} Filtered style string, or empty string
 */
function _filterStyleProperties(styleStr) {
    if (!styleStr) return '';

    const parts = styleStr.split(';').filter(Boolean);
    const allowed = [];

    for (const part of parts) {
        const colonIdx = part.indexOf(':');
        if (colonIdx === -1) continue;

        const prop = part.slice(0, colonIdx).trim().toLowerCase();
        const value = part.slice(colonIdx + 1).trim();

        if (ALLOWED_STYLE_PROPERTIES.has(prop) && value) {
            allowed.push(`${prop}: ${value}`);
        }
    }

    return allowed.length > 0 ? allowed.join('; ') : '';
}

/**
 * Sanitize HTML output (lighter sanitizer for the value getter path).
 * Removes any on* attributes and javascript: URLs that might have
 * been injected via model manipulation. Does NOT strip structural elements.
 *
 * @param {string} html - HTML string from model serialization
 * @returns {string} Sanitized HTML
 */
function _sanitizeOutput(html) {
    if (!html) return '';

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const body = doc.body;
    if (!body) return '';

    const walker = document.createTreeWalker(body, NodeFilter.SHOW_ELEMENT, null);

    let node;
    while ((node = walker.nextNode())) {
        const attrsToRemove = [];

        for (const attr of Array.from(node.attributes)) {
            const name = attr.name.toLowerCase();

            // Strip on* event handler attributes
            if (name.startsWith('on')) {
                attrsToRemove.push(attr.name);
                continue;
            }

            // Strip dangerous URL schemes
            if (URL_ATTRIBUTES.has(name)) {
                const decoded = _decodeHTMLEntities(attr.value);
                if (DANGEROUS_URL_RE.test(decoded)) {
                    if (name === 'src' && /^\s*data\s*:\s*image\//i.test(decoded)) {
                        continue; // Safe data URI for images
                    }
                    attrsToRemove.push(attr.name);
                }
            }
        }

        for (const name of attrsToRemove) {
            node.removeAttribute(name);
        }
    }

    return body.innerHTML;
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
        this._focusValue = '';
        this._settingValueProgrammatically = false;
        this._config = {};

        // Custom toolbar items registered via API
        this._customToolbarItems = new Map();

        // Internal toolbar reference (created when toolbar="full")
        this._internalToolbar = null;

        // Active dialog, link popover, and context menu references
        this._activeDialog = null;
        this._activeLinkPopover = null;
        this._activeContextMenu = null;

        // Query new template DOM elements
        this._shell = this.shadowRoot.querySelector('.rte-shell');
        this._toolbar = this.shadowRoot.querySelector('.rte-toolbar');
        this._editorArea = this.shadowRoot.querySelector('.rte-editor-area');
        this._inputSink = this.shadowRoot.querySelector('.rte-input-sink');
        this._content = this.shadowRoot.querySelector('.rte-content');
        this._selectionLayer = this.shadowRoot.querySelector('.rte-selection');

        // Create status bar for character/word count display
        this._statusBar = document.createElement('div');
        this._statusBar.className = 'rte-status-bar';
        this._statusBar.style.display = 'none';
        this._charCountSpan = document.createElement('span');
        this._charCountSpan.className = 'rte-char-count';
        this._wordCountSpan = document.createElement('span');
        this._wordCountSpan.className = 'rte-word-count';
        this._statusBar.appendChild(this._charCountSpan);
        this._statusBar.appendChild(this._wordCountSpan);
        this._shell.appendChild(this._statusBar);

        // Air toolbar reference (floating toolbar shown on text selection)
        this._airToolbar = null;

        // Set up TextElement compatibility
        this.textElement = this._content;
        this.formElement = this._content;

        // Create Schema
        this._schema = Schema.default();

        // Create initial EditorState
        this._state = EditorState.create(this._schema, null);

        // Create PluginManager and load all default plugins
        this._pluginManager = new PluginManager(this);

        // Determine which plugins to disable from config
        const disableList = this._config.disablePlugins || [];

        // Load all default plugins
        this._pluginManager.loadPlugins(DEFAULT_PLUGINS, disableList);

        // Get references to specific plugins for backward-compatible API
        this._history = this._pluginManager.getPlugin('history');
        this._clipboard = this._pluginManager.getPlugin('clipboard');
        this._search = this._pluginManager.getPlugin('search');
        this._tablePlugin = this._pluginManager.getPlugin('table');
        this._imagePlugin = this._pluginManager.getPlugin('image');
        this._characterCountPlugin = this._pluginManager.getPlugin('characterCount');
        this._placeholderPlugin = this._pluginManager.getPlugin('placeholder');

        // Build the resolved keymap from plugin contributions + baseKeymap
        const pluginKeymaps = this._pluginManager.collectKeymaps();
        const resolvedKeymap = keymap({
            ...baseKeymap,
            ...pluginKeymaps,
            // Editor-level override: Mod-k uses _handleLinkCommand for dialog
            'Mod-k': (state, dispatch) => this._handleLinkCommand(state, dispatch)
        });

        // Create EditorView
        this._view = new EditorView(this._content, this._state, this._schema);

        // Wire TablePlugin view reference (needed for cell navigation)
        if (this._tablePlugin) {
            this._tablePlugin._view = this._view;
        }

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
        this._handleContextMenuBound = this._handleContextMenu.bind(this);
        this._handleDocClickBound = this._handleDocClick.bind(this);

        this._editorArea.addEventListener('mousedown', this._handleEditorClickBound);
        this._inputSink.addEventListener('focus', this._handleInputFocusBound);
        this._inputSink.addEventListener('blur', this._handleInputBlurBound);
        this._content.addEventListener('contextmenu', this._handleContextMenuBound);

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

        // Set up toolbar binding
        this._setupToolbar();

        // Handle spellcheck forwarding
        this._syncSpellcheck();

        // Handle autofocus
        if (this.hasAttribute('autofocus')) {
            Promise.resolve().then(() => this.focus());
        }

        // Render initial state if view exists
        if (this._view && this._state) {
            this._view.updateState(this._state);
            this._selectionManager.update(this._state.selection);
        }

        // Initialize character/word count display
        this._updateCounts();

        // Fire READY event once editor is fully initialized and connected
        this.fireEvent(RichTextEditorEvent.READY, { value: this.value });
    }

    disconnectedCallback() {
        // Fire DESTROY event before teardown
        this.fireEvent(RichTextEditorEvent.DESTROY, { value: this.value });

        if (super.disconnectedCallback) {
            super.disconnectedCallback();
        }

        // Clean up all plugins via PluginManager
        if (this._pluginManager) {
            this._pluginManager.destroy();
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
        if (this._content) {
            this._content.removeEventListener('contextmenu', this._handleContextMenuBound);
        }

        // Clean up popover/context menu
        this._hideLinkPopover();
        this._hideTableContextMenu();
        this._closeDialog();

        // Clean up air toolbar
        if (this._airToolbar) {
            this._airToolbar.remove();
            this._airToolbar = null;
        }

        // Clean up internal toolbar
        if (this._internalToolbar) {
            this._internalToolbar.remove();
            this._internalToolbar = null;
        }
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return;

        super.attributeChangedCallback?.(name, oldValue, newValue);

        switch (name) {
            case 'disabled':
                this._syncDisabledState();
                break;
            case 'readonly':
                this._syncReadOnlyState();
                break;
            case 'placeholder':
                this._syncPlaceholder(newValue);
                break;
            case 'value':
                if (newValue !== this.value) {
                    this.value = newValue ?? '';
                }
                break;
            case 'toolbar':
                this._tearDownToolbar();
                this._setupToolbar();
                break;
            case 'airmode':
                this._syncAirMode();
                break;
            case 'spellcheck':
                this._syncSpellcheck();
                break;
        }
    }

    // =========================================================================
    // Public API
    // =========================================================================

    /**
     * Get the editor content as an HTML string.
     * Serializes the document model to HTML and sanitizes the output.
     * @returns {string}
     */
    get value() {
        if (!this._state || !this._state.doc) {
            return '';
        }
        const raw = this._serializeToHTML(this._state.doc);
        return _sanitizeOutput(raw);
    }

    /**
     * Set the editor content from an HTML string.
     * Sanitizes input, parses HTML into a document model, and updates the view.
     * Fires CONTENT_SET event (not INPUT).
     * @param {string} val
     */
    set value(val) {
        if (!this._schema) return;

        const oldValue = this._state ? this._serializeToHTML(this._state.doc) : '';
        const sanitized = _sanitizeInput(val);
        const doc = this._parseHTML(sanitized);
        const selection = Selection.cursor(1);
        this._state = new EditorState(doc, selection, [], [], this._schema);

        if (this._view) {
            this._view.updateState(this._state);
        }
        if (this._selectionManager) {
            this._selectionManager.update(this._state.selection);
        }

        // Fire CONTENT_SET (not INPUT) for programmatic value setting
        this._settingValueProgrammatically = true;
        this.fireEvent(RichTextEditorEvent.CONTENT_SET, {
            value: this.value,
            previousValue: oldValue
        });
        this._settingValueProgrammatically = false;
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

    /**
     * Get read-only state.
     * @returns {boolean}
     */
    get readOnly() {
        return this.hasAttribute('readonly');
    }

    /**
     * Set read-only state.
     * @param {boolean} val
     */
    set readOnly(val) {
        if (val) {
            this.setAttribute('readonly', '');
        } else {
            this.removeAttribute('readonly');
        }
        this._syncReadOnlyState();
    }

    /**
     * Get placeholder text.
     * @returns {string}
     */
    get placeholder() {
        return this.getAttribute('placeholder') || '';
    }

    /**
     * Set placeholder text. Forwards to PlaceholderPlugin.
     * @param {string} val
     */
    set placeholder(val) {
        if (val) {
            this.setAttribute('placeholder', val);
        } else {
            this.removeAttribute('placeholder');
        }
        this._syncPlaceholder(val);
    }

    /**
     * Get maxLength constraint.
     * @returns {number} -1 if not set
     */
    get maxLength() {
        const attr = this.getAttribute('maxlength');
        return attr !== null ? parseInt(attr, 10) : -1;
    }

    /**
     * Set maxLength constraint.
     * @param {number} val
     */
    set maxLength(val) {
        if (val !== null && val !== undefined && val >= 0) {
            this.setAttribute('maxlength', val);
        } else {
            this.removeAttribute('maxlength');
        }
    }

    /**
     * Get minLength constraint.
     * @returns {number} -1 if not set
     */
    get minLength() {
        const attr = this.getAttribute('minlength');
        return attr !== null ? parseInt(attr, 10) : -1;
    }

    /**
     * Set minLength constraint.
     * @param {number} val
     */
    set minLength(val) {
        if (val !== null && val !== undefined && val >= 0) {
            this.setAttribute('minlength', val);
        } else {
            this.removeAttribute('minlength');
        }
    }

    /**
     * Get the character length of the editor content (text only, no markup).
     * @returns {number}
     */
    getLength() {
        if (!this._state || !this._state.doc) return 0;
        return this._getTextLength(this._state.doc);
    }

    /**
     * Get the word count of the editor content.
     * Delegates to CharacterCountPlugin if available, otherwise counts manually.
     * @returns {number}
     */
    getWordCount() {
        if (this._characterCountPlugin) {
            return this._characterCountPlugin.getWordCount();
        }
        // Fallback: get plain text via getText and count words
        const text = this._getPlainText(this._state.doc);
        if (!text || text.trim().length === 0) return 0;
        return text.trim().split(/\s+/).length;
    }

    /**
     * Check if the editor content is effectively empty.
     * @returns {boolean}
     */
    isEmpty() {
        if (!this._state || !this._state.doc) return true;
        const doc = this._state.doc;
        if (!doc.children || doc.children.length === 0) return true;
        if (doc.children.length === 1) {
            const child = doc.children[0];
            if (child.type === 'paragraph') {
                if (!child.children || child.children.length === 0) return true;
                if (child.textContent === '') return true;
            }
        }
        if (doc.contentSize <= 2) return true;
        return false;
    }

    /**
     * Check form validity.
     * Returns false if required and empty, or if minLength constraint is violated.
     * @returns {boolean}
     */
    checkValidity() {
        if (this.required && this.isEmpty()) {
            return false;
        }
        const ml = this.minLength;
        if (ml > 0 && this.getLength() < ml) {
            return false;
        }
        return true;
    }

    /**
     * Get the editor content as an HTML string (alias for value getter).
     * @returns {string}
     */
    getHTML() {
        return this.value;
    }

    /**
     * Set the editor content from an HTML string (alias for value setter).
     * Input is sanitized before parsing.
     * @param {string} html
     */
    setHTML(html) {
        this.value = html;
    }

    /**
     * Insert HTML at the current cursor position.
     * Input is sanitized before insertion.
     * @param {string} html
     */
    insertHTML(html) {
        if (!html) return;
        const sanitized = _sanitizeInput(html);
        if (this._clipboard) {
            const { from, to } = this._state.selection;
            this._clipboard._insertHTMLContent(sanitized, from, to);
        }
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
    // List API
    // =========================================================================

    /**
     * Toggle a bullet list on the current selection.
     *
     * @returns {boolean} Whether the command executed successfully
     */
    toggleBulletList() {
        return toggleBulletList(this._state, (tr) => this._dispatch(tr));
    }

    /**
     * Toggle an ordered list on the current selection.
     *
     * @returns {boolean} Whether the command executed successfully
     */
    toggleOrderedList() {
        return toggleOrderedList(this._state, (tr) => this._dispatch(tr));
    }

    /**
     * Toggle a checklist on the current selection.
     *
     * @returns {boolean} Whether the command executed successfully
     */
    toggleChecklist() {
        return toggleChecklist(this._state, (tr) => this._dispatch(tr));
    }

    /**
     * Indent the current list item (nest under previous sibling).
     *
     * @returns {boolean} Whether the command executed successfully
     */
    indentListItem() {
        return listIndent(this._state, (tr) => this._dispatch(tr));
    }

    /**
     * Outdent the current list item (lift out of list or up one level).
     *
     * @returns {boolean} Whether the command executed successfully
     */
    outdentListItem() {
        return listOutdent(this._state, (tr) => this._dispatch(tr));
    }

    // =========================================================================
    // Table API
    // =========================================================================

    /**
     * Insert a table with the specified number of rows and columns.
     *
     * @param {number} [rows=3] - Number of rows
     * @param {number} [cols=3] - Number of columns
     * @returns {boolean} Whether the command executed successfully
     */
    insertTable(rows = 3, cols = 3) {
        return insertTableCmd(rows, cols)(this._state, (tr) => this._dispatch(tr));
    }

    /**
     * Add a row above the current row.
     *
     * @returns {boolean} Whether the command executed successfully
     */
    addRowBefore() {
        return addRowBeforeCmd(this._state, (tr) => this._dispatch(tr));
    }

    /**
     * Add a row below the current row.
     *
     * @returns {boolean} Whether the command executed successfully
     */
    addRowAfter() {
        return addRowAfterCmd(this._state, (tr) => this._dispatch(tr));
    }

    /**
     * Add a column to the left of the current column.
     *
     * @returns {boolean} Whether the command executed successfully
     */
    addColumnBefore() {
        return addColumnBeforeCmd(this._state, (tr) => this._dispatch(tr));
    }

    /**
     * Add a column to the right of the current column.
     *
     * @returns {boolean} Whether the command executed successfully
     */
    addColumnAfter() {
        return addColumnAfterCmd(this._state, (tr) => this._dispatch(tr));
    }

    /**
     * Delete the current row from the table.
     *
     * @returns {boolean} Whether the command executed successfully
     */
    deleteRow() {
        return deleteRowCmd(this._state, (tr) => this._dispatch(tr));
    }

    /**
     * Delete the current column from the table.
     *
     * @returns {boolean} Whether the command executed successfully
     */
    deleteColumn() {
        return deleteColumnCmd(this._state, (tr) => this._dispatch(tr));
    }

    /**
     * Delete the entire table containing the cursor.
     *
     * @returns {boolean} Whether the command executed successfully
     */
    deleteTable() {
        return deleteTableCmd(this._state, (tr) => this._dispatch(tr));
    }

    /**
     * Merge selected cells in the table.
     *
     * @returns {boolean} Whether the command executed successfully
     */
    mergeCells() {
        return mergeCellsCmd(this._state, (tr) => this._dispatch(tr));
    }

    /**
     * Split a merged cell back into individual cells.
     *
     * @returns {boolean} Whether the command executed successfully
     */
    splitCell() {
        return splitCellCmd(this._state, (tr) => this._dispatch(tr));
    }

    /**
     * Toggle header attribute on all cells in the current row.
     *
     * @returns {boolean} Whether the command executed successfully
     */
    toggleHeaderRow() {
        return toggleHeaderRowCmd(this._state, (tr) => this._dispatch(tr));
    }

    /**
     * Toggle header attribute on all cells in the current column.
     *
     * @returns {boolean} Whether the command executed successfully
     */
    toggleHeaderColumn() {
        return toggleHeaderColumnCmd(this._state, (tr) => this._dispatch(tr));
    }

    // =========================================================================
    // Media API
    // =========================================================================

    /**
     * Get the editor configuration object.
     *
     * @returns {object}
     */
    get config() {
        return this._config;
    }

    /**
     * Set the editor configuration object.
     * Supports: `{ imageUpload: async (file) => ({ src, alt, ... }) }`
     *
     * @param {object} val
     */
    set config(val) {
        this._config = val || {};
    }

    /**
     * Insert an image at the current cursor position.
     *
     * @param {string} src - Image source URL
     * @param {object} [attrs={}] - Optional attributes (alt, width, height, align, caption)
     * @returns {boolean} Whether the command executed successfully
     */
    insertImage(src, attrs = {}) {
        return insertImageCmd(src, attrs)(this._state, (tr) => this._dispatch(tr));
    }

    /**
     * Insert a video at the current cursor position.
     *
     * @param {string} url - Video URL (YouTube, Vimeo, or direct)
     * @param {object} [attrs={}] - Optional attributes (width, height, align)
     * @returns {boolean} Whether the command executed successfully
     */
    insertVideo(url, attrs = {}) {
        return insertVideoCmd(url, attrs)(this._state, (tr) => this._dispatch(tr));
    }

    /**
     * Insert an embed at the current cursor position.
     *
     * @param {string} url - Embed URL
     * @param {object} [attrs={}] - Optional attributes (label, width, height)
     * @returns {boolean} Whether the command executed successfully
     */
    insertEmbed(url, attrs = {}) {
        return insertEmbedCmd(url, attrs)(this._state, (tr) => this._dispatch(tr));
    }

    /**
     * Set the alignment of the currently selected media node.
     *
     * @param {string|null} align - "left", "center", "right", or null to remove
     * @returns {boolean} Whether the command executed successfully
     */
    setMediaAlignment(align) {
        return setMediaAlignmentCmd(align)(this._state, (tr) => this._dispatch(tr));
    }

    /**
     * Set the alt text of the currently selected image.
     *
     * @param {string} text - Alt text
     * @returns {boolean} Whether the command executed successfully
     */
    setImageAlt(text) {
        return setImageAltCmd(text)(this._state, (tr) => this._dispatch(tr));
    }

    /**
     * Set the caption of the currently selected image.
     *
     * @param {string} caption - Caption text
     * @returns {boolean} Whether the command executed successfully
     */
    setImageCaption(caption) {
        return setImageCaptionCmd(caption)(this._state, (tr) => this._dispatch(tr));
    }

    /**
     * Update attributes on the currently selected media node.
     *
     * @param {object} attrs - Attributes to update (e.g., { width: '300px', height: '200px' })
     * @returns {boolean} Whether the command executed successfully
     */
    updateMediaAttrs(attrs) {
        return updateMediaAttrsCmd(attrs)(this._state, (tr) => this._dispatch(tr));
    }

    /**
     * Delete the currently selected media node.
     *
     * @returns {boolean} Whether the command executed successfully
     */
    deleteMedia() {
        return deleteMediaCmd(this._state, (tr) => this._dispatch(tr));
    }

    /**
     * Get information about the currently selected media node, if any.
     *
     * @returns {{ type: string, attrs: object }|null} Media info or null
     */
    getSelectedMedia() {
        const mediaInfo = _findMediaNodeAtPos(this._state);
        if (!mediaInfo) return null;
        return { type: mediaInfo.type, attrs: { ...mediaInfo.node.attrs } };
    }

    // =========================================================================
    // Text Insertion API
    // =========================================================================

    /**
     * Insert plain text at the current cursor position.
     *
     * @param {string} text - Text to insert
     * @returns {boolean} Whether the insertion succeeded
     */
    insertText(text) {
        if (!text || !this._state) return false;
        const { from, to } = this._state.selection;
        const tr = this._state.transaction;
        const textNode = this._schema.text(text);
        tr.replaceWith(from, to, textNode);
        tr.setSelection(Selection.cursor(from + text.length));
        this._dispatch(tr);
        return true;
    }

    // =========================================================================
    // Clipboard API
    // =========================================================================

    /**
     * Get the plain text of the current selection.
     *
     * @returns {string} Selected plain text, or empty string if no selection
     */
    getSelectedText() {
        const { from, to, empty } = this._state.selection;
        if (empty) return '';
        return this._clipboard._serializePlainText(this._state.doc, from, to);
    }

    /**
     * Get the HTML of the current selection.
     *
     * @returns {string} Selected HTML, or empty string if no selection
     */
    getSelectedHTML() {
        const { from, to, empty } = this._state.selection;
        if (empty) return '';
        return this._clipboard._serializeSlice(from, to);
    }

    /**
     * Programmatically copy the current selection to clipboard.
     *
     * @returns {Promise<void>}
     */
    async copy() {
        const { from, to, empty } = this._state.selection;
        if (empty) return;

        const htmlStr = this._clipboard._serializeSlice(from, to);
        const plainStr = this._clipboard._serializePlainText(this._state.doc, from, to);

        if (navigator.clipboard && navigator.clipboard.write) {
            try {
                const blob = new Blob([htmlStr], { type: 'text/html' });
                const textBlob = new Blob([plainStr], { type: 'text/plain' });
                await navigator.clipboard.write([
                    new ClipboardItem({
                        'text/html': blob,
                        'text/plain': textBlob
                    })
                ]);
            } catch (e) {
                // Fallback: try writeText for plain text at least
                try {
                    await navigator.clipboard.writeText(plainStr);
                } catch (e2) {
                    console.warn('Clipboard write failed:', e2);
                }
            }
        }
    }

    /**
     * Programmatically cut the current selection to clipboard.
     *
     * @returns {Promise<void>}
     */
    async cut() {
        await this.copy();
        const { from, to, empty } = this._state.selection;
        if (empty) return;
        const tr = this._state.transaction;
        tr.deleteRange(from, to);
        tr.setSelection(Selection.cursor(from));
        this._dispatch(tr);
    }

    /**
     * Programmatically paste HTML content at the current cursor position.
     *
     * @param {string} html - HTML string to paste
     */
    paste(html) {
        if (!html) return;
        const sanitized = this._clipboard._sanitizer.sanitize(html);
        const { from, to } = this._state.selection;
        this._clipboard._insertHTMLContent(sanitized, from, to);
    }

    /**
     * Programmatically paste plain text at the current cursor position.
     *
     * @param {string} text - Plain text to paste
     */
    pasteText(text) {
        if (!text) return;
        const { from, to } = this._state.selection;
        this._clipboard._insertPlainText(text, from, to);
    }

    // =========================================================================
    // Search & Replace API
    // =========================================================================

    /**
     * Find text in the editor programmatically.
     *
     * @param {string} term - Search term
     * @param {object} [options] - Search options
     * @param {boolean} [options.caseSensitive=false]
     * @param {boolean} [options.wholeWord=false]
     * @param {boolean} [options.useRegex=false]
     * @returns {{ total: number, currentIndex: number }} Match info
     */
    findText(term, options) {
        this._search.setSearchTerm(term, options);
        this._search._updateSearch();
        return {
            total: this._search._matches.length,
            currentIndex: this._search._currentMatchIndex
        };
    }

    /**
     * Replace all occurrences of a search term programmatically.
     *
     * @param {string} searchTerm - Search term
     * @param {string} replaceTerm - Replacement text
     * @param {object} [options] - Search options
     * @param {boolean} [options.caseSensitive=false]
     * @param {boolean} [options.wholeWord=false]
     * @param {boolean} [options.useRegex=false]
     * @returns {number} Number of replacements made
     */
    replaceText(searchTerm, replaceTerm, options) {
        this._search.setSearchTerm(searchTerm, options);
        this._search._replaceTerm = replaceTerm || '';
        this._search._updateSearch();
        const count = this._search._matches.length;
        if (count > 0) {
            this._search.replaceAll();
        }
        return count;
    }

    /**
     * Open the find panel.
     */
    openFindPanel() {
        this._search.open('find');
    }

    /**
     * Open the find/replace panel.
     */
    openReplacePanel() {
        this._search.open('replace');
    }

    /**
     * Close the find/replace panel.
     */
    closeFindPanel() {
        this._search.close();
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
    // Toolbar API
    // =========================================================================

    /**
     * Get the toolbar mode.
     * @returns {string} "full", "none", or an element ID
     */
    get toolbar() {
        return this.getAttribute('toolbar') || 'full';
    }

    /**
     * Set the toolbar mode.
     * @param {string} val - "full", "none", or an element ID
     */
    set toolbar(val) {
        if (val === null || val === undefined) {
            this.removeAttribute('toolbar');
        } else {
            this.setAttribute('toolbar', val);
        }
    }

    /**
     * Get the group name for toolbar group binding.
     * @returns {string|null}
     */
    get group() {
        return this.getAttribute('group') || null;
    }

    /**
     * Set the group name.
     * @param {string|null} val
     */
    set group(val) {
        if (val) {
            this.setAttribute('group', val);
        } else {
            this.removeAttribute('group');
        }
    }

    /**
     * Get whether air mode (floating toolbar) is enabled.
     * @returns {boolean}
     */
    get airMode() {
        return this.hasAttribute('airmode');
    }

    /**
     * Set air mode. When true and toolbar is "full", hides the internal toolbar.
     * Floating toolbar implementation deferred to Plan 05.
     * @param {boolean} val
     */
    set airMode(val) {
        if (val) {
            this.setAttribute('airmode', '');
        } else {
            this.removeAttribute('airmode');
        }
        this._syncAirMode();
    }

    /**
     * Get spellcheck state.
     * @returns {boolean}
     */
    get spellcheck() {
        const val = this.getAttribute('spellcheck');
        return val !== 'false';
    }

    /**
     * Set spellcheck state. Forwarded to the input sink textarea.
     * @param {boolean} val
     */
    set spellcheck(val) {
        this.setAttribute('spellcheck', val ? 'true' : 'false');
        this._syncSpellcheck();
    }

    /**
     * Get autofocus state.
     * @returns {boolean}
     */
    get autofocus() {
        return this.hasAttribute('autofocus');
    }

    /**
     * Set autofocus state.
     * @param {boolean} val
     */
    set autofocus(val) {
        if (val) {
            this.setAttribute('autofocus', '');
        } else {
            this.removeAttribute('autofocus');
        }
    }

    /**
     * Register a custom toolbar item descriptor.
     * Bound toolbars will re-render to include the item.
     *
     * @param {{ name: string, type: string, [key: string]: any }} descriptor
     * @throws {Error} If descriptor lacks name or type
     */
    registerToolbarItem(descriptor) {
        if (!descriptor || !descriptor.name || !descriptor.type) {
            throw new Error('Toolbar item descriptor must have name and type');
        }
        this._customToolbarItems.set(descriptor.name, descriptor);
        this.fireEvent(RichTextEditorEvent.MODEL_CHANGED, {
            value: this.value,
            state: this._state,
            toolbarItemsChanged: true
        });
    }

    /**
     * Unregister a custom toolbar item by name.
     *
     * @param {string} name - Item name
     * @returns {boolean} true if found and removed
     */
    unregisterToolbarItem(name) {
        const removed = this._customToolbarItems.delete(name);
        if (removed) {
            this.fireEvent(RichTextEditorEvent.MODEL_CHANGED, {
                value: this.value,
                state: this._state,
                toolbarItemsChanged: true
            });
        }
        return removed;
    }

    /**
     * Get all toolbar items (from plugins + custom registrations).
     *
     * @returns {Array} Array of toolbar item descriptors
     */
    getToolbarItems() {
        const items = [];

        // Collect from plugins
        if (this._pluginManager) {
            const pluginItems = this._pluginManager.collectToolbarItems();
            items.push(...pluginItems);
        }

        // Merge custom items
        for (const item of this._customToolbarItems.values()) {
            items.push(item);
        }

        return items;
    }

    // =========================================================================
    // Plugin API
    // =========================================================================

    /**
     * Register a plugin at runtime.
     * Triggers a keymap rebuild so the new plugin's bindings take effect.
     *
     * @param {Function} PluginClass - Plugin class to register
     * @returns {object|null} Plugin instance, or null on failure
     */
    registerPlugin(PluginClass) {
        const plugin = this._pluginManager.registerPlugin(PluginClass);
        if (plugin) {
            this._rebuildKeymap();
        }
        return plugin;
    }

    /**
     * Unregister a plugin by name.
     * Triggers a keymap rebuild to remove the plugin's bindings.
     *
     * @param {string} name - Plugin name
     * @returns {boolean} true if the plugin was found and removed
     */
    unregisterPlugin(name) {
        const result = this._pluginManager.unregisterPlugin(name);
        if (result) {
            this._rebuildKeymap();
        }
        return result;
    }

    /**
     * Get a registered plugin by name.
     *
     * @param {string} name - Plugin name
     * @returns {object|null} Plugin instance or null
     */
    getPlugin(name) {
        return this._pluginManager.getPlugin(name);
    }

    /**
     * Rebuild keymap from current active plugins.
     * Called after plugin register/unregister to update key bindings.
     *
     * @private
     */
    _rebuildKeymap() {
        const pluginKeymaps = this._pluginManager.collectKeymaps();
        const resolvedKeymap = keymap({
            ...baseKeymap,
            ...pluginKeymaps,
            // Editor-level override: Mod-k uses _handleLinkCommand for dialog
            'Mod-k': (state, dispatch) => this._handleLinkCommand(state, dispatch)
        });
        if (this._inputHandler) {
            this._inputHandler.updateKeymap(resolvedKeymap);
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
        // Run plugin transaction filters (skip for forced states like undo/redo)
        if (!tr._forceState) {
            tr = this._pluginManager.runFilterTransaction(tr, this._state);
        }

        const oldState = this._state;

        if (tr._forceState) {
            // Undo/redo path: restore the state directly
            this._state = tr._forceState;
        } else {
            // Enforce maxLength constraint for content-changing steps
            if (tr.steps.length > 0 && !this._validateMaxLength(tr)) {
                return; // Reject the transaction — content would exceed maxLength
            }

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

        // Run plugin stateDidUpdate hooks (replaces direct search plugin notification)
        this._pluginManager.runStateDidUpdate(this._state, oldState);

        // Fire events
        this.fireEvent(RichTextEditorEvent.MODEL_CHANGED, {
            value: this.value,
            state: this._state
        });

        // Fire INPUT event only for user-initiated transactions (not programmatic value set)
        if (!this._settingValueProgrammatically) {
            this.fireEvent(TextElementEvent.INPUT, {
                value: this.value,
                state: this._state
            });
        }

        // Track selection changes
        if (!oldState.selection.eq(this._state.selection)) {
            const $head = this._state.doc.resolve(this._state.selection.head);
            const parentAttrs = $head.parent.attrs;
            // Detect list context for toolbar state sync
            const listContext = this._getListContext(this._state.selection.head);

            // Detect table context
            const tableInfo = _isInTable(this._state);

            // Detect media context
            const mediaInfo = _findMediaNodeAtPos(this._state);

            this.fireEvent(RichTextEditorEvent.TEXT_CURSOR_MOVE, {
                value: this.value,
                anchor: this._state.selection.anchor,
                head: this._state.selection.head,
                marks: getActiveMarks(this._state),
                blockType: $head.parent.type,
                blockAttrs: { ...parentAttrs },
                align: parentAttrs.align || "left",
                indent: parentAttrs.indent || 0,
                lineHeight: parentAttrs.lineHeight || null,
                listType: listContext.listType,
                listDepth: listContext.listDepth,
                isChecklist: listContext.isChecklist,
                inTable: !!tableInfo,
                tableRowIndex: tableInfo ? tableInfo.rowIndex : null,
                tableCellIndex: tableInfo ? tableInfo.cellIndex : null,
                inMedia: !!mediaInfo,
                mediaType: mediaInfo ? mediaInfo.type : null,
                mediaAttrs: mediaInfo ? { ...mediaInfo.node.attrs } : null
            });

            // Update link popover based on cursor position
            this._updateLinkPopover();

            // Check air toolbar visibility based on selection
            this._checkAirToolbar();
        }

        // Update character/word count display
        this._updateCounts();
    }

    // =========================================================================
    // Link handling
    // =========================================================================

    /**
     * Handle the Mod-K link command.
     *
     * If link is active on selection: removes the link (unlink).
     * Otherwise: opens the link dialog for URL entry.
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
            // Cursor inside a link -- detect existing link attrs from active marks
            const activeMarks = getActiveMarks(state);
            const linkMark = activeMarks.find(m => m.type === 'link');
            if (linkMark && linkMark.attrs) {
                this._showLinkDialog(linkMark.attrs);
                return true;
            }
            return false;
        }

        // Link NOT active -- open dialog
        this._showLinkDialog();
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
        // FormElement events
        this.addValidEvent(TextElementEvent.INPUT);
        this.addValidEvent(TextElementEvent.CHANGE);
        this.addValidEvent(FormElementEvent.FOCUS);
        this.addValidEvent(FormElementEvent.BLUR);

        // RichTextEditor-specific events
        this.addValidEvent(RichTextEditorEvent.MODEL_CHANGED);
        this.addValidEvent(RichTextEditorEvent.EDITOR_ACTION);
        this.addValidEvent(RichTextEditorEvent.TEXT_CURSOR_MOVE);
        this.addValidEvent(RichTextEditorEvent.PASTE_START);
        this.addValidEvent(RichTextEditorEvent.PASTE_END);
        this.addValidEvent(RichTextEditorEvent.SEARCH_FOUND);
        this.addValidEvent(RichTextEditorEvent.SEARCH_NOT_FOUND);
        this.addValidEvent(RichTextEditorEvent.REPLACE_DONE);
        this.addValidEvent(RichTextEditorEvent.HIGHLIGHT);
        this.addValidEvent(RichTextEditorEvent.UNHIGHLIGHT);
        this.addValidEvent(RichTextEditorEvent.PLUGIN_LOADED);
        this.addValidEvent(RichTextEditorEvent.PLUGIN_ERROR);

        // Lifecycle events
        this.addValidEvent(RichTextEditorEvent.CONTENT_SET);
        this.addValidEvent(RichTextEditorEvent.READY);
        this.addValidEvent(RichTextEditorEvent.DESTROY);
        this.addValidEvent(RichTextEditorEvent.MODE_CHANGE);
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
        this._focusValue = this.value;
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

        // Hide air toolbar on blur
        this._hideAirToolbar();

        this.fireEvent(FormElementEvent.BLUR, {
            value: this.value,
            originalEvent: event
        });

        // Fire CHANGE event if value changed since focus
        const currentValue = this.value;
        if (currentValue !== this._focusValue) {
            this.fireEvent(TextElementEvent.CHANGE, {
                value: currentValue,
                previousValue: this._focusValue,
                originalEvent: event
            });
        }
    }

    // =========================================================================
    // Internal helpers
    // =========================================================================

    /**
     * Detect list context at a given position.
     *
     * Returns listType ("bulletList", "orderedList", or null),
     * listDepth (nesting level, 0 if not in list), and isChecklist.
     *
     * @param {number} pos - Position in the document
     * @returns {{ listType: string|null, listDepth: number, isChecklist: boolean }}
     * @private
     */
    _getListContext(pos) {
        const doc = this._state.doc;
        if (!doc.children) return { listType: null, listDepth: 0, isChecklist: false };

        let accum = 0;
        for (let i = 0; i < doc.children.length; i++) {
            const child = doc.children[i];
            const childEnd = accum + child.nodeSize;

            if (pos >= accum && pos <= childEnd) {
                if (child.type === "bulletList" || child.type === "orderedList") {
                    // Check if any listItem has checked attribute (checklist)
                    let isChecklist = false;
                    if (child.children) {
                        isChecklist = child.children.some(
                            li => li.attrs && li.attrs.checked !== null && li.attrs.checked !== undefined
                        );
                    }
                    // Count nesting depth (for now, top-level is 1)
                    let depth = 1;
                    // Check for nested lists within the list item
                    if (child.children) {
                        let liAccum = accum + 1;
                        for (const li of child.children) {
                            const liEnd = liAccum + li.nodeSize;
                            if (pos >= liAccum && pos <= liEnd && li.children) {
                                // Check if any child of this listItem is a list (nested)
                                let innerAccum = liAccum + 1;
                                for (const inner of li.children) {
                                    const innerEnd = innerAccum + inner.nodeSize;
                                    if (pos >= innerAccum && pos <= innerEnd &&
                                        (inner.type === "bulletList" || inner.type === "orderedList")) {
                                        depth = 2;
                                    }
                                    innerAccum = innerEnd;
                                }
                            }
                            liAccum = liEnd;
                        }
                    }
                    return { listType: child.type, listDepth: depth, isChecklist };
                }
            }
            accum = childEnd;
        }
        return { listType: null, listDepth: 0, isChecklist: false };
    }

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
    // Dialog System
    // =========================================================================

    /**
     * Create a modal dialog inside the editor's shadow DOM.
     *
     * @param {object} config - Dialog configuration
     * @param {string} config.title - Dialog title text
     * @param {function} [config.renderBody] - Function receiving body container div
     * @param {string} [config.submitLabel='OK'] - Submit button label
     * @param {boolean} [config.showCancel=true] - Whether to show Cancel button
     * @returns {{ element: HTMLElement, body: HTMLElement, close: function, onSubmit: function }}
     * @private
     */
    _createDialog(config) {
        // Close any existing dialog
        this._closeDialog();

        const overlay = document.createElement('div');
        overlay.className = 'rte-dialog-overlay';

        const dialog = document.createElement('div');
        dialog.className = 'rte-dialog';
        dialog.setAttribute('role', 'dialog');
        dialog.setAttribute('aria-modal', 'true');
        dialog.setAttribute('aria-label', config.title || 'Dialog');

        // Header
        const header = document.createElement('div');
        header.className = 'rte-dialog-header';
        const titleEl = document.createElement('span');
        titleEl.className = 'rte-dialog-title';
        titleEl.textContent = config.title || '';
        header.appendChild(titleEl);
        const closeBtn = document.createElement('button');
        closeBtn.className = 'rte-dialog-close';
        closeBtn.type = 'button';
        closeBtn.textContent = '\u00D7';
        closeBtn.setAttribute('aria-label', 'Close');
        header.appendChild(closeBtn);
        dialog.appendChild(header);

        // Body
        const body = document.createElement('div');
        body.className = 'rte-dialog-body';
        dialog.appendChild(body);

        // Footer
        const footer = document.createElement('div');
        footer.className = 'rte-dialog-footer';
        let submitCallback = null;

        if (config.showCancel !== false) {
            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'secondary';
            cancelBtn.type = 'button';
            cancelBtn.textContent = 'Cancel';
            cancelBtn.addEventListener('click', () => close());
            footer.appendChild(cancelBtn);
        }

        const submitBtn = document.createElement('button');
        submitBtn.className = 'primary';
        submitBtn.type = 'button';
        submitBtn.textContent = config.submitLabel || 'OK';
        submitBtn.addEventListener('click', () => {
            if (submitCallback) submitCallback();
        });
        footer.appendChild(submitBtn);
        dialog.appendChild(footer);

        overlay.appendChild(dialog);

        // Render custom body content
        if (config.renderBody) {
            config.renderBody(body);
        }

        // Focus trap
        const _trapFocus = (e) => {
            if (e.key !== 'Tab') return;
            const focusable = dialog.querySelectorAll(
                'button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            if (focusable.length === 0) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (e.shiftKey) {
                if (document.activeElement === first || this.shadowRoot.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                }
            } else {
                if (document.activeElement === last || this.shadowRoot.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
        };

        // Escape to close
        const _handleKeydown = (e) => {
            if (e.key === 'Escape') {
                e.stopPropagation();
                close();
            }
            _trapFocus(e);
        };

        // Click backdrop to close
        overlay.addEventListener('mousedown', (e) => {
            if (e.target === overlay) close();
        });

        dialog.addEventListener('keydown', _handleKeydown);

        // Store reference and mount
        this._activeDialog = { overlay, dialog, cleanup: _handleKeydown };
        this._shell.appendChild(overlay);

        // Focus first input or submit button
        requestAnimationFrame(() => {
            const firstInput = dialog.querySelector('input, select, textarea');
            if (firstInput) {
                firstInput.focus();
            } else {
                submitBtn.focus();
            }
        });

        const close = () => this._closeDialog();

        return {
            element: dialog,
            body,
            close,
            onSubmit: (fn) => { submitCallback = fn; }
        };
    }

    /**
     * Close the active dialog and return focus to the editor.
     * @private
     */
    _closeDialog() {
        if (this._activeDialog) {
            const { overlay, dialog, cleanup } = this._activeDialog;
            dialog.removeEventListener('keydown', cleanup);
            if (overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
            this._activeDialog = null;
        }
        // Return focus to editor
        if (this._inputHandler) {
            this._inputHandler.focus();
        }
    }

    /**
     * Show the link dialog for inserting or editing a link.
     *
     * @param {object} [existingAttrs] - Existing link attributes for editing
     * @private
     */
    _showLinkDialog(existingAttrs) {
        const isEdit = !!(existingAttrs && existingAttrs.href);
        let urlInput, titleInput, targetSelect;

        const handle = this._createDialog({
            title: isEdit ? 'Edit Link' : 'Insert Link',
            renderBody: (body) => {
                // URL field
                const urlLabel = document.createElement('label');
                urlLabel.textContent = 'URL';
                urlInput = document.createElement('input');
                urlInput.type = 'text';
                urlInput.placeholder = 'https://example.com';
                urlInput.required = true;
                urlInput.value = (existingAttrs && existingAttrs.href) || '';
                urlLabel.appendChild(urlInput);
                body.appendChild(urlLabel);

                // Title field
                const titleLabel = document.createElement('label');
                titleLabel.textContent = 'Title';
                titleInput = document.createElement('input');
                titleInput.type = 'text';
                titleInput.placeholder = 'Link title (optional)';
                titleInput.value = (existingAttrs && existingAttrs.title) || '';
                titleLabel.appendChild(titleInput);
                body.appendChild(titleLabel);

                // Target field
                const targetLabel = document.createElement('label');
                targetLabel.textContent = 'Target';
                targetSelect = document.createElement('select');
                const options = [
                    { value: '', label: 'Same Window' },
                    { value: '_blank', label: 'New Tab' },
                    { value: '_self', label: '_self' },
                    { value: '_parent', label: '_parent' },
                    { value: '_top', label: '_top' }
                ];
                for (const opt of options) {
                    const el = document.createElement('option');
                    el.value = opt.value;
                    el.textContent = opt.label;
                    targetSelect.appendChild(el);
                }
                targetSelect.value = (existingAttrs && existingAttrs.target) || '';
                targetLabel.appendChild(targetSelect);
                body.appendChild(targetLabel);

                // Submit on Enter in URL or title inputs
                urlInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') { e.preventDefault(); submitLink(); }
                });
                titleInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') { e.preventDefault(); submitLink(); }
                });
            }
        });

        const submitLink = () => {
            const href = urlInput.value.trim();
            if (!href) return;

            // XSS prevention
            const decoded = _decodeHTMLEntities(href);
            if (DANGEROUS_URL_RE.test(decoded)) {
                urlInput.setCustomValidity('Invalid URL scheme');
                urlInput.reportValidity();
                return;
            }

            const attrs = {
                href,
                title: titleInput.value.trim() || null,
                target: targetSelect.value || null
            };

            this.formatText('link', attrs);
            handle.close();
        };

        handle.onSubmit(submitLink);
    }

    /**
     * Show the image dialog for inserting an image via URL.
     * @private
     */
    _showImageDialog() {
        let urlInput, altInput, widthInput, heightInput, previewEl;

        const handle = this._createDialog({
            title: 'Insert Image',
            renderBody: (body) => {
                // URL field
                const urlLabel = document.createElement('label');
                urlLabel.textContent = 'Image URL';
                urlInput = document.createElement('input');
                urlInput.type = 'text';
                urlInput.placeholder = 'https://example.com/image.png';
                urlInput.required = true;
                urlLabel.appendChild(urlInput);
                body.appendChild(urlLabel);

                // Alt text field
                const altLabel = document.createElement('label');
                altLabel.textContent = 'Alt Text';
                altInput = document.createElement('input');
                altInput.type = 'text';
                altInput.placeholder = 'Image description';
                altLabel.appendChild(altInput);
                body.appendChild(altLabel);

                // Dimensions row
                const dimRow = document.createElement('div');
                dimRow.style.cssText = 'display:flex;gap:12px;';

                const widthLabel = document.createElement('label');
                widthLabel.textContent = 'Width';
                widthLabel.style.flex = '1';
                widthInput = document.createElement('input');
                widthInput.type = 'number';
                widthInput.placeholder = 'auto';
                widthInput.min = '1';
                widthLabel.appendChild(widthInput);
                dimRow.appendChild(widthLabel);

                const heightLabel = document.createElement('label');
                heightLabel.textContent = 'Height';
                heightLabel.style.flex = '1';
                heightInput = document.createElement('input');
                heightInput.type = 'number';
                heightInput.placeholder = 'auto';
                heightInput.min = '1';
                heightLabel.appendChild(heightInput);
                dimRow.appendChild(heightLabel);

                body.appendChild(dimRow);

                // Preview area
                previewEl = document.createElement('div');
                previewEl.className = 'rte-dialog-preview';
                previewEl.style.cssText = 'margin-top:8px;min-height:60px;border:1px dashed var(--gooey-color-border,#ccc);border-radius:3px;display:flex;align-items:center;justify-content:center;overflow:hidden;';
                previewEl.textContent = 'Image preview';
                body.appendChild(previewEl);

                // Live preview on URL input
                urlInput.addEventListener('input', () => {
                    const src = urlInput.value.trim();
                    if (src) {
                        const img = document.createElement('img');
                        img.style.cssText = 'max-width:100%;max-height:120px;';
                        img.alt = 'Preview';
                        img.onload = () => {
                            previewEl.textContent = '';
                            previewEl.appendChild(img);
                        };
                        img.onerror = () => {
                            previewEl.textContent = 'Could not load image';
                        };
                        img.src = src;
                    } else {
                        previewEl.textContent = 'Image preview';
                    }
                });

                urlInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') { e.preventDefault(); submitImage(); }
                });
            }
        });

        const submitImage = () => {
            const src = urlInput.value.trim();
            if (!src) return;

            const attrs = {};
            const alt = altInput.value.trim();
            if (alt) attrs.alt = alt;
            const w = widthInput.value.trim();
            if (w) attrs.width = w;
            const h = heightInput.value.trim();
            if (h) attrs.height = h;

            this.insertImage(src, attrs);
            handle.close();
        };

        handle.onSubmit(submitImage);
    }

    /**
     * Show the table dialog with a visual grid picker.
     * @private
     */
    _showTableDialog() {
        let gridCells = [];
        let hoverRows = 0, hoverCols = 0;
        let rowsInput, colsInput, sizeLabel;
        const GRID_SIZE = 10;

        const handle = this._createDialog({
            title: 'Insert Table',
            submitLabel: 'Insert',
            renderBody: (body) => {
                // Grid picker
                const gridContainer = document.createElement('div');
                gridContainer.className = 'rte-table-grid';
                gridCells = [];
                for (let r = 0; r < GRID_SIZE; r++) {
                    for (let c = 0; c < GRID_SIZE; c++) {
                        const cell = document.createElement('div');
                        cell.className = 'rte-table-grid-cell';
                        cell.dataset.row = r;
                        cell.dataset.col = c;
                        cell.addEventListener('mouseenter', () => {
                            hoverRows = r + 1;
                            hoverCols = c + 1;
                            updateGridHighlight();
                            rowsInput.value = hoverRows;
                            colsInput.value = hoverCols;
                        });
                        cell.addEventListener('click', () => {
                            submitTable(r + 1, c + 1);
                        });
                        gridContainer.appendChild(cell);
                        gridCells.push(cell);
                    }
                }
                body.appendChild(gridContainer);

                // Size label
                sizeLabel = document.createElement('div');
                sizeLabel.className = 'rte-table-grid-label';
                sizeLabel.style.cssText = 'text-align:center;margin:6px 0;font-size:13px;color:var(--gooey-color-text-secondary,#666);';
                sizeLabel.textContent = '0 \u00D7 0';
                body.appendChild(sizeLabel);

                // Manual inputs
                const inputRow = document.createElement('div');
                inputRow.style.cssText = 'display:flex;gap:12px;margin-top:8px;';

                const rowsLabel = document.createElement('label');
                rowsLabel.textContent = 'Rows';
                rowsLabel.style.flex = '1';
                rowsInput = document.createElement('input');
                rowsInput.type = 'number';
                rowsInput.min = '1';
                rowsInput.max = '50';
                rowsInput.value = '3';
                rowsLabel.appendChild(rowsInput);
                inputRow.appendChild(rowsLabel);

                const colsLabel = document.createElement('label');
                colsLabel.textContent = 'Columns';
                colsLabel.style.flex = '1';
                colsInput = document.createElement('input');
                colsInput.type = 'number';
                colsInput.min = '1';
                colsInput.max = '20';
                colsInput.value = '3';
                colsLabel.appendChild(colsInput);
                inputRow.appendChild(colsLabel);

                body.appendChild(inputRow);

                // Reset grid on mouse leave
                gridContainer.addEventListener('mouseleave', () => {
                    hoverRows = 0;
                    hoverCols = 0;
                    updateGridHighlight();
                    sizeLabel.textContent = '0 \u00D7 0';
                });
            }
        });

        const updateGridHighlight = () => {
            for (const cell of gridCells) {
                const r = parseInt(cell.dataset.row, 10);
                const c = parseInt(cell.dataset.col, 10);
                if (r < hoverRows && c < hoverCols) {
                    cell.classList.add('highlighted');
                } else {
                    cell.classList.remove('highlighted');
                }
            }
            if (hoverRows > 0 && hoverCols > 0) {
                sizeLabel.textContent = `${hoverRows} \u00D7 ${hoverCols}`;
            }
        };

        const submitTable = (rows, cols) => {
            const r = rows || parseInt(rowsInput.value, 10) || 3;
            const c = cols || parseInt(colsInput.value, 10) || 3;
            this.insertTable(
                Math.max(1, Math.min(50, r)),
                Math.max(1, Math.min(20, c))
            );
            handle.close();
        };

        handle.onSubmit(() => submitTable());
    }

    /**
     * Show the special characters dialog with categorized character grids.
     * @private
     */
    _showSpecialCharsDialog() {
        const CATEGORIES = {
            'Common': '\u00A9 \u00AE \u2122 \u00A7 \u00B6 \u2020 \u2021 \u2022 \u2026 \u2014 \u2013 \u2018 \u2019 \u201C \u201D \u00AB \u00BB \u00B0 \u00B1 \u00D7 \u00F7 \u00AC \u00A2 \u00A3 \u00A5 \u20AC \u00A4',
            'Arrows': '\u2190 \u2191 \u2192 \u2193 \u2194 \u2195 \u21D0 \u21D1 \u21D2 \u21D3 \u21D4 \u21B5 \u2197 \u2198 \u2196 \u2199 \u27A1 \u2B05 \u2B06 \u2B07',
            'Math': '\u2200 \u2203 \u2205 \u2207 \u2208 \u2209 \u220B \u220F \u2211 \u221A \u221E \u2227 \u2228 \u2229 \u222A \u222B \u2234 \u2245 \u2248 \u2260 \u2261 \u2264 \u2265 \u2282 \u2283',
            'Currency': '\u0024 \u20AC \u00A3 \u00A5 \u00A2 \u20A3 \u20B9 \u20A9 \u20BD \u20BA \u20B1 \u20AB \u20AA \u20BF',
            'Greek': '\u0391 \u0392 \u0393 \u0394 \u0395 \u0396 \u0397 \u0398 \u0399 \u039A \u039B \u039C \u039D \u039E \u039F \u03A0 \u03A1 \u03A3 \u03A4 \u03A5 \u03A6 \u03A7 \u03A8 \u03A9 \u03B1 \u03B2 \u03B3 \u03B4 \u03B5 \u03B6 \u03B7 \u03B8 \u03B9 \u03BA \u03BB \u03BC \u03BD \u03BE \u03BF \u03C0 \u03C1 \u03C3 \u03C4 \u03C5 \u03C6 \u03C7 \u03C8 \u03C9',
            'Emoji': '\u2764 \u2605 \u2606 \u2714 \u2718 \u260E \u2709 \u270E \u270F \u2702 \u2660 \u2663 \u2665 \u2666 \u266A \u266B \u263A \u2639 \u2602 \u2603'
        };

        let activeCategory = 'Common';
        let charGrid;
        let categoryContainer;

        const handle = this._createDialog({
            title: 'Special Characters',
            showCancel: false,
            submitLabel: 'Close',
            renderBody: (body) => {
                // Category tabs
                categoryContainer = document.createElement('div');
                categoryContainer.className = 'rte-char-categories';
                for (const cat of Object.keys(CATEGORIES)) {
                    const btn = document.createElement('button');
                    btn.className = 'rte-char-category' + (cat === activeCategory ? ' active' : '');
                    btn.type = 'button';
                    btn.textContent = cat;
                    btn.addEventListener('click', () => {
                        activeCategory = cat;
                        renderCharGrid();
                        // Update active category button
                        for (const b of categoryContainer.children) {
                            b.classList.toggle('active', b.textContent === cat);
                        }
                    });
                    categoryContainer.appendChild(btn);
                }
                body.appendChild(categoryContainer);

                // Character grid
                charGrid = document.createElement('div');
                charGrid.className = 'rte-char-grid';
                body.appendChild(charGrid);
            }
        });

        const renderCharGrid = () => {
            charGrid.textContent = '';
            const chars = CATEGORIES[activeCategory].split(' ').filter(Boolean);
            for (const ch of chars) {
                const cell = document.createElement('div');
                cell.className = 'rte-char-cell';
                cell.textContent = ch;
                cell.title = `U+${ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}`;
                cell.addEventListener('click', () => {
                    this.insertText(ch);
                });
                charGrid.appendChild(cell);
            }
        };

        // Initial render
        renderCharGrid();

        // Close button just closes dialog
        handle.onSubmit(() => handle.close());
    }

    // =========================================================================
    // Link Popover
    // =========================================================================

    /**
     * Show a link popover near the specified link element.
     *
     * @param {object} linkMark - Link mark with attrs { href, title, target }
     * @param {{ top: number, left: number }} coords - Position coordinates relative to editor
     * @private
     */
    _showLinkPopover(linkMark, coords) {
        // Don't show while a dialog is open
        if (this._activeDialog) return;

        // Remove existing popover
        this._hideLinkPopover();

        const href = (linkMark.attrs && linkMark.attrs.href) || '';
        const popover = document.createElement('div');
        popover.className = 'rte-link-popover';

        // URL display
        const urlSpan = document.createElement('span');
        urlSpan.className = 'rte-link-popover-url';
        urlSpan.textContent = href.length > 40 ? href.slice(0, 37) + '...' : href;
        urlSpan.title = href;
        popover.appendChild(urlSpan);

        // Edit button
        const editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.textContent = 'Edit';
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this._hideLinkPopover();
            this._showLinkDialog(linkMark.attrs);
        });
        popover.appendChild(editBtn);

        // Open button
        const openBtn = document.createElement('button');
        openBtn.type = 'button';
        openBtn.textContent = 'Open';
        openBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (href) {
                window.open(href, '_blank', 'noopener');
            }
        });
        popover.appendChild(openBtn);

        // Unlink button
        const unlinkBtn = document.createElement('button');
        unlinkBtn.type = 'button';
        unlinkBtn.textContent = 'Unlink';
        unlinkBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this._hideLinkPopover();
            this.removeFormat('link');
        });
        popover.appendChild(unlinkBtn);

        // Position relative to editor area
        if (coords) {
            const editorRect = this._editorArea.getBoundingClientRect();
            popover.style.top = (coords.top - editorRect.top + 20) + 'px';
            popover.style.left = Math.max(0, coords.left - editorRect.left) + 'px';
        }

        this._editorArea.appendChild(popover);
        this._activeLinkPopover = popover;

        // Close on click outside (deferred to avoid immediate close)
        requestAnimationFrame(() => {
            this.shadowRoot.addEventListener('mousedown', this._handleDocClickBound);
        });
    }

    /**
     * Hide the active link popover.
     * @private
     */
    _hideLinkPopover() {
        if (this._activeLinkPopover) {
            if (this._activeLinkPopover.parentNode) {
                this._activeLinkPopover.parentNode.removeChild(this._activeLinkPopover);
            }
            this._activeLinkPopover = null;
            this.shadowRoot.removeEventListener('mousedown', this._handleDocClickBound);
        }
    }

    /**
     * Handle document clicks to dismiss popover and context menu.
     * @param {MouseEvent} e
     * @private
     */
    _handleDocClick(e) {
        // Close link popover if clicking outside it
        if (this._activeLinkPopover && !this._activeLinkPopover.contains(e.target)) {
            this._hideLinkPopover();
        }
        // Close context menu if clicking outside it
        if (this._activeContextMenu && !this._activeContextMenu.contains(e.target)) {
            this._hideTableContextMenu();
        }
    }

    /**
     * Check for link mark at cursor and show/hide popover accordingly.
     * Called from the dispatch method after TEXT_CURSOR_MOVE.
     * @private
     */
    _updateLinkPopover() {
        const activeMarks = getActiveMarks(this._state);
        const linkMark = activeMarks.find(m => m.type === 'link');

        if (linkMark) {
            // Show popover if not already showing
            if (!this._activeLinkPopover) {
                const coords = this._view.coordsAtPos(this._state.selection.head);
                if (coords) {
                    this._showLinkPopover(linkMark, coords);
                }
            }
        } else {
            // Hide popover if no link mark
            this._hideLinkPopover();
        }
    }

    // =========================================================================
    // Table Context Menu
    // =========================================================================

    /**
     * Handle contextmenu events on the editor content area.
     *
     * @param {MouseEvent} event
     * @private
     */
    _handleContextMenu(event) {
        // Check if the click target is inside a table cell
        const cell = event.target.closest('td, th');
        if (!cell) return; // Allow default browser context menu outside tables

        // Verify we are actually inside a table context in the model
        const tableInfo = _isInTable(this._state);
        if (!tableInfo) return;

        event.preventDefault();
        this._showTableContextMenu(event, tableInfo);
    }

    /**
     * Show a context menu for table operations.
     *
     * @param {MouseEvent} event - Mouse event for positioning
     * @param {object} tableContext - Table context info from _isInTable
     * @private
     */
    _showTableContextMenu(event, tableContext) {
        this._hideTableContextMenu();

        const menu = document.createElement('div');
        menu.className = 'rte-table-context-menu';

        const items = [
            { label: 'Insert Row Above', action: () => this.addRowBefore() },
            { label: 'Insert Row Below', action: () => this.addRowAfter() },
            { label: 'Insert Column Left', action: () => this.addColumnBefore() },
            { label: 'Insert Column Right', action: () => this.addColumnAfter() },
            { separator: true },
            { label: 'Delete Row', action: () => this.deleteRow() },
            { label: 'Delete Column', action: () => this.deleteColumn() },
            { separator: true },
            { label: 'Merge Cells', action: () => this.mergeCells(), disabled: false },
            { label: 'Split Cell', action: () => this.splitCell(), disabled: false },
            { separator: true },
            { label: 'Toggle Header Row', action: () => this.toggleHeaderRow() },
            { label: 'Toggle Header Column', action: () => this.toggleHeaderColumn() },
            { separator: true },
            { label: 'Delete Table', action: () => this.deleteTable() }
        ];

        for (const item of items) {
            if (item.separator) {
                const sep = document.createElement('div');
                sep.className = 'rte-context-separator';
                menu.appendChild(sep);
                continue;
            }

            const el = document.createElement('div');
            el.className = 'rte-context-item' + (item.disabled ? ' disabled' : '');
            el.textContent = item.label;

            if (!item.disabled) {
                el.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this._hideTableContextMenu();
                    item.action();
                });
            }

            menu.appendChild(el);
        }

        // Position at mouse coordinates relative to editor area
        const editorRect = this._editorArea.getBoundingClientRect();
        menu.style.position = 'absolute';
        menu.style.top = (event.clientY - editorRect.top) + 'px';
        menu.style.left = (event.clientX - editorRect.left) + 'px';

        this._editorArea.appendChild(menu);
        this._activeContextMenu = menu;

        // Close on click outside (deferred)
        requestAnimationFrame(() => {
            this.shadowRoot.addEventListener('mousedown', this._handleDocClickBound);
        });
    }

    /**
     * Hide the active table context menu.
     * @private
     */
    _hideTableContextMenu() {
        if (this._activeContextMenu) {
            if (this._activeContextMenu.parentNode) {
                this._activeContextMenu.parentNode.removeChild(this._activeContextMenu);
            }
            this._activeContextMenu = null;
            this.shadowRoot.removeEventListener('mousedown', this._handleDocClickBound);
        }
    }

    // =========================================================================
    // Source Edit Toggle
    // =========================================================================

    /**
     * Toggle between WYSIWYG and source editing mode.
     * Delegates to the SourceEditPlugin.
     * Fires MODE_CHANGE event.
     */
    toggleSourceEdit() {
        const sourcePlugin = this._pluginManager.getPlugin('sourceEdit');
        if (!sourcePlugin) return;

        sourcePlugin.toggle();

        const isSource = sourcePlugin.isSourceMode;
        this.fireEvent(RichTextEditorEvent.MODE_CHANGE, {
            mode: isSource ? 'source' : 'wysiwyg'
        });
    }

    /**
     * Check if the editor is in source editing mode.
     * @returns {boolean}
     */
    get isSourceMode() {
        const sourcePlugin = this._pluginManager.getPlugin('sourceEdit');
        return sourcePlugin ? sourcePlugin.isSourceMode : false;
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

    /**
     * Set up toolbar based on the toolbar attribute value.
     *
     * - "full": creates an internal RTEToolbar element
     * - "none": hides the toolbar area
     * - other string: treats as element ID for external toolbar binding
     *
     * @private
     */
    _setupToolbar() {
        const toolbarVal = this.getAttribute('toolbar') || 'full';

        if (toolbarVal === 'none') {
            // Hide toolbar slot area
            if (this._toolbar) {
                this._toolbar.style.display = 'none';
            }
            return;
        }

        if (toolbarVal === 'full') {
            // Create internal toolbar if not already created
            if (!this._internalToolbar && this._toolbar) {
                this._toolbar.style.display = '';

                // Create the toolbar element (will be available when dynamically loaded)
                const tb = document.createElement('gooeyui-rte-toolbar');
                tb.setAttribute('layout', 'full');
                this._toolbar.appendChild(tb);
                this._internalToolbar = tb;

                // Bind toolbar to this editor
                if (typeof tb._bindToEditor === 'function') {
                    tb._bindToEditor(this);
                } else {
                    // Toolbar not yet upgraded (customElements.define pending).
                    // Try binding after microtask.
                    Promise.resolve().then(() => {
                        if (typeof tb._bindToEditor === 'function') {
                            tb._bindToEditor(this);
                        }
                    });
                }

                // Sync air mode visibility
                this._syncAirMode();
            }
            return;
        }

        // Treat as element ID for external toolbar
        const externalToolbar = document.getElementById(toolbarVal);
        if (externalToolbar && typeof externalToolbar._bindToEditor === 'function') {
            externalToolbar._bindToEditor(this);
        } else {
            // Deferred lookup
            Promise.resolve().then(() => {
                const deferred = document.getElementById(toolbarVal);
                if (deferred && typeof deferred._bindToEditor === 'function') {
                    deferred._bindToEditor(this);
                }
            });
        }

        // Hide internal toolbar area when using external
        if (this._toolbar) {
            this._toolbar.style.display = 'none';
        }
    }

    /**
     * Tear down the current toolbar setup.
     * @private
     */
    _tearDownToolbar() {
        if (this._internalToolbar) {
            if (typeof this._internalToolbar._unbindFromEditor === 'function') {
                this._internalToolbar._unbindFromEditor();
            }
            this._internalToolbar.remove();
            this._internalToolbar = null;
        }
    }

    /**
     * Synchronize air mode visibility.
     * When air mode is active and toolbar is "full", hide the internal toolbar.
     * @private
     */
    _syncAirMode() {
        if (this._internalToolbar) {
            if (this.airMode) {
                this._internalToolbar.style.display = 'none';
            } else {
                this._internalToolbar.style.display = '';
            }
        }

        // Hide air toolbar when air mode is turned off
        if (!this.airMode) {
            this._hideAirToolbar();
        }
    }

    /**
     * Synchronize spellcheck attribute to the input sink textarea.
     * @private
     */
    _syncSpellcheck() {
        if (this._inputSink) {
            const val = this.getAttribute('spellcheck');
            this._inputSink.setAttribute('spellcheck', val !== 'false' ? 'true' : 'false');
        }
    }

    /**
     * Synchronize placeholder text with the PlaceholderPlugin.
     * @param {string} text - New placeholder text
     * @private
     */
    _syncPlaceholder(text) {
        if (this._pluginManager) {
            const placeholderPlugin = this._pluginManager.getPlugin('placeholder');
            if (placeholderPlugin && typeof placeholderPlugin.setPlaceholderText === 'function') {
                placeholderPlugin.setPlaceholderText(text || '');
            }
        }
    }

    /**
     * Update character and word count display in the status bar.
     * Called after each dispatch to keep counts current.
     * @private
     */
    _updateCounts() {
        if (!this._statusBar) return;

        const charCount = this.getLength();
        const wordCount = this.getWordCount();
        const ml = this.maxLength;

        // Update character count display
        if (ml >= 0) {
            this._charCountSpan.textContent = charCount + ' / ' + ml + ' characters';
        } else {
            this._charCountSpan.textContent = charCount + ' characters';
        }

        // Update word count display
        this._wordCountSpan.textContent = wordCount + ' ' + (wordCount === 1 ? 'word' : 'words');

        // Show status bar once counts are initialized
        this._statusBar.style.display = '';
    }

    /**
     * Extract plain text from a document node tree.
     * Adds spaces between block-level elements.
     *
     * @param {object} node - Document node
     * @returns {string}
     * @private
     */
    _getPlainText(node) {
        if (!node) return '';
        if (node.type === 'text') return node.text || '';
        if (!node.children || node.children.length === 0) return '';

        const parts = [];
        for (const child of node.children) {
            const childText = this._getPlainText(child);
            if (childText) parts.push(childText);
        }

        // Block-level nodes get space-separated
        const blockTypes = new Set([
            'doc', 'paragraph', 'heading', 'blockquote', 'codeBlock',
            'bulletList', 'orderedList', 'listItem', 'table',
            'tableRow', 'tableCell', 'tableHeaderCell'
        ]);
        return parts.join(blockTypes.has(node.type) ? ' ' : '');
    }

    // =========================================================================
    // Air Toolbar (floating toolbar on text selection)
    // =========================================================================

    /**
     * Show the air toolbar (floating formatting toolbar) above the current selection.
     * Creates the toolbar element if it doesn't exist, positions it near the selection.
     *
     * @param {{ top: number, left: number, bottom: number }} coords - Selection coordinates
     * @private
     */
    _showAirToolbar(coords) {
        if (!coords) return;

        // Create the air toolbar element if it doesn't exist
        if (!this._airToolbar) {
            this._airToolbar = document.createElement('div');
            this._airToolbar.className = 'rte-air-toolbar';
            this._airToolbar.setAttribute('role', 'toolbar');
            this._airToolbar.setAttribute('aria-label', 'Formatting toolbar');

            // Compact button set: bold, italic, underline, strikethrough, link, heading
            const airItems = [
                { name: 'bold', icon: 'bold', label: 'Bold', markType: 'bold' },
                { name: 'italic', icon: 'italic', label: 'Italic', markType: 'italic' },
                { name: 'underline', icon: 'underline', label: 'Underline', markType: 'underline' },
                { name: 'strikethrough', icon: 'strikethrough', label: 'Strikethrough', markType: 'strikethrough' },
                { name: 'link', icon: 'link', label: 'Link', action: 'link' },
                { name: 'heading', icon: 'heading', label: 'Heading', action: 'heading' }
            ];

            for (const item of airItems) {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'rte-tb-btn';
                btn.innerHTML = ICONS[item.icon] || '';
                btn.title = item.label;
                btn.setAttribute('aria-label', item.label);

                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    if (item.markType) {
                        this.formatText(item.markType);
                    } else if (item.action === 'link') {
                        this._handleLinkCommand(this._state, (tr) => this._dispatch(tr));
                    } else if (item.action === 'heading') {
                        // Toggle between paragraph and heading level 2
                        const blockType = this.getBlockType();
                        if (blockType === 'heading') {
                            this.setBlockType('paragraph');
                        } else {
                            this.setBlockType('heading', { level: 2 });
                        }
                    }

                    // Update air toolbar button states
                    this._updateAirToolbarState();
                });

                this._airToolbar.appendChild(btn);
            }

            this._editorArea.appendChild(this._airToolbar);
        }

        // Position above the selection
        const editorRect = this._editorArea.getBoundingClientRect();
        const toolbarHeight = 36; // Approximate height of the air toolbar
        const topPos = coords.top - editorRect.top - toolbarHeight - 6;
        const leftPos = Math.max(0, coords.left - editorRect.left);

        this._airToolbar.style.top = Math.max(0, topPos) + 'px';
        this._airToolbar.style.left = leftPos + 'px';
        this._airToolbar.style.display = 'flex';

        // Update button states
        this._updateAirToolbarState();
    }

    /**
     * Hide the air toolbar.
     * @private
     */
    _hideAirToolbar() {
        if (this._airToolbar) {
            this._airToolbar.style.display = 'none';
        }
    }

    /**
     * Update the active/inactive state of air toolbar buttons.
     * @private
     */
    _updateAirToolbarState() {
        if (!this._airToolbar || !this._state) return;

        const buttons = this._airToolbar.querySelectorAll('.rte-tb-btn');
        const markNames = ['bold', 'italic', 'underline', 'strikethrough', 'link'];

        buttons.forEach((btn, i) => {
            if (i < markNames.length) {
                const isActive = markActive(this._state, markNames[i]);
                btn.classList.toggle('active', isActive);
                btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
            } else {
                // Heading button
                const isHeading = this.getBlockType() === 'heading';
                btn.classList.toggle('active', isHeading);
                btn.setAttribute('aria-pressed', isHeading ? 'true' : 'false');
            }
        });
    }

    /**
     * Check if the current selection is a non-empty range (text is selected)
     * and show/hide the air toolbar accordingly. Called from _dispatch.
     * @private
     */
    _checkAirToolbar() {
        if (!this.airMode) return;

        const { anchor, head, empty } = this._state.selection;
        if (!empty && anchor !== head) {
            // Text is selected — show air toolbar
            const coords = this._view.coordsAtPos(Math.min(anchor, head));
            if (coords) {
                this._showAirToolbar(coords);
            }
        } else {
            // Cursor only, no range — hide air toolbar
            this._hideAirToolbar();
        }
    }

    /**
     * Get the total text character count of the document (excluding markup).
     * @param {object} node - Document or child node
     * @returns {number}
     * @private
     */
    _getTextLength(node) {
        if (!node) return 0;
        if (node.type === 'text') {
            return node.text ? node.text.length : 0;
        }
        if (node.children) {
            let total = 0;
            for (const child of node.children) {
                total += this._getTextLength(child);
            }
            return total;
        }
        return 0;
    }

    /**
     * Validate maxLength constraint and reject the transaction if exceeded.
     * Called during dispatch before state is applied.
     *
     * @param {object} tr - Transaction to check
     * @returns {boolean} true if the transaction should proceed
     * @private
     */
    _validateMaxLength(tr) {
        const ml = this.maxLength;
        if (ml < 0) return true; // No constraint

        // Apply the transaction tentatively to check length
        const newState = this._state.apply(tr);
        const newLength = this._getTextLength(newState.doc);
        return newLength <= ml;
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

        // Parse into a temporary DOM element
        const temp = document.createElement('div');
        temp.innerHTML = html;

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
