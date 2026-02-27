/**
 * AlignmentPlugin provides text alignment toolbar buttons for left, center,
 * right, and justify alignment in the RichTextEditor.
 *
 * Wraps the setAlignment() command factory from Commands.js.
 */

import { setAlignment } from "../../state/Commands.js";


export default class AlignmentPlugin {

    static pluginName = "alignment";

    /**
     * Initialize the plugin with an editor reference.
     * @param {object} editor - RichTextEditor component instance
     */
    init(editor) {
        this._editor = editor;
    }

    /**
     * Return toolbar item descriptors for text alignment.
     *
     * Provides 4 buttons: left, center, right, justify.
     * Each button is marked active when the current block has
     * the corresponding alignment attribute.
     *
     * @returns {Array<object>}
     */
    toolbarItems() {
        return [
            {
                name: "alignLeft",
                type: "button",
                command: setAlignment("left"),
                isActive: (state) => this._getAlignment(state) === "left",
                label: "Align Left",
                icon: "alignLeft",
                group: "alignment"
            },
            {
                name: "alignCenter",
                type: "button",
                command: setAlignment("center"),
                isActive: (state) => this._getAlignment(state) === "center",
                label: "Align Center",
                icon: "alignCenter",
                group: "alignment"
            },
            {
                name: "alignRight",
                type: "button",
                command: setAlignment("right"),
                isActive: (state) => this._getAlignment(state) === "right",
                label: "Align Right",
                icon: "alignRight",
                group: "alignment"
            },
            {
                name: "alignJustify",
                type: "button",
                command: setAlignment("justify"),
                isActive: (state) => this._getAlignment(state) === "justify",
                label: "Justify",
                icon: "alignJustify",
                group: "alignment"
            }
        ];
    }

    /**
     * Resolve the current block's alignment attribute from the editor state.
     *
     * Uses doc.resolve() to find the parent block at the cursor position
     * and reads its `align` attribute.
     *
     * @param {object} state - EditorState
     * @returns {string|null} Alignment value or null if unset
     * @private
     */
    _getAlignment(state) {
        try {
            const $from = state.doc.resolve(state.selection.from);
            return $from.parent.attrs.align || null;
        } catch (e) {
            return null;
        }
    }

    /**
     * Clean up plugin resources.
     */
    destroy() {
        this._editor = null;
    }
}
