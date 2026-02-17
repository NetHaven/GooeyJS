/**
 * Enrichment formatter that adds a timestamp field to the log record.
 *
 * Supports three timestamp formats:
 * - `"iso"` (default) -- ISO 8601 string via `new Date().toISOString()`
 * - `"epoch"` -- Milliseconds since Unix epoch via `Date.now()`
 * - A custom function -- Receives a `Date` object and returns any value
 *
 * An optional `alias` option duplicates the timestamp value under a second
 * field name, useful when downstream consumers expect different field names
 * (e.g., `timestamp` for human-readable logs and `ts` for machine parsing).
 *
 * Because log records may be frozen ({@link LogRecord.create}), the record
 * is always spread-copied before modification.
 *
 * **Options:**
 * - `format` (`"iso"|"epoch"|function`) -- Timestamp format (default `"iso"`)
 * - `alias` (`string|undefined`) -- Optional second field name for the
 *   timestamp value
 *
 * @example
 * // Default ISO timestamp
 * const fmt = new TimestampFormatter();
 * fmt.format(record); // { ...record, timestamp: "2026-02-17T02:20:40.123Z" }
 *
 * @example
 * // Epoch timestamp with alias
 * const fmt = new TimestampFormatter({ format: "epoch", alias: "ts" });
 * fmt.format(record); // { ...record, timestamp: 1771294840123, ts: 1771294840123 }
 *
 * @example
 * // Custom format function
 * const fmt = new TimestampFormatter({ format: (d) => d.toLocaleTimeString() });
 * fmt.format(record); // { ...record, timestamp: "9:20:40 PM" }
 *
 * @see Formatter
 */

import Formatter from "../Formatter.js";

export default class TimestampFormatter extends Formatter {

    /**
     * Create a new TimestampFormatter.
     *
     * @param {object} [options={}] - Configuration options
     * @param {"iso"|"epoch"|function} [options.format="iso"] - Timestamp format.
     *        `"iso"` produces an ISO 8601 string, `"epoch"` produces milliseconds
     *        since Unix epoch, and a function receives a `Date` and returns any value.
     * @param {string} [options.alias] - Optional second field name to duplicate
     *        the timestamp value under (e.g., `"ts"` or `"@timestamp"`)
     */
    constructor(options = {}) {
        super(options);

        /**
         * Timestamp format: `"iso"`, `"epoch"`, or a custom function.
         * @type {"iso"|"epoch"|function}
         * @private
         */
        this._format = options.format ?? "iso";

        /**
         * Optional alias field name for the timestamp value.
         * @type {string|undefined}
         * @private
         */
        this._alias = options.alias ?? undefined;
    }

    /**
     * Add a `timestamp` field to the log record.
     *
     * The timestamp value is determined by the configured format:
     * - `"iso"` -- `new Date().toISOString()`
     * - `"epoch"` -- `Date.now()`
     * - function -- `this._format(new Date())`
     *
     * If an alias is configured, the timestamp value is also stored under
     * the alias field name.
     *
     * @param {Readonly<object>} record - Log record (may be frozen)
     * @returns {object} New record with `timestamp` field (and alias if configured)
     */
    format(record) {
        let timestamp;

        if (typeof this._format === "function") {
            timestamp = this._format(new Date());
        } else if (this._format === "epoch") {
            timestamp = Date.now();
        } else {
            timestamp = new Date().toISOString();
        }

        const result = { ...record, timestamp };

        if (this._alias) {
            result[this._alias] = timestamp;
        }

        return result;
    }
}
