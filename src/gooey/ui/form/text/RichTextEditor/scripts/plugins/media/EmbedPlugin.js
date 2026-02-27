/**
 * EmbedPlugin provides a toolbar button for inserting embed nodes
 * in the RichTextEditor.
 *
 * Wraps the insertEmbed() command factory from MediaCommands.js.
 * The command is a factory that accepts (url, attrs) and returns a
 * (state, dispatch) => boolean command. The actual URL prompt is
 * handled at the UI layer.
 */

import { insertEmbed } from "../../commands/MediaCommands.js";


export default class EmbedPlugin {

    static pluginName = "embed";

    /**
     * Initialize the plugin with an editor reference.
     * @param {object} editor - RichTextEditor component instance
     */
    init(editor) {
        this._editor = editor;
    }

    /**
     * Return toolbar item descriptors for embed insertion.
     *
     * Provides a single button. The command property is the
     * insertEmbed factory; the toolbar/UI layer is responsible
     * for prompting the user for a URL and invoking the factory.
     *
     * @returns {Array<object>}
     */
    toolbarItems() {
        return [{
            name: "embed",
            type: "button",
            command: insertEmbed,
            label: "Insert Embed",
            icon: "embed"
        }];
    }

    /**
     * Clean up plugin resources.
     */
    destroy() {
        this._editor = null;
    }
}
