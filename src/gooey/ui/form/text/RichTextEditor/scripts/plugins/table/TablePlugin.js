/**
 * TablePlugin provides cell navigation and keyboard overrides for tables
 * in the RichTextEditor.
 *
 * Contributes Tab/Shift-Tab keymap overrides for moving between cells,
 * with auto-row-creation when tabbing past the last cell.
 *
 * Follows the HistoryPlugin pattern: constructed with a view reference,
 * exposes a keymap getter for integration with InputHandler.
 */

import { _isInTable } from "../../state/Commands.js";
import { addRowAfter } from "../../commands/TableCommands.js";
import { Selection } from "../../model/Position.js";


export default class TablePlugin {

    /**
     * @param {import('../../view/EditorView.js').default} view - EditorView reference
     */
    constructor(view) {
        /** @type {import('../../view/EditorView.js').default} */
        this._view = view;
    }


    // =========================================================================
    // Cell navigation commands
    // =========================================================================

    /**
     * Move cursor to the next cell in the table.
     *
     * Moves right within a row, wraps to the first cell of the next row,
     * or creates a new row if at the very last cell.
     *
     * @param {object} state - EditorState
     * @param {function|null} dispatch - Dispatch function or null for can-execute check
     * @returns {boolean}
     */
    moveToNextCell(state, dispatch) {
        const ctx = _isInTable(state);
        if (!ctx) return false;

        const { tableNode, rowNode, rowIndex, cellIndex, tablePos } = ctx;

        if (dispatch) {
            const tr = state.transaction;
            const totalRows = tableNode.children.length;
            const totalCells = rowNode.children.length;

            let targetRowIdx = rowIndex;
            let targetCellIdx = cellIndex + 1;

            if (targetCellIdx >= totalCells) {
                // Move to first cell of next row
                targetRowIdx = rowIndex + 1;
                targetCellIdx = 0;

                if (targetRowIdx >= totalRows) {
                    // At last cell of last row — add a new row first
                    if (addRowAfter(state, dispatch)) {
                        // addRowAfter already dispatched; now we need to move
                        // cursor to the first cell of the new row.
                        // The new row is appended after the current row, so we
                        // need to re-dispatch with updated state.
                        // Since addRowAfter already dispatched, we return true
                        // and let the next Tab press navigate into the new row.
                        return true;
                    }
                    return false;
                }
            }

            // Calculate position of the target cell
            const cursorPos = _getCellContentStart(tableNode, targetRowIdx, targetCellIdx, tablePos);
            tr.setSelection(Selection.cursor(cursorPos));
            dispatch(tr);
        }
        return true;
    }


    /**
     * Move cursor to the previous cell in the table.
     *
     * Moves left within a row, wraps to the last cell of the previous row.
     * Returns false if at the very first cell of the first row.
     *
     * @param {object} state - EditorState
     * @param {function|null} dispatch - Dispatch function or null for can-execute check
     * @returns {boolean}
     */
    moveToPrevCell(state, dispatch) {
        const ctx = _isInTable(state);
        if (!ctx) return false;

        const { tableNode, rowIndex, cellIndex, tablePos } = ctx;

        let targetRowIdx = rowIndex;
        let targetCellIdx = cellIndex - 1;

        if (targetCellIdx < 0) {
            // Move to last cell of previous row
            targetRowIdx = rowIndex - 1;

            if (targetRowIdx < 0) {
                // At first cell of first row — cannot go further back
                return false;
            }

            targetCellIdx = tableNode.children[targetRowIdx].children.length - 1;
        }

        if (dispatch) {
            const tr = state.transaction;
            const cursorPos = _getCellContentStart(tableNode, targetRowIdx, targetCellIdx, tablePos);
            tr.setSelection(Selection.cursor(cursorPos));
            dispatch(tr);
        }
        return true;
    }


    // =========================================================================
    // Keymap
    // =========================================================================

    /**
     * Return the keymap contributed by this plugin.
     *
     * Tab moves to next cell, Shift-Tab moves to previous cell.
     * These are integrated via chainCommands in RichTextEditor so that
     * table navigation takes priority over list indent/outdent.
     *
     * @returns {object}
     */
    get keymap() {
        return {
            "Tab": (state, dispatch) => this.moveToNextCell(state, dispatch),
            "Shift-Tab": (state, dispatch) => this.moveToPrevCell(state, dispatch)
        };
    }
}


// =============================================================================
// Private helpers
// =============================================================================

/**
 * Calculate the document position for the start of a cell's content.
 *
 * Position layout: tablePos + 1 (table opening) + row sizes before target
 * + 1 (row opening) + cell sizes before target + 1 (cell opening)
 * + 1 (first block child opening) = start of text content.
 *
 * @param {object} tableNode - Table node
 * @param {number} rowIdx - Target row index
 * @param {number} cellIdx - Target cell index
 * @param {number} tablePos - Start position of the table in document
 * @returns {number} Cursor position at start of cell content
 */
function _getCellContentStart(tableNode, rowIdx, cellIdx, tablePos) {
    let pos = tablePos + 1; // table opening boundary

    // Skip rows before target
    for (let r = 0; r < rowIdx; r++) {
        pos += tableNode.children[r].nodeSize;
    }

    pos += 1; // row opening boundary

    // Skip cells before target
    const row = tableNode.children[rowIdx];
    for (let c = 0; c < cellIdx; c++) {
        pos += row.children[c].nodeSize;
    }

    // cell opening(+1) + paragraph opening(+1) = +2
    pos += 2;

    return pos;
}
