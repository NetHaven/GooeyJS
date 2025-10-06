import Event from "../Event.js";

/**
 * Event constants for RadioButtonGroup component
 */
export default class RadioButtonGroupEvent extends Event {
    static SELECTION_CHANGE = "selectionchange";

    constructor() {
        super();
    }
}