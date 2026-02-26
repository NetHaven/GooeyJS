import Event from "./Event.js";

/**
 * Event constants for theme system lifecycle events.
 *
 * Includes both theme state events (THEME_CHANGE, THEME_READY) and
 * theme loading lifecycle events (LOADING, LOADED, ERROR) following
 * the ComponentEvent LOADING/LOADED/ERROR naming pattern.
 */
export default class ThemeEvent extends Event {
    /** Fired when the active theme changes */
    static THEME_CHANGE = "theme-change";

    /** Fired when a theme is fully loaded and ready */
    static THEME_READY = "theme-ready";

    /** Fired when a theme begins loading CSS */
    static LOADING = "theme-loading";

    /** Fired when a theme is fully loaded and ready */
    static LOADED = "theme-loaded";

    /** Fired when theme loading fails */
    static ERROR = "theme-error";

    constructor() {
        super();
    }
}
