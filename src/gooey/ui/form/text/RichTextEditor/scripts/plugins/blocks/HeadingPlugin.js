/**
 * HeadingPlugin provides heading level keybindings (Mod-Alt-1 through Mod-Alt-6)
 * and toolbar items for heading insertion in the RichTextEditor.
 *
 * Wraps the heading() command factory from Commands.js.
 */

import { heading } from "../../state/Commands.js";


export default class HeadingPlugin {

    static pluginName = "heading";

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
     * Mod-Alt-1 through Mod-Alt-6 set the block type to the
     * corresponding heading level.
     *
     * @returns {object} Keymap bindings object
     */
    keymap() {
        return {
            "Mod-Alt-1": heading(1),
            "Mod-Alt-2": heading(2),
            "Mod-Alt-3": heading(3),
            "Mod-Alt-4": heading(4),
            "Mod-Alt-5": heading(5),
            "Mod-Alt-6": heading(6)
        };
    }

    /**
     * Return toolbar item descriptors for heading insertion.
     *
     * Provides a dropdown with H1-H6 options.
     *
     * @returns {Array<object>}
     */
    toolbarItems() {
        return [{
            name: "heading",
            type: "dropdown",
            label: "Heading",
            icon: "heading",
            items: [
                { name: "heading1", command: heading(1), label: "Heading 1", icon: "h1" },
                { name: "heading2", command: heading(2), label: "Heading 2", icon: "h2" },
                { name: "heading3", command: heading(3), label: "Heading 3", icon: "h3" },
                { name: "heading4", command: heading(4), label: "Heading 4", icon: "h4" },
                { name: "heading5", command: heading(5), label: "Heading 5", icon: "h5" },
                { name: "heading6", command: heading(6), label: "Heading 6", icon: "h6" }
            ]
        }];
    }

    /**
     * Clean up plugin resources.
     */
    destroy() {
        this._editor = null;
    }
}
