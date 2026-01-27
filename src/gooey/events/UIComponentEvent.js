import Event from "./Event.js";

/**
 * Event constants for UIComponent visibility and lifecycle events
 * Used by all UI components that can change visibility
 */
export default class UIComponentEvent extends Event {
    static SHOW = "show";
    static HIDE = "hide";

    static MODEL_CHANGE = "modelChange";
    static CONTROLLER_ATTACHED = "controllerAttached";

    constructor() {
        super();
    }
}
