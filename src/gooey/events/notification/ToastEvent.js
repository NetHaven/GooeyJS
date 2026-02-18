import Event from "../Event.js";

/**
 * Event constants for Toast component
 */
export default class ToastEvent extends Event {
    static SHOW = "show";
    static HIDE = "hide";
    static ACTION = "action";
    static DISMISS = "dismiss";

    constructor() {
        super();
    }
}
