import Event from "../Event.js";

/**
 * Event constants for ToggleButtonGroup component
 */
export default class ToggleButtonGroupEvent extends Event{
    static SELECTION_CHANGE = "selectionchange";

    constructor() {
        super();
    }
}