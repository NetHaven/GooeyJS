import Event from "./Event.js";

/**
 * Event constants for Icon component lifecycle
 */
export default class IconEvent extends Event {
    static LOAD = "icon-load";
    static ERROR = "icon-error";

    constructor() {
        super();
    }
}
