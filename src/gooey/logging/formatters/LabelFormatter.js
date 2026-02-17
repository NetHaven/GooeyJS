/**
 * Enrichment formatter that adds a static label to the log record.
 *
 * Operates in one of two modes:
 * - **Field mode** (default) -- Adds a `label` field to the record with
 *   the configured label string.
 * - **Message mode** (`message: true`) -- Prepends `[label]` to the
 *   record's `msg` field instead of adding a separate field. Useful for
 *   simple text-based log output where a dedicated label field is not
 *   needed.
 *
 * Because log records may be frozen ({@link LogRecord.create}), the record
 * is always spread-copied before modification.
 *
 * **Options:**
 * - `label` (`string`) -- The label text (default `""`)
 * - `message` (`boolean`) -- If `true`, prepend `[label]` to `msg`
 *   instead of adding a separate `label` field (default `false`)
 *
 * @example
 * // Field mode (default)
 * const fmt = new LabelFormatter({ label: "API" });
 * fmt.format(record); // { ...record, label: "API" }
 *
 * @example
 * // Message-prepend mode
 * const fmt = new LabelFormatter({ label: "API", message: true });
 * fmt.format({ msg: "request received" });
 * // { msg: "[API] request received" }
 *
 * @see Formatter
 */

import Formatter from "../Formatter.js";

export default class LabelFormatter extends Formatter {

    /**
     * Create a new LabelFormatter.
     *
     * @param {object} [options={}] - Configuration options
     * @param {string} [options.label=""] - Static label string to add to records
     * @param {boolean} [options.message=false] - If `true`, prepend `[label]` to
     *        the `msg` field instead of adding a separate `label` field
     */
    constructor(options = {}) {
        super(options);

        /**
         * The static label string.
         * @type {string}
         * @private
         */
        this._label = options.label ?? "";

        /**
         * Whether to prepend the label to the message field.
         * @type {boolean}
         * @private
         */
        this._message = options.message ?? false;
    }

    /**
     * Add a label to the log record.
     *
     * In message mode, prepends `[label]` to the `msg` field. In field
     * mode, adds a `label` property with the configured label string.
     *
     * @param {Readonly<object>} record - Log record (may be frozen)
     * @returns {object} New record with label applied (field or message-prepend)
     */
    format(record) {
        if (this._message) {
            return { ...record, msg: `[${this._label}] ${record.msg ?? ""}` };
        }

        return { ...record, label: this._label };
    }
}
