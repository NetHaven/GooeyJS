import Event from "./Event.js";

/**
 * Event constants for Tree component
 */
export default class TreeEvent extends Event {
    static SELECTION_CHANGED = "selection-changed";
    static ITEM_EXPAND = "itemexpand";
    static ITEM_COLLAPSE = "itemcollapse";

    constructor() {
        super();
    }
}