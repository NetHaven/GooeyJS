/**
 * Table manipulation commands for the RichTextEditor.
 *
 * All commands follow the (state, dispatch) => boolean pattern.
 * Factory commands (like insertTable) accept parameters and return
 * a command function.
 *
 * Commands use _isInTable to detect table context and Transaction
 * for immutable document mutations.
 */

import { _isInTable } from "../state/Commands.js";
import Node from "../model/Node.js";
import { Selection } from "../model/Position.js";


// ============================================================================
// Helper: create an empty table cell node
// ============================================================================

/**
 * Create a new tableCell node with an empty paragraph.
 *
 * @param {object} [attrs] - Cell attributes (colspan, rowspan, header)
 * @returns {Node}
 */
function _emptyCell(attrs) {
    const cellAttrs = {
        colspan: 1,
        rowspan: 1,
        header: false,
        ...(attrs || {})
    };
    return new Node("tableCell", cellAttrs, [
        new Node("paragraph", {}, [], [])
    ], []);
}


/**
 * Create a new tableRow node with the given number of cells.
 *
 * @param {number} cols - Number of cells
 * @param {object} [cellAttrs] - Attributes for each cell
 * @returns {Node}
 */
function _emptyRow(cols, cellAttrs) {
    const cells = [];
    for (let c = 0; c < cols; c++) {
        cells.push(_emptyCell(cellAttrs));
    }
    return new Node("tableRow", {}, cells, []);
}


// ============================================================================
// insertTable — factory command
// ============================================================================

/**
 * Insert a table with the specified number of rows and columns.
 *
 * Returns false if the cursor is already inside a table (no nested tables).
 * After insertion, places the cursor in the first cell of the new table.
 *
 * @param {number} rows - Number of rows
 * @param {number} cols - Number of columns
 * @returns {function(object, function|null): boolean}
 */
export function insertTable(rows, cols) {
    return function (state, dispatch) {
        // No nested tables
        if (_isInTable(state)) return false;

        const { from } = state.selection;

        if (dispatch) {
            const tr = state.transaction;

            // Build table structure
            const tableRows = [];
            for (let r = 0; r < rows; r++) {
                tableRows.push(_emptyRow(cols));
            }
            const tableNode = new Node("table", {}, tableRows, []);

            // Find the block boundary to insert the table at
            // We insert the table at the current block position
            const doc = tr.doc;
            const blockInfo = _findBlockForInsert(doc, from);
            const insertPos = blockInfo ? blockInfo.pos + blockInfo.node.nodeSize : from;

            tr.replaceRange(insertPos, insertPos, tableNode);

            // Place cursor in first cell: table opening(+1) + row opening(+1)
            // + cell opening(+1) + paragraph opening(+1) = insertPos + 4
            const cursorPos = insertPos + 4;
            tr.setSelection(Selection.cursor(cursorPos));

            dispatch(tr);
        }
        return true;
    };
}


// ============================================================================
// addRowBefore
// ============================================================================

/**
 * Insert a new row above the current row.
 *
 * @param {object} state - EditorState
 * @param {function|null} dispatch - Dispatch function or null for can-execute check
 * @returns {boolean}
 */
export function addRowBefore(state, dispatch) {
    const ctx = _isInTable(state);
    if (!ctx) return false;

    if (dispatch) {
        const tr = state.transaction;
        const { tablePos, tableNode, rowNode, rowIndex } = ctx;

        const colCount = rowNode.children.length;
        const newRow = _emptyRow(colCount);

        // Build new table with inserted row
        const newRows = [...tableNode.children];
        newRows.splice(rowIndex, 0, newRow);
        const newTable = new Node("table", tableNode.attrs, newRows, []);

        tr.replaceRange(tablePos, tablePos + tableNode.nodeSize, newTable);
        dispatch(tr);
    }
    return true;
}


// ============================================================================
// addRowAfter
// ============================================================================

/**
 * Insert a new row below the current row.
 *
 * @param {object} state - EditorState
 * @param {function|null} dispatch - Dispatch function or null for can-execute check
 * @returns {boolean}
 */
export function addRowAfter(state, dispatch) {
    const ctx = _isInTable(state);
    if (!ctx) return false;

    if (dispatch) {
        const tr = state.transaction;
        const { tablePos, tableNode, rowNode, rowIndex } = ctx;

        const colCount = rowNode.children.length;
        const newRow = _emptyRow(colCount);

        // Build new table with inserted row after current
        const newRows = [...tableNode.children];
        newRows.splice(rowIndex + 1, 0, newRow);
        const newTable = new Node("table", tableNode.attrs, newRows, []);

        tr.replaceRange(tablePos, tablePos + tableNode.nodeSize, newTable);
        dispatch(tr);
    }
    return true;
}


// ============================================================================
// addColumnBefore
// ============================================================================

/**
 * Insert a new column to the left of the current column.
 *
 * @param {object} state - EditorState
 * @param {function|null} dispatch - Dispatch function or null for can-execute check
 * @returns {boolean}
 */
export function addColumnBefore(state, dispatch) {
    const ctx = _isInTable(state);
    if (!ctx) return false;

    if (dispatch) {
        const tr = state.transaction;
        const { tablePos, tableNode, cellIndex } = ctx;

        // For each row, insert a new empty cell before cellIndex
        const newRows = tableNode.children.map(row => {
            const newCells = [...row.children];
            newCells.splice(cellIndex, 0, _emptyCell());
            return new Node("tableRow", row.attrs, newCells, []);
        });

        const newTable = new Node("table", tableNode.attrs, newRows, []);
        tr.replaceRange(tablePos, tablePos + tableNode.nodeSize, newTable);
        dispatch(tr);
    }
    return true;
}


// ============================================================================
// addColumnAfter
// ============================================================================

/**
 * Insert a new column to the right of the current column.
 *
 * @param {object} state - EditorState
 * @param {function|null} dispatch - Dispatch function or null for can-execute check
 * @returns {boolean}
 */
export function addColumnAfter(state, dispatch) {
    const ctx = _isInTable(state);
    if (!ctx) return false;

    if (dispatch) {
        const tr = state.transaction;
        const { tablePos, tableNode, cellIndex } = ctx;

        // For each row, insert a new empty cell after cellIndex
        const newRows = tableNode.children.map(row => {
            const newCells = [...row.children];
            newCells.splice(cellIndex + 1, 0, _emptyCell());
            return new Node("tableRow", row.attrs, newCells, []);
        });

        const newTable = new Node("table", tableNode.attrs, newRows, []);
        tr.replaceRange(tablePos, tablePos + tableNode.nodeSize, newTable);
        dispatch(tr);
    }
    return true;
}


// ============================================================================
// deleteRow
// ============================================================================

/**
 * Remove the current row from the table.
 *
 * If the table has only one row, deletes the entire table instead.
 * Cursor moves to the nearest remaining row.
 *
 * @param {object} state - EditorState
 * @param {function|null} dispatch - Dispatch function or null for can-execute check
 * @returns {boolean}
 */
export function deleteRow(state, dispatch) {
    const ctx = _isInTable(state);
    if (!ctx) return false;

    const { tableNode, rowIndex } = ctx;

    // If only one row, delete the entire table
    if (tableNode.children.length <= 1) {
        return deleteTable(state, dispatch);
    }

    if (dispatch) {
        const tr = state.transaction;
        const { tablePos } = ctx;

        // Build new table without the current row
        const newRows = tableNode.children.filter((_, i) => i !== rowIndex);
        const newTable = new Node("table", tableNode.attrs, newRows, []);

        tr.replaceRange(tablePos, tablePos + tableNode.nodeSize, newTable);

        // Place cursor in nearest row — same row index or last row
        const targetRowIdx = Math.min(rowIndex, newRows.length - 1);
        let cursorPos = tablePos + 1; // after table opening
        for (let r = 0; r < targetRowIdx; r++) {
            cursorPos += newRows[r].nodeSize;
        }
        // row opening(+1) + cell opening(+1) + paragraph opening(+1) = +3
        cursorPos += 3;
        tr.setSelection(Selection.cursor(cursorPos));

        dispatch(tr);
    }
    return true;
}


// ============================================================================
// deleteColumn
// ============================================================================

/**
 * Remove the current column from the table.
 *
 * If each row has only one cell, deletes the entire table instead.
 * Cursor moves to the nearest remaining column.
 *
 * @param {object} state - EditorState
 * @param {function|null} dispatch - Dispatch function or null for can-execute check
 * @returns {boolean}
 */
export function deleteColumn(state, dispatch) {
    const ctx = _isInTable(state);
    if (!ctx) return false;

    const { tableNode, cellIndex } = ctx;

    // If every row has only one cell, delete the table
    const allSingleCell = tableNode.children.every(row => row.children.length <= 1);
    if (allSingleCell) {
        return deleteTable(state, dispatch);
    }

    if (dispatch) {
        const tr = state.transaction;
        const { tablePos, rowIndex } = ctx;

        // Build new table removing the column at cellIndex from every row
        const newRows = tableNode.children.map(row => {
            const newCells = row.children.filter((_, i) => i !== cellIndex);
            return new Node("tableRow", row.attrs, newCells, []);
        });

        const newTable = new Node("table", tableNode.attrs, newRows, []);
        tr.replaceRange(tablePos, tablePos + tableNode.nodeSize, newTable);

        // Place cursor in nearest column of the same row
        const targetCellIdx = Math.min(cellIndex, newRows[rowIndex].children.length - 1);
        let cursorPos = tablePos + 1; // after table opening
        for (let r = 0; r < rowIndex; r++) {
            cursorPos += newRows[r].nodeSize;
        }
        cursorPos += 1; // row opening
        for (let c = 0; c < targetCellIdx; c++) {
            cursorPos += newRows[rowIndex].children[c].nodeSize;
        }
        // cell opening(+1) + paragraph opening(+1) = +2
        cursorPos += 2;
        tr.setSelection(Selection.cursor(cursorPos));

        dispatch(tr);
    }
    return true;
}


// ============================================================================
// deleteTable
// ============================================================================

/**
 * Remove the entire table from the document.
 *
 * Cursor moves to the position just before where the table was.
 *
 * @param {object} state - EditorState
 * @param {function|null} dispatch - Dispatch function or null for can-execute check
 * @returns {boolean}
 */
export function deleteTable(state, dispatch) {
    const ctx = _isInTable(state);
    if (!ctx) return false;

    if (dispatch) {
        const tr = state.transaction;
        const { tablePos, tableNode } = ctx;

        tr.deleteRange(tablePos, tablePos + tableNode.nodeSize);

        // Place cursor at the position where the table was
        // If there's content before, go to end of previous block;
        // otherwise, stay at tablePos (which now points to next content)
        const newDoc = tr.doc;
        const safePos = Math.min(tablePos, newDoc.contentSize);
        const cursorTarget = safePos > 0 ? safePos : (newDoc.contentSize > 0 ? 1 : 0);
        tr.setSelection(Selection.cursor(cursorTarget));

        dispatch(tr);
    }
    return true;
}


// ============================================================================
// Private helper: find block position for table insertion
// ============================================================================

/**
 * Find the top-level block containing the given position.
 *
 * @param {object} doc - Document node
 * @param {number} pos - Position within the document
 * @returns {{ pos: number, index: number, node: object }|null}
 * @private
 */
function _findBlockForInsert(doc, pos) {
    if (!doc.children) return null;

    let accum = 0;
    for (let i = 0; i < doc.children.length; i++) {
        const child = doc.children[i];
        const childEnd = accum + child.nodeSize;

        if (pos >= accum && pos <= childEnd) {
            return { pos: accum, index: i, node: child };
        }

        accum = childEnd;
    }
    return null;
}
