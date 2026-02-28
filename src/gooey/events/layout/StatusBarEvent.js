import Event from "../Event.js";

/**
 * Event constants for StatusBar component
 */
export default class StatusBarEvent extends Event {
    static ITEM_ADDED = "itemadded";
    static ITEM_REMOVED = "itemremoved";
    static OVERFLOW = "overflow";

    constructor() {
        super();
    }
}
