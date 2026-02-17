/**
 * Enrichment formatter that collects non-core fields into a `metadata`
 * sub-object, keeping the top-level record clean and predictable.
 *
 * By default the "core" fields that remain at the top level are:
 * `v`, `level`, `levelName`, `name`, `msg`, `time`. Every other field
 * is moved into `record.metadata`. Fields whose key starts with `_`
 * (the internal formatter-communication convention, e.g. `_formatted`,
 * `_levelColor`) are always kept at the top level and never collected
 * into metadata.
 *
 * The set of core fields can be customised via the `fillExcept` option,
 * which replaces the default set entirely. The underscore-prefix
 * exclusion always applies regardless of the `fillExcept` value.
 *
 * Because log records may be frozen ({@link LogRecord.create}), the
 * formatter always returns a new object -- the original record is never
 * mutated.
 *
 * **Options:**
 * - `fillExcept` (`string[]`) -- Field names to keep at the top level.
 *   Defaults to `["v", "level", "levelName", "name", "msg", "time"]`.
 *   Underscore-prefixed fields are always excluded from metadata
 *   regardless of this option.
 *
 * @example
 * const fmt = new MetadataFormatter();
 * fmt.format({ v: 1, level: 3, levelName: "info", name: "app",
 *              msg: "hi", time: "...", userId: 42, reqId: "abc" });
 * // => { v: 1, level: 3, ..., metadata: { userId: 42, reqId: "abc" } }
 *
 * @example
 * // Custom core fields
 * const fmt = new MetadataFormatter({ fillExcept: ["v", "level", "msg"] });
 * fmt.format({ v: 1, level: 3, msg: "hi", name: "app", extra: true });
 * // => { v: 1, level: 3, msg: "hi", metadata: { name: "app", extra: true } }
 *
 * @see Formatter
 */

import Formatter from "../Formatter.js";

export default class MetadataFormatter extends Formatter {

    /**
     * Default set of core field names that remain at the top level.
     * @type {Set<string>}
     */
    static #DEFAULT_CORE = new Set(["v", "level", "levelName", "name", "msg", "time"]);

    /**
     * Create a new MetadataFormatter.
     *
     * @param {object} [options={}] - Configuration options
     * @param {string[]} [options.fillExcept] - Field names to keep at the
     *        top level. Replaces the default core set when provided.
     *        Underscore-prefixed fields are always excluded from metadata
     *        regardless of this option.
     */
    constructor(options = {}) {
        super(options);

        /**
         * Set of field names to keep at the top level (not collected
         * into metadata).
         * @type {Set<string>}
         * @private
         */
        this._fillExcept = new Set(options.fillExcept ?? MetadataFormatter.#DEFAULT_CORE);
    }

    /**
     * Collect non-core fields into a `metadata` sub-object.
     *
     * Iterates all keys of the input record. Fields whose key is in
     * the `fillExcept` set or whose key starts with `_` are kept at
     * the top level. All other fields are moved into a `metadata`
     * object. If no fields are collected, the `metadata` key is
     * omitted entirely.
     *
     * @param {Readonly<object>} record - Log record (may be frozen)
     * @returns {object} New record with non-core fields collected into
     *          `metadata` (or unchanged if all fields are core)
     */
    format(record) {
        const metadata = {};
        const result = {};
        let hasMetadata = false;

        const keys = Object.keys(record);

        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];

            if (this._fillExcept.has(key) || key.charAt(0) === "_") {
                result[key] = record[key];
            } else {
                metadata[key] = record[key];
                hasMetadata = true;
            }
        }

        if (hasMetadata) {
            result.metadata = metadata;
        }

        return result;
    }
}
