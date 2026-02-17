/**
 * Terminal formatter that serializes a log record as a JSON string.
 *
 * Uses {@link Serializers.safeStringify} to produce the JSON output,
 * which safely handles circular references by replacing them with
 * `"[Circular]"`. The resulting string is stored in the record's
 * `_formatted` property rather than returned as a raw string, keeping
 * the record object intact for any downstream formatters in a
 * {@link Formatter.combine} pipeline.
 *
 * **Options:**
 * - `spacing` (`number|string|undefined`) -- Passed as the `space`
 *   parameter to `JSON.stringify`. When `undefined` (the default),
 *   compact single-line JSON is produced. Set to `2` for
 *   pretty-printed output.
 * - `replacer` (`function|undefined`) -- Custom replacer function
 *   with the same signature as `JSON.stringify`'s replacer. Chained
 *   after the internal circular-reference replacer, so circular
 *   references are always caught regardless of user logic.
 *
 * This is a **terminal formatter** -- it should typically be the last
 * formatter in a combine pipeline, since the `_formatted` property
 * represents the final output string for a handler.
 *
 * @see Formatter
 * @see Serializers.safeStringify
 */

import Formatter from "../Formatter.js";
import Serializers from "../Serializers.js";

export default class JsonFormatter extends Formatter {

    /**
     * Create a new JsonFormatter.
     *
     * @param {object} [options={}] - Configuration options
     * @param {number|string} [options.spacing] - JSON indentation (undefined = compact,
     *        number = spaces, string = prefix). Maps to `JSON.stringify`'s `space` parameter.
     * @param {function} [options.replacer] - Custom JSON.stringify replacer function.
     *        Chained after circular-reference detection.
     */
    constructor(options = {}) {
        super(options);

        /**
         * JSON.stringify space parameter for indentation control.
         * @type {number|string|undefined}
         * @private
         */
        this._spacing = options.spacing ?? undefined;

        /**
         * Optional JSON.stringify replacer function.
         * @type {function|undefined}
         * @private
         */
        this._replacer = options.replacer ?? undefined;
    }

    /**
     * Serialize the log record as a JSON string and store it in `_formatted`.
     *
     * The entire record is passed through {@link Serializers.safeStringify},
     * which handles circular references safely. The resulting JSON string
     * is attached as the `_formatted` property on a spread-copy of the
     * record.
     *
     * @param {Readonly<object>} record - Log record (may be frozen)
     * @returns {object} New record object with `_formatted` containing the JSON string
     */
    format(record) {
        const json = Serializers.safeStringify(record, this._replacer, this._spacing);
        return { ...record, _formatted: json };
    }
}
