import Event from "../Event.js";

/**
 * Event constants for the GooeyJS internationalization system.
 *
 * These constants define the event types fired during i18n lifecycle
 * operations such as initialization, locale switching, message loading,
 * and missing key detection.
 *
 * @see GooeyI18n - The static singleton that uses these constants
 */
export default class I18nEvent extends Event {

    /** Fired after GooeyI18n.init() completes successfully */
    static INITIALIZED = "i18n-initialized";

    /** Fired when the active locale changes */
    static LOCALE_CHANGED = "i18n-locale-changed";

    /** Fired when a lazy locale begins loading from a remote URL */
    static LOCALE_LOADING = "i18n-locale-loading";

    /** Fired when a locale's messages have been successfully loaded */
    static LOCALE_LOADED = "i18n-locale-loaded";

    /** Fired when a translation key is not found in any locale */
    static MISSING_KEY = "i18n-missing-key";

    /** Fired when a locale loading or parsing error occurs */
    static ERROR = "i18n-error";

    /** Fired when messages are added to a locale via setLocaleMessages or mergeLocaleMessages */
    static MESSAGES_ADDED = "i18n-messages-added";

    /** Fired when messages are removed from a locale via removeLocaleMessages */
    static MESSAGES_REMOVED = "i18n-messages-removed";

    constructor() {
        super();
    }
}
