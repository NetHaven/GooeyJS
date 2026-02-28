import Event from "../Event.js";

/**
 * Event constants for Window component
 */
export default class WindowEvent extends Event {
    static CLOSE = "close";
    static OPEN = "open";
    static MOVE = "move";
    static MINIMIZE = "minimize";
    static MAXIMIZE = "maximize";
    static RESIZE = "resize";

    constructor() {
        super();
    }
}