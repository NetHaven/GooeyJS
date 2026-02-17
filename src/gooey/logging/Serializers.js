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
 * dependencies. Standard serializer functions (err, element, event,
 * req, res) and a circular-reference-safe `safeStringify()` utility
 * are provided as static members.
 *
 * @see LogRecord
 */
export default class Serializers {

    // ---- Constants ----

    /**
     * Maximum depth for recursive Error cause chain traversal.
     * Used by {@link Serializers.err} to prevent infinite recursion when
     * serializing deeply nested Error.cause chains.
     * @type {number}
     */
    static MAX_CAUSE_DEPTH = 10;

    // ---- Standard serializers ----

    /**
     * Serialize an Error (or Error-like object) into a JSON-safe plain object.
     *
     * Produces an object with `type`, `message`, and `stack` fields. If the
     * error has a `cause` property, the cause chain is traversed recursively
     * up to {@link Serializers.MAX_CAUSE_DEPTH} levels. If the error is an
     * `AggregateError` (or duck-typed equivalent with an `errors` Array),
     * each element is serialized recursively.
     *
     * Enumerable custom properties on the error (e.g., `code`, `statusCode`)
     * are preserved in the output.
     *
     * If `err` is not Error-like, it is returned unchanged.
     *
     * @param {*} err   - Value to serialize (typically an Error instance)
     * @param {number} [depth=0] - Current recursion depth (internal use)
     * @returns {object|*} Plain object representation, or `err` unchanged if not Error-like
     */
    static err(err, depth = 0) {
        if (!Serializers.#isErrorLike(err)) {
            return err;
        }

        const serialized = {
            type: err.constructor?.name || err.name || "Error",
            message: err.message,
            stack: err.stack
        };

        // Traverse cause chain with depth guard
        if (err.cause != null) {
            if (depth < Serializers.MAX_CAUSE_DEPTH) {
                serialized.cause = Serializers.#isErrorLike(err.cause)
                    ? Serializers.err(err.cause, depth + 1)
                    : err.cause;
            } else {
                serialized.cause = "[Max cause depth exceeded]";
            }
        }

        // Handle AggregateError.errors array
        if (Array.isArray(err.errors)) {
            serialized.errors = err.errors.map(e =>
                Serializers.#isErrorLike(e)
                    ? Serializers.err(e, depth + 1)
                    : e
            );
        }

        // Preserve enumerable custom properties
        const keys = Object.keys(err);
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            if (!(key in serialized) && key !== "cause" && key !== "errors") {
                serialized[key] = err[key];
            }
        }

        return serialized;
    }

    /**
     * Serialize a DOM Element into a JSON-safe plain object.
     *
     * Extracts `tagName`, `id`, `classList`, and non-id/class `attributes`.
     * Does NOT include innerHTML or outerHTML to avoid large payloads.
     *
     * If `el` is not an Element instance, it is returned unchanged.
     *
     * @param {*} el - Value to serialize (typically a DOM Element)
     * @returns {object|*} Plain object representation, or `el` unchanged if not an Element
     */
    static element(el) {
        if (!(el instanceof Element)) {
            return el;
        }

        const serialized = {
            tagName: el.tagName
        };

        if (el.id) {
            serialized.id = el.id;
        }

        if (el.classList.length > 0) {
            serialized.classList = Array.from(el.classList);
        }

        // Collect attributes other than id and class
        const attrs = {};
        let hasAttrs = false;
        for (let i = 0; i < el.attributes.length; i++) {
            const attr = el.attributes[i];
            if (attr.name !== "id" && attr.name !== "class") {
                attrs[attr.name] = attr.value;
                hasAttrs = true;
            }
        }
        if (hasAttrs) {
            serialized.attributes = attrs;
        }

        return serialized;
    }

    /**
     * Serialize a browser Event into a JSON-safe plain object.
     *
     * Extracts `type`, `timeStamp`, `bubbles`, `cancelable`,
     * `defaultPrevented`, `isTrusted`, `target`, and `currentTarget`.
     *
     * Both `target` and `currentTarget` are safely handled since
     * `currentTarget` is null outside the handler execution scope. Element
     * targets are reduced to `{ tagName, id }` objects.
     *
     * If `evt` is not an Event instance, it is returned unchanged.
     *
     * @param {*} evt - Value to serialize (typically a browser Event)
     * @returns {object|*} Plain object representation, or `evt` unchanged if not an Event
     */
    static event(evt) {
        if (!(evt instanceof Event)) {
            return evt;
        }

        const serialized = {
            type: evt.type,
            timeStamp: evt.timeStamp,
            bubbles: evt.bubbles,
            cancelable: evt.cancelable,
            defaultPrevented: evt.defaultPrevented,
            isTrusted: evt.isTrusted
        };

        // Safely serialize target (may be null)
        serialized.target = Serializers.#serializeEventTarget(evt.target);

        // Safely serialize currentTarget (null outside handler scope)
        serialized.currentTarget = Serializers.#serializeEventTarget(evt.currentTarget);

        return serialized;
    }

    /**
     * Serialize a Fetch API Request into a JSON-safe plain object.
     *
     * Extracts `method`, `url`, and `headers`.
     *
     * If `req` is not a Request instance, it is returned unchanged.
     *
     * @param {*} req - Value to serialize (typically a Fetch API Request)
     * @returns {object|*} Plain object representation, or `req` unchanged if not a Request
     */
    static req(req) {
        if (!(req instanceof Request)) {
            return req;
        }

        return {
            method: req.method,
            url: req.url,
            headers: Object.fromEntries(req.headers.entries())
        };
    }

    /**
     * Serialize a Fetch API Response into a JSON-safe plain object.
     *
     * Extracts `status`, `statusText`, `url`, and `headers`.
     *
     * If `res` is not a Response instance, it is returned unchanged.
     *
     * @param {*} res - Value to serialize (typically a Fetch API Response)
     * @returns {object|*} Plain object representation, or `res` unchanged if not a Response
     */
    static res(res) {
        if (!(res instanceof Response)) {
            return res;
        }

        return {
            status: res.status,
            statusText: res.statusText,
            url: res.url,
            headers: Object.fromEntries(res.headers.entries())
        };
    }

    /**
     * Pre-built serializer map for common log record field names.
     *
     * Maps field names to the corresponding standard serializer functions.
     * Frozen to prevent accidental mutation. Use {@link Serializers.addSerializers}
     * to create extended maps from this base.
     *
     * @type {Readonly<Object<string, function>>}
     */
    static standard = Object.freeze({
        err: Serializers.err,
        element: Serializers.element,
        event: Serializers.event,
        req: Serializers.req,
        res: Serializers.res
    });

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
     * Serialize an EventTarget for inclusion in event serialization output.
     *
     * If the target is an Element, returns `{ tagName, id }`. If the target
     * is null, returns null. Otherwise returns `String(target)`.
     *
     * @param {EventTarget|null} target - Event target to serialize
     * @returns {object|string|null} Serialized representation
     */
    static #serializeEventTarget(target) {
        if (target == null) {
            return null;
        }
        if (target instanceof Element) {
            const result = { tagName: target.tagName };
            if (target.id) {
                result.id = target.id;
            }
            return result;
        }
        return String(target);
    }

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
