/**
 * ListKeymapPlugin provides context-sensitive keyboard overrides for
 * list editing in the RichTextEditor.
 *
 * Uses chainCommands to compose fallback behavior:
 * - Tab: list indent, then 2-space insertion
 * - Shift-Tab: list outdent
 * - Enter: split list item, then split block
 * - Backspace: lift list item, then normal delete
 *
 * NOTE: Tab is also handled by TablePlugin for cell navigation.
 * Priority resolution happens in the PluginManager's collectKeymaps
 * (Plan 09), where TablePlugin's Tab binding takes priority.
 */

import {
    listIndent,
    listOutdent,
    splitListItem,
    liftListItem,
    chainCommands,
    splitBlock,
    deleteBackward,
    insertText
} from "../../state/Commands.js";


export default class ListKeymapPlugin {

    static pluginName = "listKeymap";

    /**
     * Initialize the plugin with an editor reference.
     * @param {object} editor - RichTextEditor component instance
     */
    init(editor) {
        this._editor = editor;
    }

    /**
     * Return the keymap contributed by this plugin.
     *
     * Provides context-sensitive overrides for list editing using
     * chainCommands. Each key tries the list-specific command first;
     * if it returns false (not in a list context), falls through to
     * the generic editing command.
     *
     * @returns {object} Keymap bindings object
     */
    keymap() {
        return {
            "Tab": chainCommands(listIndent, insertText("  ")),
            "Shift-Tab": listOutdent,
            "Enter": chainCommands(splitListItem, splitBlock),
            "Backspace": chainCommands(liftListItem, deleteBackward)
        };
    }

    /**
     * ListKeymapPlugin provides no toolbar items (keymap overrides only).
     *
     * @returns {Array<object>} Empty array
     */
    toolbarItems() {
        return [];
    }

    /**
     * Clean up plugin resources.
     */
    destroy() {
        this._editor = null;
    }
}
