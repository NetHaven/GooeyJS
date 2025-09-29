import Event from "../Event.js";

/**
 * Event constants for form element focus and blur events
 * Used by all form elements that can receive focus
 */
export default class FormElementEvent extends Event {
    static FOCUS = "focus";
    static BLUR = "blur";

    constructor() {
        super();
    }
}