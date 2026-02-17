/**
 * Cross-browser call-site capture utility for the GooeyJS logging system.
 *
 * Parses `Error.stack` to extract the caller's file, line number, and
 * function name. Supports two major stack trace formats:
 *
 * - **V8 (Chrome, Edge, Node.js):** Lines prefixed with "    at "
 * - **SpiderMonkey/JSC (Firefox, Safari):** Lines using "@" separator
 *
 * This is a zero-dependency standalone utility -- it imports nothing from
 * the rest of the logging system and can be used independently.
 *
 * @see Logger (integrates via src: true option)
 */

// V8 format: "    at functionName (filename:line:column)"
// Also handles: "    at filename:line:column" (anonymous)
const V8_REGEX = /^\s*at\s+(?:(.+?)\s+\()?(.*?):(\d+):(\d+)\)?$/;

// Firefox/Safari format: "functionName@filename:line:column"
// Also handles: "@filename:line:column" (anonymous)
const FF_SAFARI_REGEX = /^(.*)@(.*?):(\d+):(\d+)$/;

// Detection: does the stack contain "    at " lines? (V8 format indicator)
const IS_V8 = /^\s+at /m;

/** One-time warning flag -- module-level to persist across all instances/calls */
let srcWarningEmitted = false;

export default class CallSiteCapture {

    /**
     * Extract call-site information from Error.stack.
     *
     * Creates a new Error object to capture the current stack, then
     * parses the appropriate frame to extract file, line, and function.
     *
     * @param {number} [skipFrames=0] - Number of additional frames to skip
     *        beyond the internal capture() frame itself.
     * @returns {{ file: string, line: number, func: string }|null}
     *          Parsed call-site or null if stack is unavailable/unparseable.
     */
    static capture(skipFrames = 0) {
        const err = new Error();
        const stack = err.stack;
        if (!stack) return null;

        const lines = stack.split("\n");

        // Determine format
        const isV8 = IS_V8.test(stack);

        // Calculate which line to parse:
        // V8: line 0 is "Error" header, line 1 is capture(), line 2+ are callers
        // FF/Safari: line 0 is capture(), line 1+ are callers
        const frameOffset = isV8 ? 1 : 0;  // V8 has "Error" header line
        const internalFrames = 1;            // capture() itself
        const targetIndex = frameOffset + internalFrames + skipFrames;

        if (targetIndex >= lines.length) return null;

        const line = lines[targetIndex].trim();

        return isV8
            ? CallSiteCapture._parseV8(line)
            : CallSiteCapture._parseFFSafari(line);
    }

    /**
     * Parse a V8-format stack frame line.
     *
     * Handles both named and anonymous functions:
     *   "at Logger._write (http://localhost/Logger.js:120:15)"
     *   "at http://localhost/app.js:5:3"
     *   "at Object.<anonymous> (http://localhost/app.js:1:1)"
     *
     * @param {string} line - Trimmed stack frame line
     * @returns {{ file: string, line: number, func: string }|null}
     */
    static _parseV8(line) {
        const match = V8_REGEX.exec(line);
        if (!match) return null;

        return {
            func: match[1] || "<anonymous>",
            file: match[2] || "<unknown>",
            line: parseInt(match[3], 10)
        };
    }

    /**
     * Parse a Firefox/Safari-format stack frame line.
     *
     * Handles both named and anonymous functions:
     *   "Logger.prototype._write@http://localhost/Logger.js:120:15"
     *   "@http://localhost/app.js:5:3"
     *   "global code@http://localhost/app.js:1:1"
     *
     * @param {string} line - Trimmed stack frame line
     * @returns {{ file: string, line: number, func: string }|null}
     */
    static _parseFFSafari(line) {
        const match = FF_SAFARI_REGEX.exec(line);
        if (!match) return null;

        return {
            func: match[1] || "<anonymous>",
            file: match[2] || "<unknown>",
            line: parseInt(match[3], 10)
        };
    }

    /**
     * Emit a one-time performance warning via console.warn.
     *
     * Called when `src: true` is first activated on any Logger instance.
     * The warning is emitted only once per page load (module-level flag).
     */
    static warnOnce() {
        if (!srcWarningEmitted) {
            srcWarningEmitted = true;
            console.warn(
                "[GooeyJS Logger] src: true is enabled. This creates a new Error object " +
                "on every log call for call-site capture, which incurs per-call overhead. " +
                "Disable in production for optimal performance."
            );
        }
    }
}
