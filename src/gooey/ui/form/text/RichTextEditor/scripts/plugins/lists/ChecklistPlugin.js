/**
 * ChecklistPlugin provides a toolbar item for toggling checklist
 * formatting in the RichTextEditor.
 *
 * Wraps the toggleChecklist command from Commands.js.
 * No keybinding is assigned.
 */

import { toggleChecklist } from "../../state/Commands.js";


export default class ChecklistPlugin {

    static pluginName = "checklist";

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

    /**
     * Clean up plugin resources.
     */
    destroy() {
        this._editor = null;
    }
}
