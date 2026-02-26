import { Mark } from "../model/Node.js";
import { Selection } from "../model/Position.js";


// ============================================================================
// Command factories
// ============================================================================

/**
 * Create a command that inserts text at the current selection.
 *
 * If selection is not empty, deletes the selected range first.
 * Follows the (state, dispatch) => boolean command signature.
 *
 * @param {string} text - Text to insert
 * @returns {function(state, dispatch): boolean}
 */
export function insertText(text) {
    return function (state, dispatch) {
        if (!text || text.length === 0) return false;

        if (dispatch) {
            const tr = state.transaction;
            const { from, to } = state.selection;

            // Delete selection range first if not empty
            if (from !== to) {
                tr.deleteRange(from, to);
            }

            tr.insertText(text, from);
            // Move cursor to end of inserted text
            tr.setSelection(Selection.cursor(from + text.length));
            dispatch(tr);
        }
        return true;
    };
}


/**
 * Command that deletes the current selection range.
 * Can-execute: returns true only if selection is not empty.
 *
 * @param {object} state - EditorState
 * @param {function|null} dispatch - Dispatch function or null for can-execute check
 * @returns {boolean}
 */
export function deleteSelection(state, dispatch) {
    if (state.selection.empty) return false;

    if (dispatch) {
        const tr = state.transaction;
        const { from, to } = state.selection;
        tr.deleteRange(from, to);
        tr.setSelection(Selection.cursor(from));
        dispatch(tr);
    }
    return true;
}


/**
 * Command for Backspace key.
 *
 * - If selection is not empty, deletes the selection.
 * - If at start of block, attempts to join with previous block
 *   (returns false for now — block operations added in Phase 36).
 * - Otherwise, deletes one character before cursor.
 *
 * @param {object} state - EditorState
 * @param {function|null} dispatch - Dispatch function or null for can-execute check
 * @returns {boolean}
 */
export function deleteBackward(state, dispatch) {
    // If selection is not empty, delete it
    if (!state.selection.empty) {
        return deleteSelection(state, dispatch);
    }

    const { from } = state.selection;

    // Check if at position where we can delete backward
    if (from <= 0) return false;

    // Check if at start of block — would need block join (Phase 36)
    const $from = state.doc.resolve(from);
    if ($from.parentOffset === 0) {
        // At start of block content — block join not yet implemented
        return false;
    }

    if (dispatch) {
        const tr = state.transaction;
        tr.deleteRange(from - 1, from);
        tr.setSelection(Selection.cursor(from - 1));
        dispatch(tr);
    }
    return true;
}


/**
 * Command for Delete key.
 *
 * - If selection is not empty, deletes the selection.
 * - If at end of block, attempts to join with next block
 *   (returns false for now — block operations added in Phase 36).
 * - Otherwise, deletes one character after cursor.
 *
 * @param {object} state - EditorState
 * @param {function|null} dispatch - Dispatch function or null for can-execute check
 * @returns {boolean}
 */
export function deleteForward(state, dispatch) {
    // If selection is not empty, delete it
    if (!state.selection.empty) {
        return deleteSelection(state, dispatch);
    }

    const { from } = state.selection;

    // Check if at the end of document content
    const $from = state.doc.resolve(from);
    const parentContentSize = $from.parent.contentSize;

    if ($from.parentOffset >= parentContentSize) {
        // At end of block content — block join not yet implemented
        return false;
    }

    if (dispatch) {
        const tr = state.transaction;
        tr.deleteRange(from, from + 1);
        // Cursor stays at same position
        dispatch(tr);
    }
    return true;
}


/**
 * Command that selects all document content.
 *
 * @param {object} state - EditorState
 * @param {function|null} dispatch - Dispatch function or null for can-execute check
 * @returns {boolean}
 */
export function selectAll(state, dispatch) {
    if (dispatch) {
        const tr = state.transaction;
        const docContentSize = state.doc.contentSize;
        tr.setSelection(Selection.between(0, docContentSize));
        dispatch(tr);
    }
    return true;
}


/**
 * Create a command that toggles a mark on the current selection.
 *
 * If the mark is active in the selection, removes it.
 * If not active, adds it.
 * Can-execute: returns true if the mark type exists in the schema.
 *
 * @param {string} markType - Mark type name (e.g., "bold", "italic")
 * @param {object} [attrs] - Optional mark attributes
 * @returns {function(state, dispatch): boolean}
 */
export function toggleMark(markType, attrs) {
    return function (state, dispatch) {
        // Check if mark type exists in schema
        if (state.schema && !state.schema.marks[markType]) {
            return false;
        }

        if (dispatch) {
            const tr = state.transaction;
            const { from, to, empty } = state.selection;
            const mark = state.schema
                ? state.schema.mark(markType, attrs)
                : Mark.create(markType, attrs);

            if (empty) {
                // Cursor: toggle in stored marks
                const isActive = markActive(state, markType);
                if (isActive) {
                    // Remove from stored marks
                    const newMarks = state.marks.filter(m => m.type !== markType);
                    tr.setStoredMarks(newMarks);
                } else {
                    // Add to stored marks
                    tr.setStoredMarks([...state.marks, mark]);
                }
            } else {
                // Range: add or remove mark on text
                const isActive = markActive(state, markType);
                if (isActive) {
                    tr.removeMark(from, to, mark);
                } else {
                    tr.addMark(from, to, mark);
                }
            }

            dispatch(tr);
        }
        return true;
    };
}


/**
 * Create a command that changes the block type of blocks in the selection range.
 *
 * Can-execute: returns true if the current block is not already the target type.
 * Foundation for heading/paragraph switching in Phase 36.
 *
 * @param {string} nodeType - Target block type name (e.g., "heading", "paragraph")
 * @param {object} [attrs] - Optional attributes for the new block type
 * @returns {function(state, dispatch): boolean}
 */
export function setBlockType(nodeType, attrs) {
    return function (state, dispatch) {
        const { from } = state.selection;

        // Find the block containing the selection start
        const $from = state.doc.resolve(from);
        const parent = $from.parent;

        // If already the target type with same attrs, can't execute
        if (parent.type === nodeType) {
            if (!attrs || _attrsMatch(parent.attrs, attrs)) {
                return false;
            }
        }

        if (dispatch) {
            const tr = state.transaction;
            // Find the position of the parent block in the document
            // Walk up the path to find the block's position
            const blockPos = _findBlockPos(state.doc, from);
            if (blockPos !== null) {
                tr.setNodeAttrs(blockPos, { ...attrs, __type: nodeType });
                // Note: Full setBlockType (changing the actual node type) requires
                // a replaceRange step that rebuilds the node. For Phase 33 foundation,
                // we set attrs which serves as the mechanism for EditorView to recognize
                // the type change. Full implementation in Phase 36.
            }
            dispatch(tr);
        }
        return true;
    };
}


// ============================================================================
// Helper utilities
// ============================================================================

/**
 * Check if a mark type is active at the current selection.
 *
 * For cursor selections, checks stored marks and marks on text at cursor.
 * For range selections, checks if the mark is present on all text in range.
 *
 * @param {object} state - EditorState
 * @param {string} markType - Mark type name
 * @returns {boolean}
 */
export function markActive(state, markType) {
    const { from, to, empty } = state.selection;

    if (empty) {
        // Check stored marks first
        if (state.marks.some(m => m.type === markType)) {
            return true;
        }
        // Check marks on text at cursor position
        return _marksAtPos(state.doc, from, markType);
    }

    // Range selection: check if all text in range has the mark
    let allHaveMark = true;
    let foundText = false;

    state.doc.nodesBetween(from, to, (node, pos) => {
        if (node.type === "text") {
            foundText = true;
            const textStart = pos;
            const textEnd = pos + node.text.length;

            // Only check the overlapping portion
            if (textEnd > from && textStart < to) {
                if (!node.marks.some(m => m.type === markType)) {
                    allHaveMark = false;
                }
            }
            return false;
        }
        return true;
    });

    return foundText && allHaveMark;
}


/**
 * Check if a node of the given type can be inserted at the current position.
 *
 * @param {object} state - EditorState
 * @param {string} nodeType - Node type name
 * @returns {boolean}
 */
export function canInsert(state, nodeType) {
    if (!state.schema) return false;

    try {
        state.schema.nodeType(nodeType);
    } catch (e) {
        return false;
    }

    // Check if the parent node's content expression allows this type
    const { from } = state.selection;
    const $from = state.doc.resolve(from);
    const parent = $from.parent;

    return state.schema.validContent(parent.type, [
        ...(_getChildren(parent)),
        state.schema.node(nodeType, null, nodeType === "text" ? undefined : [])
    ]);
}


/**
 * Create a command that tries each given command in order,
 * returning the result of the first that succeeds (returns true).
 *
 * @param  {...function} commands - Command functions
 * @returns {function(state, dispatch): boolean}
 */
export function chainCommands(...commands) {
    return function (state, dispatch) {
        for (const cmd of commands) {
            if (cmd(state, dispatch)) {
                return true;
            }
        }
        return false;
    };
}


/**
 * Create a keymap object from key bindings.
 *
 * Takes an object mapping key strings to commands and normalizes
 * the key names. "Mod-" prefix resolves to platform-appropriate modifier.
 *
 * This is a data structure, not an event handler. Event handling
 * is implemented in EditorView (Plan 03).
 *
 * @param {object} bindings - Object mapping key strings to command functions
 * @returns {object} Normalized keymap object
 */
export function keymap(bindings) {
    const normalized = {};
    const isMac = _isMac();

    for (const [key, command] of Object.entries(bindings)) {
        const normalizedKey = _normalizeKey(key, isMac);
        normalized[normalizedKey] = command;
    }

    return normalized;
}


// ============================================================================
// Default keymap
// ============================================================================

/**
 * Base keymap with default keyboard bindings for foundation editing.
 */
export const baseKeymap = {
    "Backspace": deleteBackward,
    "Delete": deleteForward,
    "Mod-a": selectAll
};


// ============================================================================
// Private helpers
// ============================================================================

/**
 * Check if marks at a position include the given mark type.
 *
 * @param {object} doc - Document node
 * @param {number} pos - Position to check
 * @param {string} markType - Mark type to look for
 * @returns {boolean}
 */
function _marksAtPos(doc, pos, markType) {
    let found = false;
    // Check position - 1 and position for text marks
    const checkPos = pos > 0 ? pos - 1 : pos;
    const endPos = pos + 1;

    try {
        doc.nodesBetween(checkPos, Math.min(endPos, doc.contentSize), (node, nodePos) => {
            if (node.type === "text") {
                if (node.marks.some(m => m.type === markType)) {
                    found = true;
                }
                return false;
            }
            return true;
        });
    } catch (e) {
        // Position out of range - no marks
    }

    return found;
}


/**
 * Find the position of the block node containing a given position.
 *
 * @param {object} doc - Document node
 * @param {number} pos - Position inside the block
 * @returns {number|null} Position of the block node, or null
 */
function _findBlockPos(doc, pos) {
    const resolved = doc.resolve(pos);
    // Walk up the path to find the block parent
    for (let i = resolved.path.length - 1; i >= 0; i--) {
        const entry = resolved.path[i];
        const node = entry.node;
        if (node.type !== "document" && node.type !== "text" && node.children !== null) {
            // Found a block node, compute its position
            // This is a simplified approach - walk from root
            let blockPos = 0;
            for (let j = 1; j < i; j++) {
                blockPos += resolved.path[j].offset;
            }
            return blockPos;
        }
    }
    return null;
}


/**
 * Get children of a node as an array (handles null children).
 *
 * @param {object} node
 * @returns {Array}
 */
function _getChildren(node) {
    return node.children || [];
}


/**
 * Check if attributes match (shallow comparison).
 *
 * @param {object} a
 * @param {object} b
 * @returns {boolean}
 */
function _attrsMatch(a, b) {
    if (a === b) return true;
    if (!a || !b) return a === b;
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    for (const key of keysA) {
        if (a[key] !== b[key]) return false;
    }
    return true;
}


/**
 * Detect Mac platform.
 * @returns {boolean}
 */
function _isMac() {
    // In Node.js environment, default to non-Mac
    if (typeof navigator === "undefined") return false;
    return /Mac|iPod|iPhone|iPad/.test(navigator.platform || "");
}


/**
 * Normalize a key binding string.
 *
 * "Mod-" is resolved to "Ctrl-" on non-Mac, "Meta-" on Mac.
 * Supports: Shift-, Alt-, Ctrl-, Meta- prefixes.
 * Key names: single characters or named keys.
 *
 * @param {string} key - Key binding string
 * @param {boolean} isMac - Whether platform is Mac
 * @returns {string} Normalized key string
 */
function _normalizeKey(key, isMac) {
    return key.replace(/Mod-/g, isMac ? "Meta-" : "Ctrl-");
}
