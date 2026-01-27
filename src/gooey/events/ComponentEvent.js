import Event from "./Event.js";

/**
 * Event constants for Component loader lifecycle events and common component events
 * Used by the <gooey-component> element for lazy-loading and by all GooeyJS components
 */
export default class ComponentEvent extends Event {
    /** Fired when a component begins loading */
    static LOADING = "component-loading";
    /** Fired when a component has finished loading */
    static LOADED = "component-loaded";
    /** Fired when a component fails to load */
    static ERROR = "component-error";

    /** Fired when an attribute value fails META.goo validation */
    static ATTRIBUTE_ERROR = "attribute-error";

    constructor() {
        super();
    }
}