/**
 * Log severity level constants and utility methods.
 *
 * Provides numeric constants for 6 severity levels plus a SILENT sentinel,
 * bidirectional name/number conversion, level-enabled gating logic, and
 * pre-defined level sets (DEFAULT, NPM, SYSLOG).
 *
 * Lower numeric values indicate higher severity. SILENT (-1) is a threshold
 * sentinel that disables all logging output -- it is not a loggable level.
 *
 * This is a pure static utility class with zero dependencies. It serves as
 * the foundation of the GooeyJS logging system.
 */
export default class LogLevel {

    // ---- Level constants (lower = more severe) ----

    /** Fatal error -- application cannot continue */
    static FATAL = 0;

    /** Error -- operation failed but application can continue */
    static ERROR = 1;

    /** Warning -- unexpected situation that may indicate a problem */
    static WARN = 2;

    /** Informational -- normal operational messages */
    static INFO = 3;

    /** Debug -- detailed diagnostic information */
    static DEBUG = 4;

    /** Trace -- very fine-grained diagnostic information */
    static TRACE = 5;

    /** Silent sentinel -- disables all logging when used as threshold */
    static SILENT = -1;

    // ---- Private frozen lookup tables ----

    static #nameToNumber = Object.freeze({
        fatal:  0,
        error:  1,
        warn:   2,
        info:   3,
        debug:  4,
        trace:  5,
        silent: -1
    });

    static #numberToName = Object.freeze({
        [-1]: "silent",
        0: "fatal",
        1: "error",
        2: "warn",
        3: "info",
        4: "debug",
        5: "trace"
    });

    // ---- Conversion methods ----

    /**
     * Convert a numeric level to its string name.
     * @param {number} num - Level number
     * @returns {string|undefined} Level name (lowercase) or undefined if invalid
     */
    static toName(num) {
        return LogLevel.#numberToName[num];
    }

    /**
     * Convert a string level name to its numeric value.
     * Input is case-insensitive.
     * @param {string} name - Level name (e.g. "info", "INFO", "Info")
     * @returns {number|undefined} Level number or undefined if invalid
     */
    static toNumber(name) {
        return LogLevel.#nameToNumber[name.toLowerCase()];
    }

    // ---- Gating ----

    /**
     * Check whether a candidate level is enabled given a threshold.
     *
     * A level is enabled when its numeric value is less than or equal to the
     * threshold value. With lower-is-more-severe numbering, ERROR (1) IS
     * enabled at an INFO (3) threshold because 1 <= 3.
     *
     * SILENT as either threshold or candidate always returns false:
     * - SILENT threshold means "log nothing"
     * - SILENT candidate means "not a real log level"
     *
     * @param {number} threshold - Current logger threshold level (numeric)
     * @param {number} candidate - Level of the message to check (numeric)
     * @returns {boolean} True if candidate is enabled at the given threshold
     */
    static isLevelEnabled(threshold, candidate) {
        if (threshold === LogLevel.SILENT || candidate === LogLevel.SILENT) {
            return false;
        }
        return candidate <= threshold;
    }

    // ---- Pre-defined level sets (SILENT excluded -- not a loggable level) ----

    /** Default GooeyJS logging levels */
    static DEFAULT = Object.freeze({
        fatal: 0,
        error: 1,
        warn:  2,
        info:  3,
        debug: 4,
        trace: 5
    });

    /** npm-style logging levels (matches Winston npm convention) */
    static NPM = Object.freeze({
        error:   0,
        warn:    1,
        info:    2,
        http:    3,
        verbose: 4,
        debug:   5,
        silly:   6
    });

    /** Syslog severity levels (RFC 5424) */
    static SYSLOG = Object.freeze({
        emerg:   0,
        alert:   1,
        crit:    2,
        error:   3,
        warning: 4,
        notice:  5,
        info:    6,
        debug:   7
    });
}
