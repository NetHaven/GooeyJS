/**
 * Terminal formatter that produces human-readable single-line log output.
 *
 * Output format:
 * ```
 * LEVEL [name] message  key=value key=value
 * ```
 *
 * The "extra fields" section (after the message) contains all record
 * properties that are NOT part of the core schema or internal metadata.
 * Core and internal fields are excluded:
 * - `v`, `level`, `levelName`, `name`, `msg`, `time` (core schema)
 * - `_formatted`, `_levelColor` (internal pipeline fields)
 *
 * Object-valued extra fields are stringified using
 * {@link Serializers.safeStringify} to safely handle circular references.
 * Primitive values are used as-is.
 *
 * The formatted string is stored in the record's `_formatted` property
 * on a spread-copy of the original record, keeping the record object
 * intact for any downstream formatters in a {@link Formatter.combine}
 * pipeline.
 *
 * @see Formatter
 * @see Serializers.safeStringify
 */

import Formatter from "../Formatter.js";
import Serializers from "../Serializers.js";

export default class SimpleFormatter extends Formatter {

    /**
     * Set of field names excluded from the extra key=value output.
     *
     * Contains core log record schema fields and internal pipeline
     * metadata fields that are already represented in the structured
     * prefix (`LEVEL [name] message`).
     *
     * @type {Set<string>}
     */
    static #CORE_FIELDS = new Set([
        "v", "level", "levelName", "name", "msg", "time",
        "_formatted", "_levelColor"
    ]);

    /**
     * Format a log record as a human-readable single-line string.
     *
     * Produces output in the format:
     * ```
     * LEVEL [name] message  key=value key=value
     * ```
     *
     * Extra fields (those not in {@link SimpleFormatter.#CORE_FIELDS})
     * are appended as `key=value` pairs separated by spaces. Object
     * values are serialized via {@link Serializers.safeStringify}.
     *
     * @param {Readonly<object>} record - Log record (may be frozen)
     * @returns {object} New record object with `_formatted` containing
     *          the human-readable string
     */
    format(record) {
        const level = (record.levelName || "???").toUpperCase();
        const name = record.name || "anonymous";
        const msg = record.msg ?? "";

        // Collect non-core extra fields as key=value pairs
        const extras = [];
        const keys = Object.keys(record);

        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            if (SimpleFormatter.#CORE_FIELDS.has(key)) {
                continue;
            }

            const value = record[key];
            if (typeof value === "object" && value !== null) {
                extras.push(`${key}=${Serializers.safeStringify(value)}`);
            } else {
                extras.push(`${key}=${value}`);
            }
        }

        let formatted = `${level} [${name}] ${msg}`;
        if (extras.length > 0) {
            formatted += "  " + extras.join(" ");
        }

        return { ...record, _formatted: formatted };
    }
}
