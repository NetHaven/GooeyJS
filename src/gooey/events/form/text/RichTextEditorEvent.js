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
    static CHARACTERCOUNT = "charactercount";

    // Lifecycle events
    static CONTENT_SET = "contentSet";
    static READY = "ready";
    static DESTROY = "destroy";
    static MODE_CHANGE = "modeChange";

    // Collaboration events
    static PEER_JOINED = "peer-joined";
    static PEER_LEFT = "peer-left";
    static PEER_CURSOR_MOVED = "peer-cursor-moved";
    static REMOTE_CHANGE = "remote-change";

    constructor() {
        super();
    }
}