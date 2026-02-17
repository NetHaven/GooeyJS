/**
 * Core logger class for the GooeyJS logging system.
 *
 * Logger is the central class through which all logging flows. It composes
 * {@link HandlerManager} for output routing and {@link ObservableBase} for
 * event notification -- it does NOT extend either class. This composition
 * approach keeps the Logger lightweight and avoids diamond inheritance issues.
 *
 * **Three usage patterns:**
 *
 * 1. **Static facade** -- `Logger.info("message")` delegates to a lazily
 *    created default logger instance. Ideal for quick prototyping.
 *
 * 2. **Named singletons** -- `Logger.getLogger("DataGrid")` returns a named
 *    logger from the singleton registry. Second call returns the same
 *    reference. Ideal for per-component logging in GooeyJS.
 *
 * 3. **Direct construction** -- `new Logger({ name, level, handlers })`
 *    creates a standalone instance. Useful for testing or isolated contexts.
 *
 * **Phase 7 Plan 01:** This file establishes the class shell with constructor,
 * private fields, static registry, static facade, addHandler (with emitter
 * wiring), and stub level methods (all NOOP). Subsequent plans add:
 * - Plan 02: Argument parsing and _write() method (level methods produce output)
 * - Plan 03: Level control (_rebuildMethods with active/NOOP swap)
 * - Plan 04: Lifecycle (flush, close, child loggers)
 * - Plan 05: Namespace exposure and public API surface
 *
 * @see HandlerManager
 * @see ObservableBase
 * @see LogLevel
 * @see LogEvent
 */

import LogLevel from "./LogLevel.js";
import HandlerManager from "./HandlerManager.js";
import ObservableBase from "../events/ObservableBase.js";
import LogEvent from "../events/logging/LogEvent.js";

// ---- Module-level constants ----

/** Shared no-op function for disabled level methods */
const NOOP = function noop() {};

/** Logger version constant */
const VERSION = "1.0.0";

export default class Logger {

    // ---- Private static fields ----

    /** Named logger singleton cache */
    static #registry = new Map();

    /** Lazily-created default logger instance */
    static #defaultLogger = null;

    /** Custom levels registered via addLevel() */
    static #customLevels = {};

    // ---- Public static fields ----

    /** Logger version */
    static VERSION = VERSION;

    // ---- Private instance fields ----

    /** @type {string} Logger name */
    #name;

    /** @type {number} Current numeric log level threshold */
    #level;

    /** @type {object|null} Serializer configuration */
    #serializers;

    /** @type {object|null} Static fields merged into every record */
    #fields;

    /** @type {object|undefined|null} Base record fields (undefined=auto, null=disabled, object=custom) */
    #base;

    /** @type {Function|boolean|undefined} Timestamp function or flag */
    #timestamp;

    /** @type {string|undefined} Key name for the message field in records */
    #messageKey;

    /** @type {string} Key name for the error field in records */
    #errorKey;

    /** @type {string|undefined} Key under which non-core fields are nested */
    #nestedKey;

    /** @type {string} Prefix prepended to all log messages */
    #msgPrefix;

    /** @type {boolean} Whether this logger is enabled */
    #enabled;

    /** @type {boolean} Whether this logger suppresses all output */
    #silent;

    /** @type {object} Merged map of level name -> numeric value */
    #levelMethods;

    // ---- Constructor ----

    /**
     * Create a new Logger instance.
     *
     * @param {object} [options={}] - Configuration options
     * @param {string} [options.name="default"] - Logger name for identification
     *        and registry lookup.
     * @param {number|string} [options.level=LogLevel.INFO] - Threshold level.
     *        Messages at severity above this (higher numeric value) are discarded.
     *        Accepts numeric level or string name (e.g. "info", "debug").
     * @param {object|null} [options.serializers=null] - Serializer map applied
     *        to record fields before output. Added in Plan 05.
     * @param {object|null} [options.fields=null] - Static fields merged into
     *        every log record produced by this logger.
     * @param {object|undefined|null} [options.base] - Base record fields.
     *        undefined = auto (hostname, pid), null = disabled, object = custom.
     * @param {Function|boolean} [options.timestamp] - Timestamp function or flag.
     *        Forwarded to LogRecord.create in Plan 02.
     * @param {string} [options.messageKey] - Key name for the message field.
     * @param {string} [options.errorKey="err"] - Key name for the error field.
     * @param {string} [options.nestedKey] - Key under which non-core fields
     *        are nested in the output record.
     * @param {string} [options.msgPrefix=""] - Prefix prepended to all messages.
     * @param {boolean} [options.enabled=true] - Whether this logger is enabled.
     *        Disabled loggers silently discard all log calls.
     * @param {Handler[]} [options.handlers] - Initial set of handlers to add.
     */
    constructor(options = {}) {
        this.#name = options.name || "default";
        this.#level = this.#resolveLevel(options.level ?? LogLevel.INFO);
        this.#serializers = options.serializers || null;
        this.#fields = options.fields || null;
        this.#base = options.base;
        this.#timestamp = options.timestamp;
        this.#messageKey = options.messageKey;
        this.#errorKey = options.errorKey || "err";
        this.#nestedKey = options.nestedKey;
        this.#msgPrefix = options.msgPrefix || "";
        this.#enabled = options.enabled !== false;
        this.#silent = false;
        this.#levelMethods = { ...LogLevel.DEFAULT, ...Logger.#customLevels };

        // Compose subsystems (has-a, not is-a)
        /** @type {HandlerManager} Handler collection and dispatch */
        this._handlers = new HandlerManager();

        /** @type {ObservableBase} Event emitter for log system events */
        this._emitter = new ObservableBase();

        // Register valid events on the emitter
        this._emitter.addValidEvent(LogEvent.RECORD);
        this._emitter.addValidEvent(LogEvent.LEVEL_CHANGE);
        this._emitter.addValidEvent(LogEvent.HANDLER_ERROR);
        this._emitter.addValidEvent(LogEvent.FLUSH);

        // Add initial handlers if provided
        if (options.handlers) {
            for (const handler of options.handlers) {
                this.addHandler(handler);
            }
        }

        // Build level methods (NOOP stubs for Plan 01)
        this._rebuildMethods();
    }

    // ---- Private instance methods ----

    /**
     * Resolve a level value to its numeric representation.
     *
     * @param {number|string|null|undefined} value - Level to resolve
     * @returns {number} Numeric level value
     * @throws {Error} If the level name is unknown or the value type is invalid
     * @private
     */
    #resolveLevel(value) {
        if (typeof value === "string") {
            const num = LogLevel.toNumber(value);
            if (num === undefined) {
                throw new Error("Unknown log level: " + value);
            }
            return num;
        }
        if (typeof value === "number") {
            return value;
        }
        if (value === null || value === undefined) {
            return LogLevel.INFO;
        }
        throw new Error("Invalid log level: " + value);
    }

    // ---- Public instance methods ----

    /**
     * Add a handler to this logger.
     *
     * Wires the handler's emitter to this logger's ObservableBase so that
     * handler errors are surfaced via {@link LogEvent.HANDLER_ERROR} events
     * on the logger's event emitter.
     *
     * @param {Handler} handler - Handler instance to add
     */
    addHandler(handler) {
        handler.emitter = this._emitter;
        this._handlers.addHandler(handler);
    }

    /**
     * Remove a handler from this logger.
     *
     * @param {Handler} handler - Handler instance to remove
     */
    removeHandler(handler) {
        this._handlers.removeHandler(handler);
    }

    /**
     * Remove all handlers from this logger.
     */
    clearHandlers() {
        this._handlers.clearHandlers();
    }

    /**
     * Get a defensive copy of the handler collection.
     *
     * @type {Handler[]}
     */
    get handlers() {
        return this._handlers.handlers;
    }

    /**
     * Get the name of this logger.
     *
     * @type {string}
     */
    get name() {
        return this.#name;
    }

    /**
     * Build level methods on this logger instance.
     *
     * **Plan 01 stub:** Assigns NOOP to all 6 default level methods
     * (trace, debug, info, warn, error, fatal) plus any custom levels.
     * Plans 02 and 03 replace this with the full active/NOOP swap logic
     * based on the current level threshold.
     */
    _rebuildMethods() {
        for (const [name] of Object.entries(this.#levelMethods)) {
            this[name] = NOOP;
        }
    }

    // ---- Static private methods ----

    /**
     * Get or lazily create the default logger instance.
     *
     * The default logger is registered in the singleton registry under the
     * name "default" so that `getLogger("default")` and `Logger.info()`
     * always refer to the same instance.
     *
     * @returns {Logger} The default logger instance
     * @private
     */
    static #getDefault() {
        if (Logger.#defaultLogger === null) {
            Logger.#defaultLogger = new Logger({ name: "default" });
            Logger.#registry.set("default", Logger.#defaultLogger);
        }
        return Logger.#defaultLogger;
    }

    // ---- Static public methods ----

    /**
     * Get or create a named logger singleton.
     *
     * If a logger with the given name already exists in the registry, returns
     * the cached instance (options are ignored on cache hit). Otherwise,
     * creates a new Logger with the provided options (overriding name) and
     * caches it.
     *
     * @param {string} name - Logger name
     * @param {object} [options={}] - Constructor options (ignored on cache hit)
     * @returns {Logger} Named logger instance
     */
    static getLogger(name, options = {}) {
        if (Logger.#registry.has(name)) {
            return Logger.#registry.get(name);
        }
        const logger = new Logger({ ...options, name });
        Logger.#registry.set(name, logger);
        return logger;
    }

    /**
     * Get a snapshot of all registered loggers.
     *
     * Returns a defensive copy of the internal registry. Modifications to the
     * returned Map do not affect the logger registry.
     *
     * @returns {Map<string, Logger>} Copy of the named logger registry
     */
    static getLoggers() {
        return new Map(Logger.#registry);
    }

    // ---- Static facade methods ----
    // These delegate to the lazily-created default logger instance.
    // In Plan 01, the instance methods are NOOP stubs -- the facade will
    // execute silently without producing output until Plan 02 activates them.

    /**
     * Log a trace-level message via the default logger.
     * @param {...*} args - Arguments forwarded to the default logger's trace method
     */
    static trace(...args) { Logger.#getDefault().trace(...args); }

    /**
     * Log a debug-level message via the default logger.
     * @param {...*} args - Arguments forwarded to the default logger's debug method
     */
    static debug(...args) { Logger.#getDefault().debug(...args); }

    /**
     * Log an info-level message via the default logger.
     * @param {...*} args - Arguments forwarded to the default logger's info method
     */
    static info(...args) { Logger.#getDefault().info(...args); }

    /**
     * Log a warn-level message via the default logger.
     * @param {...*} args - Arguments forwarded to the default logger's warn method
     */
    static warn(...args) { Logger.#getDefault().warn(...args); }

    /**
     * Log an error-level message via the default logger.
     * @param {...*} args - Arguments forwarded to the default logger's error method
     */
    static error(...args) { Logger.#getDefault().error(...args); }

    /**
     * Log a fatal-level message via the default logger.
     * @param {...*} args - Arguments forwarded to the default logger's fatal method
     */
    static fatal(...args) { Logger.#getDefault().fatal(...args); }
}
