import Event from "../Event.js";

/**
 * Event constants for FormPanel component
 */
export default class FormPanelEvent extends Event {
    static INVALID = "invalid";
    static SUBMIT = "submit";

    constructor() {
        super();
    }
}