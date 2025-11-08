import Event from "./Event.js";

/**
 * Event constants for Component loader lifecycle events
 * Used by the <gooey-component> element for lazy-loading components
 */
export default class ComponentEvent extends Event {
    static LOADING = "loading";
    static LOADED = "loaded";
    static ERROR = "error";

    constructor() {
        super();
    }
}