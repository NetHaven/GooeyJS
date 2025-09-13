import Event from "./Event.js";

/**
 * Event constants for drag and drop operations
 * Used by all components that support drag and drop functionality
 */
export default class DragEvent extends Event {
    static DROP = "drop";
    static END = "dragend";
    static OVER = "dragover";
    static START = "dragstart";

    constructor() {
        super();
    }
}