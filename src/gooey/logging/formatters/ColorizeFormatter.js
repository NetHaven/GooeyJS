/**
 * Enrichment formatter that adds a CSS color string to the log record
 * based on the record's log level.
 *
 * Adds a `_levelColor` field containing a CSS style string suitable for
 * use with the browser DevTools `%c` format specifier:
 *
 *     console.log("%c[ERROR] something broke", record._levelColor);
 *
 * This formatter uses CSS color strings (NOT ANSI escape codes) because
 * GooeyJS targets browser environments where DevTools supports CSS styling
 * via `console.log("%c...", "color: red")`.
 *
 * A global color registry maps level names to CSS strings. The built-in
 * defaults cover the standard levels (fatal, error, warn, info, debug,
 * trace). Custom level colors can be registered via the static
 * {@link ColorizeFormatter.addColors} method, which merges new mappings
 * into the global registry. This intentionally follows the Winston
 * `addColors()` pattern where custom levels are registered once and
 * applied everywhere.
 *
 * **Options:**
 * - `colors` (`Object<string, string>`) -- Custom level-to-CSS mappings
 *   to merge into the global registry at construction time
 *
 * @example
 * // Default colors
 * const fmt = new ColorizeFormatter();
 * fmt.format({ levelName: "error", msg: "fail" });
 * // { levelName: "error", msg: "fail", _levelColor: "color: #ff0000" }
 *
 * @example
 * // Register custom level colors
 * ColorizeFormatter.addColors({
 *     audit:    "color: #00bcd4; font-weight: bold",
 *     security: "color: #e91e63; font-weight: bold"
 * });
 * const fmt = new ColorizeFormatter();
 * fmt.format({ levelName: "audit", msg: "user login" });
 * // { ..., _levelColor: "color: #00bcd4; font-weight: bold" }
 *
 * @example
 * // Pass custom colors at construction time
 * const fmt = new ColorizeFormatter({
 *     colors: { custom: "color: green" }
 * });
 *
 * @see Formatter
 */

import Formatter from "../Formatter.js";

/**
 * Default CSS color strings for the standard log levels.
 *
 * These are CSS style declarations for use with the browser DevTools
 * `%c` format specifier. NOT ANSI escape codes.
 *
 * @type {Object<string, string>}
 */
const DEFAULT_COLORS = {
    fatal:  "color: #ff0000; font-weight: bold",
    error:  "color: #ff0000",
    warn:   "color: #ff8c00",
    info:   "color: #0078d4",
    debug:  "color: #6a0dad",
    trace:  "color: #808080"
};

export default class ColorizeFormatter extends Formatter {

    /**
     * Mutable global color registry mapping level names to CSS strings.
     *
     * Initialized as a copy of {@link DEFAULT_COLORS}. Custom colors
     * are merged in via {@link ColorizeFormatter.addColors}. Intentionally
     * global -- custom level colors (like "audit", "security") need to be
     * registered once and used everywhere.
     *
     * @type {Object<string, string>}
     */
    static _allColors = { ...DEFAULT_COLORS };

    /**
     * Create a new ColorizeFormatter.
     *
     * If `options.colors` is provided, the custom colors are immediately
     * merged into the global color registry via {@link ColorizeFormatter.addColors}.
     *
     * @param {object} [options={}] - Configuration options
     * @param {Object<string, string>} [options.colors] - Custom level-to-CSS
     *        mappings to merge into the global registry
     */
    constructor(options = {}) {
        super(options);

        if (options.colors) {
            ColorizeFormatter.addColors(options.colors);
        }
    }

    /**
     * Merge custom level colors into the global color registry.
     *
     * Keys in `colors` override any existing entries. This is intentionally
     * global -- calling `addColors()` once affects all ColorizeFormatter
     * instances, matching the Winston `addColors()` pattern.
     *
     * @param {Object<string, string>} colors - Map of level names to CSS
     *        style strings (e.g., `{ audit: "color: teal; font-weight: bold" }`)
     */
    static addColors(colors) {
        Object.assign(ColorizeFormatter._allColors, colors);
    }

    /**
     * Add a `_levelColor` CSS string to the log record based on the level name.
     *
     * Looks up `record.levelName` in the global color registry and sets
     * `_levelColor` to the corresponding CSS string. If the level name
     * is not found in the registry, `_levelColor` is set to an empty string.
     *
     * @param {Readonly<object>} record - Log record (may be frozen)
     * @returns {object} New record with `_levelColor` CSS string field
     */
    format(record) {
        const css = ColorizeFormatter._allColors[record.levelName] || "";
        return { ...record, _levelColor: css };
    }
}
