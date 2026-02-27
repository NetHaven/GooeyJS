/**
 * BlockquotePlugin provides the Mod-Shift-B keybinding for wrapping
 * content in a blockquote and a toolbar item for blockquote insertion.
 *
 * Wraps the wrapInBlockquote command from Commands.js.
 */

import { wrapInBlockquote } from "../../state/Commands.js";


export default class BlockquotePlugin {

    static pluginName = "blockquote";

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
     * Mod-Shift-B wraps the current selection in a blockquote.
     *
     * @returns {object} Keymap bindings object
     */
    keymap() {
        return {
            "Mod-Shift-B": wrapInBlockquote
        };
    }

    /**
     * Return toolbar item descriptors for blockquote insertion.
     *
     * @returns {Array<object>}
     */
    toolbarItems() {
        return [{
            name: "blockquote",
            type: "button",
            command: wrapInBlockquote,
            label: "Blockquote",
            icon: "blockquote"
        }];
    }

    /**
     * Clean up plugin resources.
     */
    destroy() {
        this._editor = null;
    }
}
