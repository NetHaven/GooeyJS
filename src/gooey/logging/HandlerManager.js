import Handler from "./Handler.js";

/**
 * Manages an ordered collection of {@link Handler} instances for log record
 * dispatch.
 *
 * HandlerManager is a standalone utility class designed to be composed by
 * Logger (Phase 7) via has-a, not is-a. It provides the full handler
 * lifecycle API: adding, removing, clearing, and iterating handlers.
 *
 * The {@link HandlerManager#dispatch} method iterates all handlers and calls
 * {@link Handler#handle} on each independently. Because `handle()` wraps
 * `emit()` in its own try-catch, the dispatch loop is naturally error-safe --
 * a failing handler cannot prevent subsequent handlers from receiving the
 * record.
 *
 * **Design notes:**
 * - {@link HandlerManager#handlers} returns a defensive copy to prevent
 *   external mutation of the internal array.
 * - {@link HandlerManager#addHandler} validates via `instanceof Handler`
 *   (not duck-typing) because the spec requires custom handlers to extend
 *   Handler to inherit the handle/emit split contract.
 *
 * @see Handler
 */
export default class HandlerManager {

    /**
     * Create a new HandlerManager with an empty handler collection.
     */
    constructor() {
        /**
         * Ordered list of handler instances.
         * @type {Handler[]}
         * @private
         */
        this._handlers = [];
    }

    /**
     * Add a handler to the collection.
     *
     * The handler is appended to the end of the internal list, so dispatch
     * order matches insertion order.
     *
     * @param {Handler} handler - Handler instance to add
     * @throws {Error} If argument is not an instance of Handler
     */
    addHandler(handler) {
        if (!(handler instanceof Handler)) {
            throw new Error("addHandler: argument must be a Handler instance");
        }
        this._handlers.push(handler);
    }

    /**
     * Remove a handler from the collection.
     *
     * Removal is by reference equality. If the handler is not found in the
     * collection, this is a silent no-op.
     *
     * @param {Handler} handler - Handler instance to remove
     */
    removeHandler(handler) {
        const idx = this._handlers.indexOf(handler);
        if (idx !== -1) {
            this._handlers.splice(idx, 1);
        }
    }

    /**
     * Remove all handlers from the collection.
     */
    clearHandlers() {
        this._handlers.length = 0;
    }

    /**
     * Get a defensive copy of the handler collection.
     *
     * Returns a new array containing all current handlers in insertion order.
     * Modifications to the returned array do not affect the internal
     * collection.
     *
     * @type {Handler[]}
     */
    get handlers() {
        return [...this._handlers];
    }

    /**
     * Dispatch a log record to all handlers in the collection.
     *
     * Iterates through each handler and calls {@link Handler#handle} on it.
     * Each handler's `handle()` method has its own error isolation (try-catch
     * around `emit()`), so a failing handler cannot prevent subsequent
     * handlers from receiving the record.
     *
     * @param {Readonly<object>} record - Log record to dispatch
     */
    dispatch(record) {
        for (let i = 0; i < this._handlers.length; i++) {
            this._handlers[i].handle(record);
        }
    }
}
