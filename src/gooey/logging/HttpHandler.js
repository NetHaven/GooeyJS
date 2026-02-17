/**
 * HTTP log shipping handler for the GooeyJS logging system.
 *
 * HttpHandler batches log records in memory and ships them to a remote
 * endpoint via `fetch` POST requests with NDJSON payloads. Records are
 * flushed when the batch reaches a configurable size threshold or when a
 * periodic timer fires. On page visibility change to hidden or pagehide,
 * remaining records are flushed via `navigator.sendBeacon` for reliable
 * delivery during page close.
 *
 * **Batching strategy:**
 * Records are accumulated in an internal array. Flush is triggered by:
 * 1. Batch size threshold (`batchSize`, default 50 records)
 * 2. Periodic interval timer (`interval`, default 5000ms)
 * 3. Manual `flush()` call (e.g., from Logger.flush())
 * 4. Page lifecycle events (visibilitychange to hidden, pagehide)
 *
 * **NDJSON serialization:**
 * Records are serialized as newline-delimited JSON (NDJSON) using
 * {@link Serializers.safeStringify} for circular reference safety. Each
 * record is serialized on its own line, separated by `\n`.
 *
 * **Retry with exponential backoff:**
 * Failed `fetch` requests are retried up to `retries` times (default 3)
 * with exponential backoff and full jitter to prevent thundering herd:
 * `delay = baseDelay * 2^attempt + baseDelay * 2^attempt * Math.random()`.
 *
 * **sendBeacon flush:**
 * On page close, `navigator.sendBeacon` is used instead of fetch because
 * fetch requests may be cancelled during page teardown. Payloads are
 * chunked to respect the 64KB sendBeacon limit (63KB safety margin) using
 * `TextEncoder` for accurate byte measurement.
 *
 * **Lifecycle events:**
 * Uses `visibilitychange` and `pagehide` events. Does NOT use the
 * deprecated `unload` or `beforeunload` events (Chrome deprecating 2026).
 *
 * **Options:**
 * - `url` (`string`, **required**) -- Endpoint URL for POST requests.
 * - `batchSize` (`number`, default `50`) -- Flush after N records.
 * - `interval` (`number`, default `5000`) -- Flush timer interval in ms.
 * - `retries` (`number`, default `3`) -- Max retry attempts for fetch.
 * - `baseDelay` (`number`, default `1000`) -- Base delay for backoff in ms.
 * - `headers` (`object`, default `{}`) -- Additional fetch headers.
 * - All options from {@link Handler}: `level`, `formatter`, `enabled`,
 *   `emitter`.
 *
 * @example
 * // Basic usage
 * import HttpHandler from "./HttpHandler.js";
 *
 * const handler = new HttpHandler({ url: "/api/logs" });
 * handler.handle(record);
 * // Record is batched; flushed when batch fills or timer fires
 *
 * @example
 * // With custom headers and batch settings
 * const handler = new HttpHandler({
 *     url: "https://logs.example.com/ingest",
 *     batchSize: 100,
 *     interval: 10000,
 *     headers: { "Authorization": "Bearer token123" }
 * });
 *
 * @example
 * // Manual flush and cleanup
 * handler.flush();   // Force-flush pending records via fetch
 * handler.close();   // Stop timer, remove listeners, beacon remaining
 *
 * @see Handler
 * @see Serializers
 */

import Handler from "./Handler.js";
import Serializers from "./Serializers.js";

export default class HttpHandler extends Handler {

    /**
     * Create a new HttpHandler.
     *
     * @param {object} [options={}] - Configuration options
     * @param {string} options.url - Endpoint URL for POST requests (**required**)
     * @param {number} [options.batchSize=50] - Flush after N records
     * @param {number} [options.interval=5000] - Flush timer interval in ms
     * @param {number} [options.retries=3] - Max retry attempts for failed fetch
     * @param {number} [options.baseDelay=1000] - Base delay for exponential
     *        backoff in ms
     * @param {object} [options.headers={}] - Additional fetch headers (e.g.,
     *        auth tokens). Merged with the default Content-Type header.
     * @param {number|string|null} [options.level=null] - Per-handler level
     *        threshold (inherited from {@link Handler}).
     * @param {Formatter|null} [options.formatter=null] - Per-handler formatter
     *        (inherited from {@link Handler}).
     * @param {boolean} [options.enabled=true] - Whether this handler is active
     *        (inherited from {@link Handler}).
     * @param {Observable|null} [options.emitter=null] - Observable for error
     *        events (inherited from {@link Handler}).
     * @throws {Error} If `url` option is missing or falsy
     */
    constructor(options = {}) {
        super(options);

        if (!options.url) {
            throw new Error("HttpHandler: url option is required");
        }

        /** @private */
        this._url = options.url;

        /** @private */
        this._batchSize = options.batchSize || 50;

        /** @private */
        this._interval = options.interval || 5000;

        /** @private */
        this._retries = options.retries ?? 3;

        /** @private */
        this._baseDelay = options.baseDelay ?? 1000;

        /** @private */
        this._headers = options.headers || {};

        /** @private */
        this._batch = [];

        /** @private */
        this._timer = null;

        this._startTimer();
        this._bindLifecycleEvents();
    }

    // ---- Core contract ----

    /**
     * Buffer a log record for batched delivery.
     *
     * Pushes the original record (not the formatted version) into the
     * internal batch array. When the batch reaches {@link HttpHandler#_batchSize},
     * a flush is triggered automatically.
     *
     * This method is synchronous -- it never awaits. The actual HTTP
     * delivery is fire-and-forget from emit's perspective.
     *
     * @param {Readonly<object>} record - Original log record
     * @param {object} formatted - Formatted record (unused -- raw record
     *        is stored for NDJSON serialization)
     */
    emit(record, formatted) {
        this._batch.push(record);

        if (this._batch.length >= this._batchSize) {
            this._flush();
        }
    }

    /**
     * Force-flush all pending records via fetch POST.
     *
     * Public method callable by users or Logger.flush(). Delegates to
     * the internal {@link HttpHandler#_flush} method.
     */
    flush() {
        this._flush();
    }

    /**
     * Release all resources held by this handler.
     *
     * Stops the flush interval timer, removes page lifecycle event
     * listeners, and sends any remaining buffered records via
     * `navigator.sendBeacon` for reliable delivery during teardown.
     *
     * After close(), the handler should not be used. No further records
     * will be batched or flushed.
     */
    close() {
        this._stopTimer();
        this._unbindLifecycleEvents();

        if (this._batch.length > 0) {
            this._flushViaBeacon(this._batch.splice(0));
        }
    }

    // ---- Internal flush mechanics ----

    /**
     * Extract the current batch and send via fetch POST.
     *
     * Uses `splice(0)` for atomic extract-and-clear to prevent double-flush
     * if multiple triggers fire concurrently. The fetch request is
     * fire-and-forget -- errors are caught and routed to {@link Handler#_onError}.
     *
     * @private
     */
    _flush() {
        if (this._batch.length === 0) {
            return;
        }

        const records = this._batch.splice(0);
        const payload = this._serializeNDJSON(records);

        this._sendWithRetry(payload).catch(err => {
            this._onError(err, { msg: "HttpHandler flush failed" });
        });
    }

    /**
     * Serialize an array of records as NDJSON (newline-delimited JSON).
     *
     * Uses {@link Serializers.safeStringify} instead of raw `JSON.stringify`
     * for circular reference safety.
     *
     * @param {Array<object>} records - Records to serialize
     * @returns {string} NDJSON payload
     * @private
     */
    _serializeNDJSON(records) {
        return records.map(record => Serializers.safeStringify(record)).join("\n");
    }

    /**
     * Send a payload via fetch POST with exponential backoff retry.
     *
     * On failure, retries up to {@link HttpHandler#_retries} times with
     * exponential backoff and full jitter to prevent thundering herd.
     * Delay formula: `baseDelay * 2^attempt + baseDelay * 2^attempt * Math.random()`.
     *
     * @param {string} payload - NDJSON payload string
     * @param {number} [attempt=0] - Current attempt number (0-indexed)
     * @returns {Promise<void>} Resolves on success, rejects after max retries
     * @private
     */
    async _sendWithRetry(payload, attempt = 0) {
        try {
            const response = await fetch(this._url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-ndjson",
                    ...this._headers
                },
                body: payload
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status} ${response.statusText}`);
            }
        } catch (err) {
            if (attempt < this._retries) {
                const delay = this._baseDelay * Math.pow(2, attempt);
                const jitter = delay * Math.random();
                await new Promise(resolve => setTimeout(resolve, delay + jitter));
                return this._sendWithRetry(payload, attempt + 1);
            }
            throw err;
        }
    }

    // ---- sendBeacon flush ----

    /**
     * Flush records via `navigator.sendBeacon` for reliable unload delivery.
     *
     * Payloads are chunked to respect the 64KB sendBeacon limit using a
     * 63KB safety margin. Each record is measured via `TextEncoder` for
     * accurate byte size. If `sendBeacon()` returns false (queue full),
     * remaining chunks are abandoned.
     *
     * @param {Array<object>} records - Records to send
     * @private
     */
    _flushViaBeacon(records) {
        if (records.length === 0) {
            return;
        }

        const encoder = new TextEncoder();
        const maxSize = 63 * 1024; // 63KB safety margin for 64KB limit

        // Build chunks that fit within the sendBeacon size limit
        const chunks = [];
        let currentChunk = [];
        let currentSize = 0;

        for (let i = 0; i < records.length; i++) {
            const line = Serializers.safeStringify(records[i]) + "\n";
            const lineSize = encoder.encode(line).byteLength;

            if (currentSize + lineSize > maxSize && currentChunk.length > 0) {
                chunks.push(currentChunk);
                currentChunk = [];
                currentSize = 0;
            }

            currentChunk.push(line);
            currentSize += lineSize;
        }

        if (currentChunk.length > 0) {
            chunks.push(currentChunk);
        }

        // Send each chunk via sendBeacon
        for (let i = 0; i < chunks.length; i++) {
            const payload = chunks[i].join("");
            const blob = new Blob([payload], { type: "application/x-ndjson" });

            if (!navigator.sendBeacon(this._url, blob)) {
                break; // Queue full -- stop sending
            }
        }
    }

    // ---- Timer management ----

    /**
     * Start the periodic flush interval timer.
     *
     * Guards against double-start by checking if a timer is already running.
     *
     * @private
     */
    _startTimer() {
        if (this._timer) {
            return;
        }

        this._timer = setInterval(() => {
            if (this._batch.length > 0) {
                this._flush();
            }
        }, this._interval);
    }

    /**
     * Stop the periodic flush interval timer.
     *
     * @private
     */
    _stopTimer() {
        if (this._timer) {
            clearInterval(this._timer);
            this._timer = null;
        }
    }

    // ---- Page lifecycle events ----

    /**
     * Register page lifecycle event listeners for unload flush.
     *
     * Listens for `visibilitychange` (on document) and `pagehide` (on window).
     * Uses `splice(0)` for atomic extract-and-clear in both handlers to
     * prevent double-flush if both events fire during the same page teardown.
     *
     * Does NOT use the deprecated `unload` or `beforeunload` events.
     *
     * @private
     */
    _bindLifecycleEvents() {
        /** @private */
        this._boundVisibilityHandler = () => {
            if (document.visibilityState === "hidden") {
                this._flushViaBeacon(this._batch.splice(0));
            }
        };

        /** @private */
        this._boundPageHideHandler = () => {
            if (this._batch.length > 0) {
                this._flushViaBeacon(this._batch.splice(0));
            }
        };

        document.addEventListener("visibilitychange", this._boundVisibilityHandler);
        window.addEventListener("pagehide", this._boundPageHideHandler);
    }

    /**
     * Remove page lifecycle event listeners.
     *
     * @private
     */
    _unbindLifecycleEvents() {
        document.removeEventListener("visibilitychange", this._boundVisibilityHandler);
        window.removeEventListener("pagehide", this._boundPageHideHandler);
    }
}
