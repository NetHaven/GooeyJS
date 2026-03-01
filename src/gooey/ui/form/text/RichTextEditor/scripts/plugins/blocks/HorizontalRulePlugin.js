/**
 * HorizontalRulePlugin provides a toolbar item for inserting a horizontal
 * rule in the RichTextEditor.
 *
 * Wraps the insertHorizontalRule command from Commands.js.
 * No keybinding is assigned.
 */

import { insertHorizontalRule } from "../../state/Commands.js";
import Plugin from "../Plugin.js";


export default class HorizontalRulePlugin extends Plugin {

    static pluginName = "horizontalRule";

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

}
