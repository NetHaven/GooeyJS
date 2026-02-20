import Event from "./Event.js";

/**
 * Event constants for theme system lifecycle events
 */
export default class ThemeEvent extends Event {
    /** Fired when the active theme changes */
    static THEME_CHANGE = "theme-change";

    /** Fired when a theme is fully loaded and ready */
    static THEME_READY = "theme-ready";

    constructor() {
        super();
    }
}
