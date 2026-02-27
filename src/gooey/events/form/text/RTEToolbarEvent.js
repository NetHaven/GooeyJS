import Event from "../../Event.js";

/**
 * Event constants for RTEToolbar component.
 */
export default class RTEToolbarEvent extends Event {
    static ACTION = "action";
    static BOUND = "bound";
    static UNBOUND = "unbound";

    constructor() {
        super();
    }
}
