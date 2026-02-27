/**
 * HistoryPlugin provides undo/redo with operation batching for the RichTextEditor.
 *
 * Stores EditorState snapshots on undo/redo stacks. Rapid consecutive edits
 * within a configurable batch delay (default 500ms) are grouped into a single
 * undo step. The undo stack is bounded to a configurable max depth (default 100).
 *
 * Integrates with the command/keymap system via exported command functions
 * and a keymap builder.
 */
export default class HistoryPlugin {

    /**
     * @param {object} [options]
     * @param {number} [options.batchDelay=500] - Delay in ms for batching edits
     * @param {number} [options.maxDepth=100] - Maximum undo stack size
     */
    constructor(options = {}) {
        /** @type {Array<{state: object, timestamp: number}>} */
        this._undoStack = [];

        /** @type {Array<{state: object, timestamp: number}>} */
        this._redoStack = [];

        /** @type {number} */
        this._batchDelay = options.batchDelay ?? 500;

        /** @type {number} */
        this._maxDepth = options.maxDepth ?? 100;

        /** @type {number} */
        this._lastPushTime = 0;

        /** @type {{state: object, timestamp: number}|null} */
        this._currentBatch = null;
    }

    /**
     * Record the editor state before a transaction is applied.
     * Implements batching: rapid edits within batchDelay are grouped
     * into a single undo step.
     *
     * @param {object} stateBefore - EditorState before the transaction
     */
    pushState(stateBefore) {
        const now = Date.now();

        if (this._currentBatch === null) {
            // No active batch - start a new one
            this._currentBatch = { state: stateBefore, timestamp: now };
        } else if (now - this._lastPushTime >= this._batchDelay) {
            // Batch delay expired - finalize current batch and start new one
            this._finalizeBatch();
            this._currentBatch = { state: stateBefore, timestamp: now };
        }
        // else: within batch delay, keep the existing batch's "before" state

        // New edits invalidate redo history
        this._redoStack.length = 0;

        // Enforce max depth on undo stack
        if (this._undoStack.length > this._maxDepth) {
            this._undoStack.shift();
        }

        this._lastPushTime = now;
    }

    /**
     * Flush the current batch to the undo stack if one exists.
     * @private
     */
    _finalizeBatch() {
        if (this._currentBatch !== null) {
            this._undoStack.push(this._currentBatch);
            this._currentBatch = null;

            // Enforce max depth after pushing
            if (this._undoStack.length > this._maxDepth) {
                this._undoStack.shift();
            }
        }
    }

    /**
     * Undo the last edit. Returns the EditorState to restore, or null
     * if there is nothing to undo.
     *
     * @param {object} currentState - Current EditorState (pushed to redo stack)
     * @returns {object|null} EditorState to restore, or null
     */
    undo(currentState) {
        // Flush any pending batch first
        this._finalizeBatch();

        if (this._undoStack.length === 0) {
            return null;
        }

        const entry = this._undoStack.pop();
        this._redoStack.push({ state: currentState, timestamp: Date.now() });
        return entry.state;
    }

    /**
     * Redo a previously undone edit. Returns the EditorState to restore,
     * or null if there is nothing to redo.
     *
     * @param {object} currentState - Current EditorState (pushed to undo stack)
     * @returns {object|null} EditorState to restore, or null
     */
    redo(currentState) {
        if (this._redoStack.length === 0) {
            return null;
        }

        const entry = this._redoStack.pop();
        this._undoStack.push({ state: currentState, timestamp: Date.now() });
        return entry.state;
    }

    /**
     * Check whether undo is available.
     * @returns {boolean}
     */
    canUndo() {
        return this._currentBatch !== null || this._undoStack.length > 0;
    }

    /**
     * Check whether redo is available.
     * @returns {boolean}
     */
    canRedo() {
        return this._redoStack.length > 0;
    }

    /**
     * Clear all history (both undo and redo stacks).
     */
    clear() {
        this._undoStack.length = 0;
        this._redoStack.length = 0;
        this._currentBatch = null;
        this._lastPushTime = 0;
    }

    /**
     * Get the batch delay in milliseconds.
     * @returns {number}
     */
    get batchDelay() {
        return this._batchDelay;
    }

    /**
     * Set the batch delay in milliseconds.
     * @param {number} ms
     */
    set batchDelay(ms) {
        this._batchDelay = ms;
    }

    /**
     * Get the maximum undo stack depth.
     * @returns {number}
     */
    get maxDepth() {
        return this._maxDepth;
    }

    /**
     * Set the maximum undo stack depth.
     * If the new max is smaller than the current stack size, trims oldest entries.
     * @param {number} n
     */
    set maxDepth(n) {
        this._maxDepth = n;
        while (this._undoStack.length > n) {
            this._undoStack.shift();
        }
    }
}


// ============================================================================
// Command functions
// ============================================================================

/**
 * Create an undo command bound to a HistoryPlugin instance.
 *
 * Follows the (state, dispatch) => boolean command signature.
 * When dispatch is null, acts as a can-execute check.
 * When dispatching, sets tr._forceState so the dispatch pipeline
 * in RichTextEditor restores the state directly.
 *
 * @param {HistoryPlugin} plugin - HistoryPlugin instance
 * @returns {function(state, dispatch): boolean}
 */
export function undoCommand(plugin) {
    return function (state, dispatch) {
        if (!plugin.canUndo()) return false;

        if (dispatch) {
            const restored = plugin.undo(state);
            if (restored) {
                const tr = state.transaction;
                tr._forceState = restored;
                dispatch(tr);
            }
        }
        return true;
    };
}

/**
 * Create a redo command bound to a HistoryPlugin instance.
 *
 * Follows the (state, dispatch) => boolean command signature.
 * When dispatch is null, acts as a can-execute check.
 * When dispatching, sets tr._forceState so the dispatch pipeline
 * in RichTextEditor restores the state directly.
 *
 * @param {HistoryPlugin} plugin - HistoryPlugin instance
 * @returns {function(state, dispatch): boolean}
 */
export function redoCommand(plugin) {
    return function (state, dispatch) {
        if (!plugin.canRedo()) return false;

        if (dispatch) {
            const restored = plugin.redo(state);
            if (restored) {
                const tr = state.transaction;
                tr._forceState = restored;
                dispatch(tr);
            }
        }
        return true;
    };
}

/**
 * Build a keymap object with undo/redo key bindings.
 *
 * Uses "Mod-" prefix which normalizes to Ctrl- on non-Mac
 * and Meta- on Mac (handled by the keymap() function in Commands.js).
 *
 * @param {HistoryPlugin} plugin - HistoryPlugin instance
 * @returns {object} Keymap bindings object
 */
export function historyKeymap(plugin) {
    return {
        "Mod-z": undoCommand(plugin),
        "Mod-Shift-z": redoCommand(plugin),
        "Mod-y": redoCommand(plugin)
    };
}
