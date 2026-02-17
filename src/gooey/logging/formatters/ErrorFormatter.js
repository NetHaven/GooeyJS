/**
 * Enrichment formatter that serializes Error objects in the log record.
 *
 * Operates on the record's `err` field specifically. When the field contains
 * an Error (or Error-like object), it is serialized into a plain JSON-safe
 * object using {@link Serializers.err}. This produces a structured
 * representation with `type`, `message`, `stack`, and optionally `cause`
 * and `errors` (for AggregateError) fields.
 *
 * The `stack` option controls whether stack traces are included in the
 * serialized output. When `false`, the `stack` property is removed from
 * the serialized error. This is useful in production environments where
 * stack traces add noise to structured logs.
 *
 * If the record has no `err` field (or it is not an object), the record
 * is returned as-is without unnecessary allocation.
 *
 * Because log records may be frozen ({@link LogRecord.create}), the record
 * is spread-copied before modification when an `err` field is present.
 *
 * **Options:**
 * - `stack` (`boolean`) -- Whether to include stack traces in serialized
 *   errors (default `true`)
 *
 * @example
 * // Default: include stack traces
 * const fmt = new ErrorFormatter();
 * fmt.format({ err: new TypeError("bad input"), msg: "failed" });
 * // { err: { type: "TypeError", message: "bad input", stack: "..." }, msg: "failed" }
 *
 * @example
 * // Exclude stack traces
 * const fmt = new ErrorFormatter({ stack: false });
 * fmt.format({ err: new Error("oops") });
 * // { err: { type: "Error", message: "oops" } }
 *
 * @see Formatter
 * @see Serializers.err
 */

import Formatter from "../Formatter.js";
import Serializers from "../Serializers.js";

export default class ErrorFormatter extends Formatter {

    /**
     * Create a new ErrorFormatter.
     *
     * @param {object} [options={}] - Configuration options
     * @param {boolean} [options.stack=true] - Whether to include stack traces
     *        in serialized errors. Set to `false` for cleaner production logs.
     */
    constructor(options = {}) {
        super(options);

        /**
         * Whether to include stack traces in the serialized error output.
         * @type {boolean}
         * @private
         */
        this._stack = options.stack ?? true;
    }

    /**
     * Serialize the `err` field of the log record using {@link Serializers.err}.
     *
     * If the record has no `err` field or `err` is not an object, the record
     * is returned unchanged (no allocation). Otherwise, the error is
     * serialized and the `stack` property is optionally removed based on
     * the `stack` configuration option.
     *
     * @param {Readonly<object>} record - Log record (may be frozen)
     * @returns {object} Record with serialized `err` field, or original record if no err
     */
    format(record) {
        if (!record.err || typeof record.err !== "object") {
            return record;
        }

        const serializedErr = Serializers.err(record.err);

        if (!this._stack) {
            delete serializedErr.stack;
        }

        return { ...record, err: serializedErr };
    }
}
