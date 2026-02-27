/**
 * VideoPlugin provides a toolbar button for inserting video nodes
 * in the RichTextEditor.
 *
 * Wraps the insertVideo() command factory from MediaCommands.js.
 * The command is a factory that accepts (url, attrs) and returns a
 * (state, dispatch) => boolean command. The actual URL prompt is
 * handled at the UI layer.
 */

import { insertVideo } from "../../commands/MediaCommands.js";


export default class VideoPlugin {

    static pluginName = "video";

    /**
     * Initialize the plugin with an editor reference.
     * @param {object} editor - RichTextEditor component instance
     */
    init(editor) {
        this._editor = editor;
    }

    /**
     * Return toolbar item descriptors for video insertion.
     *
     * Provides a single button. The command property is the
     * insertVideo factory; the toolbar/UI layer is responsible
     * for prompting the user for a URL and invoking the factory.
     *
     * @returns {Array<object>}
     */
    toolbarItems() {
        return [{
            name: "video",
            type: "button",
            command: insertVideo,
            label: "Insert Video",
            icon: "video"
        }];
    }

    /**
     * Clean up plugin resources.
     */
    destroy() {
        this._editor = null;
    }
}
