import Event from "../Event.js";

/**
 * Event constants for DataGridColumn component
 */
export default class DataGridColumnEvent extends Event {
    static HEADER_CLICK = "header-click";
    static RESIZE_START = "resize-start";
    static RESIZE_END = "resize-end";

    constructor() {
        super();
    }
}
