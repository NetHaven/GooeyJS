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
import Plugin from './Plugin.js';
import Transaction, { Mapping } from '../state/Transaction.js';

export default class HistoryPlugin extends Plugin {

    /**
     * Unique plugin name for registry identification.
     * @returns {string}
     */
    static get pluginName() { return 'history'; }

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

        /**
         * Accumulated mapping from remote steps received since last undo.
         * Used to rebase inverse steps during undo so they account for
         * remote changes that arrived after the local edit was recorded.
         * @type {Mapping|null}
         */
        this._remoteMapping = null;
    }

    /**
     * Filter transactions before state application.
     * Marks remote-origin transactions with addToHistory=false as defense-in-depth.
     *
     * @param {object} tr - Transaction
     * @param {object} state - Current EditorState
     * @returns {object} The transaction (possibly modified)
     */
    filterTransaction(tr, state) {
        if (tr._origin === 'remote') {
            tr.setMeta('addToHistory', false);
        }
        return tr;
    }

    /**
     * Called after a transaction has been applied and the editor state updated.
     * Accumulates remote step mappings into _remoteMapping so that undo can
     * rebase inverse steps through any remote changes that arrived since the
     * local edit was recorded.
     *
     * @param {object} newState - The new EditorState
     * @param {object} oldState - The previous EditorState
     * @param {Step[]} steps - The steps that produced the new state
     * @param {object} transaction - The full transaction (includes origin, meta)
     */
    stateDidUpdate(newState, oldState, steps, transaction) {
        if (transaction._origin !== 'remote') return;
        if (steps.length === 0) return;

        // Build mapping from remote steps
        const mapping = new Mapping(steps.map(s => s.getMap()));

        // Accumulate into _remoteMapping for later rebase during undo
        this._remoteMapping = this._remoteMapping || new Mapping();
        for (const map of mapping.maps) {
            this._remoteMapping.appendMap(map);
        }
    }

    /**
     * Record the editor state before a transaction is applied.
     * Implements batching: rapid edits within batchDelay are grouped
     * into a single undo step.
     *
     * @param {object} stateBefore - EditorState before the transaction
     * @param {object} [tr] - The transaction being applied (optional for backward compat)
     */
    pushState(stateBefore, tr) {
        // Check metadata flag -- skip if addToHistory is explicitly false
        if (tr && tr.getMeta && tr.getMeta('addToHistory') === false) {
            return;
        }

        // Compute inverse steps for step-based undo when collaboration is active.
        // Each entry stores BOTH { state, inverseSteps, timestamp } so undo can
        // use step-based rebase when _remoteMapping is present, or fall back to
        // snapshot-based restore for single-user editing.
        let inverseSteps = null;
        if (tr && tr.steps && tr.steps.length > 0) {
            try {
                inverseSteps = tr.steps.map(s => s.invert(stateBefore.doc));
                inverseSteps.reverse(); // Undo in reverse order
            } catch (e) {
                // Graceful degradation: if any step lacks invert(), fall back to snapshot only
                console.warn('HistoryPlugin: could not compute inverse steps, falling back to snapshot', e);
                inverseSteps = null;
            }
        }

        const now = Date.now();

        if (this._currentBatch === null) {
            // No active batch - start a new one
            this._currentBatch = { state: stateBefore, inverseSteps, timestamp: now };
        } else if (now - this._lastPushTime >= this._batchDelay) {
            // Batch delay expired - finalize current batch and start new one
            this._finalizeBatch();
            this._currentBatch = { state: stateBefore, inverseSteps, timestamp: now };
        } else if (inverseSteps && this._currentBatch.inverseSteps) {
            // Within batch delay: prepend new inverse steps to existing batch's inverses
            // (new inverses go first since they undo the most recent edit)
            this._currentBatch.inverseSteps = [...inverseSteps, ...this._currentBatch.inverseSteps];
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
     * Undo the last edit. Returns the EditorState to restore (snapshot path)
     * or a Transaction with rebased inverse steps (step-based path), or null
     * if there is nothing to undo.
     *
     * When the entry has inverseSteps and _remoteMapping has accumulated maps,
     * the inverse steps are rebased through the remote mapping before being
     * applied as a transaction. This ensures undo only reverts local changes
     * while preserving remote edits.
     *
     * @param {object} currentState - Current EditorState (pushed to redo stack)
     * @returns {object|Transaction|null} EditorState, Transaction, or null
     */
    undo(currentState) {
        // Flush any pending batch first
        this._finalizeBatch();

        if (this._undoStack.length === 0) {
            return null;
        }

        const entry = this._undoStack.pop();

        // Step-based path: rebase inverse steps through remote mapping
        if (entry.inverseSteps && entry.inverseSteps.length > 0) {
            let steps = entry.inverseSteps;

            // Rebase through accumulated remote changes if any
            if (this._remoteMapping && this._remoteMapping.maps.length > 0) {
                steps = steps.map(s => s.map(this._remoteMapping)).filter(Boolean);
            }

            if (steps.length > 0) {
                // Apply inverse steps as a transaction
                const tr = new Transaction(currentState);
                for (const step of steps) {
                    tr._applyStep(step);
                }

                // Push forward steps to redo stack
                try {
                    const forwardSteps = steps.map(s => s.invert(currentState.doc));
                    forwardSteps.reverse();
                    this._redoStack.push({
                        state: currentState,
                        inverseSteps: forwardSteps,
                        timestamp: Date.now()
                    });
                } catch (e) {
                    // Fallback: store snapshot-only redo entry
                    this._redoStack.push({ state: currentState, timestamp: Date.now() });
                }

                // Reset remote mapping -- the rebase has been consumed
                this._remoteMapping = null;

                return tr;
            }
            // All steps were eliminated by remote changes -- fall through to snapshot path
        }

        // Snapshot-based path (legacy/fallback for non-collaboration usage)
        this._redoStack.push({ state: currentState, timestamp: Date.now() });
        return entry.state;
    }

    /**
     * Redo a previously undone edit. Returns the EditorState to restore
     * (snapshot path) or a Transaction with rebased steps (step-based path),
     * or null if there is nothing to redo.
     *
     * @param {object} currentState - Current EditorState (pushed to undo stack)
     * @returns {object|Transaction|null} EditorState, Transaction, or null
     */
    redo(currentState) {
        if (this._redoStack.length === 0) {
            return null;
        }

        const entry = this._redoStack.pop();

        // Step-based path
        if (entry.inverseSteps && entry.inverseSteps.length > 0) {
            let steps = entry.inverseSteps;

            // Rebase through accumulated remote changes if any
            if (this._remoteMapping && this._remoteMapping.maps.length > 0) {
                steps = steps.map(s => s.map(this._remoteMapping)).filter(Boolean);
            }

            if (steps.length > 0) {
                // Apply redo steps as a transaction
                const tr = new Transaction(currentState);
                for (const step of steps) {
                    tr._applyStep(step);
                }

                // Push inverse steps to undo stack
                try {
                    const inverseSteps = steps.map(s => s.invert(currentState.doc));
                    inverseSteps.reverse();
                    this._undoStack.push({
                        state: currentState,
                        inverseSteps,
                        timestamp: Date.now()
                    });
                } catch (e) {
                    // Fallback: store snapshot-only undo entry
                    this._undoStack.push({ state: currentState, timestamp: Date.now() });
                }

                // Reset remote mapping -- the rebase has been consumed
                this._remoteMapping = null;

                return tr;
            }
            // All steps were eliminated by remote changes -- fall through to snapshot path
        }

        // Snapshot-based path (legacy/fallback)
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
        this._remoteMapping = null;
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

    // =========================================================================
    // Plugin interface methods
    // =========================================================================

    /**
     * Return keybindings for undo/redo.
     *
     * @returns {object} Keymap bindings
     */
    keymap() {
        return {
            'Mod-z': undoCommand(this),
            'Mod-Shift-z': redoCommand(this),
            'Mod-y': redoCommand(this)
        };
    }

    /**
     * Return toolbar item descriptors for undo/redo buttons.
     *
     * @returns {Array<object>}
     */
    toolbarItems() {
        return [
            { name: 'undo', type: 'button', command: undoCommand(this), isEnabled: () => this.canUndo(), label: 'Undo', icon: 'undo' },
            { name: 'redo', type: 'button', command: redoCommand(this), isEnabled: () => this.canRedo(), label: 'Redo', icon: 'redo' }
        ];
    }

    /**
     * Clean up history state and editor reference.
     */
    destroy() {
        this.clear();
        this._editor = null;
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
            const result = plugin.undo(state);
            if (result) {
                if (result instanceof Transaction) {
                    // Step-based path: dispatch the transaction directly
                    result.setMeta('addToHistory', false);
                    dispatch(result);
                } else {
                    // Snapshot-based path: force-restore the state
                    const tr = state.transaction;
                    tr._forceState = result;
                    dispatch(tr);
                }
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
            const result = plugin.redo(state);
            if (result) {
                if (result instanceof Transaction) {
                    // Step-based path: dispatch the transaction directly
                    result.setMeta('addToHistory', false);
                    dispatch(result);
                } else {
                    // Snapshot-based path: force-restore the state
                    const tr = state.transaction;
                    tr._forceState = result;
                    dispatch(tr);
                }
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
