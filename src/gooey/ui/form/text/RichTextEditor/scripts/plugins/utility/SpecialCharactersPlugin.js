/**
 * SpecialCharactersPlugin provides a toolbar button for inserting special characters.
 *
 * The command opens the editor's special characters dialog, which shows
 * categorized character grids for browsing and inserting symbols.
 *
 * Uses init(editor) to store the editor reference for the dialog command.
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
                command: () => this._openSpecialCharsDialog()
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
     * Open the special characters dialog on the editor.
     *
     * Delegates to the editor's _showSpecialCharsDialog method which
     * provides a full categorized character picker UI.
     *
     * @private
     */
    _openSpecialCharsDialog() {
        if (!this._editor) return;

        if (typeof this._editor._showSpecialCharsDialog === "function") {
            this._editor._showSpecialCharsDialog();
        }
    }
}
