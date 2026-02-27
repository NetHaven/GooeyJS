import Node, { Mark } from "../model/Node.js";
import { Selection } from "../model/Position.js";


// ============================================================================
// Navigation commands
// ============================================================================

/**
 * Move cursor one position to the left.
 *
 * If selection is not empty, collapses to the `from` side.
 * If at position 0, returns false (cannot move further).
 *
 * @param {object} state - EditorState
 * @param {function|null} dispatch - Dispatch function or null for can-execute check
 * @returns {boolean}
 */
export function moveLeft(state, dispatch) {
    const { from, empty, head } = state.selection;

    if (!empty) {
        // Collapse selection to the from (left) side
        if (dispatch) {
            const tr = state.transaction;
            tr.setSelection(Selection.cursor(from));
            dispatch(tr);
        }
        return true;
    }

    if (head <= 0) return false;

    // Find the previous valid text position
    const newPos = _findPrevTextPos(state.doc, head);
    if (newPos === null || newPos === head) return false;

    if (dispatch) {
        const tr = state.transaction;
        tr.setSelection(Selection.cursor(newPos));
        dispatch(tr);
    }
    return true;
}


/**
 * Move cursor one position to the right.
 *
 * If selection is not empty, collapses to the `to` side.
 * If at end of document, returns false.
 *
 * @param {object} state - EditorState
 * @param {function|null} dispatch - Dispatch function or null for can-execute check
 * @returns {boolean}
 */
export function moveRight(state, dispatch) {
    const { to, empty, head } = state.selection;

    if (!empty) {
        // Collapse selection to the to (right) side
        if (dispatch) {
            const tr = state.transaction;
            tr.setSelection(Selection.cursor(to));
            dispatch(tr);
        }
        return true;
    }

    const docSize = state.doc.contentSize;
    if (head >= docSize) return false;

    // Find the next valid text position
    const newPos = _findNextTextPos(state.doc, head);
    if (newPos === null || newPos === head) return false;

    if (dispatch) {
        const tr = state.transaction;
        tr.setSelection(Selection.cursor(newPos));
        dispatch(tr);
    }
    return true;
}


/**
 * Factory: create a moveUp command that uses the view for coordinate mapping.
 *
 * @param {object} view - EditorView reference
 * @returns {function(state, dispatch): boolean}
 */
export function moveUp(view) {
    return function (state, dispatch) {
        const { head } = state.selection;
        const coords = view.coordsAtPos(head);
        if (!coords) {
            // Cannot determine coordinates — move to document start
            if (dispatch) {
                const tr = state.transaction;
                const startPos = _firstTextPos(state.doc);
                tr.setSelection(Selection.cursor(startPos));
                dispatch(tr);
            }
            return true;
        }

        const lineHeight = coords.bottom - coords.top;
        if (lineHeight <= 0) return false;

        // Look one line up
        const targetTop = coords.top - lineHeight;
        const pos = view.posAtCoords({ left: coords.left, top: targetTop });

        if (pos === null || pos === head) {
            // No position above — move to document start
            if (dispatch) {
                const tr = state.transaction;
                const startPos = _firstTextPos(state.doc);
                tr.setSelection(Selection.cursor(startPos));
                dispatch(tr);
            }
            return true;
        }

        if (dispatch) {
            const tr = state.transaction;
            tr.setSelection(Selection.cursor(pos));
            dispatch(tr);
        }
        return true;
    };
}


/**
 * Factory: create a moveDown command that uses the view for coordinate mapping.
 *
 * @param {object} view - EditorView reference
 * @returns {function(state, dispatch): boolean}
 */
export function moveDown(view) {
    return function (state, dispatch) {
        const { head } = state.selection;
        const coords = view.coordsAtPos(head);
        if (!coords) {
            // Cannot determine coordinates — move to document end
            if (dispatch) {
                const tr = state.transaction;
                tr.setSelection(Selection.cursor(state.doc.contentSize));
                dispatch(tr);
            }
            return true;
        }

        const lineHeight = coords.bottom - coords.top;
        if (lineHeight <= 0) return false;

        // Look one line down
        const targetTop = coords.bottom + 1;
        const pos = view.posAtCoords({ left: coords.left, top: targetTop });

        if (pos === null || pos === head) {
            // No position below — move to document end
            if (dispatch) {
                const tr = state.transaction;
                tr.setSelection(Selection.cursor(state.doc.contentSize));
                dispatch(tr);
            }
            return true;
        }

        if (dispatch) {
            const tr = state.transaction;
            tr.setSelection(Selection.cursor(pos));
            dispatch(tr);
        }
        return true;
    };
}


/**
 * Move cursor to the start of the current block (Home key).
 *
 * @param {object} state - EditorState
 * @param {function|null} dispatch - Dispatch function or null for can-execute check
 * @returns {boolean}
 */
export function moveToBlockStart(state, dispatch) {
    const { head } = state.selection;
    const $head = state.doc.resolve(head);

    // Find the start of the parent block's content
    const blockStart = head - $head.parentOffset;

    if (blockStart === head) return false; // Already at start

    if (dispatch) {
        const tr = state.transaction;
        tr.setSelection(Selection.cursor(blockStart));
        dispatch(tr);
    }
    return true;
}


/**
 * Move cursor to the end of the current block (End key).
 *
 * @param {object} state - EditorState
 * @param {function|null} dispatch - Dispatch function or null for can-execute check
 * @returns {boolean}
 */
export function moveToBlockEnd(state, dispatch) {
    const { head } = state.selection;
    const $head = state.doc.resolve(head);

    // Find the end of the parent block's content
    const blockEnd = head - $head.parentOffset + $head.parent.contentSize;

    if (blockEnd === head) return false; // Already at end

    if (dispatch) {
        const tr = state.transaction;
        tr.setSelection(Selection.cursor(blockEnd));
        dispatch(tr);
    }
    return true;
}


/**
 * Move cursor one word to the left (Ctrl+Left / Mod+Left).
 *
 * Scans backward from cursor: skips whitespace, then skips word characters,
 * stopping at the word boundary. Stops at block boundaries.
 *
 * @param {object} state - EditorState
 * @param {function|null} dispatch - Dispatch function or null for can-execute check
 * @returns {boolean}
 */
export function moveWordLeft(state, dispatch) {
    const { head } = state.selection;
    const $head = state.doc.resolve(head);

    // Get the text content of the parent block
    const blockText = $head.parent.textContent;
    const offset = $head.parentOffset;
    const blockStart = head - offset;

    if (offset === 0) {
        // At start of block — try to move to previous block
        return moveLeft(state, dispatch);
    }

    // Scan backward from offset
    let pos = offset;

    // Skip whitespace
    while (pos > 0 && /\s/.test(blockText[pos - 1])) {
        pos--;
    }
    // Skip word characters
    while (pos > 0 && /\w/.test(blockText[pos - 1])) {
        pos--;
    }

    // If we didn't move at all (e.g., at a punctuation char), move at least one
    if (pos === offset && pos > 0) {
        pos--;
    }

    const newPos = blockStart + pos;
    if (newPos === head) return false;

    if (dispatch) {
        const tr = state.transaction;
        tr.setSelection(Selection.cursor(newPos));
        dispatch(tr);
    }
    return true;
}


/**
 * Move cursor one word to the right (Ctrl+Right / Mod+Right).
 *
 * Scans forward from cursor: skips word characters, then skips whitespace,
 * stopping at the next word boundary. Stops at block boundaries.
 *
 * @param {object} state - EditorState
 * @param {function|null} dispatch - Dispatch function or null for can-execute check
 * @returns {boolean}
 */
export function moveWordRight(state, dispatch) {
    const { head } = state.selection;
    const $head = state.doc.resolve(head);

    // Get the text content of the parent block
    const blockText = $head.parent.textContent;
    const offset = $head.parentOffset;
    const blockStart = head - offset;
    const textLen = blockText.length;

    if (offset >= textLen) {
        // At end of block — try to move to next block
        return moveRight(state, dispatch);
    }

    // Scan forward from offset
    let pos = offset;

    // Skip word characters
    while (pos < textLen && /\w/.test(blockText[pos])) {
        pos++;
    }
    // Skip whitespace
    while (pos < textLen && /\s/.test(blockText[pos])) {
        pos++;
    }

    // If we didn't move at all (e.g., at a punctuation char), move at least one
    if (pos === offset && pos < textLen) {
        pos++;
    }

    const newPos = blockStart + pos;
    if (newPos === head) return false;

    if (dispatch) {
        const tr = state.transaction;
        tr.setSelection(Selection.cursor(newPos));
        dispatch(tr);
    }
    return true;
}


/**
 * Higher-order function that wraps a movement command to extend
 * the selection instead of collapsing it.
 *
 * Preserves the anchor and moves only the head.
 *
 * @param {function} moveCommand - A movement command (state, dispatch) => boolean
 * @returns {function(state, dispatch): boolean}
 */
export function extendSelection(moveCommand) {
    return function (state, dispatch) {
        const { anchor } = state.selection;

        // Create a probe dispatch to find where the movement would go
        let targetHead = null;
        const probeDispatch = (tr) => {
            if (tr._selection) {
                // The movement command set a selection — get its head
                targetHead = tr._selection.head;
            }
        };

        // Execute the command in probe mode to find the target position
        const canExec = moveCommand(state, probeDispatch);
        if (!canExec || targetHead === null) return false;

        if (dispatch) {
            const tr = state.transaction;
            tr.setSelection(Selection.between(anchor, targetHead));
            dispatch(tr);
        }
        return true;
    };
}


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
 * - If at start of block, joins with the previous block.
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

    // Check if at start of block — join with previous block
    const $from = state.doc.resolve(from);
    if ($from.parentOffset === 0) {
        // At start of block content — join with previous block
        return _joinBlockBackward(state, dispatch, from, $from);
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
 * - If at end of block, joins with the next block.
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

    // Check if at the end of block content
    const $from = state.doc.resolve(from);
    const parentContentSize = $from.parent.contentSize;

    if ($from.parentOffset >= parentContentSize) {
        // At end of block content — join with next block
        return _joinBlockForward(state, dispatch, from, $from);
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
 * Create a command that applies an attribute mark to the current selection.
 *
 * Unlike toggleMark which removes the mark if active, setMark always
 * applies/replaces the mark with the given attributes. This is the
 * correct semantic for color, fontSize, fontFamily marks where the
 * user is selecting a new value, not toggling on/off.
 *
 * If selection is empty (cursor): adds/replaces the mark in stored marks.
 * If selection has a range: removes any existing mark of the same type,
 * then adds the new mark with the given attributes.
 *
 * Can-execute: returns true if the mark type exists in the schema.
 *
 * @param {string} markType - Mark type name (e.g., "textColor", "fontSize")
 * @param {object} attrs - Mark attributes (e.g., { color: '#FF0000' })
 * @returns {function(state, dispatch): boolean}
 */
export function setMark(markType, attrs) {
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
                // Cursor: replace in stored marks
                const newMarks = state.marks.filter(m => m.type !== markType);
                newMarks.push(mark);
                tr.setStoredMarks(newMarks);
            } else {
                // Range: remove existing mark of same type, then add new one
                tr.removeMark(from, to, Mark.create(markType));
                tr.addMark(from, to, mark);
            }

            dispatch(tr);
        }
        return true;
    };
}


/**
 * Command for Mod-K link toggle.
 *
 * If the link mark is active on the selection: removes the link (unlink).
 * If the link mark is NOT active: returns true from can-execute but does
 * NOT dispatch. The actual link creation requires a dialog (URL input),
 * which must be handled by the RichTextEditor component.
 *
 * @param {object} state - EditorState
 * @param {function|null} dispatch - Dispatch function or null for can-execute check
 * @returns {boolean}
 */
export function toggleLink(state, dispatch) {
    // Check if link mark type exists in schema
    if (state.schema && !state.schema.marks['link']) {
        return false;
    }

    const { from, to, empty } = state.selection;
    const isActive = markActive(state, 'link');

    if (isActive && !empty) {
        // Link is active on selection range: remove it (unlink)
        if (dispatch) {
            const tr = state.transaction;
            tr.removeMark(from, to, Mark.create('link'));
            dispatch(tr);
        }
        return true;
    }

    if (isActive && empty) {
        // Cursor inside a link: signal can-execute (component handles dialog)
        return true;
    }

    // Link NOT active: signal can-execute for dialog handling by component
    return true;
}


/**
 * Command that removes all marks from the current selection.
 *
 * If the selection is empty (cursor), clears all stored marks.
 * If the selection has a range, removes all marks from all text in the range.
 * Always returns true (clearing formatting is always valid).
 *
 * @param {object} state - EditorState
 * @param {function|null} dispatch - Dispatch function or null for can-execute check
 * @returns {boolean}
 */
export function clearFormatting(state, dispatch) {
    if (dispatch) {
        const tr = state.transaction;
        const { from, to, empty } = state.selection;

        if (empty) {
            // Cursor: clear all stored marks
            tr.setStoredMarks([]);
        } else {
            // Range: collect all unique mark types in the range, then remove each
            const markTypes = new Set();

            state.doc.nodesBetween(from, to, (node, pos) => {
                if (node.type === "text") {
                    for (const mark of node.marks) {
                        markTypes.add(mark.type);
                    }
                    return false;
                }
                return true;
            });

            // Remove each unique mark type from the range
            for (const markType of markTypes) {
                tr.removeMark(from, to, Mark.create(markType));
            }
        }

        dispatch(tr);
    }
    return true;
}


/**
 * Get all active marks at the current selection position.
 *
 * For cursor selections (empty): returns stored marks merged with marks
 * on text at the cursor position.
 * For range selections: returns marks that are present on ALL text nodes
 * in the range (intersection of mark sets).
 *
 * @param {object} state - EditorState
 * @returns {object[]} Array of active mark objects
 */
export function getActiveMarks(state) {
    const { from, to, empty } = state.selection;

    if (empty) {
        // Cursor: merge stored marks with marks on adjacent text
        const storedMarks = state.marks || [];
        const posMarks = _allMarksAtPos(state.doc, from);

        // Merge: start with stored marks, add position marks not already present
        const merged = [...storedMarks];
        for (const mark of posMarks) {
            if (!merged.some(m => m.type === mark.type)) {
                merged.push(mark);
            }
        }
        return merged;
    }

    // Range: find marks present on ALL text nodes in the range
    let commonMarks = null;
    let foundText = false;

    state.doc.nodesBetween(from, to, (node, pos) => {
        if (node.type === "text") {
            const textStart = pos;
            const textEnd = pos + node.text.length;

            // Only consider the overlapping portion
            if (textEnd > from && textStart < to) {
                foundText = true;
                if (commonMarks === null) {
                    // First text node: start with its marks
                    commonMarks = [...node.marks];
                } else {
                    // Intersect: keep only marks present on this node too
                    commonMarks = commonMarks.filter(
                        cm => node.marks.some(m => m.type === cm.type)
                    );
                }
            }
            return false;
        }
        return true;
    });

    if (!foundText || commonMarks === null) return [];
    return commonMarks;
}


/**
 * Create a command that changes the block type of blocks in the selection range.
 *
 * Uses the SetBlockTypeStep to properly change the block's type (not the
 * old attrs hack). Can-execute: returns false if already the target type
 * with matching attrs.
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
            const blockInfo = _findBlockInDoc(state.doc, from);
            if (blockInfo !== null) {
                const { blockPos } = blockInfo;
                tr.setBlockType(blockPos, nodeType, attrs || null);

                // Preserve cursor at same relative offset in the new block
                const relOffset = $from.parentOffset;
                tr.setSelection(Selection.cursor(blockPos + 1 + relOffset));
            }
            dispatch(tr);
        }
        return true;
    };
}


/**
 * Command that wraps the current block(s) in a blockquote, or unwraps
 * if already inside a blockquote (toggle behavior).
 *
 * @param {object} state - EditorState
 * @param {function|null} dispatch - Dispatch function or null for can-execute check
 * @returns {boolean}
 */
export function wrapInBlockquote(state, dispatch) {
    const { from } = state.selection;
    const doc = state.doc;

    // Check if we're inside a blockquote
    const bqInfo = _findAncestorOfType(doc, from, "blockquote");

    if (bqInfo) {
        // Already in a blockquote — unwrap it
        if (dispatch) {
            const tr = state.transaction;
            tr.unwrap(bqInfo.pos);
            // Adjust cursor position: unwrapping removes 2 positions (boundaries)
            const newCursorPos = Math.max(1, from - 1);
            tr.setSelection(Selection.cursor(newCursorPos));
            dispatch(tr);
        }
        return true;
    }

    // Not in blockquote — wrap the current block(s)
    const blockInfo = _findBlockInDoc(doc, from);
    if (!blockInfo) return false;

    if (dispatch) {
        const tr = state.transaction;
        const block = doc.children[blockInfo.blockIndex];
        const blockEnd = blockInfo.blockPos + block.nodeSize;
        tr.wrapIn(blockInfo.blockPos, blockEnd, "blockquote");
        // Cursor shifts right by 1 (opening boundary of blockquote)
        tr.setSelection(Selection.cursor(from + 1));
        dispatch(tr);
    }
    return true;
}


/**
 * Command that toggles the current block between codeBlock and paragraph.
 *
 * When converting to codeBlock, strips all marks from text children
 * since code blocks only contain plain text (content: "text*").
 *
 * @param {object} state - EditorState
 * @param {function|null} dispatch - Dispatch function or null for can-execute check
 * @returns {boolean}
 */
export function toggleCodeBlock(state, dispatch) {
    const { from } = state.selection;
    const $from = state.doc.resolve(from);
    const parent = $from.parent;

    if (parent.type === "codeBlock") {
        // Already a code block — convert back to paragraph
        return setBlockType("paragraph")(state, dispatch);
    }

    // Convert to code block
    if (parent.type !== "paragraph" && parent.type !== "heading") {
        return false; // Can only convert paragraphs and headings
    }

    if (dispatch) {
        const tr = state.transaction;
        const blockInfo = _findBlockInDoc(state.doc, from);
        if (blockInfo !== null) {
            const { blockPos } = blockInfo;
            const block = state.doc.children[blockInfo.blockIndex];

            // Strip all marks from text children for code block
            const plainChildren = [];
            if (block.children) {
                for (const child of block.children) {
                    if (child.type === "text") {
                        if (child.marks.length > 0) {
                            plainChildren.push(new Node("text", null, null, [], child.text));
                        } else {
                            plainChildren.push(child);
                        }
                    }
                    // Skip non-text inline nodes (hardBreak etc.) in code blocks
                }
            }

            // Build the code block node directly and replace
            const codeBlockNode = new Node("codeBlock", { language: null }, plainChildren);
            const blockEnd = blockPos + block.nodeSize;
            tr.replaceRange(blockPos, blockEnd, [codeBlockNode]);

            // Position cursor inside the code block
            const relOffset = Math.min($from.parentOffset, codeBlockNode.contentSize);
            tr.setSelection(Selection.cursor(blockPos + 1 + relOffset));
        }
        dispatch(tr);
    }
    return true;
}


/**
 * Command that inserts a horizontal rule at the cursor position.
 *
 * Splits the current block at the cursor, inserts a horizontalRule node
 * between the two halves, and ensures the document remains valid
 * (paragraph after the rule if needed).
 *
 * @param {object} state - EditorState
 * @param {function|null} dispatch - Dispatch function or null for can-execute check
 * @returns {boolean}
 */
export function insertHorizontalRule(state, dispatch) {
    const { from, to, empty } = state.selection;
    const $from = state.doc.resolve(from);

    if ($from.parent.type === "document") return false;

    if (dispatch) {
        const tr = state.transaction;
        const doc = state.doc;

        // Delete selection first if not empty
        let cursorPos = from;
        if (!empty) {
            tr.deleteRange(from, to);
            cursorPos = from;
        }

        const currentDoc = tr.doc;
        const blockInfo = _findBlockInDoc(currentDoc, cursorPos);
        if (!blockInfo) return false;

        const { blockPos, blockIndex } = blockInfo;
        const block = currentDoc.children[blockIndex];
        const $cursor = currentDoc.resolve(cursorPos);
        const offset = $cursor.parentOffset;

        // Split the block into left/right halves
        const allChildren = block.children || [];
        const leftChildren = [];
        const rightChildren = [];

        let childAccum = 0;
        for (let i = 0; i < allChildren.length; i++) {
            const child = allChildren[i];
            const childSize = child.nodeSize;
            const childEnd = childAccum + childSize;

            if (childEnd <= offset) {
                leftChildren.push(child);
            } else if (childAccum >= offset) {
                rightChildren.push(child);
            } else if (child.type === "text") {
                const splitAt = offset - childAccum;
                const leftText = child.text.slice(0, splitAt);
                const rightText = child.text.slice(splitAt);
                if (leftText) leftChildren.push(new Node("text", child.attrs, null, child.marks, leftText));
                if (rightText) rightChildren.push(new Node("text", child.attrs, null, child.marks, rightText));
            } else {
                rightChildren.push(child);
            }

            childAccum += childSize;
        }

        // Build the replacement: leftBlock + hr + rightBlock
        const leftBlock = block.copy(leftChildren);
        const hrNode = new Node("horizontalRule", null, null);
        const rightBlock = block.copy(rightChildren);

        const blockEnd = blockPos + block.nodeSize;
        tr.replaceRange(blockPos, blockEnd, [leftBlock, hrNode, rightBlock]);

        // Set cursor to start of right block (after hr)
        const newCursorPos = blockPos + leftBlock.nodeSize + hrNode.nodeSize + 1;
        tr.setSelection(Selection.cursor(newCursorPos));

        dispatch(tr);
    }
    return true;
}


/**
 * Create a heading command for a specific level.
 *
 * @param {number} level - Heading level (1-6)
 * @returns {function(state, dispatch): boolean}
 */
export function heading(level) {
    return setBlockType("heading", { level });
}


/**
 * Command that converts the current block to a paragraph.
 *
 * @type {function(state, dispatch): boolean}
 */
export const paragraph = setBlockType("paragraph");


// ============================================================================
// Alignment, indentation, and line height commands
// ============================================================================

/**
 * Iterate over all top-level blocks that overlap the current selection.
 *
 * @param {object} state - EditorState
 * @param {function} callback - (block, blockPos, blockIndex) => void
 * @private
 */
function _forEachBlockInSelection(state, callback) {
    const { from, to } = state.selection;
    const doc = state.doc;
    if (!doc.children) return;

    let accum = 0;
    for (let i = 0; i < doc.children.length; i++) {
        const child = doc.children[i];
        const childEnd = accum + child.nodeSize;

        if (childEnd > from && accum < to) {
            callback(child, accum, i);
        }

        accum = childEnd;
    }
}


/**
 * Create a command that sets text alignment on blocks in the selection.
 *
 * @param {string|null} align - Alignment value ("left", "center", "right", "justify", or null to reset)
 * @returns {function(state, dispatch): boolean}
 */
export function setAlignment(align) {
    return function (state, dispatch) {
        if (dispatch) {
            const tr = state.transaction;
            const { from, to } = state.selection;
            const doc = state.doc;

            if (!doc.children) return false;

            // For single-block or multi-block selections, set alignment on all blocks
            let accum = 0;
            let posOffset = 0;
            for (let i = 0; i < doc.children.length; i++) {
                const child = doc.children[i];
                const childEnd = accum + child.nodeSize;

                if (childEnd > from && accum < to) {
                    tr.setNodeAttrs(accum + posOffset, { align });
                }

                accum = childEnd;
            }

            dispatch(tr);
        }
        return true;
    };
}


/**
 * Command that increases the indentation of the current block(s).
 * Maximum indent level is 10.
 *
 * @param {object} state - EditorState
 * @param {function|null} dispatch - Dispatch function or null for can-execute check
 * @returns {boolean}
 */
export function increaseIndent(state, dispatch) {
    const { from } = state.selection;
    const $from = state.doc.resolve(from);
    const currentIndent = $from.parent.attrs.indent || 0;

    if (currentIndent >= 10) return false;

    if (dispatch) {
        const tr = state.transaction;
        const doc = state.doc;
        const { to } = state.selection;

        let accum = 0;
        for (let i = 0; i < doc.children.length; i++) {
            const child = doc.children[i];
            const childEnd = accum + child.nodeSize;

            if (childEnd > from && accum < to) {
                const indent = (child.attrs.indent || 0) + 1;
                if (indent <= 10) {
                    tr.setNodeAttrs(accum, { indent });
                }
            }

            accum = childEnd;
        }

        dispatch(tr);
    }
    return true;
}


/**
 * Command that decreases the indentation of the current block(s).
 * Minimum indent level is 0.
 *
 * @param {object} state - EditorState
 * @param {function|null} dispatch - Dispatch function or null for can-execute check
 * @returns {boolean}
 */
export function decreaseIndent(state, dispatch) {
    const { from } = state.selection;
    const $from = state.doc.resolve(from);
    const currentIndent = $from.parent.attrs.indent || 0;

    if (currentIndent <= 0) return false;

    if (dispatch) {
        const tr = state.transaction;
        const doc = state.doc;
        const { to } = state.selection;

        let accum = 0;
        for (let i = 0; i < doc.children.length; i++) {
            const child = doc.children[i];
            const childEnd = accum + child.nodeSize;

            if (childEnd > from && accum < to) {
                const indent = Math.max(0, (child.attrs.indent || 0) - 1);
                tr.setNodeAttrs(accum, { indent });
            }

            accum = childEnd;
        }

        dispatch(tr);
    }
    return true;
}


/**
 * Create a command that sets line height on blocks in the selection.
 *
 * @param {string|null} value - CSS line-height value (e.g., "1.5", "2") or null to reset
 * @returns {function(state, dispatch): boolean}
 */
export function setLineHeight(value) {
    return function (state, dispatch) {
        if (dispatch) {
            const tr = state.transaction;
            const { from, to } = state.selection;
            const doc = state.doc;

            if (!doc.children) return false;

            let accum = 0;
            for (let i = 0; i < doc.children.length; i++) {
                const child = doc.children[i];
                const childEnd = accum + child.nodeSize;

                if (childEnd > from && accum < to) {
                    tr.setNodeAttrs(accum, { lineHeight: value });
                }

                accum = childEnd;
            }

            dispatch(tr);
        }
        return true;
    };
}


// ============================================================================
// Table utilities
// ============================================================================

/**
 * Check if the cursor is inside a table structure.
 *
 * Walks the document tree to find if the cursor position falls within
 * a table > tableRow > tableCell hierarchy, returning full context
 * about the table, row, and cell containing the cursor.
 *
 * @param {object} state - EditorState
 * @returns {{ tablePos: number, tableIndex: number, rowPos: number, rowIndex: number, cellPos: number, cellIndex: number, tableNode: object, rowNode: object, cellNode: object }|null}
 * @public
 */
export function _isInTable(state) {
    const { from } = state.selection;
    const doc = state.doc;
    if (!doc.children) return null;

    let accum = 0;
    for (let i = 0; i < doc.children.length; i++) {
        const child = doc.children[i];
        const childEnd = accum + child.nodeSize;

        if (from >= accum && from <= childEnd) {
            if (child.type === "table") {
                // Find the row containing the position
                const rowInfo = _findRowInTable(child, from, accum);
                if (!rowInfo) return null;

                // Find the cell containing the position within the row
                const cellInfo = _findCellInRow(rowInfo.node, from, rowInfo.pos);
                if (!cellInfo) return null;

                return {
                    tablePos: accum,
                    tableIndex: i,
                    rowPos: rowInfo.pos,
                    rowIndex: rowInfo.index,
                    cellPos: cellInfo.pos,
                    cellIndex: cellInfo.index,
                    tableNode: child,
                    rowNode: rowInfo.node,
                    cellNode: cellInfo.node
                };
            }
        }

        accum = childEnd;
    }
    return null;
}


/**
 * Find the table row containing a position within a table node.
 *
 * @param {object} tableNode - table node
 * @param {number} pos - Document position
 * @param {number} tableStart - Start position of the table in the document
 * @returns {{ pos: number, index: number, node: object }|null}
 * @private
 */
function _findRowInTable(tableNode, pos, tableStart) {
    if (!tableNode.children) return null;

    let accum = tableStart + 1; // +1 for table opening boundary
    for (let i = 0; i < tableNode.children.length; i++) {
        const row = tableNode.children[i];
        const rowEnd = accum + row.nodeSize;

        if (pos >= accum && pos <= rowEnd) {
            return { pos: accum, index: i, node: row };
        }

        accum = rowEnd;
    }
    return null;
}


/**
 * Find the table cell containing a position within a table row node.
 *
 * @param {object} rowNode - tableRow node
 * @param {number} pos - Document position
 * @param {number} rowStart - Start position of the row in the document
 * @returns {{ pos: number, index: number, node: object }|null}
 * @private
 */
function _findCellInRow(rowNode, pos, rowStart) {
    if (!rowNode.children) return null;

    let accum = rowStart + 1; // +1 for row opening boundary
    for (let i = 0; i < rowNode.children.length; i++) {
        const cell = rowNode.children[i];
        const cellEnd = accum + cell.nodeSize;

        if (pos >= accum && pos <= cellEnd) {
            return { pos: accum, index: i, node: cell };
        }

        accum = cellEnd;
    }
    return null;
}


// ============================================================================
// List commands
// ============================================================================

/**
 * Check if the cursor is inside a list structure.
 *
 * @param {object} state - EditorState
 * @returns {{ listType: string, listPos: number, listIndex: number, listItemPos: number, listItemIndex: number }|null}
 * @private
 */
function _isInList(state) {
    const { from } = state.selection;
    const doc = state.doc;
    if (!doc.children) return null;

    let accum = 0;
    for (let i = 0; i < doc.children.length; i++) {
        const child = doc.children[i];
        const childEnd = accum + child.nodeSize;

        if (from >= accum && from <= childEnd) {
            if (child.type === "bulletList" || child.type === "orderedList") {
                // Find the list item containing the position
                const liInfo = _findListItemInList(child, from, accum);
                return {
                    listType: child.type,
                    listPos: accum,
                    listIndex: i,
                    listItemPos: liInfo ? liInfo.pos : accum + 1,
                    listItemIndex: liInfo ? liInfo.index : 0
                };
            }
        }

        accum = childEnd;
    }
    return null;
}


/**
 * Find the list item containing a position within a list node.
 *
 * @param {object} listNode - bulletList or orderedList node
 * @param {number} pos - Document position
 * @param {number} listStart - Start position of the list in the document
 * @returns {{ pos: number, index: number, node: object }|null}
 * @private
 */
function _findListItemInList(listNode, pos, listStart) {
    if (!listNode.children) return null;

    let accum = listStart + 1; // +1 for list opening boundary
    for (let i = 0; i < listNode.children.length; i++) {
        const li = listNode.children[i];
        const liEnd = accum + li.nodeSize;

        if (pos >= accum && pos <= liEnd) {
            return { pos: accum, index: i, node: li };
        }

        accum = liEnd;
    }
    return null;
}


/**
 * Toggle a bullet list on the current selection.
 *
 * - If not in a list: wraps current block(s) in bulletList > listItem
 * - If in a bulletList: unwraps (lifts content out)
 * - If in an orderedList: converts to bulletList
 *
 * @param {object} state - EditorState
 * @param {function|null} dispatch - Dispatch function or null for can-execute check
 * @returns {boolean}
 */
export function toggleBulletList(state, dispatch) {
    return _toggleList(state, dispatch, "bulletList");
}


/**
 * Toggle an ordered list on the current selection.
 *
 * - If not in a list: wraps current block(s) in orderedList > listItem
 * - If in an orderedList: unwraps (lifts content out)
 * - If in a bulletList: converts to orderedList
 *
 * @param {object} state - EditorState
 * @param {function|null} dispatch - Dispatch function or null for can-execute check
 * @returns {boolean}
 */
export function toggleOrderedList(state, dispatch) {
    return _toggleList(state, dispatch, "orderedList");
}


/**
 * Toggle a checklist (bullet list with checked attributes on list items).
 *
 * - If not in a list: wraps in bulletList with listItems having checked: false
 * - If already a checklist (listItem has checked !== null): unwraps
 * - If in a regular list: adds checked attribute to list items
 *
 * @param {object} state - EditorState
 * @param {function|null} dispatch - Dispatch function or null for can-execute check
 * @returns {boolean}
 */
export function toggleChecklist(state, dispatch) {
    const listInfo = _isInList(state);

    if (listInfo) {
        // Check if current list items have checked attribute (it's a checklist)
        const doc = state.doc;
        const listNode = doc.children[listInfo.listIndex];
        const hasChecked = listNode.children && listNode.children.some(
            li => li.attrs.checked !== null && li.attrs.checked !== undefined
        );

        if (hasChecked) {
            // Already a checklist — unwrap
            if (dispatch) {
                const tr = state.transaction;
                const { from } = state.selection;

                // Extract content from list items and replace the list
                const blocks = [];
                for (const li of listNode.children) {
                    if (li.children) {
                        blocks.push(...li.children);
                    }
                }
                const listEnd = listInfo.listPos + listNode.nodeSize;
                tr.replaceRange(listInfo.listPos, listEnd, blocks);
                tr.setSelection(Selection.cursor(Math.min(from, tr.doc.contentSize)));
                dispatch(tr);
            }
            return true;
        }

        // In a regular list — convert to checklist by adding checked attrs
        if (dispatch) {
            const tr = state.transaction;
            let accum = listInfo.listPos + 1; // skip list opening
            for (const li of listNode.children) {
                tr.setNodeAttrs(accum, { checked: false });
                accum += li.nodeSize;
            }
            dispatch(tr);
        }
        return true;
    }

    // Not in a list — wrap in bullet list with checked items
    if (dispatch) {
        const { from } = state.selection;
        const blockInfo = _findBlockInDoc(state.doc, from);
        if (!blockInfo) return false;

        const tr = state.transaction;
        const block = state.doc.children[blockInfo.blockIndex];
        const blockEnd = blockInfo.blockPos + block.nodeSize;

        // Create: bulletList > listItem(checked: false) > [block content]
        const listItem = new Node("listItem", { checked: false, align: null, indent: 0 }, [block]);
        const bulletList = new Node("bulletList", null, [listItem]);
        tr.replaceRange(blockInfo.blockPos, blockEnd, [bulletList]);

        // Position cursor inside the list item
        tr.setSelection(Selection.cursor(blockInfo.blockPos + 3 + (block.children ? 0 : 0)));
        dispatch(tr);
    }
    return true;
}


/**
 * Internal: toggle a list type on the current selection.
 *
 * @param {object} state - EditorState
 * @param {function|null} dispatch - Dispatch function
 * @param {string} targetType - "bulletList" or "orderedList"
 * @returns {boolean}
 * @private
 */
function _toggleList(state, dispatch, targetType) {
    const listInfo = _isInList(state);

    if (listInfo) {
        if (listInfo.listType === targetType) {
            // Already in the target list type — unwrap
            if (dispatch) {
                const tr = state.transaction;
                const { from } = state.selection;
                const doc = state.doc;
                const listNode = doc.children[listInfo.listIndex];

                // Extract the content blocks from all list items
                const blocks = [];
                for (const li of listNode.children) {
                    if (li.children) {
                        blocks.push(...li.children);
                    }
                }

                const listEnd = listInfo.listPos + listNode.nodeSize;
                tr.replaceRange(listInfo.listPos, listEnd, blocks);
                tr.setSelection(Selection.cursor(Math.min(from, tr.doc.contentSize)));
                dispatch(tr);
            }
            return true;
        }

        // In a different list type — convert
        if (dispatch) {
            const tr = state.transaction;
            const attrs = targetType === "orderedList" ? { start: 1 } : null;
            tr.setBlockType(listInfo.listPos, targetType, attrs);
            dispatch(tr);
        }
        return true;
    }

    // Not in a list — wrap current block in a list
    if (dispatch) {
        const { from } = state.selection;
        const blockInfo = _findBlockInDoc(state.doc, from);
        if (!blockInfo) return false;

        const tr = state.transaction;
        const block = state.doc.children[blockInfo.blockIndex];
        const blockEnd = blockInfo.blockPos + block.nodeSize;

        // Create: listType > listItem > [block]
        const listItem = new Node("listItem", { align: null, indent: 0 }, [block]);
        const attrs = targetType === "orderedList" ? { start: 1 } : null;
        const listNode = new Node(targetType, attrs, [listItem]);
        tr.replaceRange(blockInfo.blockPos, blockEnd, [listNode]);

        // Position cursor inside the list
        const $from = state.doc.resolve(from);
        const relOffset = $from.parentOffset;
        // list opening (1) + listItem opening (1) + block opening (1) + relOffset
        tr.setSelection(Selection.cursor(blockInfo.blockPos + 3 + relOffset));
        dispatch(tr);
    }
    return true;
}


/**
 * Indent the current list item (Tab in list context).
 *
 * Nests the current list item into a sub-list inside the previous sibling.
 *
 * @param {object} state - EditorState
 * @param {function|null} dispatch - Dispatch function or null for can-execute check
 * @returns {boolean}
 */
export function listIndent(state, dispatch) {
    const listInfo = _isInList(state);
    if (!listInfo) return false;

    // Cannot indent the first item (no previous sibling)
    if (listInfo.listItemIndex <= 0) return false;

    const doc = state.doc;
    const listNode = doc.children[listInfo.listIndex];

    // Check nesting depth (max 6 levels)
    // For simplicity, count list nesting by checking parent structure
    if (!listNode.children) return false;

    if (dispatch) {
        const tr = state.transaction;
        const { from } = state.selection;
        const currentItem = listNode.children[listInfo.listItemIndex];
        const prevItem = listNode.children[listInfo.listItemIndex - 1];

        // Create a sub-list of the same type containing the current item
        const subList = new Node(listInfo.listType, null, [currentItem]);

        // New previous item: original children + sub-list
        const newPrevChildren = [...(prevItem.children || []), subList];
        const newPrevItem = prevItem.copy(newPrevChildren);

        // Rebuild the list without the current item, with modified prev item
        const newListChildren = [...listNode.children];
        newListChildren[listInfo.listItemIndex - 1] = newPrevItem;
        newListChildren.splice(listInfo.listItemIndex, 1);

        const newList = listNode.copy(newListChildren);

        // Replace the list in the document
        const newDocChildren = [...doc.children];
        newDocChildren[listInfo.listIndex] = newList;
        const newDoc = doc.copy(newDocChildren);

        // Use replaceRange to swap the list
        const listEnd = listInfo.listPos + listNode.nodeSize;
        tr.replaceRange(listInfo.listPos, listEnd, [newList]);

        // Try to maintain cursor position
        tr.setSelection(Selection.cursor(Math.min(from + 2, tr.doc.contentSize)));
        dispatch(tr);
    }
    return true;
}


/**
 * Outdent the current list item (Shift-Tab in list context).
 *
 * If at top level: lifts content out of the list.
 * If nested: moves the item up one level.
 *
 * @param {object} state - EditorState
 * @param {function|null} dispatch - Dispatch function or null for can-execute check
 * @returns {boolean}
 */
export function listOutdent(state, dispatch) {
    const listInfo = _isInList(state);
    if (!listInfo) return false;

    if (dispatch) {
        const tr = state.transaction;
        const { from } = state.selection;
        const doc = state.doc;
        const listNode = doc.children[listInfo.listIndex];

        // At top level: lift content out of the list entirely
        const currentItem = listNode.children[listInfo.listItemIndex];
        const blocks = currentItem.children || [];

        if (listNode.children.length === 1) {
            // Only one item — replace the entire list with the content blocks
            const listEnd = listInfo.listPos + listNode.nodeSize;
            tr.replaceRange(listInfo.listPos, listEnd, blocks);
        } else {
            // Multiple items — remove just this item and insert content after the list
            const newListChildren = [...listNode.children];
            newListChildren.splice(listInfo.listItemIndex, 1);
            const newList = listNode.copy(newListChildren);

            const listEnd = listInfo.listPos + listNode.nodeSize;
            tr.replaceRange(listInfo.listPos, listEnd, [newList, ...blocks]);
        }

        tr.setSelection(Selection.cursor(Math.min(from, tr.doc.contentSize)));
        dispatch(tr);
    }
    return true;
}


/**
 * Split the current list item at the cursor (Enter in list context).
 *
 * If the list item is empty: lift out of the list instead.
 * Otherwise: creates two list items from the split.
 *
 * @param {object} state - EditorState
 * @param {function|null} dispatch - Dispatch function or null for can-execute check
 * @returns {boolean}
 */
export function splitListItem(state, dispatch) {
    const listInfo = _isInList(state);
    if (!listInfo) return false;

    const doc = state.doc;
    const listNode = doc.children[listInfo.listIndex];
    const currentItem = listNode.children[listInfo.listItemIndex];

    // Check if the list item is empty (or has just an empty paragraph)
    const isEmpty = !currentItem.children ||
        currentItem.children.length === 0 ||
        (currentItem.children.length === 1 &&
         currentItem.children[0].type === "paragraph" &&
         currentItem.children[0].contentSize === 0);

    if (isEmpty) {
        // Empty list item — lift out of list (standard behavior)
        return listOutdent(state, dispatch);
    }

    if (dispatch) {
        const tr = state.transaction;
        const { from } = state.selection;

        // Find the paragraph within the list item and split it
        if (!currentItem.children || currentItem.children.length === 0) return false;

        const innerBlock = currentItem.children[0]; // First block in list item
        const $from = doc.resolve(from);
        const offset = $from.parentOffset;

        // Split the inner block's children
        const allChildren = innerBlock.children || [];
        const leftChildren = [];
        const rightChildren = [];

        let childAccum = 0;
        for (let i = 0; i < allChildren.length; i++) {
            const child = allChildren[i];
            const childSize = child.nodeSize;
            const childEnd = childAccum + childSize;

            if (childEnd <= offset) {
                leftChildren.push(child);
            } else if (childAccum >= offset) {
                rightChildren.push(child);
            } else if (child.type === "text") {
                const splitAt = offset - childAccum;
                const leftText = child.text.slice(0, splitAt);
                const rightText = child.text.slice(splitAt);
                if (leftText) leftChildren.push(new Node("text", child.attrs, null, child.marks, leftText));
                if (rightText) rightChildren.push(new Node("text", child.attrs, null, child.marks, rightText));
            } else {
                rightChildren.push(child);
            }

            childAccum += childSize;
        }

        // Create two list items
        const leftBlock = innerBlock.copy(leftChildren);
        const rightBlock = innerBlock.copy(rightChildren);

        const leftItem = new Node("listItem", { ...currentItem.attrs }, [leftBlock, ...currentItem.children.slice(1)]);
        const rightItem = new Node("listItem", { align: null, indent: 0 }, [rightBlock]);

        // Rebuild the list with the split items
        const newListChildren = [...listNode.children];
        newListChildren.splice(listInfo.listItemIndex, 1, leftItem, rightItem);
        const newList = listNode.copy(newListChildren);

        // Replace the list in the document
        const listEnd = listInfo.listPos + listNode.nodeSize;
        tr.replaceRange(listInfo.listPos, listEnd, [newList]);

        // Set cursor to start of the new (right) list item
        // Calculate: listPos + list opening + left items sizes + right item opening + block opening
        let cursorPos = listInfo.listPos + 1; // list opening
        for (let i = 0; i < listInfo.listItemIndex; i++) {
            cursorPos += listNode.children[i].nodeSize;
        }
        cursorPos += leftItem.nodeSize + 1 + 1; // after left item + li opening + block opening
        tr.setSelection(Selection.cursor(Math.min(cursorPos, tr.doc.contentSize)));

        dispatch(tr);
    }
    return true;
}


/**
 * Lift content out of list on Backspace at start of first list item.
 *
 * Only triggers when cursor is at position 0 within a list item's content.
 *
 * @param {object} state - EditorState
 * @param {function|null} dispatch - Dispatch function or null for can-execute check
 * @returns {boolean}
 */
export function liftListItem(state, dispatch) {
    const listInfo = _isInList(state);
    if (!listInfo) return false;

    const { from } = state.selection;
    const $from = state.doc.resolve(from);

    // Only trigger at start of block content within a list item
    if ($from.parentOffset !== 0) return false;

    // Only lift the first list item (at start)
    if (listInfo.listItemIndex !== 0) {
        // For non-first items at start of content: join with previous item
        return false;
    }

    // Lift first list item out of list
    return listOutdent(state, dispatch);
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
// Block splitting and hard break commands
// ============================================================================

/**
 * Command for Enter key: split the current block at the cursor position.
 *
 * If selection is not empty, deletes it first. Then splits the parent
 * block into two blocks of the same type at the cursor position.
 * Places the cursor at the start of the new (second) block.
 *
 * @param {object} state - EditorState
 * @param {function|null} dispatch - Dispatch function or null for can-execute check
 * @returns {boolean}
 */
export function splitBlock(state, dispatch) {
    const { from, to, empty } = state.selection;

    // Resolve cursor to check we're inside a block
    const $from = state.doc.resolve(from);
    if ($from.parent.type === "document") return false;

    if (dispatch) {
        const tr = state.transaction;

        // Delete selection first if not empty
        let cursorPos = from;
        if (!empty) {
            tr.deleteRange(from, to);
            cursorPos = from;
        }

        // Resolve the position in the (potentially modified) document
        const doc = tr.doc;
        const $cursor = doc.resolve(cursorPos);
        const parentBlock = $cursor.parent;
        const offset = $cursor.parentOffset;

        // Find the block's position in the document
        const blockInfo = _findBlockInDoc(doc, cursorPos);
        if (!blockInfo) return false;

        const { blockPos } = blockInfo;

        // Gather children for left and right halves
        const allChildren = parentBlock.children || [];
        const leftChildren = [];
        const rightChildren = [];

        let childAccum = 0;
        for (let i = 0; i < allChildren.length; i++) {
            const child = allChildren[i];
            const childSize = child.nodeSize;
            const childEnd = childAccum + childSize;

            if (childEnd <= offset) {
                // Entirely in left half
                leftChildren.push(child);
            } else if (childAccum >= offset) {
                // Entirely in right half
                rightChildren.push(child);
            } else {
                // Split point is within this child (must be a text node)
                if (child.type === "text") {
                    const splitAt = offset - childAccum;
                    const leftText = child.text.slice(0, splitAt);
                    const rightText = child.text.slice(splitAt);
                    if (leftText) {
                        leftChildren.push(new Node("text", child.attrs, null, child.marks, leftText));
                    }
                    if (rightText) {
                        rightChildren.push(new Node("text", child.attrs, null, child.marks, rightText));
                    }
                } else {
                    // Non-text child at split point goes to right half
                    rightChildren.push(child);
                }
            }

            childAccum += childSize;
        }

        // Create two new blocks of the same type with same attrs
        const leftBlock = parentBlock.copy(leftChildren);
        const rightBlock = parentBlock.copy(rightChildren);

        // Replace the original block with the two new blocks
        // Block starts at blockPos (its opening boundary position)
        // Block ends at blockPos + parentBlock.nodeSize
        const blockEnd = blockPos + parentBlock.nodeSize;

        // Replace the range from blockPos to blockEnd with the two new blocks
        // The blockPos is the position of the block's opening boundary in the
        // document's content area
        tr.replaceRange(blockPos, blockEnd, [leftBlock, rightBlock]);

        // Set cursor to position 1 inside the new (second) block
        // New cursor position: blockPos + leftBlock.nodeSize + 1 (opening of right block)
        const newCursorPos = blockPos + leftBlock.nodeSize + 1;
        tr.setSelection(Selection.cursor(newCursorPos));

        dispatch(tr);
    }
    return true;
}


/**
 * Command for Shift-Enter: insert a hard line break within a block.
 *
 * If selection is not empty, deletes it first. Then inserts a hard_break
 * node if the schema defines one, otherwise inserts a newline character.
 *
 * @param {object} state - EditorState
 * @param {function|null} dispatch - Dispatch function or null for can-execute check
 * @returns {boolean}
 */
export function insertHardBreak(state, dispatch) {
    if (dispatch) {
        const tr = state.transaction;
        const { from, to, empty } = state.selection;

        // Delete selection first if not empty
        if (!empty) {
            tr.deleteRange(from, to);
        }

        // Check if schema defines a hard_break node type
        const schema = state.schema;
        if (schema && schema.nodes["hardBreak"]) {
            // Insert a hardBreak node
            const hardBreakNode = new Node("hardBreak", null, null, null);
            tr.replaceRange(from, from, [hardBreakNode]);
            // Cursor moves past the hard break (nodeSize = 1)
            tr.setSelection(Selection.cursor(from + 1));
        } else {
            // Fallback: insert a newline character
            tr.insertText("\n", from);
            tr.setSelection(Selection.cursor(from + 1));
        }

        dispatch(tr);
    }
    return true;
}


// ============================================================================
// Default keymap
// ============================================================================

/**
 * Base keymap with default keyboard bindings for editing and navigation.
 *
 * Note: ArrowUp and ArrowDown are NOT included here because they require
 * a view reference (coordinate mapping). They are added dynamically
 * by the EditorView/InputHandler using moveUp(view) and moveDown(view).
 */
export const baseKeymap = {
    "Backspace": deleteBackward,
    "Delete": deleteForward,
    "Mod-a": selectAll,
    "ArrowLeft": moveLeft,
    "ArrowRight": moveRight,
    "Home": moveToBlockStart,
    "End": moveToBlockEnd,
    "Mod-ArrowLeft": moveWordLeft,
    "Mod-ArrowRight": moveWordRight,
    "Enter": splitBlock,
    "Shift-Enter": insertHardBreak
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
 * Get all mark objects on text at a given position.
 *
 * Checks text nodes adjacent to the cursor (before and after)
 * and returns all marks found.
 *
 * @param {object} doc - Document node
 * @param {number} pos - Position to check
 * @returns {object[]} Array of mark objects
 */
function _allMarksAtPos(doc, pos) {
    const marks = [];
    const seen = new Set();
    const checkPos = pos > 0 ? pos - 1 : pos;
    const endPos = pos + 1;

    try {
        doc.nodesBetween(checkPos, Math.min(endPos, doc.contentSize), (node, nodePos) => {
            if (node.type === "text") {
                for (const mark of node.marks) {
                    if (!seen.has(mark.type)) {
                        seen.add(mark.type);
                        marks.push(mark);
                    }
                }
                return false;
            }
            return true;
        });
    } catch (e) {
        // Position out of range - no marks
    }

    return marks;
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


// ============================================================================
// Block join helpers
// ============================================================================

/**
 * Join current block with the previous block (Backspace at start of block).
 *
 * Finds the previous sibling block, appends current block's content to it,
 * and removes the current block.
 *
 * @param {object} state - EditorState
 * @param {function|null} dispatch - Dispatch function
 * @param {number} from - Cursor position (start of current block content)
 * @param {object} $from - Resolved position
 * @returns {boolean}
 */
function _joinBlockBackward(state, dispatch, from, $from) {
    const doc = state.doc;

    // Find parent block in the document's child list
    const blockInfo = _findBlockInDoc(doc, from);
    if (!blockInfo) return false;

    const { blockIndex, blockPos } = blockInfo;

    // Need a previous block to join with
    if (blockIndex <= 0) return false;

    const prevBlock = doc.children[blockIndex - 1];
    const currBlock = doc.children[blockIndex];

    // Only join block-level containers (not text or leaf nodes)
    if (prevBlock.children === null || currBlock.children === null) return false;

    if (dispatch) {
        const tr = state.transaction;

        // Merge: combine children of both blocks into the previous block
        const prevChildren = prevBlock.children || [];
        const currChildren = currBlock.children || [];
        const mergedChildren = [...prevChildren, ...currChildren];

        // Create merged block (keep the previous block's type and attrs)
        const mergedBlock = prevBlock.copy(mergedChildren);

        // Replace both blocks with the merged one
        const newDocChildren = [...doc.children];
        newDocChildren.splice(blockIndex - 1, 2, mergedBlock);
        const newDoc = doc.copy(newDocChildren);

        // Calculate cursor position: end of previous block's content
        // Position = previous block opening boundary + previous block content size
        let cursorPos = 0;
        for (let i = 0; i < blockIndex - 1; i++) {
            cursorPos += doc.children[i].nodeSize;
        }
        cursorPos += 1 + prevBlock.contentSize; // +1 for opening boundary

        // Build step manually: replace the entire document
        // Use replaceRange with the boundaries between the two blocks
        const prevBlockStart = blockPos - currBlock.nodeSize;
        // Actually, we need to compute positions carefully.
        // The boundary between blocks is: end of prev block to start of curr block content
        // prev block ends at: prevBlockPos + prevBlock.nodeSize
        // curr block starts at: prevBlockPos + prevBlock.nodeSize

        // Simpler approach: rebuild with the transaction's replaceRange
        // Delete from end of prev block's content to start of curr block's content
        // This removes the closing tag of prev, the opening tag of curr = 2 positions
        const deleteFrom = cursorPos; // end of prev block's content
        const deleteTo = deleteFrom + 2; // skip closing of prev + opening of curr

        tr.deleteRange(deleteFrom, deleteTo);
        tr.setSelection(Selection.cursor(cursorPos));
        dispatch(tr);
    }
    return true;
}


/**
 * Join current block with the next block (Delete at end of block).
 *
 * Finds the next sibling block, appends its content to the current block,
 * and removes the next block.
 *
 * @param {object} state - EditorState
 * @param {function|null} dispatch - Dispatch function
 * @param {number} from - Cursor position (end of current block content)
 * @param {object} $from - Resolved position
 * @returns {boolean}
 */
function _joinBlockForward(state, dispatch, from, $from) {
    const doc = state.doc;

    // Find the current block in the document's child list
    const blockInfo = _findBlockInDoc(doc, from);
    if (!blockInfo) return false;

    const { blockIndex } = blockInfo;

    // Need a next block to join with
    if (blockIndex >= doc.children.length - 1) return false;

    const currBlock = doc.children[blockIndex];
    const nextBlock = doc.children[blockIndex + 1];

    // Only join block-level containers
    if (currBlock.children === null || nextBlock.children === null) return false;

    if (dispatch) {
        const tr = state.transaction;

        // The boundary to delete is: closing tag of current block + opening tag of next block
        // That's 2 positions starting at `from` (which is at end of current block's content)
        const deleteFrom = from; // end of current block content
        const deleteTo = from + 2; // closing of current + opening of next

        tr.deleteRange(deleteFrom, deleteTo);
        tr.setSelection(Selection.cursor(from));
        dispatch(tr);
    }
    return true;
}


/**
 * Find which top-level block a position belongs to.
 *
 * @param {object} doc - Document node
 * @param {number} pos - Position within the document
 * @returns {{ blockIndex: number, blockPos: number }|null}
 */
function _findBlockInDoc(doc, pos) {
    if (!doc.children) return null;

    let accum = 0;
    for (let i = 0; i < doc.children.length; i++) {
        const child = doc.children[i];
        const childEnd = accum + child.nodeSize;

        if (pos >= accum && pos <= childEnd) {
            return { blockIndex: i, blockPos: accum };
        }

        accum = childEnd;
    }
    return null;
}


/**
 * Find an ancestor node of a specific type containing a position.
 *
 * Searches top-level document children for a container of the given type
 * that contains the position.
 *
 * @param {object} doc - Document node
 * @param {number} pos - Position within the document
 * @param {string} nodeType - Type name to search for (e.g., "blockquote")
 * @returns {{ pos: number, node: object, index: number }|null}
 */
function _findAncestorOfType(doc, pos, nodeType) {
    if (!doc.children) return null;

    let accum = 0;
    for (let i = 0; i < doc.children.length; i++) {
        const child = doc.children[i];
        const childEnd = accum + child.nodeSize;

        if (pos >= accum && pos <= childEnd) {
            if (child.type === nodeType) {
                return { pos: accum, node: child, index: i };
            }
            // Check inside container children recursively
            if (child.children) {
                let innerAccum = accum + 1; // +1 for opening boundary
                for (let j = 0; j < child.children.length; j++) {
                    const inner = child.children[j];
                    const innerEnd = innerAccum + inner.nodeSize;
                    if (pos >= innerAccum && pos <= innerEnd && inner.type === nodeType) {
                        return { pos: innerAccum, node: inner, index: j };
                    }
                    innerAccum = innerEnd;
                }
            }
        }

        accum = childEnd;
    }
    return null;
}


// ============================================================================
// Navigation position helpers
// ============================================================================

/**
 * Find the previous valid text position from a given position.
 * Skips over block boundaries (the +2 positions for container open/close).
 *
 * @param {object} doc - Document node
 * @param {number} pos - Current position
 * @returns {number|null} Previous text position, or null if none
 */
function _findPrevTextPos(doc, pos) {
    if (pos <= 0) return null;

    // Try pos - 1 first
    const candidate = pos - 1;
    try {
        const $candidate = doc.resolve(candidate);
        // If resolving succeeds and position is within a text-containing block, it's valid
        if ($candidate.parent.type !== "document") {
            return candidate;
        }
        // Position is at a block boundary — skip to previous block's content end
        // Go one more back
        if (candidate > 0) {
            return _findPrevTextPos(doc, candidate);
        }
    } catch (e) {
        // Position out of range
    }
    return null;
}


/**
 * Find the next valid text position from a given position.
 * Skips over block boundaries.
 *
 * @param {object} doc - Document node
 * @param {number} pos - Current position
 * @returns {number|null} Next text position, or null if none
 */
function _findNextTextPos(doc, pos) {
    const maxPos = doc.contentSize;
    if (pos >= maxPos) return null;

    const candidate = pos + 1;
    if (candidate > maxPos) return null;

    try {
        const $candidate = doc.resolve(candidate);
        if ($candidate.parent.type !== "document") {
            return candidate;
        }
        // At a block boundary — skip forward
        if (candidate < maxPos) {
            return _findNextTextPos(doc, candidate);
        }
    } catch (e) {
        // Position out of range
    }
    return null;
}


/**
 * Find the first valid text position in the document.
 *
 * @param {object} doc - Document node
 * @returns {number} First text position (usually 1, inside first block)
 */
function _firstTextPos(doc) {
    if (doc.children && doc.children.length > 0) {
        return 1; // After first block's opening boundary
    }
    return 0;
}
