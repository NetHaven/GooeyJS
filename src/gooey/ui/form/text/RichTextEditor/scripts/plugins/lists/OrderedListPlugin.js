/**
 * OrderedListPlugin provides the Mod-Shift-7 keybinding for toggling
 * ordered lists and a toolbar item for ordered list insertion.
 *
 * Wraps the toggleOrderedList command from Commands.js.
 */

import { toggleOrderedList } from "../../state/Commands.js";
import Plugin from "../Plugin.js";


export default class OrderedListPlugin extends Plugin {

    static pluginName = "orderedList";

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

}
