import Event from "../../Event.js";

/**
 * Event constants for RichTextEditor component
 */
export default class RichTextEditorEvent extends Event {
    static MODEL_CHANGED = "modelChanged";
    static EDITOR_ACTION = "editorAction";
    static HIGHLIGHT = "highlight";
    static UNHIGHLIGHT = "unhighlight";
    static TEXT_CURSOR_MOVE = "textcursormove";
    static PASTE_START = "pastestart";
    static PASTE_END = "pasteend";
    static SEARCH_FOUND = "searchfound";
    static SEARCH_NOT_FOUND = "searchnotfound";
    static REPLACE_DONE = "replacedone";
    static PLUGIN_LOADED = "pluginloaded";
    static PLUGIN_ERROR = "pluginerror";

    constructor() {
        super();
    }
}