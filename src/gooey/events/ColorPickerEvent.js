import Event from "./Event.js";

/**
 * Event constants for ColorPicker component
 */
export default class ColorPickerEvent extends Event {
    static CHANGE = "change";
    static OPEN = "open";
    static CLOSE = "close";

    constructor() {
        super();
    }
}