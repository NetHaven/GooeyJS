/**
 * CodeBlockPlugin provides a toolbar item for toggling code block
 * formatting in the RichTextEditor.
 *
 * Wraps the toggleCodeBlock command from Commands.js.
 * No keybinding is assigned.
 */

import { toggleCodeBlock } from "../../state/Commands.js";


export default class CodeBlockPlugin {

    static pluginName = "codeBlock";

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
     * CodeBlockPlugin has no keybindings.
     *
     * @returns {object} Empty keymap
     */
    keymap() {
        return {};
    }

    /**
     * Return toolbar item descriptors for code block toggling.
     *
     * @returns {Array<object>}
     */
    toolbarItems() {
        return [{
            name: "codeBlock",
            type: "button",
            command: toggleCodeBlock,
            label: "Code Block",
            icon: "codeBlock"
        }];
    }

    /**
     * Clean up plugin resources.
     */
    destroy() {
        this._editor = null;
    }
}
