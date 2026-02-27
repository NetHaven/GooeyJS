/**
 * OrderedListPlugin provides the Mod-Shift-7 keybinding for toggling
 * ordered lists and a toolbar item for ordered list insertion.
 *
 * Wraps the toggleOrderedList command from Commands.js.
 */

import { toggleOrderedList } from "../../state/Commands.js";


export default class OrderedListPlugin {

    static pluginName = "orderedList";

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
     * Mod-Shift-7 toggles an ordered list on the current selection.
     *
     * @returns {object} Keymap bindings object
     */
    keymap() {
        return {
            "Mod-Shift-7": toggleOrderedList
        };
    }

    /**
     * Return toolbar item descriptors for ordered list toggling.
     *
     * @returns {Array<object>}
     */
    toolbarItems() {
        return [{
            name: "orderedList",
            type: "button",
            command: toggleOrderedList,
            label: "Ordered List",
            icon: "orderedList"
        }];
    }

    /**
     * Clean up plugin resources.
     */
    destroy() {
        this._editor = null;
    }
}
