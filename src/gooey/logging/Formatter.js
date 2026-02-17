/**
 * Base class for all log record formatters in the GooeyJS logging system.
 *
 * A formatter transforms a log record (a plain frozen object produced by
 * {@link LogRecord.create}) into a modified record. Subclasses override
 * {@link Formatter#format} to add, remove, or reshape fields. Because
 * log records are frozen, subclasses that modify fields must spread-copy
 * the record first (`{ ...record, newField: value }`).
 *
 * The primary composition mechanism is {@link Formatter.combine}, which
 * chains multiple formatters into a sequential pipeline (inspired by
 * Winston logform's `combine()` cascade). Each formatter receives the
 * output of the previous one. If any formatter returns a falsey value
 * (null, undefined, false, 0, ""), the pipeline short-circuits and
 * returns `false`, signalling "record was dropped by filtering."
 *
 * This module exports two classes:
 * - `Formatter` (default export) -- base class with identity `format()`
 * - `CombinedFormatter` (named export) -- pipeline executor returned
 *   by `Formatter.combine()`
 *
 * Zero dependencies. Formatters operate on plain objects and do not
 * import any other module.
 *
 * @see LogRecord
 * @see Serializers
 */

/**
 * Base formatter class. Provides the format contract and the static
 * `combine()` factory for building formatter pipelines.
 */
export default class Formatter {

    /**
     * Create a new Formatter.
     *
     * Subclasses typically accept an options object to configure their
     * transformation behavior (field names, inclusion flags, etc.).
     *
     * @param {object} [options={}] - Configuration options for this formatter
     */
    constructor(options = {}) {
        this.options = options;
    }

    /**
     * Transform a log record.
     *
     * The base implementation is an identity function that returns the
     * record unchanged. Subclasses override this to perform their
     * specific transformation.
     *
     * A formatter may return:
     * - A transformed record object (the normal case)
     * - A falsey value (null, undefined, false) to signal that the
     *   record should be dropped from the logging pipeline. When used
     *   inside a {@link CombinedFormatter}, this short-circuits the
     *   chain immediately.
     *
     * @param {Readonly<object>} record - Log record (may be frozen)
     * @returns {object|false|null|undefined} Transformed record, or
     *          falsey to drop the record
     */
    format(record) {
        return record;
    }

    /**
     * Create a combined formatter that chains multiple formatters in
     * sequence.
     *
     * Each formatter receives the output of the previous formatter.
     * If any formatter returns a falsey value, the pipeline stops
     * immediately and returns `false` (record dropped).
     *
     * All arguments must be formatter-like objects with a `format()`
     * method. An error is thrown if any argument fails validation.
     *
     * @param {...Formatter} formatters - Formatters to chain (in order)
     * @returns {CombinedFormatter} A new formatter that runs the chain
     * @throws {Error} If any argument lacks a `format()` method
     *
     * @example
     * const pipeline = Formatter.combine(
     *     new TimestampFormatter(),
     *     new LevelFilter({ level: LogLevel.WARN }),
     *     new JsonFormatter()
     * );
     * const result = pipeline.format(record);
     * // result is false if LevelFilter dropped it, otherwise JSON string
     */
    static combine(...formatters) {
        for (let i = 0; i < formatters.length; i++) {
            if (typeof formatters[i].format !== "function") {
                throw new Error("Formatter.combine(): all arguments must have a format() method");
            }
        }
        return new CombinedFormatter(formatters);
    }
}

/**
 * Pipeline executor that chains multiple formatters sequentially.
 *
 * Created by {@link Formatter.combine}, not intended for direct
 * instantiation. Iterates through its formatter list in order,
 * passing each record through the next formatter. Short-circuits
 * and returns `false` if any formatter returns a falsey value.
 *
 * @extends Formatter
 */
export class CombinedFormatter extends Formatter {

    /**
     * Create a CombinedFormatter.
     *
     * @param {Formatter[]} formatters - Array of formatter instances to chain
     */
    constructor(formatters) {
        super();

        /**
         * Ordered list of formatters to execute.
         * @type {Formatter[]}
         * @private
         */
        this._formatters = formatters;
    }

    /**
     * Run the formatter pipeline on a log record.
     *
     * Iterates through each formatter in order, passing the result of
     * one as the input to the next. If any formatter returns a falsey
     * value (null, undefined, false, 0, ""), the pipeline stops
     * immediately and returns `false` to signal the record was dropped.
     *
     * @param {Readonly<object>} record - Log record to transform
     * @returns {object|false} Final transformed record, or `false` if
     *          any formatter in the chain dropped the record
     */
    format(record) {
        let result = record;

        for (let i = 0; i < this._formatters.length; i++) {
            result = this._formatters[i].format(result);
            if (!result) {
                return false;
            }
        }

        return result;
    }
}
