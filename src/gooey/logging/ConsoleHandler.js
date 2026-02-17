/**
 * Browser console output handler for the GooeyJS logging system.
 *
 * ConsoleHandler routes log records to the appropriate `console.*` method
 * based on the record's severity level, enabling DevTools severity filtering.
 * It optionally applies CSS `%c` badge styling for visual level
 * differentiation in the browser console.
 *
 * **Level-to-method mapping:**
 *
 * | Log Level | Console Method   |
 * |-----------|------------------|
 * | FATAL     | `console.error`  |
 * | ERROR     | `console.error`  |
 * | WARN      | `console.warn`   |
 * | INFO      | `console.info`   |
 * | DEBUG     | `console.debug`  |
 * | TRACE     | `console.debug`  |
 *
 * TRACE intentionally maps to `console.debug`, NOT `console.trace`, because
 * `console.trace()` generates automatic stack traces which are noisy and
 * misleading for general trace-level log output.
 *
 * ConsoleHandler inherits the {@link Handler#handle} method which performs
 * level gating, formatter application, and error isolation automatically.
 * Only {@link ConsoleHandler#emit} is overridden to provide the console
 * output logic.
 *
 * **Options:**
 * - `colors` (`boolean`, default `true`) -- Apply CSS `%c` badge styling
 *   with level-colored badges in the console output.
 * - `groupCollapsed` (`boolean`, default `false`) -- Wrap output in
 *   `console.groupCollapsed()` with the full record expandable inside.
 * - All options from {@link Handler}: `level`, `formatter`, `enabled`,
 *   `emitter`.
 *
 * @example
 * // Standalone usage with a log record
 * import ConsoleHandler from "./ConsoleHandler.js";
 * import LogRecord from "./LogRecord.js";
 *
 * const handler = new ConsoleHandler({ colors: true });
 * const record = LogRecord.create({ msg: "Server started", name: "app" });
 * handler.handle(record);
 * // Outputs: %c INFO %c Server started  (with blue badge styling)
 *
 * @example
 * // With groupCollapsed for expandable details
 * const handler = new ConsoleHandler({ groupCollapsed: true });
 * handler.handle(record);
 * // Outputs a collapsed group with the message as header and full record inside
 *
 * @example
 * // Plain output without CSS styling
 * const handler = new ConsoleHandler({ colors: false });
 * handler.handle(record);
 * // Outputs plain text via console.info("Server started")
 *
 * @see Handler
 * @see LogLevel
 * @see ColorizeFormatter
 */

import Handler from "./Handler.js";
import LogLevel from "./LogLevel.js";
import ColorizeFormatter from "./formatters/ColorizeFormatter.js";

export default class ConsoleHandler extends Handler {

    /**
     * Frozen mapping of numeric log levels to console method names.
     *
     * Each key is a {@link LogLevel} numeric constant and each value is the
     * name of a `console` method. This mapping determines which DevTools
     * severity bucket each log level falls into.
     *
     * Notable: TRACE maps to `"debug"`, NOT `"trace"`. `console.trace()`
     * generates automatic stack traces which are undesirable for general
     * trace-level logging output.
     *
     * @type {Readonly<Object<number, string>>}
     */
    static LEVEL_METHODS = Object.freeze({
        [LogLevel.FATAL]: "error",
        [LogLevel.ERROR]: "error",
        [LogLevel.WARN]:  "warn",
        [LogLevel.INFO]:  "info",
        [LogLevel.DEBUG]: "debug",
        [LogLevel.TRACE]: "debug"
    });

    /**
     * Create a new ConsoleHandler.
     *
     * @param {object} [options={}] - Configuration options
     * @param {boolean} [options.colors=true] - Apply CSS `%c` badge styling
     *        with level-colored badges. When true, output uses `%c` format
     *        specifiers with CSS strings from the {@link ColorizeFormatter}
     *        color registry. When false, output is plain text.
     * @param {boolean} [options.groupCollapsed=false] - Wrap console output
     *        in `console.groupCollapsed()`. The formatted message is the
     *        group header, and the full record object is expandable inside.
     * @param {number|string|null} [options.level=null] - Per-handler level
     *        threshold (inherited from {@link Handler}).
     * @param {Formatter|null} [options.formatter=null] - Per-handler formatter
     *        (inherited from {@link Handler}).
     * @param {boolean} [options.enabled=true] - Whether this handler is active
     *        (inherited from {@link Handler}).
     * @param {Observable|null} [options.emitter=null] - Observable for error
     *        events (inherited from {@link Handler}).
     */
    constructor(options = {}) {
        super(options);

        /** @private */
        this._colors = options.colors !== false;

        /** @private */
        this._groupCollapsed = options.groupCollapsed === true;
    }

    /**
     * Deliver a formatted log record to the browser console.
     *
     * Routes the output to the appropriate `console.*` method based on the
     * record's level via {@link ConsoleHandler.LEVEL_METHODS}. When colors
     * are enabled, a CSS-styled level badge is prepended using `%c` format
     * specifiers. When groupCollapsed is enabled, output is wrapped in a
     * collapsible group with the full record expandable inside.
     *
     * This method is called by {@link Handler#handle} after level gating,
     * formatter application, and error isolation. It should NOT be called
     * directly -- use `handle(record)` instead.
     *
     * The record parameter is treated as read-only and is never mutated.
     *
     * @param {Readonly<object>} record - Original log record (unmodified)
     * @param {object|string} formatted - Formatted output. If an object,
     *        the `_formatted` or `msg` property is used as the display
     *        string. If a string, it is used directly.
     */
    emit(record, formatted) {
        const method = ConsoleHandler.LEVEL_METHODS[record.level] || "log";
        const consoleFn = console[method];

        const output = (typeof formatted === "object" && formatted !== null)
            ? (formatted._formatted || formatted.msg || "")
            : String(formatted);

        if (this._colors) {
            const levelName = (record.levelName || "???").toUpperCase();

            // Try formatter-injected color first, then global color registry, then empty
            const css = (typeof formatted === "object" && formatted !== null && formatted._levelColor)
                ? formatted._levelColor
                : (ColorizeFormatter._allColors[record.levelName] || "");

            if (css) {
                const badge = `%c ${levelName} `;
                const resetCSS = "color: inherit; font-weight: inherit";

                if (this._groupCollapsed) {
                    console.groupCollapsed(badge + "%c" + output, css, resetCSS);
                    consoleFn(record);
                    console.groupEnd();
                } else {
                    consoleFn(badge + "%c " + output, css, resetCSS);
                }
                return;
            }
            // No CSS found -- fall through to plain output
        }

        // Plain output (no colors or no CSS available)
        if (this._groupCollapsed) {
            console.groupCollapsed(output);
            consoleFn(record);
            console.groupEnd();
        } else {
            consoleFn(output);
        }
    }
}
