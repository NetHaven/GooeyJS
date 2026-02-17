/**
 * Circular in-memory buffer handler for the GooeyJS logging system.
 *
 * RingBuffer stores log records in a fixed-capacity circular buffer using
 * modulo arithmetic for O(1) write and eviction. When the buffer reaches
 * capacity, the oldest record is silently overwritten by the newest.
 *
 * Two consumption patterns are supported:
 *
 * - **Post-mortem querying** via {@link RingBuffer#query} -- filter stored
 *   records by time range, severity level, custom predicate, and project
 *   to specific fields. Supports ascending/descending order with limit.
 *
 * - **Live-tailing** via {@link RingBuffer.RECORD} events -- subscribe to
 *   new records as they arrive through the composed {@link ObservableBase}.
 *   Listener errors are swallowed to guarantee that storage always succeeds.
 *
 * RingBuffer inherits the {@link Handler#handle} method which performs level
 * gating, formatter application, and error isolation automatically. Only
 * {@link RingBuffer#emit} is overridden to provide the buffer storage and
 * event firing logic.
 *
 * **Options:**
 * - `capacity` (`number`, default `100`) -- Maximum number of records to
 *   retain. Values less than 1 are clamped to 1.
 * - All options from {@link Handler}: `level`, `formatter`, `enabled`,
 *   `emitter`.
 *
 * @example
 * // Create a buffer and store records
 * import RingBuffer from "./RingBuffer.js";
 * import LogRecord from "./LogRecord.js";
 *
 * const ring = new RingBuffer({ capacity: 50 });
 * const record = LogRecord.create({ msg: "Server started", name: "app" });
 * ring.handle(record);
 *
 * // Query recent errors
 * const errors = ring.query({ level: "error", limit: 10, order: "desc" });
 *
 * @example
 * // Live-tailing -- subscribe to new records
 * ring.addEventListener(RingBuffer.RECORD, (eventName, event) => {
 *     console.log("New log:", event.record.msg);
 * });
 *
 * @example
 * // Time-range query with field projection
 * const recent = ring.query({
 *     from: Date.now() - 60000,
 *     until: Date.now(),
 *     fields: ["time", "level", "msg"]
 * });
 *
 * @see Handler
 * @see LogLevel
 * @see ObservableBase
 */

import Handler from "./Handler.js";
import LogLevel from "./LogLevel.js";
import ObservableBase from "../events/ObservableBase.js";

export default class RingBuffer extends Handler {

    /**
     * Event name fired on each record write for live-tailing consumers.
     * @type {string}
     */
    static RECORD = "ringbuffer-record";

    /**
     * Create a new RingBuffer handler.
     *
     * @param {object} [options={}] - Configuration options
     * @param {number} [options.capacity=100] - Maximum number of records to
     *        retain in the buffer. Must be a positive integer; values less
     *        than 1 are clamped to 1, non-integers are floored.
     * @param {number|string|null} [options.level=null] - Per-handler level
     *        threshold (inherited from {@link Handler}).
     * @param {Formatter|null} [options.formatter=null] - Per-handler formatter
     *        (inherited from {@link Handler}).
     * @param {boolean} [options.enabled=true] - Whether this handler is active
     *        (inherited from {@link Handler}).
     * @param {Observable|null} [options.emitter=null] - Observable for error
     *        events (inherited from {@link Handler}).
     */
    constructor(options = {}) {
        super(options);

        /** @private */
        this._capacity = Math.max(1, Math.floor(options.capacity || 100));

        /** @private */
        this._buffer = new Array(this._capacity);

        /** @private */
        this._head = 0;

        /** @private */
        this._size = 0;

        /** @private */
        this._observable = new ObservableBase();
        this._observable.addValidEvent(RingBuffer.RECORD);
    }

    // ---- Getters ----

    /**
     * Current number of records stored in the buffer.
     * @type {number}
     */
    get size() {
        return this._size;
    }

    /**
     * Maximum number of records this buffer can hold.
     * @type {number}
     */
    get capacity() {
        return this._capacity;
    }

    // ---- Handler contract ----

    /**
     * Store a log record in the circular buffer and fire a live-tail event.
     *
     * The original record (not the formatted version) is stored, since
     * query consumers may wish to re-format records differently. Records
     * are frozen by LogRecord.create(), so returning direct references
     * from query() is safe.
     *
     * When the buffer is full, the oldest record is silently evicted via
     * head-pointer advancement -- no Array.shift() is used, ensuring O(1)
     * write cost regardless of buffer capacity.
     *
     * The {@link RingBuffer.RECORD} event is fired AFTER successful storage.
     * Listener errors are caught and swallowed to guarantee that storage
     * always succeeds and the handler never crashes.
     *
     * @param {Readonly<object>} record - Original log record (unmodified)
     * @param {object} formatted - Formatted record (unused -- original
     *        record is stored for maximum consumer flexibility)
     */
    emit(record, formatted) {
        // Calculate write position
        const writePos = (this._head + this._size) % this._capacity;

        // Store original record (not formatted)
        this._buffer[writePos] = record;

        // Advance pointers
        if (this._size < this._capacity) {
            this._size++;
        } else {
            // Buffer full -- oldest record evicted, advance head
            this._head = (this._head + 1) % this._capacity;
        }

        // Fire live-tail event (listener errors must not prevent storage)
        try {
            this._observable.fireEvent(RingBuffer.RECORD, { record });
        } catch (e) {
            // Swallow -- listener errors must not prevent storage or crash handler
        }
    }

    // ---- Query API ----

    /**
     * Query stored records with optional filtering, ordering, and projection.
     *
     * All parameters are optional. When no parameters are provided, returns
     * all stored records in ascending (oldest-first) order.
     *
     * @param {object} [options={}] - Query options
     * @param {number} [options.from] - Minimum timestamp (inclusive). Records
     *        with `time < from` are excluded.
     * @param {number} [options.until] - Maximum timestamp (inclusive). Records
     *        with `time > until` are excluded.
     * @param {number|string} [options.level] - Level threshold for filtering.
     *        String names are converted via {@link LogLevel.toNumber}. Only
     *        records at or below this severity (numerically <=) are included.
     * @param {number} [options.limit] - Maximum number of records to return.
     * @param {string} [options.order="asc"] - Iteration order: `"asc"` for
     *        oldest-first, `"desc"` for newest-first.
     * @param {string[]} [options.fields] - Field projection. When provided,
     *        each result is a new object containing only the listed fields.
     * @param {function} [options.filter] - Custom predicate function. Called
     *        with each record; return truthy to include, falsey to exclude.
     * @returns {object[]} Array of matching records (or projected objects).
     *          Returns direct references when no field projection is applied
     *          (safe because records are frozen).
     */
    query({ from, until, level, limit, order = "asc", fields, filter } = {}) {
        // Resolve level to numeric value
        const levelNum = level != null
            ? (typeof level === "string" ? LogLevel.toNumber(level) : level)
            : null;

        const descending = order === "desc";
        const results = [];

        for (let i = 0; i < this._size; i++) {
            const offset = descending ? (this._size - 1 - i) : i;
            const idx = (this._head + offset) % this._capacity;
            const record = this._buffer[idx];

            // Apply filters
            if (from != null && record.time < from) {
                continue;
            }
            if (until != null && record.time > until) {
                continue;
            }
            if (levelNum != null && !LogLevel.isLevelEnabled(levelNum, record.level)) {
                continue;
            }
            if (filter && !filter(record)) {
                continue;
            }

            // Apply field projection or use record directly
            results.push(fields ? this._project(record, fields) : record);

            // Check limit
            if (limit && results.length >= limit) {
                break;
            }
        }

        return results;
    }

    /**
     * Project a record to a subset of fields.
     *
     * @param {Readonly<object>} record - Source record
     * @param {string[]} fields - Field names to include
     * @returns {object} New object containing only the specified fields
     * @private
     */
    _project(record, fields) {
        const projected = {};
        for (const field of fields) {
            if (field in record) {
                projected[field] = record[field];
            }
        }
        return projected;
    }

    // ---- Buffer management ----

    /**
     * Remove all records from the buffer.
     *
     * After calling clear(), {@link RingBuffer#size} returns 0 and
     * {@link RingBuffer#query} returns an empty array. The capacity
     * is unchanged.
     */
    clear() {
        this._buffer = new Array(this._capacity);
        this._head = 0;
        this._size = 0;
    }

    // ---- Observable delegation ----

    /**
     * Register a listener for RingBuffer events.
     *
     * Delegates to the internal {@link ObservableBase} instance. The only
     * valid event name is {@link RingBuffer.RECORD}.
     *
     * @param {string} eventName - Event name (must be a registered event)
     * @param {function} listener - Callback function
     * @throws {Error} If eventName is not a valid registered event
     */
    addEventListener(eventName, listener) {
        this._observable.addEventListener(eventName, listener);
    }

    /**
     * Remove a previously registered event listener.
     *
     * Delegates to the internal {@link ObservableBase} instance.
     *
     * @param {string} eventName - Event name
     * @param {function} listener - Callback function to remove
     * @throws {Error} If eventName is not a valid registered event
     */
    removeEventListener(eventName, listener) {
        this._observable.removeEventListener(eventName, listener);
    }

    // ---- Lifecycle ----

    /**
     * Release all resources held by this handler.
     *
     * Clears the buffer and removes all event listeners from the internal
     * Observable. After calling close(), the handler should not be reused.
     */
    close() {
        this.clear();
        this._observable.removeAllEventListeners();
    }
}
