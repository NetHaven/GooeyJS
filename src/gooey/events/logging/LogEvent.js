import Event from "../Event.js";

/**
 * Event constants for the GooeyJS logging system.
 * Used with Observable's addValidEvent() and fireEvent() pattern.
 *
 * All event names use a "log-" prefix in kebab-case to avoid collision
 * with other Observable event types.
 */
export default class LogEvent extends Event {

    /** Fired when a log record is created and dispatched */
    static RECORD = "log-record";

    /** Fired when a logger's level is changed at runtime */
    static LEVEL_CHANGE = "log-level-change";

    /** Fired when a handler encounters an error during emit */
    static HANDLER_ERROR = "log-handler-error";

    /** Fired when a flush operation is requested */
    static FLUSH = "log-flush";

    /** Fired when an uncaught exception or unhandled rejection is captured */
    static EXCEPTION = "log-exception";

    constructor() {
        super();
    }
}
