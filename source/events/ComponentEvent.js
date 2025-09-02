import Event from "./Event.js";

/**
 * Event constants for Component visibility and lifecycle events
 * Used by all components that can change visibility
 */
export default class ComponentEvent extends Event {
    static SHOW = "show";
    static HIDE = "hide";

    constructor() {
        super();
    }
}