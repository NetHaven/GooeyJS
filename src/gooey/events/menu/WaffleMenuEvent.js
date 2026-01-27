import Event from "../Event.js";

/**
 * Event constants for WaffleMenu component
 */
export default class WaffleMenuEvent extends Event {
    static OPEN = "wafflemenuopen";
    static CLOSE = "wafflemenuclose";
    static ITEM_SELECT = "wafflemenuitemselect";

    constructor() {
        super();
    }
}
