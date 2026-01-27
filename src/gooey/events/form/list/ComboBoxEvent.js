import Event from "../../Event.js";

/**
 * Event constants for ComboBox component
 */
export default class ComboBoxEvent extends Event {
    static DROPDOWN_OPEN = "dropdownOpen";
    static DROPDOWN_CLOSE = "dropdownClose";
    static CHANGE = "change";

    constructor() {
        super();
    }
}