import Event from "../Event.js";

/**
 * Event constants for Slider component
 */
export default class SliderEvent extends Event {
    static CHANGE = "change";
    static INPUT = "input";
    static SLIDE_START = "slidestart";
    static SLIDE_END = "slideend";

    constructor() {
        super();
    }
}
