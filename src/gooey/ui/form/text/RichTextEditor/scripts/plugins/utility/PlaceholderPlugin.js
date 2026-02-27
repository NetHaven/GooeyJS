/**
 * PlaceholderPlugin shows placeholder text when the editor is empty.
 *
 * Uses the stateDidUpdate(newState, oldState) hook to check document
 * emptiness after each state change. When the document contains only
 * a single empty paragraph (contentSize <= 2), the placeholder element
 * is shown. Otherwise it is hidden.
 *
 * The placeholder text is read from the editor's `placeholder` attribute
 * or from constructor options.
 */


export default class PlaceholderPlugin {

    static get pluginName() {
        return "placeholder";
    }

    /**
     * @param {object} [options]
     * @param {string} [options.text] - Placeholder text to display
     */
    constructor(options = {}) {
        /** @type {string} */
        this._text = options.text || "";

        /** @type {HTMLElement|null} */
        this._placeholderEl = null;

        /** @type {object|null} */
        this._editor = null;
    }

    /**
     * Called when plugin is registered with the editor.
     * Reads placeholder text from editor attribute if not set via options.
     * Creates the placeholder DOM element.
     *
     * @param {object} editor - RichTextEditor instance
     */
    init(editor) {
        this._editor = editor;

        // Read placeholder text from editor attribute if not set in options
        if (!this._text && editor.getAttribute) {
            this._text = editor.getAttribute("placeholder") || "";
        }

        // Create placeholder element
        this._placeholderEl = document.createElement("div");
        this._placeholderEl.className = "rte-placeholder";
        this._placeholderEl.textContent = this._text;
        this._placeholderEl.style.display = "none";

        // Append to editor area
        const editorArea = editor._editorArea;
        if (editorArea) {
            editorArea.appendChild(this._placeholderEl);
        }

        // Initial check
        if (editor._state) {
            this._updateVisibility(editor._state);
        }
    }

    /**
     * React after a new state is applied.
     * Shows or hides placeholder based on document emptiness.
     *
     * @param {object} newState - New EditorState
     * @param {object} oldState - Previous EditorState
     */
    stateDidUpdate(newState, oldState) {
        this._updateVisibility(newState);
    }

    /**
     * Update the placeholder text.
     * @param {string} text - New placeholder text
     */
    setPlaceholderText(text) {
        this._text = text;
        if (this._placeholderEl) {
            this._placeholderEl.textContent = text;
        }
    }

    /**
     * Get the current placeholder text.
     * @returns {string}
     */
    getPlaceholderText() {
        return this._text;
    }

    /**
     * Cleanup when plugin is unregistered.
     * Removes the placeholder element from the DOM.
     */
    destroy() {
        if (this._placeholderEl && this._placeholderEl.parentNode) {
            this._placeholderEl.parentNode.removeChild(this._placeholderEl);
        }
        this._placeholderEl = null;
        this._editor = null;
    }

    // =========================================================================
    // Private
    // =========================================================================

    /**
     * Show or hide the placeholder based on document emptiness.
     *
     * A document is considered empty if it has a single child paragraph
     * with no text content (contentSize <= 2 means just opening + closing
     * boundaries of one paragraph).
     *
     * @param {object} state - EditorState
     * @private
     */
    _updateVisibility(state) {
        if (!this._placeholderEl) return;

        const doc = state.doc;
        const isEmpty = _isDocEmpty(doc);

        this._placeholderEl.style.display = isEmpty ? "" : "none";
    }
}


// =============================================================================
// Private helpers
// =============================================================================

/**
 * Check if a document is effectively empty.
 *
 * Empty means: single paragraph child with no text content,
 * or contentSize <= 2 (just one empty container node).
 *
 * @param {object} doc - Document node
 * @returns {boolean}
 */
function _isDocEmpty(doc) {
    if (!doc || !doc.children) return true;
    if (doc.children.length === 0) return true;

    // Single empty paragraph is the "empty" state
    if (doc.children.length === 1) {
        const child = doc.children[0];
        if (child.type === "paragraph") {
            if (!child.children || child.children.length === 0) return true;
            if (child.textContent === "") return true;
        }
    }

    // Also check via contentSize (doc with contentSize <= 2 is essentially empty)
    if (doc.contentSize <= 2) return true;

    return false;
}
