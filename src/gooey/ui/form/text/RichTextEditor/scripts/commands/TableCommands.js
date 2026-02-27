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
// mergeCells
// ============================================================================

/**
 * Merge cells spanned by the current selection.
 *
 * Requires the selection to span across multiple cells (from and to
 * positions are in different cells). Merges horizontally (same row)
 * by updating colspan, or vertically (different rows) by updating
 * rowspan. Content from merged cells is concatenated.
 *
 * @param {object} state - EditorState
 * @param {function|null} dispatch - Dispatch function or null for can-execute check
 * @returns {boolean}
 */
export function mergeCells(state, dispatch) {
    const ctx = _isInTable(state);
    if (!ctx) return false;

    const { from, to } = state.selection;
    if (from === to) return false; // Need a range selection

    const { tablePos, tableNode } = ctx;

    // Find cells at the start and end of the selection
    const startCell = _findCellAtPos(tableNode, from, tablePos);
    const endCell = _findCellAtPos(tableNode, to, tablePos);

    if (!startCell || !endCell) return false;

    // Selection must span different cells
    if (startCell.rowIndex === endCell.rowIndex && startCell.cellIndex === endCell.cellIndex) {
        return false;
    }

    if (dispatch) {
        const tr = state.transaction;

        if (startCell.rowIndex === endCell.rowIndex) {
            // Horizontal merge — same row, different columns
            const rowIdx = startCell.rowIndex;
            const fromCol = Math.min(startCell.cellIndex, endCell.cellIndex);
            const toCol = Math.max(startCell.cellIndex, endCell.cellIndex);

            const row = tableNode.children[rowIdx];
            const mergedContent = [];
            let totalColspan = 0;

            for (let c = fromCol; c <= toCol; c++) {
                const cell = row.children[c];
                totalColspan += (cell.attrs.colspan || 1);
                // Collect all block children from each cell
                if (cell.children) {
                    mergedContent.push(...cell.children);
                }
            }

            // Create merged cell with combined content
            const mergedCell = new Node("tableCell", {
                ...row.children[fromCol].attrs,
                colspan: totalColspan,
                rowspan: row.children[fromCol].attrs.rowspan || 1
            }, mergedContent.length > 0 ? mergedContent : [new Node("paragraph", {}, [], [])], []);

            // Build new row with merged cells
            const newCells = [];
            for (let c = 0; c < row.children.length; c++) {
                if (c === fromCol) {
                    newCells.push(mergedCell);
                } else if (c > fromCol && c <= toCol) {
                    // Skip merged cells
                    continue;
                } else {
                    newCells.push(row.children[c]);
                }
            }

            const newRow = new Node("tableRow", row.attrs, newCells, []);
            const newRows = tableNode.children.map((r, i) => i === rowIdx ? newRow : r);
            const newTable = new Node("table", tableNode.attrs, newRows, []);

            tr.replaceRange(tablePos, tablePos + tableNode.nodeSize, newTable);
        } else {
            // Vertical merge — different rows, same column
            const fromRow = Math.min(startCell.rowIndex, endCell.rowIndex);
            const toRow = Math.max(startCell.rowIndex, endCell.rowIndex);
            const colIdx = startCell.cellIndex;

            const mergedContent = [];
            let totalRowspan = 0;

            for (let r = fromRow; r <= toRow; r++) {
                const cell = tableNode.children[r].children[colIdx];
                if (cell) {
                    totalRowspan += (cell.attrs.rowspan || 1);
                    if (cell.children) {
                        mergedContent.push(...cell.children);
                    }
                }
            }

            // Build new table with merged cells
            const newRows = tableNode.children.map((row, rIdx) => {
                if (rIdx === fromRow) {
                    // First row: replace cell with merged cell
                    const mergedCell = new Node("tableCell", {
                        ...row.children[colIdx].attrs,
                        colspan: row.children[colIdx].attrs.colspan || 1,
                        rowspan: totalRowspan
                    }, mergedContent.length > 0 ? mergedContent : [new Node("paragraph", {}, [], [])], []);

                    const newCells = row.children.map((c, i) => i === colIdx ? mergedCell : c);
                    return new Node("tableRow", row.attrs, newCells, []);
                } else if (rIdx > fromRow && rIdx <= toRow) {
                    // Subsequent rows: remove the cell at colIdx
                    const newCells = row.children.filter((_, i) => i !== colIdx);
                    if (newCells.length === 0) return null; // Row becomes empty
                    return new Node("tableRow", row.attrs, newCells, []);
                }
                return row;
            }).filter(Boolean);

            const newTable = new Node("table", tableNode.attrs, newRows, []);
            tr.replaceRange(tablePos, tablePos + tableNode.nodeSize, newTable);
        }

        dispatch(tr);
    }
    return true;
}


// ============================================================================
// splitCell
// ============================================================================

/**
 * Split a merged cell back into individual cells.
 *
 * Checks current cell's colspan and rowspan. If both are 1, returns
 * false (nothing to split). Splits horizontally if colspan > 1, or
 * vertically if rowspan > 1. The first cell keeps the content;
 * additional cells get empty paragraphs.
 *
 * @param {object} state - EditorState
 * @param {function|null} dispatch - Dispatch function or null for can-execute check
 * @returns {boolean}
 */
export function splitCell(state, dispatch) {
    const ctx = _isInTable(state);
    if (!ctx) return false;

    const { cellNode, cellIndex, rowIndex, tablePos, tableNode } = ctx;
    const colspan = cellNode.attrs.colspan || 1;
    const rowspan = cellNode.attrs.rowspan || 1;

    // Nothing to split if both are 1
    if (colspan <= 1 && rowspan <= 1) return false;

    if (dispatch) {
        const tr = state.transaction;

        if (colspan > 1 && rowspan <= 1) {
            // Horizontal split — replace merged cell with individual cells
            const row = tableNode.children[rowIndex];
            const newCells = [];

            for (let c = 0; c < row.children.length; c++) {
                if (c === cellIndex) {
                    // First cell keeps the content with colspan=1
                    const firstCell = new Node("tableCell", {
                        ...cellNode.attrs,
                        colspan: 1,
                        rowspan: 1
                    }, cellNode.children, cellNode.marks);
                    newCells.push(firstCell);

                    // Additional cells get empty paragraphs
                    for (let s = 1; s < colspan; s++) {
                        newCells.push(_emptyCell({ header: cellNode.attrs.header || false }));
                    }
                } else {
                    newCells.push(row.children[c]);
                }
            }

            const newRow = new Node("tableRow", row.attrs, newCells, []);
            const newRows = tableNode.children.map((r, i) => i === rowIndex ? newRow : r);
            const newTable = new Node("table", tableNode.attrs, newRows, []);

            tr.replaceRange(tablePos, tablePos + tableNode.nodeSize, newTable);
        } else if (rowspan > 1 && colspan <= 1) {
            // Vertical split — reduce rowspan to 1, insert cells in subsequent rows
            const newRows = tableNode.children.map((row, rIdx) => {
                if (rIdx === rowIndex) {
                    // Original row: set rowspan to 1
                    const splitCellNode = new Node("tableCell", {
                        ...cellNode.attrs,
                        colspan: 1,
                        rowspan: 1
                    }, cellNode.children, cellNode.marks);

                    const newCells = row.children.map((c, i) => i === cellIndex ? splitCellNode : c);
                    return new Node("tableRow", row.attrs, newCells, []);
                } else if (rIdx > rowIndex && rIdx < rowIndex + rowspan) {
                    // Subsequent spanned rows: insert empty cell at the column position
                    const newCells = [...row.children];
                    newCells.splice(cellIndex, 0, _emptyCell({ header: cellNode.attrs.header || false }));
                    return new Node("tableRow", row.attrs, newCells, []);
                }
                return row;
            });

            const newTable = new Node("table", tableNode.attrs, newRows, []);
            tr.replaceRange(tablePos, tablePos + tableNode.nodeSize, newTable);
        } else {
            // Both colspan > 1 AND rowspan > 1 — split into grid
            const newRows = tableNode.children.map((row, rIdx) => {
                if (rIdx === rowIndex) {
                    // Original row: split into colspan individual cells
                    const newCells = [];
                    for (let c = 0; c < row.children.length; c++) {
                        if (c === cellIndex) {
                            // First cell keeps content
                            const firstCell = new Node("tableCell", {
                                ...cellNode.attrs,
                                colspan: 1,
                                rowspan: 1
                            }, cellNode.children, cellNode.marks);
                            newCells.push(firstCell);
                            for (let s = 1; s < colspan; s++) {
                                newCells.push(_emptyCell({ header: cellNode.attrs.header || false }));
                            }
                        } else {
                            newCells.push(row.children[c]);
                        }
                    }
                    return new Node("tableRow", row.attrs, newCells, []);
                } else if (rIdx > rowIndex && rIdx < rowIndex + rowspan) {
                    // Subsequent spanned rows: insert colspan empty cells
                    const newCells = [...row.children];
                    for (let s = 0; s < colspan; s++) {
                        newCells.splice(cellIndex + s, 0, _emptyCell({ header: cellNode.attrs.header || false }));
                    }
                    return new Node("tableRow", row.attrs, newCells, []);
                }
                return row;
            });

            const newTable = new Node("table", tableNode.attrs, newRows, []);
            tr.replaceRange(tablePos, tablePos + tableNode.nodeSize, newTable);
        }

        dispatch(tr);
    }
    return true;
}


// ============================================================================
// toggleHeaderRow
// ============================================================================

/**
 * Toggle the header attribute on all cells in the current row.
 *
 * If all cells in the row have header: true, toggles to false.
 * Otherwise toggles to true. The header attribute causes cells to
 * render as <th> instead of <td> via the Schema's toDOM spec.
 *
 * @param {object} state - EditorState
 * @param {function|null} dispatch - Dispatch function or null for can-execute check
 * @returns {boolean}
 */
export function toggleHeaderRow(state, dispatch) {
    const ctx = _isInTable(state);
    if (!ctx) return false;

    if (dispatch) {
        const tr = state.transaction;
        const { tablePos, tableNode, rowNode, rowIndex } = ctx;

        // Determine current header state — all cells must be header for toggle-off
        const allHeader = rowNode.children.every(cell => cell.attrs.header === true);
        const newHeaderValue = !allHeader;

        // Rebuild the row with updated header attribute on all cells
        const newCells = rowNode.children.map(cell => {
            return new Node("tableCell", {
                ...cell.attrs,
                header: newHeaderValue
            }, cell.children, cell.marks);
        });

        const newRow = new Node("tableRow", rowNode.attrs, newCells, []);
        const newRows = tableNode.children.map((r, i) => i === rowIndex ? newRow : r);
        const newTable = new Node("table", tableNode.attrs, newRows, []);

        tr.replaceRange(tablePos, tablePos + tableNode.nodeSize, newTable);
        dispatch(tr);
    }
    return true;
}


// ============================================================================
// toggleHeaderColumn
// ============================================================================

/**
 * Toggle the header attribute on all cells in the current column.
 *
 * If all cells at the current column index across all rows have
 * header: true, toggles to false. Otherwise toggles to true.
 *
 * @param {object} state - EditorState
 * @param {function|null} dispatch - Dispatch function or null for can-execute check
 * @returns {boolean}
 */
export function toggleHeaderColumn(state, dispatch) {
    const ctx = _isInTable(state);
    if (!ctx) return false;

    if (dispatch) {
        const tr = state.transaction;
        const { tablePos, tableNode, cellIndex } = ctx;

        // Determine current header state — check if ALL cells at cellIndex are header
        const allHeader = tableNode.children.every(row => {
            const cell = row.children[cellIndex];
            return cell && cell.attrs.header === true;
        });
        const newHeaderValue = !allHeader;

        // Rebuild the table with updated header attribute on cells at cellIndex
        const newRows = tableNode.children.map(row => {
            const newCells = row.children.map((cell, i) => {
                if (i === cellIndex) {
                    return new Node("tableCell", {
                        ...cell.attrs,
                        header: newHeaderValue
                    }, cell.children, cell.marks);
                }
                return cell;
            });
            return new Node("tableRow", row.attrs, newCells, []);
        });

        const newTable = new Node("table", tableNode.attrs, newRows, []);
        tr.replaceRange(tablePos, tablePos + tableNode.nodeSize, newTable);
        dispatch(tr);
    }
    return true;
}


// ============================================================================
// Private helpers
// ============================================================================

/**
 * Find the cell (and its row) at a specific position within a table.
 *
 * @param {object} tableNode - Table node
 * @param {number} pos - Position within the document
 * @param {number} tablePos - Start position of the table
 * @returns {{ rowIndex: number, cellIndex: number, cellNode: object }|null}
 * @private
 */
function _findCellAtPos(tableNode, pos, tablePos) {
    if (!tableNode.children) return null;

    let rowAccum = tablePos + 1; // +1 for table opening
    for (let r = 0; r < tableNode.children.length; r++) {
        const row = tableNode.children[r];
        const rowEnd = rowAccum + row.nodeSize;

        if (pos >= rowAccum && pos <= rowEnd) {
            // Find cell within this row
            let cellAccum = rowAccum + 1; // +1 for row opening
            for (let c = 0; c < row.children.length; c++) {
                const cell = row.children[c];
                const cellEnd = cellAccum + cell.nodeSize;

                if (pos >= cellAccum && pos <= cellEnd) {
                    return { rowIndex: r, cellIndex: c, cellNode: cell };
                }

                cellAccum = cellEnd;
            }
        }

        rowAccum = rowEnd;
    }
    return null;
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
