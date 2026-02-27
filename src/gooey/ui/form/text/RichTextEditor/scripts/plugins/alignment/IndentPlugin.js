/**
 * IndentPlugin provides indentation keybindings and toolbar buttons
 * for the RichTextEditor.
 *
 * Wraps the increaseIndent and decreaseIndent commands from Commands.js.
 * Provides Mod-] to increase and Mod-[ to decrease block indentation.
 */

import { increaseIndent, decreaseIndent } from "../../state/Commands.js";


export default class IndentPlugin {

    static pluginName = "indent";

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
     * Mod-] increases indentation, Mod-[ decreases indentation.
     *
     * @returns {object} Keymap bindings object
     */
    keymap() {
        return {
            "Mod-]": increaseIndent,
            "Mod-[": decreaseIndent
        };
    }

    /**
     * Return toolbar item descriptors for indentation.
     *
     * Provides 2 buttons: increase indent and decrease indent.
     *
     * @returns {Array<object>}
     */
    toolbarItems() {
        return [
            {
                name: "increaseIndent",
                type: "button",
                command: increaseIndent,
                label: "Increase Indent",
                icon: "indentIncrease",
                group: "indent"
            },
            {
                name: "decreaseIndent",
                type: "button",
                command: decreaseIndent,
                label: "Decrease Indent",
                icon: "indentDecrease",
                group: "indent"
            }
        ];
    }

    /**
     * Clean up plugin resources.
     */
    destroy() {
        this._editor = null;
    }
}
