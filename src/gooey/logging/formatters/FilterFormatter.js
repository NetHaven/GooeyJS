/**
 * Gate formatter that drops log records based on a predicate function.
 *
 * The predicate receives the full log record and returns a truthy or
 * falsey value. When truthy, the record passes through unchanged. When
 * falsey, `null` is returned, which signals the
 * {@link CombinedFormatter} pipeline to short-circuit and drop the
 * record entirely.
 *
 * FilterFormatter does NOT spread-copy the record on pass-through
 * because it adds no fields -- the original record reference is
 * returned as-is, which is safe because nothing is mutated.
 *
 * The constructor validates that the predicate argument is a function,
 * throwing immediately if it is not. This catches configuration errors
 * early rather than failing silently at log time.
 *
 * @example
 * // Drop records below WARN level
 * const filter = new FilterFormatter((r) => r.level <= 2);
 * filter.format({ level: 1, msg: "error" }); // => { level: 1, msg: "error" }
 * filter.format({ level: 4, msg: "debug" }); // => null (dropped)
 *
 * @example
 * // Use with Formatter.combine() for pipeline filtering
 * const pipeline = Formatter.combine(
 *     new FilterFormatter((r) => r.level <= LogLevel.WARN),
 *     new SimpleFormatter()
 * );
 * // Records above WARN are dropped before reaching SimpleFormatter
 *
 * @see Formatter
 * @see CombinedFormatter
 */

import Formatter from "../Formatter.js";

export default class FilterFormatter extends Formatter {

    /**
     * Create a new FilterFormatter.
     *
     * @param {function(object): *} predicate - Function that receives a
     *        log record and returns a truthy value to keep it, or a
     *        falsey value to drop it
     * @throws {Error} If `predicate` is not a function
     */
    constructor(predicate) {
        super();

        if (typeof predicate !== "function") {
            throw new Error("FilterFormatter requires a predicate function");
        }

        /**
         * Predicate function that determines whether a record passes.
         * @type {function(object): *}
         * @private
         */
        this._predicate = predicate;
    }

    /**
     * Evaluate the predicate against a log record.
     *
     * Returns the original record unchanged if the predicate returns
     * a truthy value. Returns `null` if the predicate returns a falsey
     * value, signalling to {@link CombinedFormatter} that the record
     * should be dropped from the pipeline.
     *
     * @param {Readonly<object>} record - Log record to evaluate
     * @returns {object|null} The original record if accepted, or `null`
     *          if the predicate rejected it
     */
    format(record) {
        return this._predicate(record) ? record : null;
    }
}
