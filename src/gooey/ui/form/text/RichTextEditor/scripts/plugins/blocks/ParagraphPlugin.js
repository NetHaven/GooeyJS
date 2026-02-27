/**
 * ParagraphPlugin provides the Mod-Alt-0 keybinding for converting
 * blocks to paragraphs and a toolbar item for paragraph insertion.
 *
 * Wraps the paragraph command from Commands.js.
 */

import { paragraph } from "../../state/Commands.js";


export default class ParagraphPlugin {

    static pluginName = "paragraph";

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
     * Mod-Alt-0 converts the current block to a paragraph.
     *
     * @returns {object} Keymap bindings object
     */
    keymap() {
        return {
            "Mod-Alt-0": paragraph
        };
    }

    /**
     * Return toolbar item descriptors for paragraph insertion.
     *
     * @returns {Array<object>}
     */
    toolbarItems() {
        return [{
            name: "paragraph",
            type: "button",
            command: paragraph,
            label: "Paragraph",
            icon: "paragraph"
        }];
    }

    /**
     * Clean up plugin resources.
     */
    destroy() {
        this._editor = null;
    }
}
