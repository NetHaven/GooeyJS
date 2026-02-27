/**
 * SpecialCharactersPlugin provides a toolbar button for inserting special characters.
 *
 * The command opens a dialog (placeholder implementation -- full UI comes in Phase 41).
 * For now, the command inserts a character using a simple window.prompt() fallback.
 *
 * Uses init(editor) to store the editor reference for the insert command.
 */


export default class SpecialCharactersPlugin {

    static get pluginName() {
        return "specialCharacters";
    }

    constructor() {
        /** @type {object|null} */
        this._editor = null;
    }

    /**
     * Called when plugin is registered with the editor.
     * @param {object} editor - RichTextEditor instance
     */
    init(editor) {
        this._editor = editor;
    }

    /**
     * Return toolbar item descriptors for the special characters button.
     * @returns {Array<object>}
     */
    toolbarItems() {
        return [
            {
                name: "specialCharacters",
                type: "button",
                label: "Special Characters",
                icon: "specialCharacters",
                command: () => this._insertSpecialCharacter()
            }
        ];
    }

    /**
     * Cleanup when plugin is unregistered.
     */
    destroy() {
        this._editor = null;
    }

    // =========================================================================
    // Private
    // =========================================================================

    /**
     * Prompt the user for a special character and insert it at the cursor.
     *
     * This is a placeholder implementation using window.prompt().
     * Phase 41 will provide a proper character picker dialog UI.
     *
     * @private
     */
    _insertSpecialCharacter() {
        if (!this._editor) return;

        const char = window.prompt("Enter special character:");
        if (!char) return;

        const state = this._editor._state;
        if (!state) return;

        const tr = state.transaction;
        const { from, to } = state.selection;

        // Replace selection (or insert at cursor) with the character
        tr.replaceWith(from, to, state.schema
            ? state.schema.text(char)
            : _createTextNode(char)
        );

        if (typeof this._editor._dispatch === "function") {
            this._editor._dispatch(tr);
        }
    }
}


// =============================================================================
// Private helpers
// =============================================================================

/**
 * Create a plain text node (fallback when schema is not available).
 * @param {string} text
 * @returns {object}
 */
function _createTextNode(text) {
    return Object.freeze({
        type: "text",
        text,
        attrs: Object.freeze({}),
        marks: Object.freeze([]),
        children: null,
        get nodeSize() { return text.length; },
        get contentSize() { return text.length; },
        get isText() { return true; },
        get isLeaf() { return false; },
        get textContent() { return text; }
    });
}
