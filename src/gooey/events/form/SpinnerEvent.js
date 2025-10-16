import Event from "../Event.js";

/**
 * Event constants for Spinner component
 */
export default class SpinnerEvent extends Event {
    static VALUE_CHANGE = "valuechange";
    static INPUT = "input";
    static CHANGE = "change";

    constructor() {
        super();
    }
}