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
 * **Phase 7 build-up:**
 * - Plan 01: Class shell, constructor, static registry, static facade, stubs
 * - Plan 02: Argument parsing (_createLogMethod), printf interpolation
 *   (_interpolate), error detection (_isError), write pipeline (_write),
 *   and active _rebuildMethods with level gating
 * - Plan 03: Level control (setLevel, level getter, enabled toggle)
 * - Plan 04: Lifecycle (flush, close, child loggers)
 * - Plan 05: Namespace exposure and public API surface
 *
 * @see HandlerManager
 * @see ObservableBase
 * @see LogLevel
 * @see LogEvent
 */

import LogLevel from "./LogLevel.js";
import LogRecord from "./LogRecord.js";
import Serializers from "./Serializers.js";
import HandlerManager from "./HandlerManager.js";
import ObservableBase from "../events/ObservableBase.js";
import LogEvent from "../events/logging/LogEvent.js";
import ColorizeFormatter from "./formatters/ColorizeFormatter.js";
import Formatter, { CombinedFormatter } from "./Formatter.js";
import Handler from "./Handler.js";
import ConsoleHandler from "./ConsoleHandler.js";
import RingBuffer from "./RingBuffer.js";
import HttpHandler from "./HttpHandler.js";
import JsonFormatter from "./formatters/JsonFormatter.js";
import SimpleFormatter from "./formatters/SimpleFormatter.js";
import PrintfFormatter from "./formatters/PrintfFormatter.js";
import TimestampFormatter from "./formatters/TimestampFormatter.js";
import LabelFormatter from "./formatters/LabelFormatter.js";
import ErrorFormatter from "./formatters/ErrorFormatter.js";
import MetadataFormatter from "./formatters/MetadataFormatter.js";
import AlignFormatter from "./formatters/AlignFormatter.js";
import MillisecondFormatter from "./formatters/MillisecondFormatter.js";
import FilterFormatter from "./formatters/FilterFormatter.js";
import Redactor from "./Redactor.js";

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

    /** @type {Logger|null} Parent logger reference for handler delegation */
    #parent;

    /** @type {object} This logger's own bindings (not inherited). Empty object for root loggers. */
    #bindings;

    /** @type {object|null} Parent's merged fields, stored for setBindings() recalculation */
    #parentFields;

    /** @type {function|null} Callback invoked when child() creates a new child logger */
    #onChild;

    /** @type {object|null} Formatters option: { level, bindings, log } functions */
    #formatters;

    /** @type {object|Array|null} Raw redaction config (for child merging) */
    #redact;

    /** @type {Redactor|null} Instantiated redactor (null if no redaction configured) */
    #redactor;

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

        // Phase 8 fields: child logger support
        this.#parent = options._parent || null;
        this.#bindings = options._bindings || {};
        this.#parentFields = options._parentFields || null;
        this.#onChild = options.onChild || null;
        this.#formatters = options.formatters || null;
        this.#redact = options.redact || null;
        this.#redactor = this.#redact ? new Redactor(this.#redact) : null;

        // Compose subsystems (has-a, not is-a)
        // Child loggers share the parent's HandlerManager for handler inheritance
        /** @type {HandlerManager} Handler collection and dispatch */
        if (this.#parent) {
            this._handlers = this.#parent._handlers;
        } else {
            this._handlers = new HandlerManager();
        }

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

        // Build level methods (active closures or NOOP based on level gate)
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
        if (typeof value === "number") return value;
        if (typeof value === "string") {
            const num = LogLevel.toNumber(value);
            if (num !== undefined) return num;
            const custom = Logger.#customLevels[value.toLowerCase()];
            if (custom !== undefined) return custom;
            throw new Error("Unknown log level: " + value);
        }
        if (value == null) return LogLevel.INFO;
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
     * Flush all buffered handlers.
     *
     * Iterates every handler in the collection and calls `flush()` on each.
     * Errors thrown by individual handlers are swallowed to ensure that a
     * failing handler does not prevent subsequent handlers from flushing.
     *
     * After all handlers have been flushed, fires a {@link LogEvent.FLUSH}
     * event. Listener errors on the event are also swallowed.
     *
     * @see Handler#flush
     */
    flush() {
        const handlers = this._handlers.handlers;
        for (const handler of handlers) {
            try {
                handler.flush();
            } catch (e) {
                // Swallow -- flush errors must not crash the caller
            }
        }
        try {
            this._emitter.fireEvent(LogEvent.FLUSH, {});
        } catch (e) {
            // Swallow -- listener errors must not crash flush
        }
    }

    /**
     * Close this logger and release all resources.
     *
     * Performs the following steps in order:
     * 1. Flushes all handlers via {@link Logger#flush}
     * 2. Calls `close()` on each handler (errors swallowed)
     * 3. Clears the handler collection
     * 4. Removes all event listeners from the emitter
     *
     * **This is a one-way operation.** The logger should not be reused
     * after `close()` is called. Adding new handlers or logging after
     * close will not restore previous state.
     *
     * @see Handler#close
     */
    close() {
        this.flush();
        const handlers = this._handlers.handlers;
        for (const handler of handlers) {
            try {
                handler.close();
            } catch (e) {
                // Swallow -- close errors must not crash the caller
            }
        }
        this._handlers.clearHandlers();
        this._emitter.removeAllEventListeners();
    }

    /**
     * Create a child logger with bound context fields.
     *
     * The child logger inherits the parent's handler collection by sharing
     * the same {@link HandlerManager} reference. This means handlers added
     * to the parent after child creation are automatically visible to the
     * child.
     *
     * Bindings are accumulated: a grandchild merges its own bindings on
     * top of the parent's merged fields. The `msgPrefix` is concatenated
     * (parent prefix + child prefix).
     *
     * Child-level overrides (level, serializers, msgPrefix, formatters,
     * onChild) take effect independently of the parent.
     *
     * If `formatters.bindings` is configured, it transforms the bindings
     * object before merging with parent fields.
     *
     * @param {object} [bindings={}] - Context fields bound to every record
     * @param {object} [options={}] - Child-level configuration overrides
     * @param {number|string} [options.level] - Override threshold level
     * @param {object|null} [options.serializers] - Override serializers (merged with parent)
     * @param {string} [options.msgPrefix] - Additional prefix (concatenated with parent)
     * @param {object|null} [options.formatters] - Override formatters
     * @param {function|null} [options.onChild] - Override onChild callback
     * @returns {Logger} New child logger instance
     * @throws {Error} If bindings is not a plain object
     */
    child(bindings = {}, options = {}) {
        if (typeof bindings !== "object" || bindings === null || Array.isArray(bindings)) {
            throw new Error("child: bindings must be a plain object");
        }

        // Apply formatters.bindings if configured (transforms bindings before merge)
        const formattedBindings = (this.#formatters && this.#formatters.bindings)
            ? this.#formatters.bindings(bindings)
            : bindings;

        // Merge parent fields with child bindings
        const mergedFields = this.#fields
            ? { ...this.#fields, ...formattedBindings }
            : (Object.keys(formattedBindings).length > 0 ? { ...formattedBindings } : null);

        // Merge serializers: parent base, child overrides
        const mergedSerializers = options.serializers
            ? (this.#serializers
                ? { ...this.#serializers, ...options.serializers }
                : options.serializers)
            : this.#serializers;

        // Message prefix: cumulative (parent prefix + child prefix)
        const mergedMsgPrefix = (this.#msgPrefix || "") + (options.msgPrefix || "");

        // Merge redaction config: union paths, child object-form overrides censor/remove
        const mergedRedact = this._mergeRedact(this.#redact, options.redact);

        // Construct child logger with merged options
        const child = new Logger({
            name: this.#name,
            level: options.level ?? this.#level,
            serializers: mergedSerializers,
            fields: mergedFields,
            base: this.#base,
            timestamp: this.#timestamp,
            messageKey: this.#messageKey,
            errorKey: this.#errorKey,
            nestedKey: this.#nestedKey,
            msgPrefix: mergedMsgPrefix || "",
            enabled: this.#enabled,
            formatters: options.formatters ?? this.#formatters,
            onChild: options.onChild ?? this.#onChild,
            redact: mergedRedact,
            // Internal fields for child tracking
            _parent: this,
            _bindings: formattedBindings,
            _parentFields: this.#fields
        });

        // Fire onChild callback if configured
        if (this.#onChild) {
            try {
                this.#onChild(child);
            } catch (e) {
                // Swallow -- onChild errors must not break child creation
            }
        }

        return child;
    }

    /**
     * Get a defensive copy of this logger's own bindings.
     *
     * Returns only the bindings that were passed to this logger's
     * {@link Logger#child} call (or set via {@link Logger#setBindings}).
     * Does NOT include inherited parent fields. For root loggers,
     * returns an empty object.
     *
     * @returns {object} Shallow copy of this logger's own bindings
     */
    bindings() {
        return { ...this.#bindings };
    }

    /**
     * Replace this logger's bindings and rebuild merged fields.
     *
     * After replacement, the internal `#fields` are recalculated by
     * merging `#parentFields` (if this is a child logger) with the new
     * bindings. This ensures that the full ancestor field chain is
     * preserved while allowing the child's own bindings to change.
     *
     * @param {object} newBindings - New bindings object (replaces, does not merge)
     * @throws {Error} If newBindings is not a plain object
     */
    setBindings(newBindings) {
        if (typeof newBindings !== "object" || newBindings === null || Array.isArray(newBindings)) {
            throw new Error("setBindings: argument must be a plain object");
        }
        this.#bindings = { ...newBindings };
        // Rebuild merged fields from parent fields + current bindings
        this.#fields = this.#parentFields
            ? { ...this.#parentFields, ...this.#bindings }
            : (Object.keys(this.#bindings).length > 0 ? { ...this.#bindings } : null);
    }

    /**
     * Merge parent and child redaction configurations.
     *
     * Paths are unioned (deduplicated). When the child provides an
     * object-form config, its `censor` and `remove` settings override
     * the parent's. When the child provides an array-form config,
     * the parent's censor/remove settings are preserved (if any).
     *
     * @param {Array|object|null} parentRedact - Parent redaction config
     * @param {Array|object|null|undefined} childRedact - Child redaction config
     * @returns {Array|object|null} Merged redaction config
     */
    _mergeRedact(parentRedact, childRedact) {
        if (!parentRedact && !childRedact) return null;
        if (!parentRedact) return childRedact;
        if (!childRedact) return parentRedact;

        const parentPaths = Array.isArray(parentRedact) ? parentRedact : (parentRedact.paths || []);
        const childPaths = Array.isArray(childRedact) ? childRedact : (childRedact.paths || []);
        const mergedPaths = [...new Set([...parentPaths, ...childPaths])];

        // Child object-form overrides parent censor/remove settings
        if (!Array.isArray(childRedact) && typeof childRedact === "object") {
            return {
                paths: mergedPaths,
                censor: childRedact.censor !== undefined ? childRedact.censor : (Array.isArray(parentRedact) ? "[REDACTED]" : parentRedact.censor),
                remove: childRedact.remove !== undefined ? childRedact.remove : (Array.isArray(parentRedact) ? false : parentRedact.remove)
            };
        }

        // Child is array-form -- preserve parent's censor/remove if parent is object-form
        if (!Array.isArray(parentRedact) && typeof parentRedact === "object") {
            return {
                paths: mergedPaths,
                censor: parentRedact.censor,
                remove: parentRedact.remove
            };
        }

        // Both are array-form
        return mergedPaths;
    }

    /**
     * Get the parent logger reference (read-only).
     *
     * Returns `null` for root loggers. Useful for debugging and
     * inspecting the logger hierarchy.
     *
     * @type {Logger|null}
     */
    get parent() {
        return this.#parent;
    }

    /**
     * Whether this logger is a child of another logger.
     *
     * Convenience getter that returns `true` if this logger was created
     * via {@link Logger#child}, `false` for root loggers.
     *
     * @type {boolean}
     */
    get isChild() {
        return this.#parent !== null;
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
     * Get the current log level as a human-readable string name.
     *
     * Returns the standard level name (from {@link LogLevel.toName}) if
     * the current threshold maps to a built-in level, otherwise checks
     * custom levels registered via {@link Logger.addLevel}. Falls back
     * to the numeric value as a string if no name is found.
     *
     * @type {string}
     */
    get level() {
        return LogLevel.toName(this.#level)
            || this._customLevelName(this.#level)
            || String(this.#level);
    }

    /**
     * Set the log level threshold at runtime.
     *
     * Accepts a string level name (built-in or custom) or a numeric value.
     * After resolving the new threshold, rebuilds all level methods so that
     * methods below the new threshold become {@link NOOP} and methods at or
     * above become active logging closures.
     *
     * Fires a {@link LogEvent.LEVEL_CHANGE} event with `oldLevel`,
     * `newLevel`, `oldLevelName`, and `newLevelName` properties. Event
     * listener errors are swallowed to prevent level changes from failing.
     *
     * No-op if the resolved new level equals the current level.
     *
     * @param {number|string} value - New level threshold (name or number)
     * @throws {Error} If the level name is unknown or the value type is invalid
     */
    set level(value) {
        const oldLevel = this.#level;
        const newLevel = this.#resolveLevel(value);
        if (oldLevel === newLevel) return;

        this.#level = newLevel;
        this._rebuildMethods();

        // Fire level change event
        try {
            this._emitter.fireEvent(LogEvent.LEVEL_CHANGE, {
                oldLevel,
                newLevel,
                oldLevelName: LogLevel.toName(oldLevel) || this._customLevelName(oldLevel) || String(oldLevel),
                newLevelName: LogLevel.toName(newLevel) || this._customLevelName(newLevel) || String(newLevel)
            });
        } catch (e) {
            // Swallow -- event listener errors must not break level changes
        }
    }

    /**
     * Get the current numeric log level threshold.
     *
     * Useful when comparing levels numerically or when the caller needs
     * the raw threshold value rather than the human-readable name.
     *
     * @type {number}
     */
    get levelVal() {
        return this.#level;
    }

    /**
     * Whether this logger suppresses all output.
     *
     * When `true`, {@link Logger#_write} returns immediately without
     * creating records, dispatching to handlers, or firing events.
     * However, unlike {@link Logger#enabled}, the level methods remain
     * as active closures -- arguments are still evaluated and the method
     * body executes up to the `_write()` call.
     *
     * Use `silent` when you want to temporarily suppress output but
     * retain the ability to inspect method references (e.g., for testing).
     * Use `enabled = false` when you need true zero-overhead suppression.
     *
     * @type {boolean}
     */
    get silent() {
        return this.#silent;
    }

    /**
     * Set the silent mode flag.
     *
     * @param {boolean} value - True to suppress output, false to resume
     */
    set silent(value) {
        this.#silent = !!value;
    }

    /**
     * Whether this logger is enabled.
     *
     * When `false`, ALL level methods (trace, debug, info, warn, error,
     * fatal, plus any custom levels) are replaced with the shared
     * {@link NOOP} function -- providing true zero-overhead suppression.
     * No arguments are evaluated, no closures execute, no records are
     * created.
     *
     * When set back to `true`, methods are rebuilt based on the current
     * level threshold via {@link Logger#_rebuildMethods}.
     *
     * @type {boolean}
     */
    get enabled() {
        return this.#enabled;
    }

    /**
     * Set the enabled state.
     *
     * Triggers {@link Logger#_rebuildMethods} when the value actually
     * changes, so the cost of the setter is proportional to the number
     * of level methods. No-op if the new value matches the current state.
     *
     * @param {boolean} value - True to enable, false to disable
     */
    set enabled(value) {
        const newEnabled = !!value;
        if (this.#enabled === newEnabled) return;
        this.#enabled = newEnabled;
        this._rebuildMethods();
    }

    /**
     * Reconfigure this logger at runtime via shallow merge.
     *
     * Only the keys present in `options` are updated; all other settings
     * retain their current values. This allows callers to tweak a single
     * setting without needing to reconstruct the logger.
     *
     * **Setter-backed keys** (`level`, `enabled`) use their respective
     * setters, which trigger side-effects (method rebuilds, events).
     *
     * **`handlers`** is a replacement operation -- the existing handler
     * collection is cleared and the new handlers are added. This avoids
     * the ambiguity of merging handler arrays.
     *
     * @param {object} [options={}] - Configuration options (same keys as constructor)
     * @param {number|string} [options.level] - New level threshold
     * @param {object|null} [options.serializers] - New serializer map
     * @param {object|null} [options.fields] - New static fields
     * @param {object|undefined|null} [options.base] - New base record fields
     * @param {Function|boolean} [options.timestamp] - New timestamp function or flag
     * @param {string} [options.messageKey] - New message key
     * @param {string} [options.errorKey] - New error key
     * @param {string} [options.nestedKey] - New nested key
     * @param {string} [options.msgPrefix] - New message prefix
     * @param {boolean} [options.enabled] - New enabled state
     * @param {Handler[]} [options.handlers] - New handler set (replaces all)
     * @param {function|null} [options.onChild] - New onChild callback
     * @param {object|null} [options.formatters] - New formatters configuration
     */
    configure(options = {}) {
        if ("level" in options) {
            this.level = options.level;
        }
        if ("serializers" in options) {
            this.#serializers = options.serializers;
        }
        if ("fields" in options) {
            this.#fields = options.fields;
        }
        if ("base" in options) {
            this.#base = options.base;
        }
        if ("timestamp" in options) {
            this.#timestamp = options.timestamp;
        }
        if ("messageKey" in options) {
            this.#messageKey = options.messageKey;
        }
        if ("errorKey" in options) {
            this.#errorKey = options.errorKey;
        }
        if ("nestedKey" in options) {
            this.#nestedKey = options.nestedKey;
        }
        if ("msgPrefix" in options) {
            this.#msgPrefix = options.msgPrefix;
        }
        if ("enabled" in options) {
            this.enabled = options.enabled;
        }
        if ("handlers" in options) {
            this._handlers.clearHandlers();
            if (options.handlers) {
                for (const handler of options.handlers) {
                    this.addHandler(handler);
                }
            }
        }
        if ("onChild" in options) {
            this.#onChild = options.onChild;
        }
        if ("formatters" in options) {
            this.#formatters = options.formatters;
        }
        if ("redact" in options) {
            this.#redact = options.redact || null;
            this.#redactor = this.#redact ? new Redactor(this.#redact) : null;
        }
    }

    /**
     * Register an event listener on this logger.
     *
     * Valid events:
     * - {@link LogEvent.RECORD} -- fired on each log record dispatch
     * - {@link LogEvent.LEVEL_CHANGE} -- fired when level is changed
     * - {@link LogEvent.HANDLER_ERROR} -- fired when a handler throws during emit
     * - {@link LogEvent.FLUSH} -- fired when flush() is called
     *
     * @param {string} eventName - Event name (must be a registered valid event)
     * @param {function} listener - Callback function: (eventName, eventObject) => void
     * @throws {Error} If eventName is not a valid registered event
     */
    addEventListener(eventName, listener) {
        this._emitter.addEventListener(eventName, listener);
    }

    /**
     * Remove a previously registered event listener.
     *
     * @param {string} eventName - Event name
     * @param {function} listener - Callback function to remove
     * @throws {Error} If eventName is not a valid registered event
     */
    removeEventListener(eventName, listener) {
        this._emitter.removeEventListener(eventName, listener);
    }

    /**
     * Suspend all event firing on this logger.
     *
     * While suspended, log records are still created and dispatched to handlers,
     * but no events (RECORD, LEVEL_CHANGE, etc.) are fired to listeners.
     */
    suspendEvents() {
        this._emitter.suspendEvents();
    }

    /**
     * Resume event firing after suspension.
     */
    resumeEvents() {
        this._emitter.resumeEvents();
    }

    /**
     * Look up a custom level name by its numeric value.
     *
     * Iterates the instance-level method map to find a name that maps to
     * the given numeric value. Returns `undefined` if no custom level
     * matches.
     *
     * @param {number} num - Numeric level value to look up
     * @returns {string|undefined} Custom level name or undefined
     * @private
     */
    _customLevelName(num) {
        for (const [name, val] of Object.entries(this.#levelMethods)) {
            if (val === num) return name;
        }
        return undefined;
    }

    /**
     * Build (or rebuild) level methods on this logger instance.
     *
     * For each level in the merged level map ({@link LogLevel.DEFAULT} plus
     * custom levels), assigns either an active logging closure (from
     * {@link _createLogMethod}) or the shared {@link NOOP} function based on:
     *
     * 1. Whether this logger is enabled (`#enabled`)
     * 2. Whether the level passes the threshold gate
     *    (`LogLevel.isLevelEnabled(#level, levelNum)`)
     *
     * Called once in the constructor and again whenever the level threshold
     * or enabled state changes at runtime.
     */
    _rebuildMethods() {
        for (const [name, num] of Object.entries(this.#levelMethods)) {
            if (this.#enabled && LogLevel.isLevelEnabled(this.#level, num)) {
                this[name] = this._createLogMethod(name, num);
            } else {
                this[name] = NOOP;
            }
        }
    }

    /**
     * Detect whether a value is an Error or Error-like object.
     *
     * Returns `true` for native Error instances. For cross-realm error
     * detection (iframes, Workers), duck-types by requiring BOTH `message`
     * (string) AND `stack` (string). Requiring both properties avoids false
     * positives on plain objects that happen to have a `message` property
     * (e.g., `{ message: "hello" }`).
     *
     * @param {*} val - Value to test
     * @returns {boolean} True if val is an Error or Error-like object
     * @private
     */
    _isError(val) {
        return val instanceof Error || (
            val !== null &&
            typeof val === "object" &&
            typeof val.message === "string" &&
            typeof val.stack === "string"
        );
    }

    /**
     * Printf-style string interpolation.
     *
     * Replaces format specifiers in `fmt` with values from `args`:
     *
     * | Specifier | Conversion                                    |
     * |-----------|-----------------------------------------------|
     * | `%s`      | String coercion (`String(val)`)                |
     * | `%d`      | Number coercion (`Number(val).toString()`)     |
     * | `%j`      | JSON via `Serializers.safeStringify(val)`       |
     * | `%o`      | JSON via `Serializers.safeStringify(val)`       |
     * | `%O`      | Pretty JSON via `safeStringify(val, null, 2)`   |
     * | `%%`      | Literal `%` (does not consume an argument)      |
     *
     * Extra arguments beyond the number of specifiers are ignored.
     * Missing arguments leave the specifier intact in the output.
     *
     * @param {string} fmt  - Format string containing specifiers
     * @param {Array}  args - Substitution values
     * @returns {string} Interpolated string
     * @private
     */
    _interpolate(fmt, args) {
        let i = 0;
        return String(fmt).replace(/%([sdjoO%])/g, (match, spec) => {
            if (spec === "%") return "%";
            if (i >= args.length) return match;
            const val = args[i++];
            switch (spec) {
                case "s": return String(val);
                case "d": return Number(val).toString();
                case "j": return Serializers.safeStringify(val);
                case "o": return Serializers.safeStringify(val);
                case "O": return Serializers.safeStringify(val, null, 2);
                default:  return match;
            }
        });
    }

    /**
     * Create a bound logging method for a specific severity level.
     *
     * Returns a closure that captures `this` (the logger instance) and
     * performs flexible argument parsing before delegating to {@link _write}.
     *
     * **Three argument patterns are supported:**
     *
     * 1. **Error-first** -- `logger.error(new Error("fail"))` or
     *    `logger.error(err, "context message", ...args)`
     *    - Wraps the error in the `#errorKey` field
     *    - Uses `error.message` as msg if no string follows
     *    - Uses the string as msg if provided (with optional printf args)
     *
     * 2. **Object-first** -- `logger.info({ userId: 42 }, "loaded user")`
     *    - Merges the object as additional fields into the record
     *    - Second argument is the message (with optional printf args)
     *
     * 3. **String-first** -- `logger.info("hello")` or
     *    `logger.info("loaded %d items", 5)`
     *    - First argument is the message
     *    - Remaining arguments are printf substitution values
     *
     * After argument parsing, applies printf interpolation (if args exist),
     * prepends `#msgPrefix`, and calls {@link _write}.
     *
     * @param {string} levelName - Level name (e.g. "info", "error")
     * @param {number} levelNum  - Numeric level value
     * @returns {function(...*): void} Bound logging method
     * @private
     */
    _createLogMethod(levelName, levelNum) {
        const logger = this;
        return function (...args) {
            if (args.length === 0) return;

            let fields = null;
            let msg = "";
            let msgArgs = null;
            const first = args[0];

            if (logger._isError(first)) {
                // Error-first: logger.error(new Error("fail"))
                //           or logger.error(err, "context message", ...args)
                fields = { [logger.#errorKey || "err"]: first };
                if (args.length > 1 && typeof args[1] === "string") {
                    msg = args[1];
                    if (args.length > 2) msgArgs = args.slice(2);
                } else {
                    msg = first.message;
                }
            } else if (typeof first === "object" && first !== null) {
                // Object-first: logger.info({ userId: 42 }, "loaded user")
                fields = first;
                if (args.length > 1) {
                    msg = String(args[1]);
                    if (args.length > 2) msgArgs = args.slice(2);
                }
            } else {
                // String-first: logger.info("hello")
                //            or logger.info("loaded %d items", 5)
                msg = String(first);
                if (args.length > 1) msgArgs = args.slice(1);
            }

            // Printf interpolation
            if (msgArgs) {
                msg = logger._interpolate(msg, msgArgs);
            }

            // Message prefix
            if (logger.#msgPrefix) {
                msg = logger.#msgPrefix + msg;
            }

            logger._write(levelNum, levelName, msg, fields);
        };
    }

    /**
     * Core write pipeline -- creates a record and dispatches it to handlers.
     *
     * Pipeline sequence:
     * 1. **Silent check** -- if `#silent` is true, return immediately
     * 2. **Merge fields** -- combine logger-level `#fields` with call-level fields
     * 3. **Create record** -- via `LogRecord.create()` with all configuration
     * 4. **Apply serializers** -- via `Serializers.apply()` if serializers are configured
     * 5. **Fire RECORD event** -- notify listeners (errors swallowed)
     * 6. **Dispatch to handlers** -- via `HandlerManager.dispatch()`
     *
     * @param {number} levelNum  - Numeric level value
     * @param {string} levelName - Level name (for potential custom level use)
     * @param {string} msg       - Formatted log message
     * @param {object|null} fields - Call-level fields to merge into the record
     * @private
     */
    _write(levelNum, levelName, msg, fields) {
        // Silent mode -- suppress all output
        if (this.#silent) return;

        // Merge logger-level bound fields with call-level fields
        const mergedFields = this.#fields
            ? (fields ? { ...this.#fields, ...fields } : this.#fields)
            : fields;

        // Create record via LogRecord.create
        const record = LogRecord.create({
            level: levelNum,
            name: this.#name,
            msg,
            fields: mergedFields,
            base: this.#base,
            timestamp: this.#timestamp,
            messageKey: this.#messageKey,
            errorKey: this.#errorKey,
            nestedKey: this.#nestedKey
        });

        // Patch levelName for custom levels -- LogRecord.create only knows
        // built-in LogLevel names, so custom levels get no levelName.
        const finalRecord = (!record.levelName && levelName)
            ? Object.freeze({ ...record, levelName })
            : record;

        // Apply redaction if configured (before serialization)
        const redacted = (this.#redactor && this.#redactor.hasPaths)
            ? this.#redactor.redact(finalRecord)
            : finalRecord;

        // Apply serializers (returns original if no serializers match)
        const serialized = this.#serializers
            ? Serializers.apply(redacted, this.#serializers)
            : redacted;

        // Fire RECORD event (listener errors must not crash the pipeline)
        try {
            this._emitter.fireEvent(LogEvent.RECORD, { record: serialized });
        } catch (e) {
            // Swallow -- listener errors must not prevent handler dispatch
        }

        // Dispatch to all handlers
        this._handlers.dispatch(serialized);
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

    /**
     * Register a custom log level globally.
     *
     * Custom levels are available to all existing and future Logger instances.
     * Each existing logger's level method map is updated and its methods are
     * rebuilt so that the new level method is immediately callable.
     *
     * If `color` is provided, it is registered with {@link ColorizeFormatter}
     * so that the custom level receives CSS styling in console output.
     *
     * @param {string} name  - Level name (case-insensitive, stored lowercase)
     * @param {number} value - Numeric level value (lower = more severe)
     * @param {string} [color] - Optional CSS color string for
     *        {@link ColorizeFormatter} (e.g., `"color: teal; font-weight: bold"`)
     */
    static addLevel(name, value, color) {
        const lowerName = name.toLowerCase();
        Logger.#customLevels[lowerName] = value;

        if (color) {
            ColorizeFormatter.addColors({ [lowerName]: color });
        }

        // Update all existing registered loggers
        for (const [, logger] of Logger.#registry) {
            logger.#levelMethods[lowerName] = value;
            logger._rebuildMethods();
        }

        // Update default logger if it exists but is not in the registry
        if (Logger.#defaultLogger && !Logger.#registry.has("default")) {
            Logger.#defaultLogger.#levelMethods[lowerName] = value;
            Logger.#defaultLogger._rebuildMethods();
        }
    }

    /**
     * Reconfigure the default logger at runtime.
     *
     * Convenience static method that delegates to the default logger's
     * {@link Logger#configure} instance method. This enables concise
     * reconfiguration without obtaining a logger reference:
     *
     * ```js
     * Logger.configure({ level: "debug" });
     * ```
     *
     * @param {object} [options={}] - Configuration options (see {@link Logger#configure})
     * @static
     */
    static configure(options = {}) {
        Logger.#getDefault().configure(options);
    }

    /**
     * Flush all handlers on the default logger.
     *
     * Convenience static method that delegates to the default logger's
     * {@link Logger#flush} instance method.
     *
     * @static
     */
    static flush() {
        Logger.#getDefault().flush();
    }

    // ---- Static facade methods ----
    // These delegate to the lazily-created default logger instance.

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

// ---- Class namespace exposure (CORE-06) ----
// Assign all supporting classes as static properties so downstream code
// can access everything via a single import: import Logger from "./Logger.js"
// then use Logger.LogLevel, Logger.ConsoleHandler, etc.
//
// These assignments happen at module evaluation time, synchronously after
// the class definition. There are no circular dependency issues because
// Logger imports subsystems (not the other way around).

Logger.Redactor = Redactor;
Logger.LogLevel = LogLevel;
Logger.LogRecord = LogRecord;
Logger.Serializers = Serializers;
Logger.Formatter = Formatter;
Logger.CombinedFormatter = CombinedFormatter;
Logger.Handler = Handler;
Logger.HandlerManager = HandlerManager;
Logger.ConsoleHandler = ConsoleHandler;
Logger.RingBuffer = RingBuffer;
Logger.HttpHandler = HttpHandler;
Logger.LogEvent = LogEvent;

// Formatters
Logger.JsonFormatter = JsonFormatter;
Logger.SimpleFormatter = SimpleFormatter;
Logger.PrintfFormatter = PrintfFormatter;
Logger.TimestampFormatter = TimestampFormatter;
Logger.LabelFormatter = LabelFormatter;
Logger.ErrorFormatter = ErrorFormatter;
Logger.MetadataFormatter = MetadataFormatter;
Logger.AlignFormatter = AlignFormatter;
Logger.ColorizeFormatter = ColorizeFormatter;
Logger.MillisecondFormatter = MillisecondFormatter;
Logger.FilterFormatter = FilterFormatter;
