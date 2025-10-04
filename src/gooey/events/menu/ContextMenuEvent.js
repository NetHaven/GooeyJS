import Event from "../Event.js";

/**
 * Event constants for ContextMenu component
 */
export default class ContextMenuEvent extends Event {
    static CONTEXT_MENU_SHOW = "contextmenushow";
    static CONTEXT_MENU_HIDE = "contextmenuhide";

    constructor() {
        super();
    }
}