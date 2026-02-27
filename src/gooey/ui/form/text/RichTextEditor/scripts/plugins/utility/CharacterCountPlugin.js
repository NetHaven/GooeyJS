/**
 * CharacterCountPlugin exposes character and word count via the stateDidUpdate hook.
 *
 * On every state update, walks the document tree to count characters and words.
 * Fires a 'charactercount' event on the editor with { characters, words } data.
 * Provides getCharacterCount() and getWordCount() public methods for querying.
 */


export default class CharacterCountPlugin {

    static get pluginName() {
        return "characterCount";
    }

    constructor() {
        /** @type {object|null} */
        this._editor = null;

        /** @type {number} */
        this._characterCount = 0;

        /** @type {number} */
        this._wordCount = 0;
    }

    /**
     * Called when plugin is registered with the editor.
     * @param {object} editor - RichTextEditor instance
     */
    init(editor) {
        this._editor = editor;

        // Initial count from current state
        if (editor._state) {
            this._updateCounts(editor._state);
        }
    }

    /**
     * React after a new state is applied.
     * Recalculates character and word counts.
     *
     * @param {object} newState - New EditorState
     * @param {object} oldState - Previous EditorState
     */
    stateDidUpdate(newState, oldState) {
        this._updateCounts(newState);
    }

    /**
     * Get the current character count.
     * @returns {number}
     */
    getCharacterCount() {
        return this._characterCount;
    }

    /**
     * Get the current word count.
     * @returns {number}
     */
    getWordCount() {
        return this._wordCount;
    }

    /**
     * Cleanup when plugin is unregistered.
     */
    destroy() {
        this._editor = null;
        this._characterCount = 0;
        this._wordCount = 0;
    }

    // =========================================================================
    // Private
    // =========================================================================

    /**
     * Walk the document tree to count characters and words.
     * Fires 'charactercount' event on the editor.
     *
     * @param {object} state - EditorState
     * @private
     */
    _updateCounts(state) {
        const doc = state.doc;
        const text = _extractText(doc);

        this._characterCount = text.length;
        this._wordCount = _countWords(text);

        // Fire event on editor
        if (this._editor && typeof this._editor.fireEvent === "function") {
            this._editor.fireEvent("charactercount", {
                characters: this._characterCount,
                words: this._wordCount
            });
        }
    }
}


// =============================================================================
// Private helpers
// =============================================================================

/**
 * Extract all text content from a document tree.
 * Adds spaces between block-level elements to separate words.
 *
 * @param {object} node - Document node
 * @returns {string}
 */
function _extractText(node) {
    if (!node) return "";

    if (node.type === "text") {
        return node.text || "";
    }

    if (!node.children || node.children.length === 0) {
        return "";
    }

    const parts = [];
    for (const child of node.children) {
        const childText = _extractText(child);
        if (childText) {
            parts.push(childText);
        }
    }

    // Join block-level children with spaces (paragraphs, headings, etc.)
    // Text nodes within the same block are joined directly
    if (node.type !== "text" && node.children !== null) {
        const isBlock = _isBlockType(node.type);
        return parts.join(isBlock ? " " : "");
    }

    return parts.join("");
}

/**
 * Count words in a text string.
 * Splits on whitespace and filters empty strings.
 *
 * @param {string} text
 * @returns {number}
 */
function _countWords(text) {
    if (!text || text.trim().length === 0) return 0;
    return text.trim().split(/\s+/).length;
}

/**
 * Check if a node type is a block-level type.
 * @param {string} type - Node type name
 * @returns {boolean}
 */
function _isBlockType(type) {
    const blockTypes = new Set([
        "doc", "paragraph", "heading", "blockquote", "codeBlock",
        "bulletList", "orderedList", "listItem", "table",
        "tableRow", "tableCell", "tableHeaderCell"
    ]);
    return blockTypes.has(type);
}
