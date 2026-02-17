/**
 * Terminal formatter that applies a user-provided template function to
 * produce the formatted log output.
 *
 * The template function receives the full log record object and must
 * return a string. This gives complete control over the output format
 * without needing to subclass {@link Formatter}.
 *
 * The resulting string is stored in the record's `_formatted` property
 * on a spread-copy of the original record, keeping the record object
 * intact for any downstream formatters in a {@link Formatter.combine}
 * pipeline.
 *
 * @example
 * const fmt = new PrintfFormatter(
 *     (record) => `${record.levelName}: ${record.msg}`
 * );
 * const result = fmt.format({ levelName: "info", msg: "hello" });
 * // result._formatted === "info: hello"
 *
 * @example
 * // With timestamp
 * const fmt = new PrintfFormatter(
 *     (r) => `[${r.time}] ${r.levelName.toUpperCase()} ${r.msg}`
 * );
 *
 * @see Formatter
 */

import Formatter from "../Formatter.js";

export default class PrintfFormatter extends Formatter {

    /**
     * Create a new PrintfFormatter.
     *
     * @param {function} templateFn - Function that receives a log record
     *        object and returns a formatted string. Must be a function;
     *        throws if not.
     * @throws {Error} If `templateFn` is not a function
     */
    constructor(templateFn) {
        super();

        if (typeof templateFn !== "function") {
            throw new Error("PrintfFormatter requires a template function");
        }

        /**
         * User-provided template function for custom formatting.
         * @type {function}
         * @private
         */
        this._templateFn = templateFn;
    }

    /**
     * Apply the template function to the log record and store the result
     * in `_formatted`.
     *
     * Calls `this._templateFn(record)` to produce the formatted string,
     * then returns a spread-copy of the record with the `_formatted`
     * property set.
     *
     * @param {Readonly<object>} record - Log record (may be frozen)
     * @returns {object} New record object with `_formatted` containing
     *          the template function's output
     */
    format(record) {
        const result = this._templateFn(record);
        return { ...record, _formatted: result };
    }
}
