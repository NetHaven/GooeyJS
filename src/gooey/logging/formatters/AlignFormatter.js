/**
 * Enrichment formatter that pads the `levelName` field to a uniform
 * width using {@link String.prototype.padEnd}.
 *
 * This produces aligned level-name columns in text-based log output,
 * making it easier to visually scan console logs:
 * ```
 * info  [app] Server started
 * warn  [app] Slow query detected
 * error [app] Connection lost
 * ```
 *
 * The default pad width is 5, matching the longest built-in level names
 * (`fatal`, `error`, `trace`, `debug`). If custom log levels with
 * longer names are used, supply a larger `padWidth` option.
 *
 * Because log records may be frozen ({@link LogRecord.create}), the
 * record is always spread-copied before modification.
 *
 * **Options:**
 * - `padWidth` (`number`) -- Minimum width to pad `levelName` to.
 *   Defaults to `5`.
 *
 * @example
 * const fmt = new AlignFormatter();
 * fmt.format({ levelName: "info" });
 * // => { levelName: "info " }
 *
 * @example
 * // Custom pad width for longer level names
 * const fmt = new AlignFormatter({ padWidth: 8 });
 * fmt.format({ levelName: "info" });
 * // => { levelName: "info    " }
 *
 * @see Formatter
 */

import Formatter from "../Formatter.js";

export default class AlignFormatter extends Formatter {

    /**
     * Length of the longest built-in level name ("fatal", "error",
     * "trace", "debug" are all 5 characters).
     * @type {number}
     */
    static #MAX_LEVEL_LENGTH = 5;

    /**
     * Create a new AlignFormatter.
     *
     * @param {object} [options={}] - Configuration options
     * @param {number} [options.padWidth=5] - Minimum width to pad the
     *        `levelName` field to. Increase for custom levels with
     *        longer names.
     */
    constructor(options = {}) {
        super(options);

        /**
         * Target padding width for the `levelName` field.
         * @type {number}
         * @private
         */
        this._padWidth = options.padWidth ?? AlignFormatter.#MAX_LEVEL_LENGTH;
    }

    /**
     * Pad the `levelName` field to a uniform width.
     *
     * Uses {@link String.prototype.padEnd} to append trailing spaces
     * up to the configured `padWidth`. If `levelName` is missing or
     * falsy, an empty string is padded instead.
     *
     * @param {Readonly<object>} record - Log record (may be frozen)
     * @returns {object} New record with `levelName` padded to uniform width
     */
    format(record) {
        return { ...record, levelName: (record.levelName || "").padEnd(this._padWidth) };
    }
}
