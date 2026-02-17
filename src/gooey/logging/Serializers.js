/**
 * Field-mapped serializer registry and application engine for the GooeyJS
 * logging system.
 *
 * A "serializer" is a plain function that transforms a single field value
 * within a log record before it reaches formatters and handlers. Serializers
 * are registered as a plain object whose keys correspond to record field
 * names and whose values are transform functions:
 *
 *     { err: (val) => ({ message: val.message, stack: val.stack }) }
 *
 * When {@link Serializers.apply} encounters a record field that matches a
 * serializer key, it calls the transform and replaces the field value with
 * the result. Fields without matching serializers pass through unchanged.
 *
 * Because log records produced by {@link LogRecord.create} are frozen
 * (`Object.freeze`), `apply()` spread-copies the record into a new unfrozen
 * object before making any modifications. When no serializers match, the
 * original frozen record is returned as-is (no unnecessary allocation).
 *
 * This is a pure static utility class (never instantiated) with zero
 * dependencies. Standard serializer functions (err, element, event, etc.)
 * are added in Plan 03-02.
 *
 * @see LogRecord
 */
export default class Serializers {

    // ---- Constants ----

    /**
     * Maximum depth for recursive Error cause chain traversal.
     * Used by the standard `err` serializer (Plan 03-02) to prevent
     * infinite recursion when serializing deeply nested Error.cause chains.
     * @type {number}
     */
    static MAX_CAUSE_DEPTH = 10;

    // ---- Core API ----

    /**
     * Apply field-mapped serializers to a log record.
     *
     * For each key in `serializers`, if the record contains that key with a
     * non-null value, the corresponding serializer function is called with
     * the field value. The transformed value replaces the original.
     *
     * If a serializer function throws, the field value is replaced with an
     * error indicator string rather than crashing the logging pipeline.
     *
     * The input record may be frozen (from {@link LogRecord.create}). When
     * transforms are applied, a new unfrozen object is returned via spread
     * copy (`{ ...record }`). When no transforms are needed (no serializers,
     * or no matching fields), the original record is returned unchanged.
     *
     * @param {Readonly<object>} record      - Log record (may be frozen)
     * @param {Object<string, function>} [serializers] - Map of field names to transform functions
     * @returns {object} Transformed record (new object if modified, original if not)
     */
    static apply(record, serializers) {
        if (!serializers) {
            return record;
        }

        // Check if any serializer key matches a non-null field in the record
        const keys = Object.keys(serializers);
        let hasMatch = false;

        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            if (key in record && record[key] != null) {
                hasMatch = true;
                break;
            }
        }

        if (!hasMatch) {
            return record;
        }

        // Spread-copy to create an unfrozen working copy
        const result = { ...record };

        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            if (key in result && result[key] != null) {
                try {
                    result[key] = serializers[key](result[key]);
                } catch (e) {
                    result[key] = `[Serializer error: ${e.message}]`;
                }
            }
        }

        return result;
    }

    /**
     * Merge two serializer maps into a new object.
     *
     * Keys in `additions` override keys in `existing`. Neither input
     * object is mutated; a new object is always returned.
     *
     * @param {Object<string, function>} existing  - Base serializer map
     * @param {Object<string, function>} additions - Serializers to add/override
     * @returns {Object<string, function>} New merged serializer map
     */
    static addSerializers(existing, additions) {
        return { ...existing, ...additions };
    }

    // ---- Private helpers ----

    /**
     * Duck-type check for Error-like objects.
     *
     * Returns true if `obj` is an `Error` instance OR if it quacks like
     * one: a non-null object with a `message` property of type "string".
     *
     * The duck-type path exists because `instanceof Error` fails for
     * objects originating from different JavaScript realms (e.g., iframes,
     * Web Workers, cross-frame communication) where each realm has its own
     * `Error` constructor.
     *
     * @param {*} obj - Value to test
     * @returns {boolean} True if obj is Error-like
     */
    static #isErrorLike(obj) {
        if (obj instanceof Error) {
            return true;
        }
        return (
            obj !== null &&
            typeof obj === "object" &&
            typeof obj.message === "string"
        );
    }
}
