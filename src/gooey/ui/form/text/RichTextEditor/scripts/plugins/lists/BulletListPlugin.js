/**
 * BulletListPlugin provides the Mod-Shift-8 keybinding for toggling
 * bullet lists and a toolbar item for bullet list insertion.
 *
 * Wraps the toggleBulletList command from Commands.js.
 */

import { toggleBulletList } from "../../state/Commands.js";
import Plugin from "../Plugin.js";


export default class BulletListPlugin extends Plugin {

    static pluginName = "bulletList";

    /**
     * Return the keymap contributed by this plugin.
     *
     * Mod-Shift-8 toggles a bullet list on the current selection.
     *
     * @returns {object} Keymap bindings object
     */
    keymap() {
        return {
            "Mod-Shift-8": toggleBulletList
        };
    }

    /**
     * Return toolbar item descriptors for bullet list toggling.
     *
     * @returns {Array<object>}
     */
    toolbarItems() {
        return [{
            name: "bulletList",
            type: "button",
            command: toggleBulletList,
            label: "Bullet List",
            icon: "bulletList"
        }];
    }

}
