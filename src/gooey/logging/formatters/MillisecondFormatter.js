/**
 * Enrichment formatter that adds an `ms` field showing the elapsed time
 * since the previous log call, in the format `"+Nms"`.
 *
 * This is a **stateful** formatter -- each instance tracks the timestamp
 * of the previous `format()` call internally. The first call always
 * produces `"+0ms"` (no previous reference point). Subsequent calls
 * compute the delta using {@link performance.now} for high-resolution
 * sub-millisecond precision, then round to the nearest millisecond.
 *
 * **WARNING:** Do not share a single MillisecondFormatter instance
 * across multiple loggers. Each logger should create its own instance
 * so that the elapsed-time deltas are meaningful for that logger's
 * call cadence. Sharing an instance would produce interleaved,
 * misleading timing values.
 *
 * Because log records may be frozen ({@link LogRecord.create}), the
 * record is always spread-copied before the `ms` field is added.
 *
 * @example
 * const fmt = new MillisecondFormatter();
 * fmt.format(record);  // => { ...record, ms: "+0ms" }
 * // ... some time passes ...
 * fmt.format(record);  // => { ...record, ms: "+42ms" }
 *
 * @see Formatter
 */

import Formatter from "../Formatter.js";

export default class MillisecondFormatter extends Formatter {

    /**
     * Create a new MillisecondFormatter.
     *
     * Initialises the internal previous-time tracker to `0`, which
     * causes the first `format()` call to produce `"+0ms"`.
     *
     * @param {object} [options={}] - Configuration options (reserved
     *        for future use; currently unused)
     */
    constructor(options = {}) {
        super(options);

        /**
         * Timestamp of the previous `format()` call, obtained from
         * {@link performance.now}. Initialised to `0` so the first
         * call produces a zero delta.
         * @type {number}
         * @private
         */
        this._prevTime = 0;
    }

    /**
     * Add an `ms` field with the elapsed time since the previous call.
     *
     * Uses {@link performance.now} for high-resolution timing. The
     * delta is rounded to the nearest integer millisecond and formatted
     * as `"+Nms"` (e.g. `"+0ms"`, `"+17ms"`, `"+1204ms"`).
     *
     * @param {Readonly<object>} record - Log record (may be frozen)
     * @returns {object} New record with `ms` field added
     */
    format(record) {
        const now = performance.now();
        const diff = this._prevTime ? Math.round(now - this._prevTime) : 0;
        this._prevTime = now;

        return { ...record, ms: `+${diff}ms` };
    }
}
