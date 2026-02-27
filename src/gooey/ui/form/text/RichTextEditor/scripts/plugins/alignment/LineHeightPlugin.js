/**
 * LineHeightPlugin provides a toolbar dropdown for setting line height
 * on blocks in the RichTextEditor.
 *
 * Wraps the setLineHeight() command factory from Commands.js.
 * Offers common line height values: 1, 1.15, 1.5, 2, 2.5, 3.
 */

import { setLineHeight } from "../../state/Commands.js";


export default class LineHeightPlugin {

    static pluginName = "lineHeight";

    /**
     * Initialize the plugin with an editor reference.
     * @param {object} editor - RichTextEditor component instance
     */
    init(editor) {
        this._editor = editor;
    }

    /**
     * Return toolbar item descriptors for line height.
     *
     * Provides a dropdown with common line height values.
     * Includes a "Default" option that resets line height to null.
     *
     * @returns {Array<object>}
     */
    toolbarItems() {
        return [{
            name: "lineHeight",
            type: "dropdown",
            label: "Line Height",
            icon: "lineHeight",
            items: [
                { name: "lineHeight-default", command: setLineHeight(null), label: "Default", value: null },
                { name: "lineHeight-1", command: setLineHeight("1"), label: "1", value: "1" },
                { name: "lineHeight-1.15", command: setLineHeight("1.15"), label: "1.15", value: "1.15" },
                { name: "lineHeight-1.5", command: setLineHeight("1.5"), label: "1.5", value: "1.5" },
                { name: "lineHeight-2", command: setLineHeight("2"), label: "2", value: "2" },
                { name: "lineHeight-2.5", command: setLineHeight("2.5"), label: "2.5", value: "2.5" },
                { name: "lineHeight-3", command: setLineHeight("3"), label: "3", value: "3" }
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
