/**
 * HorizontalRulePlugin provides a toolbar item for inserting a horizontal
 * rule in the RichTextEditor.
 *
 * Wraps the insertHorizontalRule command from Commands.js.
 * No keybinding is assigned.
 */

import { insertHorizontalRule } from "../../state/Commands.js";


export default class HorizontalRulePlugin {

    static pluginName = "horizontalRule";

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
     * HorizontalRulePlugin has no keybindings.
     *
     * @returns {object} Empty keymap
     */
    keymap() {
        return {};
    }

    /**
     * Return toolbar item descriptors for horizontal rule insertion.
     *
     * @returns {Array<object>}
     */
    toolbarItems() {
        return [{
            name: "horizontalRule",
            type: "button",
            command: insertHorizontalRule,
            label: "Horizontal Rule",
            icon: "horizontalRule"
        }];
    }

    /**
     * Clean up plugin resources.
     */
    destroy() {
        this._editor = null;
    }
}
