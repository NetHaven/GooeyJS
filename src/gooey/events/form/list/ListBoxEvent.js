import Event from "../../Event.js";

/**
 * Event constants for ListBox component
 */
export default class ListBoxEvent extends Event  {
    static CHANGE = "change";
    static SELECTION_CHANGE = "selectionchange";

    constructor() {
        super();
    }
}