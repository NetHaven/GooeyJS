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

    constructor() {
        super();
    }
}