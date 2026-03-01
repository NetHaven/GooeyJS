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
import Plugin from "../Plugin.js";


export default class EmbedPlugin extends Plugin {

    static pluginName = "embed";

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

}
