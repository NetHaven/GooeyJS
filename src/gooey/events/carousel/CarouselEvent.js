import Event from "../Event.js";

/**
 * Events fired by the Carousel component.
 */
export default class CarouselEvent extends Event {

    // Lifecycle
    /** Fired when the carousel initializes. */
    static INIT = "init";

    /** Fired when the carousel is destroyed. */
    static DESTROY = "destroy";

    /** Fired when the carousel updates (recalculates layout). */
    static UPDATE = "update";

    /** Fired when the carousel reinitializes. */
    static REINIT = "reinit";

    /** Fired when the carousel resizes. */
    static RESIZE = "resize";

    // Navigation
    /** Fired when the active slide index changes. */
    static SLIDE_CHANGE = "slide-change";

    /** Fired when the slide transition completes. */
    static SLIDE_CHANGED = "slide-changed";

    /** Fired when navigating to the next slide. */
    static SLIDE_NEXT = "slide-next";

    /** Fired when navigating to the previous slide. */
    static SLIDE_PREV = "slide-prev";

    /** Fired when the first slide is reached. */
    static REACHED_START = "reached-start";

    /** Fired when the last slide is reached. */
    static REACHED_END = "reached-end";

    // Interaction
    /** Fired when a drag interaction starts. */
    static DRAG_START = "drag-start";

    /** Fired during a drag interaction. */
    static DRAG_MOVE = "drag-move";

    /** Fired when a drag interaction ends. */
    static DRAG_END = "drag-end";

    /** Fired on click. */
    static CLICK = "click";

    // Scroll & progress
    /** Fired on continuous scroll position update. */
    static SCROLL = "scroll";

    /** Fired on normalized 0-1 progress update. */
    static SCROLL_PROGRESS = "scroll-progress";

    // Module lifecycle
    /** Fired when a module is loaded. */
    static MODULE_LOADED = "module-loaded";

    /** Fired when a module is unloaded. */
    static MODULE_UNLOADED = "module-unloaded";

    constructor() {
        super();
    }
}
