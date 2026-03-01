/**
 * ChecklistPlugin provides a toolbar item for toggling checklist
 * formatting in the RichTextEditor.
 *
 * Wraps the toggleChecklist command from Commands.js.
 * No keybinding is assigned.
 */

import { toggleChecklist } from "../../state/Commands.js";
import Plugin from "../Plugin.js";


export default class ChecklistPlugin extends Plugin {

    static pluginName = "checklist";

    /**
     * Return the keymap contributed by this plugin.
     *
     * ChecklistPlugin has no keybindings.
     *
     * @returns {object} Empty keymap
     */
    keymap() {
        return {};
    }

    /**
     * Return toolbar item descriptors for checklist toggling.
     *
     * @returns {Array<object>}
     */
    toolbarItems() {
        return [{
            name: "checklist",
            type: "button",
            command: toggleChecklist,
            label: "Checklist",
            icon: "checklist"
        }];
    }

}
