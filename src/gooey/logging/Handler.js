import LogLevel from "./LogLevel.js";
import LogEvent from "../events/logging/LogEvent.js";

/**
 * Abstract base class for all log output handlers in the GooeyJS logging
 * system.
 *
 * Handlers are the output abstraction -- they receive log records and deliver
 * them to a destination (console, HTTP endpoint, ring buffer, etc.). The base
 * class defines a two-method contract:
 *
 * - {@link Handler#handle} -- The public entry point. Performs three steps in
 *   order: enabled/level gating, formatter application, and error-isolated
 *   delegation to `emit()`. **Subclasses should NOT override this method.**
 * - {@link Handler#emit} -- The protected output method. Subclasses MUST
 *   override this to deliver the formatted record to their destination.
 *
 * This split ensures that level filtering, formatting, and error isolation
 * are applied consistently across all handler types. Subclass authors only
 * need to implement the "write it somewhere" logic in `emit()`.
 *
 * Handlers are lightweight objects -- they do NOT extend ObservableBase.
 * Instead, they accept an external `emitter` reference (set by Logger in
 * Phase 7) for surfacing errors via {@link LogEvent.HANDLER_ERROR}. If no
 * emitter is available, errors fall back to `console.error`.
 *
 * @see LogLevel
 * @see LogEvent
 * @see Formatter
 */
export default class Handler {

    /**
     * Create a new Handler.
     *
     * @param {object} [options={}] - Configuration options
     * @param {number|string|null} [options.level=null] - Per-handler level
     *        threshold. Numeric level value, string level name (normalized
     *        via {@link LogLevel.toNumber}), or null to accept all records
     *        (deferring to logger-level filtering).
     * @param {Formatter|null} [options.formatter=null] - Per-handler
     *        formatter instance. Null means records pass through as-is.
     * @param {boolean} [options.enabled=true] - Whether this handler is
     *        active. Disabled handlers silently ignore all records.
     * @param {Observable|null} [options.emitter=null] - Observable instance
     *        for firing error events. Typically set by Logger in Phase 7.
     *        Null triggers console.error fallback on errors.
     */
    constructor(options = {}) {
        this._level = typeof options.level === "string"
            ? LogLevel.toNumber(options.level)
            : (options.level ?? null);
        this._formatter = options.formatter ?? null;
        this._enabled = options.enabled !== false;
        this._emitter = options.emitter ?? null;
        this._handleExceptions = options.handleExceptions === true;
        this._handleRejections = options.handleRejections === true;
    }

    // ---- Getters / Setters ----

    /**
     * Per-handler level threshold.
     *
     * When non-null, only records at or below this severity (numerically <=)
     * pass through to emit(). Null means "accept all records."
     *
     * @type {number|null}
     */
    get level() {
        return this._level;
    }

    /**
     * Set the per-handler level threshold.
     *
     * Accepts a numeric level value or a string name (normalized via
     * {@link LogLevel.toNumber}).
     *
     * @param {number|string|null} value - Level threshold
     */
    set level(value) {
        this._level = typeof value === "string"
            ? LogLevel.toNumber(value)
            : value;
    }

    /**
     * Per-handler formatter instance.
     *
     * When non-null, {@link Handler#handle} applies this formatter to the
     * record before passing the result to emit(). If the formatter returns
     * a falsey value, the record is dropped (emit() is not called).
     *
     * @type {Formatter|null}
     */
    get formatter() {
        return this._formatter;
    }

    /**
     * @param {Formatter|null} value - Formatter instance or null
     */
    set formatter(value) {
        this._formatter = value;
    }

    /**
     * Whether this handler is active.
     *
     * Disabled handlers silently ignore all records passed to handle().
     *
     * @type {boolean}
     */
    get enabled() {
        return this._enabled;
    }

    /**
     * @param {boolean} value - True to enable, false to disable
     */
    set enabled(value) {
        this._enabled = value;
    }

    /**
     * Observable reference for error events.
     *
     * When set, handler errors during emit() are surfaced via
     * {@link LogEvent.HANDLER_ERROR} through this emitter. When null,
     * errors fall back to console.error.
     *
     * @type {Observable|null}
     */
    get emitter() {
        return this._emitter;
    }

    /**
     * @param {Observable|null} value - Observable instance or null
     */
    set emitter(value) {
        this._emitter = value;
    }

    /**
     * Whether this handler receives uncaught exception records.
     *
     * When `true`, the {@link ExceptionHandler} will route global uncaught
     * exception records to this handler. Defaults to `false`.
     *
     * @type {boolean}
     */
    get handleExceptions() {
        return this._handleExceptions;
    }

    /**
     * @param {boolean} value - True to opt in to exception records
     */
    set handleExceptions(value) {
        this._handleExceptions = !!value;
    }

    /**
     * Whether this handler receives unhandled promise rejection records.
     *
     * When `true`, the {@link ExceptionHandler} will route global unhandled
     * rejection records to this handler. Defaults to `false`.
     *
     * @type {boolean}
     */
    get handleRejections() {
        return this._handleRejections;
    }

    /**
     * @param {boolean} value - True to opt in to rejection records
     */
    set handleRejections(value) {
        this._handleRejections = !!value;
    }

    // ---- Core contract ----

    /**
     * Process a log record through the handler pipeline.
     *
     * This is the public entry point for dispatching records to this handler.
     * It performs three steps in order:
     *
     * 1. **Enabled/level gate** -- If the handler is disabled or the record's
     *    level does not pass the handler's threshold, the record is silently
     *    dropped.
     * 2. **Format** -- If a formatter is configured, the record is transformed.
     *    If the formatter returns a falsey value, the record is dropped.
     * 3. **Emit with error isolation** -- The formatted record is passed to
     *    {@link Handler#emit}, wrapped in a try-catch. Errors are surfaced
     *    via {@link Handler#_onError} without crashing the caller.
     *
     * **Subclasses should NOT override this method.** Override
     * {@link Handler#emit} instead.
     *
     * @param {Readonly<object>} record - Log record to process
     */
    handle(record) {
        // Step 1: Enabled check
        if (!this._enabled) {
            return;
        }

        // Step 2: Level gate
        if (this._level !== null) {
            if (!LogLevel.isLevelEnabled(this._level, record.level)) {
                return;
            }
        }

        // Step 3: Format
        let formatted;
        if (this._formatter !== null) {
            formatted = this._formatter.format(record);
            if (!formatted) {
                return;
            }
        } else {
            formatted = record;
        }

        // Step 4: Emit with error isolation
        try {
            this.emit(record, formatted);
        } catch (err) {
            this._onError(err, record);
        }
    }

    /**
     * Deliver a formatted record to the output destination.
     *
     * **Subclasses MUST override this method.** The base implementation
     * throws an error to enforce the contract.
     *
     * @param {Readonly<object>} record - Original log record (unmodified)
     * @param {object} formatted - Formatted record (may be same reference
     *        as record if no formatter is configured)
     * @throws {Error} Always -- subclasses must provide an implementation
     */
    emit(record, formatted) {
        throw new Error("Handler.emit() must be implemented by subclass");
    }

    /**
     * Flush any buffered output.
     *
     * The base implementation is a no-op. Buffering handlers (e.g.,
     * BatchHandler) override this to force delivery of pending records.
     */
    flush() {
        // No-op -- override in buffering subclasses
    }

    /**
     * Release any resources held by this handler.
     *
     * The base implementation is a no-op. Handlers with open connections,
     * file handles, or timers override this for cleanup.
     */
    close() {
        // No-op -- override in subclasses with resources
    }

    // ---- Error handling (private) ----

    /**
     * Handle an error that occurred during emit().
     *
     * If an emitter is available and has the HANDLER_ERROR event registered,
     * the error is surfaced as an event. Otherwise, falls back to
     * console.error.
     *
     * @param {Error} error - The error thrown by emit()
     * @param {Readonly<object>} record - The record that caused the error
     * @private
     */
    _onError(error, record) {
        if (this._emitter && typeof this._emitter.hasEvent === "function" && this._emitter.hasEvent(LogEvent.HANDLER_ERROR)) {
            try {
                this._emitter.fireEvent(LogEvent.HANDLER_ERROR, {
                    handler: this,
                    error: error,
                    record: record
                });
            } catch (fireErr) {
                console.error("[GooeyJS Handler Error]", error);
            }
        } else {
            console.error("[GooeyJS Handler Error]", error);
        }
    }
}
