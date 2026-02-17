/**
 * Path-based redaction engine for sensitive data in log records.
 *
 * Redactor accepts dot-notation paths (e.g., "password", "user.ssn",
 * "headers.authorization") and replaces matching values in log records
 * with a configurable censor string, function result, or by removing
 * the key entirely.
 *
 * **Design principles:**
 * - **Standalone** -- zero imports, no dependencies on Logger or any
 *   other module in the logging system.
 * - **Immutable input** -- `redact()` always returns a new object;
 *   the original frozen record is never mutated.
 * - **Prototype pollution prevention** -- `__proto__`, `constructor`,
 *   and `prototype` keys are never traversed.
 * - **CSP-safe** -- no `eval`, `new Function`, or dynamic code
 *   generation. Paths are parsed into segment arrays and walked
 *   interpretively.
 *
 * **Two construction forms:**
 *
 * 1. Array form: `new Redactor(["password", "user.ssn"])`
 *    - Defaults to censor `"[REDACTED]"`, remove `false`
 *
 * 2. Object form: `new Redactor({ paths: [...], censor: "***", remove: false })`
 *    - Explicit censor string/function and remove flag
 *
 * **Path syntax:**
 * - `"a.b.c"` -- nested dot notation
 * - `"a['b'].c"` -- bracket notation with quotes
 * - `"a[0].b"` -- numeric index
 * - `"a[*].b"` -- wildcard (iterates all own enumerable keys)
 *
 * @see Logger
 */

// ---- Module-level constants ----

/**
 * Keys that must never be traversed during redaction to prevent
 * prototype pollution attacks.
 * @type {Set<string>}
 */
const BANNED_KEYS = new Set(["__proto__", "constructor", "prototype"]);

export default class Redactor {

    // ---- Private instance fields ----

    /** @type {Array<string[]>} Parsed path segment arrays */
    #paths;

    /** @type {string|function|null} Replacement value, function, or null (remove mode) */
    #censor;

    /** @type {boolean} True = delete key, false = replace value */
    #remove;

    // ---- Constructor ----

    /**
     * Create a new Redactor instance.
     *
     * @param {string[]|object} config - Array of dot-notation paths, or
     *        options object with `paths`, `censor`, and `remove` keys
     * @param {string[]} [config.paths] - Dot-notation paths to redact
     * @param {string|function} [config.censor="[REDACTED]"] - Replacement
     *        value or function `(value) => replacement`
     * @param {boolean} [config.remove=false] - If true, delete the key
     *        instead of replacing the value
     * @throws {Error} If config is not an array or plain object
     */
    constructor(config) {
        if (Array.isArray(config)) {
            // Array form: new Redactor(["password", "user.ssn"])
            this.#paths = config.map(Redactor.parsePath);
            this.#censor = "[REDACTED]";
            this.#remove = false;
        } else if (config !== null && typeof config === "object") {
            // Object form: new Redactor({ paths: [...], censor: "***", remove: false })
            const paths = config.paths || [];
            this.#paths = paths.map(Redactor.parsePath);
            this.#censor = config.censor !== undefined ? config.censor : "[REDACTED]";
            this.#remove = !!config.remove;
        } else {
            throw new Error("Redactor: config must be an array of paths or an options object");
        }
    }

    // ---- Static methods ----

    /**
     * Parse a dot-notation path string into an array of segments.
     *
     * Character-by-character parser that handles:
     * - Dot-separated segments: `"a.b.c"` -> `["a", "b", "c"]`
     * - Bracket notation with quotes: `"a['b'].c"` -> `["a", "b", "c"]`
     * - Numeric bracket indices: `"a[0].b"` -> `["a", "0", "b"]`
     * - Wildcard segments: `"a[*].b"` -> `["a", "*", "b"]`
     *
     * @param {string} path - Dot-notation path string
     * @returns {string[]} Array of path segments
     * @throws {Error} If bracket syntax is malformed (unclosed bracket)
     * @static
     */
    static parsePath(path) {
        const segments = [];
        let current = "";
        let i = 0;

        while (i < path.length) {
            const ch = path[i];

            if (ch === ".") {
                // Dot separator -- flush current segment
                if (current.length > 0) {
                    segments.push(current);
                    current = "";
                }
                i++;
            } else if (ch === "[") {
                // Bracket start -- flush current segment first
                if (current.length > 0) {
                    segments.push(current);
                    current = "";
                }
                i++; // skip '['

                // Check for quoted bracket content
                if (i < path.length && (path[i] === "'" || path[i] === '"')) {
                    const quote = path[i];
                    i++; // skip opening quote
                    let bracketContent = "";
                    while (i < path.length && path[i] !== quote) {
                        bracketContent += path[i];
                        i++;
                    }
                    if (i < path.length) i++; // skip closing quote
                    // Expect closing bracket
                    if (i < path.length && path[i] === "]") {
                        i++; // skip ']'
                    } else {
                        throw new Error("Unclosed bracket in redaction path: " + path);
                    }
                    segments.push(bracketContent);
                } else {
                    // Unquoted bracket content (numeric index or wildcard)
                    let bracketContent = "";
                    while (i < path.length && path[i] !== "]") {
                        bracketContent += path[i];
                        i++;
                    }
                    if (i >= path.length) {
                        throw new Error("Unclosed bracket in redaction path: " + path);
                    }
                    i++; // skip ']'
                    segments.push(bracketContent);
                }
            } else {
                // Regular character -- accumulate
                current += ch;
                i++;
            }
        }

        // Flush trailing segment
        if (current.length > 0) {
            segments.push(current);
        }

        return segments;
    }

    // ---- Public instance methods ----

    /**
     * Whether this redactor has any paths configured.
     *
     * A redactor with no paths is a no-op -- `redact()` returns the
     * original record without copying.
     *
     * @type {boolean}
     */
    get hasPaths() {
        return this.#paths.length > 0;
    }

    /**
     * Redact sensitive values from a log record.
     *
     * Creates a shallow copy of the record and walks each configured
     * path, replacing or removing matching values. The original record
     * is never mutated.
     *
     * If no paths are configured, returns the original record directly
     * (no copy needed since nothing would be modified).
     *
     * @param {object} record - Frozen log record to redact
     * @returns {object} New record with sensitive values redacted
     */
    redact(record) {
        if (this.#paths.length === 0) return record;

        const result = { ...record };
        for (const segments of this.#paths) {
            this._redactPath(result, segments, 0);
        }
        return result;
    }

    // ---- Private instance methods ----

    /**
     * Recursively walk a path and apply censoring at the terminal segment.
     *
     * At each step:
     * - Checks that the current object is traversable (non-null object)
     * - Skips banned keys (`__proto__`, `constructor`, `prototype`)
     * - On wildcard `*`, iterates all own enumerable keys
     * - Before recursing into a nested object, creates a shallow copy
     *   to prevent mutating shared references from the original record
     *
     * @param {object} obj - Current object being traversed (may be mutated)
     * @param {string[]} segments - Parsed path segments
     * @param {number} index - Current position in the segments array
     * @private
     */
    _redactPath(obj, segments, index) {
        if (obj === null || obj === undefined || typeof obj !== "object") return;
        if (index >= segments.length) return;

        const key = segments[index];
        const isLast = (index === segments.length - 1);

        if (key === "*") {
            // Wildcard -- iterate all own enumerable keys
            const keys = Object.keys(obj);
            for (const k of keys) {
                if (BANNED_KEYS.has(k)) continue;

                if (isLast) {
                    this._applyCensor(obj, k);
                } else {
                    // Deep-copy nested value before recursing
                    if (obj[k] !== null && typeof obj[k] === "object") {
                        obj[k] = Array.isArray(obj[k]) ? [...obj[k]] : { ...obj[k] };
                        this._redactPath(obj[k], segments, index + 1);
                    }
                }
            }
        } else {
            // Named key
            if (BANNED_KEYS.has(key)) return;
            if (!(key in obj)) return;

            if (isLast) {
                this._applyCensor(obj, key);
            } else {
                // Deep-copy nested value before recursing
                if (obj[key] !== null && typeof obj[key] === "object") {
                    obj[key] = Array.isArray(obj[key]) ? [...obj[key]] : { ...obj[key] };
                    this._redactPath(obj[key], segments, index + 1);
                }
            }
        }
    }

    /**
     * Apply the configured censoring strategy to a single key.
     *
     * Three modes:
     * 1. **Remove mode** (`#remove = true`) -- deletes the key from the object
     * 2. **Function censor** -- calls `#censor(value)` and assigns the result
     * 3. **String censor** -- assigns the censor string directly
     *
     * @param {object} obj - Object containing the key to censor
     * @param {string} key - Key whose value should be censored
     * @private
     */
    _applyCensor(obj, key) {
        if (this.#remove) {
            delete obj[key];
        } else if (typeof this.#censor === "function") {
            obj[key] = this.#censor(obj[key]);
        } else {
            obj[key] = this.#censor;
        }
    }
}
