/**
 * BlockquotePlugin provides the Mod-Shift-B keybinding for wrapping
 * content in a blockquote and a toolbar item for blockquote insertion.
 *
 * Wraps the wrapInBlockquote command from Commands.js.
 */

import { wrapInBlockquote } from "../../state/Commands.js";
import Plugin from "../Plugin.js";


export default class BlockquotePlugin extends Plugin {

    static pluginName = "blockquote";

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

}
