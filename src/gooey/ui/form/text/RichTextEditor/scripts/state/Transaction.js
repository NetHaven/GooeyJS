import Node, { Mark } from "../model/Node.js";
import { Selection } from "../model/Position.js";


// ============================================================================
// StepMap — records position changes from a single step
// ============================================================================

/**
 * StepMap records position changes produced by a single step.
 *
 * Stores an array of [from, oldSize, newSize] ranges describing
 * what was removed and inserted at each affected position.
 */
export class StepMap {

    /**
     * @param {Array<[number, number, number]>} ranges - Array of [from, oldSize, newSize]
     */
    constructor(ranges) {
        /** @type {Array<[number, number, number]>} */
        this.ranges = ranges || [];
        Object.freeze(this.ranges);
        Object.freeze(this);
    }

    /**
     * Map a position through this step's changes.
     *
     * @param {number} pos - Position to map
     * @param {number} [bias=1] - Bias: -1 maps to start of change, 1 maps to end
     * @returns {number} Mapped position
     */
    map(pos, bias = 1) {
        let diff = 0;
        for (const [from, oldSize, newSize] of this.ranges) {
            const to = from + oldSize;
            if (pos < from + diff) break;
            if (pos <= to + diff) {
                // Position is within the changed range
                const side = !oldSize ? (bias <= 0 ? 0 : newSize)
                    : pos === from + diff ? (bias <= 0 ? 0 : newSize)
                    : pos === to + diff ? (bias >= 0 ? newSize : oldSize)
                    : newSize;
                return from + side;
            }
            diff += newSize - oldSize;
        }
        return pos + diff;
    }

    /**
     * Create an empty step map (no position changes).
     * @returns {StepMap}
     */
    static empty() {
        return new StepMap([]);
    }
}


// ============================================================================
// Mapping — composes multiple StepMaps
// ============================================================================

/**
 * Mapping composes multiple StepMaps into a single mapping pipeline.
 * Positions are remapped through each constituent map in sequence.
 */
export class Mapping {

    /**
     * @param {StepMap[]} [maps] - Initial step maps
     */
    constructor(maps) {
        /** @type {StepMap[]} */
        this.maps = maps ? [...maps] : [];
    }

    /**
     * Map a position through all step maps in sequence.
     *
     * @param {number} pos - Position to map
     * @param {number} [bias=1] - Bias direction
     * @returns {number} Mapped position
     */
    map(pos, bias = 1) {
        for (const map of this.maps) {
            pos = map.map(pos, bias);
        }
        return pos;
    }

    /**
     * Add a step map to the end of this mapping.
     * @param {StepMap} stepMap
     */
    appendMap(stepMap) {
        this.maps.push(stepMap);
    }
}


// ============================================================================
// Step base class and concrete step types
// ============================================================================

/**
 * Base class for document mutation steps.
 * Each step must implement apply, invert, getMap, map, and toJSON.
 */
class Step {
    /**
     * Apply this step to a document.
     * @param {Node} doc
     * @returns {{ doc: Node|null, failed: string|null }}
     */
    apply(doc) {
        return { doc: null, failed: "Not implemented" };
    }

    /**
     * Return the inverse of this step (for undo).
     * @param {Node} doc - The document BEFORE this step was applied
     * @returns {Step}
     */
    invert(doc) {
        throw new Error("Not implemented");
    }

    /**
     * Return a StepMap recording position changes.
     * @returns {StepMap}
     */
    getMap() {
        return StepMap.empty();
    }

    /**
     * Remap this step through a mapping.
     * @param {Mapping} mapping
     * @returns {Step|null} Remapped step, or null if no longer applicable
     */
    map(mapping) {
        return null;
    }

    /**
     * Serialize to JSON.
     * @returns {object}
     */
    toJSON() {
        throw new Error("Not implemented");
    }
}


// ============================================================================
// InsertTextStep
// ============================================================================

/**
 * Insert text at a position within the document.
 */
class InsertTextStep extends Step {

    /**
     * @param {string} text - Text to insert
     * @param {number} pos - Position to insert at
     */
    constructor(text, pos) {
        super();
        this.text = text;
        this.pos = pos;
    }

    apply(doc) {
        try {
            const newDoc = _insertTextInDoc(doc, this.pos, this.text);
            return { doc: newDoc, failed: null };
        } catch (e) {
            return { doc: null, failed: e.message };
        }
    }

    invert(doc) {
        return new DeleteRangeStep(this.pos, this.pos + this.text.length);
    }

    getMap() {
        return new StepMap([[this.pos, 0, this.text.length]]);
    }

    map(mapping) {
        const newPos = mapping.map(this.pos, 1);
        return new InsertTextStep(this.text, newPos);
    }

    toJSON() {
        return { type: "insertText", text: this.text, pos: this.pos };
    }

    static fromJSON(schema, json) {
        return new InsertTextStep(json.text, json.pos);
    }
}


// ============================================================================
// DeleteRangeStep
// ============================================================================

/**
 * Delete content in a range [from, to).
 */
class DeleteRangeStep extends Step {

    /**
     * @param {number} from - Start position
     * @param {number} to - End position
     */
    constructor(from, to) {
        super();
        this.from = from;
        this.to = to;
    }

    apply(doc) {
        try {
            const newDoc = _deleteRangeInDoc(doc, this.from, this.to);
            return { doc: newDoc, failed: null };
        } catch (e) {
            return { doc: null, failed: e.message };
        }
    }

    invert(doc) {
        // Extract the content being deleted for the inverse
        const deletedContent = _extractContent(doc, this.from, this.to);
        return new ReplaceRangeStep(this.from, this.from, deletedContent);
    }

    getMap() {
        const size = this.to - this.from;
        return new StepMap([[this.from, size, 0]]);
    }

    map(mapping) {
        const newFrom = mapping.map(this.from, 1);
        const newTo = mapping.map(this.to, -1);
        if (newFrom >= newTo) return null;
        return new DeleteRangeStep(newFrom, newTo);
    }

    toJSON() {
        return { type: "deleteRange", from: this.from, to: this.to };
    }

    static fromJSON(schema, json) {
        return new DeleteRangeStep(json.from, json.to);
    }
}


// ============================================================================
// ReplaceRangeStep
// ============================================================================

/**
 * Replace a range [from, to) with new content.
 */
class ReplaceRangeStep extends Step {

    /**
     * @param {number} from - Start position
     * @param {number} to - End position
     * @param {Node|Node[]} content - Replacement content (Node or array of nodes)
     */
    constructor(from, to, content) {
        super();
        this.from = from;
        this.to = to;
        // Normalize to array
        this.content = Array.isArray(content) ? content : (content ? [content] : []);
    }

    apply(doc) {
        try {
            const newDoc = _replaceRangeInDoc(doc, this.from, this.to, this.content);
            return { doc: newDoc, failed: null };
        } catch (e) {
            return { doc: null, failed: e.message };
        }
    }

    invert(doc) {
        const deletedContent = _extractContent(doc, this.from, this.to);
        const insertedSize = _contentSize(this.content);
        return new ReplaceRangeStep(this.from, this.from + insertedSize, deletedContent);
    }

    getMap() {
        const oldSize = this.to - this.from;
        const newSize = _contentSize(this.content);
        return new StepMap([[this.from, oldSize, newSize]]);
    }

    map(mapping) {
        const newFrom = mapping.map(this.from, 1);
        const newTo = mapping.map(this.to, -1);
        if (newFrom > newTo) return null;
        return new ReplaceRangeStep(newFrom, newTo, this.content);
    }

    toJSON() {
        return {
            type: "replaceRange",
            from: this.from,
            to: this.to,
            content: this.content.map(n => n.toJSON())
        };
    }

    static fromJSON(schema, json) {
        const content = (json.content || []).map(n => Node.fromJSON(schema, n));
        return new ReplaceRangeStep(json.from, json.to, content);
    }
}


// ============================================================================
// AddMarkStep
// ============================================================================

/**
 * Apply a mark to text in a range.
 */
class AddMarkStep extends Step {

    /**
     * @param {number} from - Start position
     * @param {number} to - End position
     * @param {object} mark - Mark to add
     */
    constructor(from, to, mark) {
        super();
        this.from = from;
        this.to = to;
        this.mark = mark;
    }

    apply(doc) {
        try {
            const newDoc = _addMarkInDoc(doc, this.from, this.to, this.mark);
            return { doc: newDoc, failed: null };
        } catch (e) {
            return { doc: null, failed: e.message };
        }
    }

    invert(doc) {
        return new RemoveMarkStep(this.from, this.to, this.mark);
    }

    getMap() {
        // Marks don't change positions
        return StepMap.empty();
    }

    map(mapping) {
        const newFrom = mapping.map(this.from, 1);
        const newTo = mapping.map(this.to, -1);
        if (newFrom >= newTo) return null;
        return new AddMarkStep(newFrom, newTo, this.mark);
    }

    toJSON() {
        return {
            type: "addMark",
            from: this.from,
            to: this.to,
            mark: this.mark.attrs
                ? { type: this.mark.type, attrs: { ...this.mark.attrs } }
                : { type: this.mark.type }
        };
    }

    static fromJSON(schema, json) {
        const mark = Mark.create(json.mark.type, json.mark.attrs);
        return new AddMarkStep(json.from, json.to, mark);
    }
}


// ============================================================================
// RemoveMarkStep
// ============================================================================

/**
 * Remove a mark from text in a range.
 */
class RemoveMarkStep extends Step {

    /**
     * @param {number} from - Start position
     * @param {number} to - End position
     * @param {object} mark - Mark to remove
     */
    constructor(from, to, mark) {
        super();
        this.from = from;
        this.to = to;
        this.mark = mark;
    }

    apply(doc) {
        try {
            const newDoc = _removeMarkInDoc(doc, this.from, this.to, this.mark);
            return { doc: newDoc, failed: null };
        } catch (e) {
            return { doc: null, failed: e.message };
        }
    }

    invert(doc) {
        return new AddMarkStep(this.from, this.to, this.mark);
    }

    getMap() {
        return StepMap.empty();
    }

    map(mapping) {
        const newFrom = mapping.map(this.from, 1);
        const newTo = mapping.map(this.to, -1);
        if (newFrom >= newTo) return null;
        return new RemoveMarkStep(newFrom, newTo, this.mark);
    }

    toJSON() {
        return {
            type: "removeMark",
            from: this.from,
            to: this.to,
            mark: this.mark.attrs
                ? { type: this.mark.type, attrs: { ...this.mark.attrs } }
                : { type: this.mark.type }
        };
    }

    static fromJSON(schema, json) {
        const mark = Mark.create(json.mark.type, json.mark.attrs);
        return new RemoveMarkStep(json.from, json.to, mark);
    }
}


// ============================================================================
// SetNodeAttrsStep
// ============================================================================

/**
 * Change attributes on a node at a given position.
 */
class SetNodeAttrsStep extends Step {

    /**
     * @param {number} pos - Position of the node
     * @param {object} attrs - New attributes to set
     */
    constructor(pos, attrs) {
        super();
        this.pos = pos;
        this.attrs = attrs;
    }

    apply(doc) {
        try {
            const newDoc = _setNodeAttrsInDoc(doc, this.pos, this.attrs);
            return { doc: newDoc, failed: null };
        } catch (e) {
            return { doc: null, failed: e.message };
        }
    }

    invert(doc) {
        const resolved = doc.resolve(this.pos);
        const targetNode = resolved.nodeAfter || resolved.parent;
        return new SetNodeAttrsStep(this.pos, { ...targetNode.attrs });
    }

    getMap() {
        return StepMap.empty();
    }

    map(mapping) {
        const newPos = mapping.map(this.pos, 1);
        return new SetNodeAttrsStep(newPos, this.attrs);
    }

    toJSON() {
        return { type: "setNodeAttrs", pos: this.pos, attrs: { ...this.attrs } };
    }

    static fromJSON(schema, json) {
        return new SetNodeAttrsStep(json.pos, json.attrs);
    }
}


// ============================================================================
// WrapInStep
// ============================================================================

/**
 * Wrap a range of blocks in a container node.
 */
class WrapInStep extends Step {

    /**
     * @param {number} from - Start position (block-level boundary)
     * @param {number} to - End position (block-level boundary)
     * @param {string} nodeType - Container type to wrap with (e.g., "blockquote")
     * @param {object|null} attrs - Attributes for the wrapper node
     */
    constructor(from, to, nodeType, attrs) {
        super();
        this.from = from;
        this.to = to;
        this.nodeType = nodeType;
        this.attrs = attrs || null;
    }

    apply(doc) {
        try {
            const newDoc = _wrapInDoc(doc, this.from, this.to, this.nodeType, this.attrs);
            return { doc: newDoc, failed: null };
        } catch (e) {
            return { doc: null, failed: e.message };
        }
    }

    invert(doc) {
        // Inverting a wrap is an unwrap at the same from position
        return new UnwrapStep(this.from);
    }

    getMap() {
        // Wrapping adds 2 positions (opening + closing boundary of wrapper)
        return new StepMap([[this.from, 0, 2]]);
    }

    map(mapping) {
        const newFrom = mapping.map(this.from, 1);
        const newTo = mapping.map(this.to, -1);
        if (newFrom >= newTo) return null;
        return new WrapInStep(newFrom, newTo, this.nodeType, this.attrs);
    }

    toJSON() {
        return {
            type: "wrapIn",
            from: this.from,
            to: this.to,
            nodeType: this.nodeType,
            attrs: this.attrs ? { ...this.attrs } : null
        };
    }

    static fromJSON(schema, json) {
        return new WrapInStep(json.from, json.to, json.nodeType, json.attrs);
    }
}


// ============================================================================
// UnwrapStep
// ============================================================================

/**
 * Remove a wrapping container node, lifting its children into the parent.
 */
class UnwrapStep extends Step {

    /**
     * @param {number} pos - Position of the wrapper node
     */
    constructor(pos) {
        super();
        this.pos = pos;
    }

    apply(doc) {
        try {
            const newDoc = _unwrapInDoc(doc, this.pos);
            return { doc: newDoc, failed: null };
        } catch (e) {
            return { doc: null, failed: e.message };
        }
    }

    invert(doc) {
        // Find the wrapper node at pos before unwrapping to get its type/attrs
        const resolved = doc.resolve(this.pos);
        const wrapperNode = resolved.nodeAfter;
        if (!wrapperNode) {
            // Fallback: cannot invert without knowing the wrapper
            return new WrapInStep(this.pos, this.pos, "blockquote", null);
        }
        const endPos = this.pos + wrapperNode.nodeSize;
        return new WrapInStep(this.pos, endPos, wrapperNode.type, wrapperNode.attrs);
    }

    getMap() {
        // Unwrapping removes 2 positions (opening + closing boundary)
        return new StepMap([[this.pos, 2, 0]]);
    }

    map(mapping) {
        const newPos = mapping.map(this.pos, 1);
        return new UnwrapStep(newPos);
    }

    toJSON() {
        return { type: "unwrap", pos: this.pos };
    }

    static fromJSON(schema, json) {
        return new UnwrapStep(json.pos);
    }
}


// ============================================================================
// SetBlockTypeStep
// ============================================================================

/**
 * Change the type of a block node at a given position.
 */
class SetBlockTypeStep extends Step {

    /**
     * @param {number} pos - Position of the block node
     * @param {string} newType - New block type name
     * @param {object|null} newAttrs - New attributes for the block
     */
    constructor(pos, newType, newAttrs) {
        super();
        this.pos = pos;
        this.newType = newType;
        this.newAttrs = newAttrs || null;
    }

    apply(doc) {
        try {
            const newDoc = _setBlockTypeInDoc(doc, this.pos, this.newType, this.newAttrs);
            return { doc: newDoc, failed: null };
        } catch (e) {
            return { doc: null, failed: e.message };
        }
    }

    invert(doc) {
        const resolved = doc.resolve(this.pos);
        const targetNode = resolved.nodeAfter;
        if (!targetNode) {
            throw new Error(`No node at position ${this.pos} for inversion`);
        }
        return new SetBlockTypeStep(this.pos, targetNode.type, { ...targetNode.attrs });
    }

    getMap() {
        // Changing block type doesn't change positions
        return StepMap.empty();
    }

    map(mapping) {
        const newPos = mapping.map(this.pos, 1);
        return new SetBlockTypeStep(newPos, this.newType, this.newAttrs);
    }

    toJSON() {
        return {
            type: "setBlockType",
            pos: this.pos,
            newType: this.newType,
            newAttrs: this.newAttrs ? { ...this.newAttrs } : null
        };
    }

    static fromJSON(schema, json) {
        return new SetBlockTypeStep(json.pos, json.newType, json.newAttrs);
    }
}


// ============================================================================
// Step registry for deserialization
// ============================================================================

const STEP_TYPES = {
    insertText: InsertTextStep,
    deleteRange: DeleteRangeStep,
    replaceRange: ReplaceRangeStep,
    addMark: AddMarkStep,
    removeMark: RemoveMarkStep,
    setNodeAttrs: SetNodeAttrsStep,
    wrapIn: WrapInStep,
    unwrap: UnwrapStep,
    setBlockType: SetBlockTypeStep
};


// ============================================================================
// Document mutation helpers
// ============================================================================

/**
 * Insert text at a given position in the document.
 * Positions follow ProseMirror convention: container boundaries +1,
 * text characters +1 each, leaf nodes +1.
 *
 * @param {Node} doc - Document root
 * @param {number} pos - Position to insert at
 * @param {string} text - Text to insert
 * @returns {Node} New document with text inserted
 */
function _insertTextInDoc(doc, pos, text) {
    return _mutateAtPos(doc, pos, 0, (parent, offset, children) => {
        // Find the text node at offset or create one
        let accum = 0;
        for (let i = 0; i < children.length; i++) {
            const child = children[i];
            const childSize = child.nodeSize;

            if (child.type === "text" && offset >= accum && offset <= accum + childSize) {
                // Insert within this text node
                const textOffset = offset - accum;
                const newText = child.text.slice(0, textOffset) + text + child.text.slice(textOffset);
                const newChild = new Node("text", child.attrs, null, child.marks, newText);
                const newChildren = [...children];
                newChildren[i] = newChild;
                return newChildren;
            }

            if (offset === accum && child.type !== "text") {
                // Insert before this non-text node
                const newTextNode = new Node("text", null, null, [], text);
                const newChildren = [...children];
                newChildren.splice(i, 0, newTextNode);
                return newChildren;
            }

            accum += childSize;
        }

        // Insert at end of children
        if (offset === accum) {
            const newTextNode = new Node("text", null, null, [], text);
            return [...children, newTextNode];
        }

        throw new Error(`Cannot insert text at position ${pos} (offset ${offset})`);
    });
}


/**
 * Delete a range [from, to) from the document.
 *
 * @param {Node} doc - Document root
 * @param {number} from - Start position
 * @param {number} to - End position
 * @returns {Node} New document with range deleted
 */
function _deleteRangeInDoc(doc, from, to) {
    if (from === to) return doc;
    return _transformRange(doc, from, to, () => []);
}


/**
 * Replace a range [from, to) with new content.
 *
 * @param {Node} doc - Document root
 * @param {number} from - Start position
 * @param {number} to - End position
 * @param {Node[]} content - Replacement nodes
 * @returns {Node} New document with range replaced
 */
function _replaceRangeInDoc(doc, from, to, content) {
    return _transformRange(doc, from, to, () => content);
}


/**
 * Add a mark to all text in a range.
 *
 * @param {Node} doc - Document root
 * @param {number} from - Start position
 * @param {number} to - End position
 * @param {object} mark - Mark to add
 * @returns {Node} New document with mark added
 */
function _addMarkInDoc(doc, from, to, mark) {
    return _mapTextInRange(doc, from, to, (textNode) => {
        // Check if mark already exists
        for (const m of textNode.marks) {
            if (Mark.eq(m, mark)) return textNode;
        }
        const newMarks = Mark.sort([...textNode.marks, mark]);
        return textNode.mark(newMarks);
    });
}


/**
 * Remove a mark from all text in a range.
 *
 * @param {Node} doc - Document root
 * @param {number} from - Start position
 * @param {number} to - End position
 * @param {object} mark - Mark to remove
 * @returns {Node} New document with mark removed
 */
function _removeMarkInDoc(doc, from, to, mark) {
    return _mapTextInRange(doc, from, to, (textNode) => {
        const newMarks = textNode.marks.filter(m => !Mark.eq(m, mark));
        if (newMarks.length === textNode.marks.length) return textNode;
        return textNode.mark(newMarks);
    });
}


/**
 * Set attributes on the node at a given position.
 *
 * @param {Node} doc - Document root
 * @param {number} pos - Position of the target node
 * @param {object} attrs - New attributes
 * @returns {Node} New document with attributes changed
 */
function _setNodeAttrsInDoc(doc, pos, attrs) {
    const resolved = doc.resolve(pos);
    const targetNode = resolved.nodeAfter;
    if (!targetNode) {
        throw new Error(`No node at position ${pos}`);
    }
    const mergedAttrs = { ...targetNode.attrs, ...attrs };
    const newNode = new Node(targetNode.type, mergedAttrs, targetNode.children, targetNode.marks, targetNode.text);

    // Rebuild tree from root to the changed node
    return _replaceChildInPath(doc, resolved, newNode);
}


// ============================================================================
// Tree manipulation helpers
// ============================================================================

/**
 * Perform a mutation at a position within a parent node's content.
 * Walks the tree to find the parent containing the position,
 * then calls mutator to produce new children.
 *
 * @param {Node} doc - Document root
 * @param {number} pos - Target position
 * @param {number} startPos - Starting position of current node's content
 * @param {function} mutator - (parent, localOffset, children) => newChildren
 * @returns {Node} New document
 */
function _mutateAtPos(doc, pos, startPos, mutator) {
    return _mutateAtPosInner(doc, pos, startPos, mutator);
}

function _mutateAtPosInner(node, pos, contentStart, mutator) {
    if (node.type === "text") {
        throw new Error("Cannot mutate within a text node via _mutateAtPos");
    }

    const children = node.children || [];
    let accum = contentStart;

    for (let i = 0; i < children.length; i++) {
        const child = children[i];
        const childSize = child.nodeSize;
        const childEnd = accum + childSize;

        if (pos >= accum && pos <= childEnd) {
            if (child.type !== "text" && child.children !== null) {
                const childContentStart = accum + 1; // +1 for opening boundary
                const childContentEnd = childEnd - 1; // -1 for closing boundary

                if (pos >= childContentStart && pos <= childContentEnd) {
                    // Position is inside this child container — recurse
                    const newChild = _mutateAtPosInner(child, pos, childContentStart, mutator);
                    const newChildren = [...children];
                    newChildren[i] = newChild;
                    return node.copy(newChildren);
                }
            }
        }

        accum = childEnd;
    }

    // Position is within this node's direct content
    const localOffset = pos - contentStart;
    const newChildren = mutator(node, localOffset, children);
    return node.copy(newChildren);
}


/**
 * Transform (delete/replace) content in a range within a single parent.
 * Handles text-level operations within the most specific common ancestor.
 *
 * @param {Node} doc - Document root
 * @param {number} from - Start position
 * @param {number} to - End position
 * @param {function} replacer - () => Node[] (replacement content)
 * @returns {Node} New document
 */
function _transformRange(doc, from, to, replacer) {
    return _transformRangeInner(doc, from, to, 0, replacer);
}

function _transformRangeInner(node, from, to, contentStart, replacer) {
    if (node.type === "text") {
        throw new Error("Cannot transform range on text node directly");
    }

    const children = node.children || [];
    let accum = contentStart;

    // Check if the range is entirely within one child
    for (let i = 0; i < children.length; i++) {
        const child = children[i];
        const childSize = child.nodeSize;
        const childStart = accum;
        const childEnd = accum + childSize;

        if (from >= childStart && to <= childEnd) {
            if (child.type === "text") {
                // Range is within a single text node
                const textFrom = from - childStart;
                const textTo = to - childStart;
                const replacement = replacer();

                if (replacement.length === 0) {
                    // Pure deletion within text
                    const newText = child.text.slice(0, textFrom) + child.text.slice(textTo);
                    const newChildren = [...children];
                    if (newText.length === 0) {
                        // Remove the text node entirely
                        newChildren.splice(i, 1);
                    } else {
                        newChildren[i] = new Node("text", child.attrs, null, child.marks, newText);
                    }
                    return node.copy(newChildren);
                }

                // Replace within text
                const before = child.text.slice(0, textFrom);
                const after = child.text.slice(textTo);
                const newChildren = [...children];
                const parts = [];
                if (before) parts.push(new Node("text", child.attrs, null, child.marks, before));
                parts.push(...replacement);
                if (after) parts.push(new Node("text", child.attrs, null, child.marks, after));
                newChildren.splice(i, 1, ...parts);
                return node.copy(newChildren);
            }

            if (child.children !== null) {
                // Range is within a container child — recurse
                const childContentStart = childStart + 1;
                if (from >= childContentStart && to <= childEnd - 1) {
                    const newChild = _transformRangeInner(child, from, to, childContentStart, replacer);
                    const newChildren = [...children];
                    newChildren[i] = newChild;
                    return node.copy(newChildren);
                }
            }
        }

        accum += childSize;
    }

    // Range spans multiple children — handle at this level
    const replacement = replacer();
    const newChildren = [];
    accum = contentStart;

    for (let i = 0; i < children.length; i++) {
        const child = children[i];
        const childSize = child.nodeSize;
        const childStart = accum;
        const childEnd = accum + childSize;

        if (childEnd <= from || childStart >= to) {
            // Entirely outside range — keep
            newChildren.push(child);
        } else if (childStart >= from && childEnd <= to) {
            // Entirely inside range — skip (replaced)
        } else if (child.type === "text") {
            // Partially overlapping text node
            const textStart = childStart;
            if (from > textStart) {
                // Keep text before range
                const keepEnd = from - textStart;
                const keptText = child.text.slice(0, keepEnd);
                if (keptText) {
                    newChildren.push(new Node("text", child.attrs, null, child.marks, keptText));
                }
            }
            if (to < textStart + child.text.length) {
                // Keep text after range
                const keepStart = to - textStart;
                const keptText = child.text.slice(keepStart);
                if (keptText) {
                    newChildren.push(new Node("text", child.attrs, null, child.marks, keptText));
                }
            }
        } else {
            // Partially overlapping non-text child — keep it but trim content
            newChildren.push(child);
        }

        // Insert replacement at the from boundary
        if (childEnd > from && childStart <= from && replacement.length > 0) {
            newChildren.push(...replacement);
        }

        accum += childSize;
    }

    // If from is at or after all children, insert at end
    if (from >= accum && replacement.length > 0) {
        newChildren.push(...replacement);
    }

    return node.copy(newChildren);
}


/**
 * Map a transformation over text nodes in a given range.
 * Used for mark operations that don't change positions.
 *
 * @param {Node} doc - Document root
 * @param {number} from - Start position
 * @param {number} to - End position
 * @param {function} mapper - (textNode) => Node
 * @returns {Node} New document
 */
function _mapTextInRange(doc, from, to, mapper) {
    return _mapTextInRangeInner(doc, from, to, 0, mapper);
}

function _mapTextInRangeInner(node, from, to, contentStart, mapper) {
    if (node.type === "text") return node; // Text nodes handled by parent

    const children = node.children || [];
    let changed = false;
    const newChildren = [];
    let accum = contentStart;

    for (let i = 0; i < children.length; i++) {
        const child = children[i];
        const childSize = child.nodeSize;
        const childStart = accum;
        const childEnd = accum + childSize;

        if (childEnd <= from || childStart >= to) {
            // Outside range
            newChildren.push(child);
        } else if (child.type === "text") {
            // Text node overlaps range — may need to split and map
            const textStart = childStart;
            const textEnd = childStart + child.text.length;
            const overlapFrom = Math.max(from, textStart);
            const overlapTo = Math.min(to, textEnd);

            if (overlapFrom === textStart && overlapTo === textEnd) {
                // Entire text node is in range
                const mapped = mapper(child);
                newChildren.push(mapped);
                if (mapped !== child) changed = true;
            } else {
                // Partial overlap — split text node
                const relFrom = overlapFrom - textStart;
                const relTo = overlapTo - textStart;

                if (relFrom > 0) {
                    newChildren.push(new Node("text", child.attrs, null, child.marks, child.text.slice(0, relFrom)));
                    changed = true;
                }

                const middle = new Node("text", child.attrs, null, child.marks, child.text.slice(relFrom, relTo));
                const mapped = mapper(middle);
                newChildren.push(mapped);
                if (mapped !== middle) changed = true;

                if (relTo < child.text.length) {
                    newChildren.push(new Node("text", child.attrs, null, child.marks, child.text.slice(relTo)));
                    changed = true;
                }
            }
        } else if (child.children !== null) {
            // Container child overlaps — recurse
            const childContentStart = childStart + 1;
            const newChild = _mapTextInRangeInner(child, from, to, childContentStart, mapper);
            newChildren.push(newChild);
            if (newChild !== child) changed = true;
        } else {
            // Leaf non-text node
            newChildren.push(child);
        }

        accum += childSize;
    }

    if (!changed) return node;
    return node.copy(newChildren);
}


/**
 * Extract content nodes from a range in the document.
 * Returns an array of nodes representing the content in [from, to).
 *
 * @param {Node} doc - Document root
 * @param {number} from - Start position
 * @param {number} to - End position
 * @returns {Node[]} Extracted content
 */
function _extractContent(doc, from, to) {
    const result = [];
    doc.nodesBetween(from, to, (node, pos, parent, index) => {
        if (node.type === "text") {
            const textStart = pos;
            const textEnd = pos + node.text.length;
            const sliceFrom = Math.max(from, textStart) - textStart;
            const sliceTo = Math.min(to, textEnd) - textStart;
            const sliced = node.text.slice(sliceFrom, sliceTo);
            if (sliced) {
                result.push(new Node("text", node.attrs, null, node.marks, sliced));
            }
            return false;
        }
        return true;
    });
    return result;
}


/**
 * Compute the total position size of an array of content nodes.
 *
 * @param {Node[]} nodes
 * @returns {number}
 */
function _contentSize(nodes) {
    let size = 0;
    for (const n of nodes) {
        size += n.nodeSize;
    }
    return size;
}


/**
 * Wrap blocks in a range with a container node.
 *
 * @param {Node} doc - Document root
 * @param {number} from - Start position of blocks to wrap
 * @param {number} to - End position of blocks to wrap
 * @param {string} nodeType - Container type name
 * @param {object|null} attrs - Container attributes
 * @returns {Node} New document with blocks wrapped
 */
function _wrapInDoc(doc, from, to, nodeType, attrs) {
    if (!doc.children) throw new Error("Cannot wrap in a document without children");

    // Find blocks in the range
    const blocksToWrap = [];
    let firstIdx = -1;
    let lastIdx = -1;
    let accum = 0;

    for (let i = 0; i < doc.children.length; i++) {
        const child = doc.children[i];
        const childEnd = accum + child.nodeSize;

        if (childEnd > from && accum < to) {
            if (firstIdx === -1) firstIdx = i;
            lastIdx = i;
            blocksToWrap.push(child);
        }

        accum += childEnd === accum ? child.nodeSize : 0;
        accum = accum === 0 ? childEnd : accum;
    }

    // Recompute properly
    blocksToWrap.length = 0;
    firstIdx = -1;
    lastIdx = -1;
    accum = 0;

    for (let i = 0; i < doc.children.length; i++) {
        const child = doc.children[i];
        const childStart = accum;
        const childEnd = accum + child.nodeSize;

        if (childEnd > from && childStart < to) {
            if (firstIdx === -1) firstIdx = i;
            lastIdx = i;
            blocksToWrap.push(child);
        }

        accum = childEnd;
    }

    if (blocksToWrap.length === 0) {
        throw new Error(`No blocks found in range [${from}, ${to})`);
    }

    // Create wrapper node containing the blocks
    const wrapperNode = new Node(nodeType, attrs, blocksToWrap);

    // Build new children array: before + wrapper + after
    const newChildren = [
        ...doc.children.slice(0, firstIdx),
        wrapperNode,
        ...doc.children.slice(lastIdx + 1)
    ];

    return doc.copy(newChildren);
}


/**
 * Unwrap a container node, lifting its children into the parent.
 *
 * @param {Node} doc - Document root
 * @param {number} pos - Position of the wrapper node
 * @returns {Node} New document with wrapper removed
 */
function _unwrapInDoc(doc, pos) {
    if (!doc.children) throw new Error("Cannot unwrap in a document without children");

    // Find the wrapper node at pos
    let accum = 0;
    for (let i = 0; i < doc.children.length; i++) {
        const child = doc.children[i];
        const childStart = accum;

        if (childStart === pos) {
            if (!child.children || child.children.length === 0) {
                throw new Error(`Node at position ${pos} has no children to unwrap`);
            }

            // Replace wrapper with its children
            const newChildren = [
                ...doc.children.slice(0, i),
                ...child.children,
                ...doc.children.slice(i + 1)
            ];

            return doc.copy(newChildren);
        }

        accum += child.nodeSize;
    }

    throw new Error(`No node found at position ${pos} to unwrap`);
}


/**
 * Change the type of a block node at a given position.
 *
 * @param {Node} doc - Document root
 * @param {number} pos - Position of the block node
 * @param {string} newType - New block type name
 * @param {object|null} newAttrs - New attributes
 * @returns {Node} New document with block type changed
 */
function _setBlockTypeInDoc(doc, pos, newType, newAttrs) {
    const resolved = doc.resolve(pos);
    const targetNode = resolved.nodeAfter;
    if (!targetNode) {
        throw new Error(`No node at position ${pos}`);
    }

    // Build new node with new type but same children and marks
    const mergedAttrs = newAttrs ? { ...newAttrs } : {};
    const newNode = new Node(newType, mergedAttrs, targetNode.children, targetNode.marks, targetNode.text);

    // Rebuild tree from root to the changed node
    return _replaceChildInPath(doc, resolved, newNode);
}


/**
 * Replace a child node found via ResolvedPos path in the tree.
 *
 * @param {Node} doc - Document root
 * @param {import('../model/Node.js').ResolvedPos} resolved - Resolved position
 * @param {Node} replacement - Replacement node
 * @returns {Node}
 */
function _replaceChildInPath(doc, resolved, replacement) {
    // Walk the path from the resolved position to rebuild the tree
    const parent = resolved.parent;
    const index = resolved.index;

    if (parent === doc) {
        // Direct child of document
        const newChildren = [...doc.children];
        newChildren[index] = replacement;
        return doc.copy(newChildren);
    }

    // Need to walk from root
    return _replaceNodeAtPos(doc, resolved.pos, replacement, 0);
}

function _replaceNodeAtPos(node, pos, replacement, contentStart) {
    if (node.type === "text") return node;

    const children = node.children || [];
    let accum = contentStart;

    for (let i = 0; i < children.length; i++) {
        const child = children[i];
        const childSize = child.nodeSize;
        const childStart = accum;
        const childEnd = accum + childSize;

        if (pos === childStart) {
            // This is the node to replace
            const newChildren = [...children];
            newChildren[i] = replacement;
            return node.copy(newChildren);
        }

        if (pos > childStart && pos < childEnd && child.children !== null) {
            // Position is inside this child — recurse
            const newChild = _replaceNodeAtPos(child, pos, replacement, childStart + 1);
            const newChildren = [...children];
            newChildren[i] = newChild;
            return node.copy(newChildren);
        }

        accum += childSize;
    }

    return node; // Position not found, return unchanged
}


// ============================================================================
// Transaction
// ============================================================================

/**
 * Transaction accumulates Steps and produces a new state when applied.
 *
 * Created from an EditorState, accumulates mutation steps via builder
 * methods, and is dispatched via EditorState.apply() to produce a
 * new immutable state.
 */
export default class Transaction {

    /**
     * @param {import('./EditorState.js').default} state - Starting editor state
     */
    constructor(state) {
        /** @type {import('./EditorState.js').default} */
        this._state = state;

        /** @type {Step[]} Accumulated steps */
        this._steps = [];

        /** @type {StepMap[]} Step maps from each step */
        this._maps = [];

        /** @type {Node} Current document (updated after each step) */
        this._doc = state.doc;

        /** @type {Selection|null} Explicitly set selection (null = map from original) */
        this._selection = null;

        /** @type {object[]|null} Stored marks override (null = carry from state) */
        this._storedMarks = null;
    }

    /**
     * Array of accumulated steps.
     * @returns {Step[]}
     */
    get steps() {
        return this._steps;
    }

    /**
     * Current document after accumulated steps.
     * @returns {Node}
     */
    get doc() {
        return this._doc;
    }

    /**
     * Composed Mapping from all step maps.
     * @returns {Mapping}
     */
    get mapping() {
        return new Mapping(this._maps);
    }

    // --- Builder methods (each returns this) ---

    /**
     * Add an insertText step.
     * @param {string} text - Text to insert
     * @param {number} pos - Position to insert at
     * @returns {Transaction} this
     */
    insertText(text, pos) {
        const step = new InsertTextStep(text, pos);
        return this._applyStep(step);
    }

    /**
     * Add a deleteRange step.
     * @param {number} from - Start position
     * @param {number} to - End position
     * @returns {Transaction} this
     */
    deleteRange(from, to) {
        if (from === to) return this;
        const step = new DeleteRangeStep(from, to);
        return this._applyStep(step);
    }

    /**
     * Add a replaceRange step.
     * @param {number} from - Start position
     * @param {number} to - End position
     * @param {Node|Node[]} content - Replacement content
     * @returns {Transaction} this
     */
    replaceRange(from, to, content) {
        const step = new ReplaceRangeStep(from, to, content);
        return this._applyStep(step);
    }

    /**
     * Add an addMark step.
     * @param {number} from - Start position
     * @param {number} to - End position
     * @param {object} mark - Mark to add
     * @returns {Transaction} this
     */
    addMark(from, to, mark) {
        const step = new AddMarkStep(from, to, mark);
        return this._applyStep(step);
    }

    /**
     * Add a removeMark step.
     * @param {number} from - Start position
     * @param {number} to - End position
     * @param {object} mark - Mark to remove
     * @returns {Transaction} this
     */
    removeMark(from, to, mark) {
        const step = new RemoveMarkStep(from, to, mark);
        return this._applyStep(step);
    }

    /**
     * Add a setNodeAttrs step.
     * @param {number} pos - Position of the node
     * @param {object} attrs - New attributes
     * @returns {Transaction} this
     */
    setNodeAttrs(pos, attrs) {
        const step = new SetNodeAttrsStep(pos, attrs);
        return this._applyStep(step);
    }

    /**
     * Add a wrapIn step.
     * @param {number} from - Start position of blocks to wrap
     * @param {number} to - End position of blocks to wrap
     * @param {string} nodeType - Container type name
     * @param {object|null} [attrs] - Container attributes
     * @returns {Transaction} this
     */
    wrapIn(from, to, nodeType, attrs) {
        const step = new WrapInStep(from, to, nodeType, attrs || null);
        return this._applyStep(step);
    }

    /**
     * Add an unwrap step.
     * @param {number} pos - Position of the wrapper node to unwrap
     * @returns {Transaction} this
     */
    unwrap(pos) {
        const step = new UnwrapStep(pos);
        return this._applyStep(step);
    }

    /**
     * Add a setBlockType step.
     * @param {number} pos - Position of the block node
     * @param {string} newType - New block type name
     * @param {object|null} [attrs] - New attributes for the block
     * @returns {Transaction} this
     */
    setBlockType(pos, newType, attrs) {
        const step = new SetBlockTypeStep(pos, newType, attrs || null);
        return this._applyStep(step);
    }

    /**
     * Set the selection for this transaction.
     * @param {Selection} selection
     * @returns {Transaction} this
     */
    setSelection(selection) {
        this._selection = selection;
        return this;
    }

    /**
     * Set stored marks for next input.
     * @param {object[]} marks
     * @returns {Transaction} this
     */
    setStoredMarks(marks) {
        this._storedMarks = marks;
        return this;
    }

    /**
     * Apply a step, update the document and step maps.
     * @param {Step} step
     * @returns {Transaction} this
     * @private
     */
    _applyStep(step) {
        const result = step.apply(this._doc);
        if (result.failed) {
            throw new Error(`Step failed: ${result.failed}`);
        }
        this._steps.push(step);
        this._maps.push(step.getMap());
        this._doc = result.doc;
        return this;
    }

    /**
     * Deserialize a step from JSON.
     * @param {object} schema - Schema for node reconstruction
     * @param {object} json - Serialized step
     * @returns {Step}
     */
    static stepFromJSON(schema, json) {
        const StepClass = STEP_TYPES[json.type];
        if (!StepClass) {
            throw new Error(`Unknown step type: "${json.type}"`);
        }
        return StepClass.fromJSON(schema, json);
    }
}

// Export step classes for direct use
export { Step, InsertTextStep, DeleteRangeStep, ReplaceRangeStep, AddMarkStep, RemoveMarkStep, SetNodeAttrsStep, WrapInStep, UnwrapStep, SetBlockTypeStep };
