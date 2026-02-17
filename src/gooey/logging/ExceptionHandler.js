/**
 * Global exception and rejection handler for the GooeyJS logging system.
 *
 * Captures uncaught exceptions (window "error" event) and unhandled promise
 * rejections (window "unhandledrejection" event), routing them to Logger
 * handlers that opt in via per-handler boolean flags (`handleExceptions`,
 * `handleRejections`).
 *
 * Design:
 * - **Standalone class** -- not a Handler subclass. Manages global listener
 *   registration/deregistration and record creation independently.
 * - **Idempotent registration** -- calling `register()` twice does not
 *   double-register listeners.
 * - **Re-entry guard** -- if the exception handler's own code throws during
 *   dispatch, the `#dispatching` flag prevents infinite recursion.
 * - **onError callback** -- optional user callback that can suppress errors
 *   by returning `true`, preventing both logging and default browser behavior.
 *
 * @see Logger
 * @see Handler
 * @see LogRecord
 * @see LogLevel
 * @see LogEvent
 */
import LogLevel from "./LogLevel.js";
import LogRecord from "./LogRecord.js";
import LogEvent from "../events/logging/LogEvent.js";

export default class ExceptionHandler {

    /** @type {Logger} Logger reference for handler access and event emission */
    #logger;

    /** @type {function|null} User callback for error suppression control */
    #onError;

    /** @type {function} Bound reference to _handleError for addEventListener/removeEventListener */
    #errorHandler;

    /** @type {function} Bound reference to _handleRejection for addEventListener/removeEventListener */
    #rejectionHandler;

    /** @type {boolean} Whether global listeners are currently registered */
    #registered;

    /** @type {boolean} Re-entry guard to prevent infinite recursion */
    #dispatching;

    /**
     * Create a new ExceptionHandler.
     *
     * Does NOT register listeners automatically -- call {@link register}
     * to start capturing global exceptions and rejections.
     *
     * @param {Logger} logger - Logger instance whose handlers receive exception records
     * @param {object} [options={}] - Configuration options
     * @param {function|null} [options.onError=null] - Callback invoked before logging.
     *        Signature: `(error, type) => boolean`. If it returns `true`, the error
     *        is suppressed (not logged, browser default prevented).
     */
    constructor(logger, options = {}) {
        this.#logger = logger;
        this.#onError = options.onError || null;
        this.#errorHandler = this._handleError.bind(this);
        this.#rejectionHandler = this._handleRejection.bind(this);
        this.#registered = false;
        this.#dispatching = false;
    }

    // ---- Lifecycle ----

    /**
     * Register global exception and rejection listeners.
     *
     * Idempotent -- calling twice has no effect. Listeners are added to
     * `window` (browser environment).
     */
    register() {
        if (this.#registered) return;
        window.addEventListener("error", this.#errorHandler);
        window.addEventListener("unhandledrejection", this.#rejectionHandler);
        this.#registered = true;
    }

    /**
     * Deregister global exception and rejection listeners.
     *
     * Safe to call even if not registered -- no-op in that case.
     * After deregistration, no further exceptions or rejections are captured.
     */
    deregister() {
        if (!this.#registered) return;
        window.removeEventListener("error", this.#errorHandler);
        window.removeEventListener("unhandledrejection", this.#rejectionHandler);
        this.#registered = false;
    }

    /**
     * Whether global listeners are currently registered.
     *
     * @type {boolean}
     */
    get registered() {
        return this.#registered;
    }

    // ---- Event handlers ----

    /**
     * Handle uncaught exceptions (window "error" event).
     *
     * Extracts the error from the event, optionally consults the onError
     * callback for suppression, then dispatches to opted-in handlers at
     * FATAL level.
     *
     * @param {ErrorEvent} event - Browser error event
     * @private
     */
    _handleError(event) {
        try {
            // Re-entry guard: prevent infinite recursion if our own code throws
            if (this.#dispatching) return;

            const error = event.error || new Error(event.message || "Unknown error");

            // onError callback: allows user to suppress the error
            if (this.#onError) {
                try {
                    const suppress = this.#onError(error, "exception");
                    if (suppress === true) {
                        event.preventDefault();
                        return;
                    }
                } catch (e) {
                    // Swallow -- onError errors must not break exception handling
                }
            }

            this.#dispatching = true;
            this._dispatch(error, LogLevel.FATAL, "handleExceptions", {
                type: "exception",
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno
            });
            this.#dispatching = false;

            // Suppress default browser console output
            event.preventDefault();
        } catch (e) {
            // Last resort: log to console to avoid silent failure
            this.#dispatching = false;
            console.error("[GooeyJS ExceptionHandler] Error in _handleError:", e);
        }
    }

    /**
     * Handle unhandled promise rejections (window "unhandledrejection" event).
     *
     * Extracts the rejection reason, optionally consults the onError
     * callback for suppression, then dispatches to opted-in handlers at
     * ERROR level.
     *
     * @param {PromiseRejectionEvent} event - Browser rejection event
     * @private
     */
    _handleRejection(event) {
        try {
            // Re-entry guard: prevent infinite recursion if our own code throws
            if (this.#dispatching) return;

            const reason = event.reason;
            const error = (reason instanceof Error)
                ? reason
                : new Error(String(reason ?? "Unhandled rejection"));

            // onError callback: allows user to suppress the rejection
            if (this.#onError) {
                try {
                    const suppress = this.#onError(error, "rejection");
                    if (suppress === true) {
                        event.preventDefault();
                        return;
                    }
                } catch (e) {
                    // Swallow -- onError errors must not break rejection handling
                }
            }

            this.#dispatching = true;
            this._dispatch(error, LogLevel.ERROR, "handleRejections", {
                type: "rejection"
            });
            this.#dispatching = false;

            // Suppress default browser console output
            event.preventDefault();
        } catch (e) {
            // Last resort: log to console to avoid silent failure
            this.#dispatching = false;
            console.error("[GooeyJS ExceptionHandler] Error in _handleRejection:", e);
        }
    }

    // ---- Dispatch ----

    /**
     * Create a log record and route it to handlers that have opted in.
     *
     * Only handlers where `handler[flagName]` is `true` receive the record.
     * After handler dispatch, fires a {@link LogEvent.EXCEPTION} event on
     * the logger's emitter.
     *
     * @param {Error} error - The captured error
     * @param {number} level - Log level for the record (FATAL or ERROR)
     * @param {string} flagName - Handler flag to check ("handleExceptions" or "handleRejections")
     * @param {object} meta - Additional metadata fields (type, filename, lineno, colno)
     * @private
     */
    _dispatch(error, level, flagName, meta) {
        // Create a log record for the exception
        const record = LogRecord.create({
            level,
            name: this.#logger.name,
            msg: error.message,
            fields: { err: error, ...meta },
            timestamp: true
        });

        // Route to opted-in handlers
        const handlers = this.#logger.handlers;
        for (const handler of handlers) {
            if (handler[flagName]) {
                try {
                    handler.handle(record);
                } catch (e) {
                    // Swallow -- handler errors must not break exception handling
                }
            }
        }

        // Fire EXCEPTION event on logger's emitter
        try {
            this.#logger._emitter.fireEvent(LogEvent.EXCEPTION, {
                error,
                record,
                type: meta.type
            });
        } catch (e) {
            // Swallow -- event listener errors must not break exception handling
        }
    }
}
