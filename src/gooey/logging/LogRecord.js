/**
 * Structured log record factory for the GooeyJS logging system.
 *
 * Every log call in GooeyJS produces a plain frozen JavaScript object via
 * {@link LogRecord.create}. The record follows a consistent schema:
 * `v`, `level`, `levelName`, `name`, `msg` (or custom key), and `time`
 * (configurable), plus optional browser metadata and caller-provided fields.
 *
 * LogRecord is the data contract between all logging subsystems. Serializers,
 * formatters, and handlers all consume these plain objects.
 *
 * This is a pure static utility class (never instantiated). Its only
 * dependency is {@link LogLevel} from Phase 1.
 *
 * @see LogLevel
 */
import LogLevel from "./LogLevel.js";

export default class LogRecord {

    // ---- Schema version ----

    /** Format version -- increment on breaking schema changes */
    static LOG_VERSION = 1;

    // ---- Private session ID infrastructure ----

    /** @type {string|null} Cached session ID, generated once per page load */
    static #sessionId = null;

    /**
     * Lazy getter for the page-session UUID.
     * Uses `crypto.randomUUID()` when available (secure contexts),
     * otherwise falls back to manual UUID v4 generation.
     * @returns {string} UUID v4 string
     */
    static #getSessionId() {
        if (LogRecord.#sessionId === null) {
            if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
                LogRecord.#sessionId = crypto.randomUUID();
            } else {
                LogRecord.#sessionId = LogRecord.#fallbackUUID();
            }
        }
        return LogRecord.#sessionId;
    }

    /**
     * Generate a UUID v4 manually using crypto.getRandomValues.
     * Sets version nibble (byte 6) to 0x4x and variant bits (byte 8) to 0b10xx.
     * @returns {string} UUID v4 string formatted as xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
     */
    static #fallbackUUID() {
        const bytes = crypto.getRandomValues(new Uint8Array(16));

        // Set version: byte 6 upper nibble to 0100 (version 4)
        bytes[6] = (bytes[6] & 0x0f) | 0x40;
        // Set variant: byte 8 upper two bits to 10 (RFC 4122)
        bytes[8] = (bytes[8] & 0x3f) | 0x80;

        const hex = Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
        return (
            hex.slice(0, 8) + "-" +
            hex.slice(8, 12) + "-" +
            hex.slice(12, 16) + "-" +
            hex.slice(16, 20) + "-" +
            hex.slice(20)
        );
    }

    // ---- Standard timestamp functions ----

    /**
     * Frozen collection of named timestamp generator functions.
     * Pass one of these as the `timestamp` option to {@link LogRecord.create}.
     *
     * - `ISO`     -- ISO 8601 string (default when timestamp is true)
     * - `EPOCH`   -- milliseconds since Unix epoch (Date.now())
     * - `UNIX`    -- seconds since Unix epoch (floored)
     * - `NONE`    -- returns undefined (time field omitted from record)
     * - `HIGHRES` -- high-resolution float from performance.now()
     *
     * @type {Readonly<{ISO: function(): string, EPOCH: function(): number, UNIX: function(): number, NONE: function(): undefined, HIGHRES: function(): number}>}
     */
    static stdTimeFunctions = Object.freeze({
        ISO:     () => new Date().toISOString(),
        EPOCH:   () => Date.now(),
        UNIX:    () => Math.floor(Date.now() / 1000),
        NONE:    () => undefined,
        HIGHRES: () => performance.now()
    });

    // ---- Browser metadata ----

    /**
     * Returns an object containing browser metadata for the current page.
     *
     * Called per record creation (not cached) because `location.href`
     * may change in single-page applications.
     *
     * @returns {{ userAgent: string|undefined, url: string|undefined, sessionId: string }}
     */
    static defaultBase() {
        return {
            userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
            url:       typeof location !== "undefined" ? location.href : undefined,
            sessionId: LogRecord.#getSessionId()
        };
    }

    // ---- Record factory ----

    /**
     * Create a structured, frozen log record.
     *
     * Construction order ensures core schema fields always take precedence
     * over user-provided fields: user fields are applied first (lowest
     * priority), then browser metadata, then core fields (highest priority).
     *
     * @param {object}           options                - Record configuration
     * @param {number}           options.level          - Numeric severity level (e.g. LogLevel.INFO)
     * @param {string}           options.name           - Logger name / source identifier
     * @param {*}                [options.msg]          - Log message
     * @param {object}           [options.fields]       - Additional user-defined fields to merge
     * @param {object|null}      [options.base]         - Browser metadata override: undefined = auto, null = disabled, object = custom
     * @param {boolean|function} [options.timestamp=true] - Timestamp mode: true = ISO (default), false = omit, function = custom generator
     * @param {string}           [options.messageKey="msg"] - Key name for the message field in the output record
     * @param {string}           [options.errorKey="err"]   - Key name for error field (accepted for forward compatibility; not used in record construction yet -- actual error-to-field mapping belongs in Logger/serializers)
     * @param {string}           [options.nestedKey]    - If set, user fields are wrapped under this key instead of merged at top level
     * @returns {Readonly<object>} Frozen plain object representing the log record
     */
    static create({ level, name, msg, fields, base, timestamp = true, messageKey = "msg", errorKey = "err", nestedKey }) {
        // errorKey is accepted for forward compatibility but intentionally
        // not used in record construction. Error-to-field mapping will be
        // handled by Logger (Phase 7) and serializers (Phase 3).

        const record = {};

        // 1. User fields FIRST (lowest priority)
        if (fields) {
            if (nestedKey) {
                record[nestedKey] = fields;
            } else {
                Object.assign(record, fields);
            }
        }

        // 2. Browser metadata SECOND
        if (base === null) {
            // Explicitly disabled -- skip
        } else if (base !== undefined) {
            // Custom base object provided
            Object.assign(record, base);
        } else {
            // Default browser metadata
            Object.assign(record, LogRecord.defaultBase());
        }

        // 3. Core schema fields LAST (highest priority -- always win)
        record.v = LogRecord.LOG_VERSION;
        record.level = level;
        record.levelName = LogLevel.toName(level);
        record.name = name;

        // 4. Message (using configurable key name)
        if (msg !== undefined) {
            record[messageKey] = msg;
        }

        // 5. Timestamp
        if (timestamp === false) {
            // Omit time field entirely
        } else if (typeof timestamp === "function") {
            const t = timestamp();
            if (t !== undefined) {
                record.time = t;
            }
        } else {
            // Default: ISO 8601
            record.time = LogRecord.stdTimeFunctions.ISO();
        }

        // 6. Freeze and return
        return Object.freeze(record);
    }
}
