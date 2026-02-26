/**
 * Mark utility for creating and comparing inline formatting marks.
 *
 * Marks are plain objects { type: string, attrs?: object } that annotate
 * text nodes with formatting information (bold, italic, link, etc.).
 */
export class Mark {

    /**
     * Create a mark object with sorted attrs for consistent comparison.
     * @param {string} type - Mark type name (e.g., "bold", "link")
     * @param {object} [attrs] - Optional mark attributes
     * @returns {object} Frozen mark object
     */
    static create(type, attrs) {
        if (typeof type !== "string" || !type) {
            throw new Error("Mark type must be a non-empty string");
        }
        const mark = attrs && Object.keys(attrs).length > 0
            ? { type, attrs: Object.freeze({ ...attrs }) }
            : { type };
        return Object.freeze(mark);
    }

    /**
     * Deep equality check for two marks.
     * @param {object} a - First mark
     * @param {object} b - Second mark
     * @returns {boolean}
     */
    static eq(a, b) {
        if (a === b) return true;
        if (!a || !b) return false;
        if (a.type !== b.type) return false;
        if (!a.attrs && !b.attrs) return true;
        if (!a.attrs || !b.attrs) return false;
        const keysA = Object.keys(a.attrs);
        const keysB = Object.keys(b.attrs);
        if (keysA.length !== keysB.length) return false;
        for (const key of keysA) {
            if (a.attrs[key] !== b.attrs[key]) return false;
        }
        return true;
    }

    /**
     * Compare two mark arrays for equality.
     * @param {object[]} a - First marks array
     * @param {object[]} b - Second marks array
     * @returns {boolean}
     */
    static sameSet(a, b) {
        if (a === b) return true;
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
            if (!Mark.eq(a[i], b[i])) return false;
        }
        return true;
    }

    /**
     * Sort marks by type name for consistent ordering.
     * @param {object[]} marks - Array of mark objects
     * @returns {object[]} Sorted copy
     */
    static sort(marks) {
        if (!marks || marks.length <= 1) return marks;
        return [...marks].sort((a, b) => a.type < b.type ? -1 : a.type > b.type ? 1 : 0);
    }
}


/**
 * Resolved position within a document tree.
 *
 * Produced by Node.resolve(pos), provides context about where
 * an integer position falls within the tree structure.
 */
export class ResolvedPos {

    /**
     * @param {number} pos - The resolved integer position
     * @param {Array} path - Array of { node, index, offset } from root to leaf
     * @param {Node} parentNode - The direct parent node at this position
     * @param {number} parentOffset - Offset within the parent's content
     */
    constructor(pos, path, parentNode, parentOffset) {
        /** @type {number} The original integer position */
        this.pos = pos;

        /** @type {Array<{node: Node, index: number, offset: number}>} Path from root */
        this.path = path;

        /** @type {number} Depth (0 = document level) */
        this.depth = path.length - 1;

        /** @type {Node} The parent node containing this position */
        this.parent = parentNode;

        /** @type {number} Offset within parent's content area */
        this.parentOffset = parentOffset;

        // Compute index: which child of parent this position is in/after
        let idx = 0;
        let accum = 0;
        if (parentNode.type === "text") {
            this.index = 0;
            this.textOffset = parentOffset;
        } else if (parentNode.children) {
            for (let i = 0; i < parentNode.children.length; i++) {
                const childSize = parentNode.children[i].nodeSize;
                if (accum + childSize > parentOffset) {
                    idx = i;
                    break;
                }
                accum += childSize;
                idx = i + 1;
            }
            this.index = idx;
            this.textOffset = parentOffset - accum;
        } else {
            this.index = 0;
            this.textOffset = 0;
        }

        // Node after this position (the child at index, if any)
        if (parentNode.children && this.index < parentNode.children.length && this.textOffset === 0) {
            this.nodeAfter = parentNode.children[this.index];
        } else {
            this.nodeAfter = null;
        }

        // Node before this position
        if (parentNode.children && this.index > 0 && this.textOffset === 0) {
            this.nodeBefore = parentNode.children[this.index - 1];
        } else {
            this.nodeBefore = null;
        }

        Object.freeze(this);
    }
}


/**
 * Node represents an element in the document tree.
 *
 * Nodes are immutable. All structural operations return new Node instances.
 * The document is a tree of Nodes with three categories:
 * - Block nodes: paragraph, heading, blockquote, etc. (have children)
 * - Inline nodes: hardBreak (leaf)
 * - Text nodes: carry text content and marks
 */
export default class Node {

    /**
     * @param {string} type - Node type name
     * @param {object|null} attrs - Node attributes
     * @param {Node[]|null} children - Child nodes (null for text nodes)
     * @param {object[]|null} marks - Mark objects for text nodes
     * @param {string|null} [text] - Text content (only for text nodes)
     */
    constructor(type, attrs, children, marks, text) {
        if (typeof type !== "string" || !type) {
            throw new Error("Node type must be a non-empty string");
        }

        /** @type {string} */
        this.type = type;

        /** @type {object} */
        this.attrs = Object.freeze(attrs ? { ...attrs } : {});

        /** @type {object[]} */
        this.marks = Object.freeze(Mark.sort(marks || []));

        if (type === "text") {
            if (typeof text !== "string") {
                throw new Error("Text nodes must have a text string");
            }
            /** @type {string|null} */
            this.text = text;
            /** @type {Node[]|null} */
            this.children = null;
        } else {
            this.text = null;
            /** @type {Node[]} */
            this.children = Object.freeze(children ? [...children] : []);
        }

        Object.freeze(this);
    }

    /**
     * Computed node size using ProseMirror-style position counting:
     * - Text nodes: text.length
     * - Leaf nodes (no children, no text): 1
     * - Container nodes: sum of children nodeSize + 2 (opening + closing)
     * @returns {number}
     */
    get nodeSize() {
        if (this.type === "text") {
            return this.text.length;
        }
        if (!this.children || this.children.length === 0) {
            // Leaf non-text node (e.g., horizontalRule, hardBreak, image)
            return 1;
        }
        let size = 0;
        for (const child of this.children) {
            size += child.nodeSize;
        }
        return size + 2; // +2 for opening and closing boundaries
    }

    /**
     * Content size (size of children without opening/closing boundary).
     * @returns {number}
     */
    get contentSize() {
        if (this.type === "text") return this.text.length;
        if (!this.children) return 0;
        let size = 0;
        for (const child of this.children) {
            size += child.nodeSize;
        }
        return size;
    }

    /**
     * Whether this is a text node.
     * @returns {boolean}
     */
    get isText() {
        return this.type === "text";
    }

    /**
     * Whether this is a leaf node (no children and not text).
     * @returns {boolean}
     */
    get isLeaf() {
        return this.type !== "text" && (!this.children || this.children.length === 0);
    }

    /**
     * Number of child nodes.
     * @returns {number}
     */
    get childCount() {
        return this.children ? this.children.length : 0;
    }

    /**
     * Return child node at given index.
     * @param {number} index
     * @returns {Node}
     */
    child(index) {
        if (!this.children || index < 0 || index >= this.children.length) {
            throw new RangeError(`Child index ${index} out of range (0..${this.childCount - 1})`);
        }
        return this.children[index];
    }

    /**
     * Concatenated text content of all descendant text nodes.
     * @returns {string}
     */
    get textContent() {
        if (this.type === "text") return this.text;
        if (!this.children) return "";
        let result = "";
        for (const child of this.children) {
            result += child.textContent;
        }
        return result;
    }

    /**
     * Create a copy with different children (immutable update).
     * @param {Node[]} children - New children array
     * @returns {Node}
     */
    copy(children) {
        if (this.type === "text") {
            return this; // Text nodes don't have children
        }
        return new Node(this.type, this.attrs, children, this.marks);
    }

    /**
     * Create a copy of this text node with different marks.
     * @param {object[]} marks - New marks array
     * @returns {Node}
     */
    mark(marks) {
        if (this.type !== "text") {
            throw new Error("mark() can only be called on text nodes");
        }
        return new Node("text", this.attrs, null, marks, this.text);
    }

    /**
     * Deep structural equality check.
     * @param {Node} other
     * @returns {boolean}
     */
    eq(other) {
        if (this === other) return true;
        if (!other || !(other instanceof Node)) return false;
        if (this.type !== other.type) return false;
        if (this.text !== other.text) return false;

        // Compare attrs
        if (!_objEq(this.attrs, other.attrs)) return false;

        // Compare marks
        if (!Mark.sameSet(this.marks, other.marks)) return false;

        // Compare children
        if (this.children === null && other.children === null) return true;
        if (this.children === null || other.children === null) return false;
        if (this.children.length !== other.children.length) return false;
        for (let i = 0; i < this.children.length; i++) {
            if (!this.children[i].eq(other.children[i])) return false;
        }
        return true;
    }

    /**
     * Serialize to plain JSON object.
     * @returns {object}
     */
    toJSON() {
        const obj = { type: this.type };
        if (Object.keys(this.attrs).length > 0) {
            obj.attrs = { ...this.attrs };
        }
        if (this.type === "text") {
            obj.text = this.text;
        }
        if (this.marks.length > 0) {
            obj.marks = this.marks.map(m =>
                m.attrs ? { type: m.type, attrs: { ...m.attrs } } : { type: m.type }
            );
        }
        if (this.children && this.children.length > 0) {
            obj.children = this.children.map(c => c.toJSON());
        }
        return obj;
    }

    /**
     * Deserialize from a plain JSON object.
     * @param {object} schema - Schema instance for validation
     * @param {object} json - Plain object to deserialize
     * @returns {Node}
     */
    static fromJSON(schema, json) {
        if (!json || typeof json.type !== "string") {
            throw new Error("Invalid JSON: missing or invalid 'type'");
        }

        // If schema has a node() method, use it for validation
        if (schema && typeof schema.node === "function" && json.type !== "text") {
            const children = json.children
                ? json.children.map(c => Node.fromJSON(schema, c))
                : null;
            const marks = json.marks || null;
            return schema.node(json.type, json.attrs || null, children, marks);
        }

        if (json.type === "text") {
            if (schema && typeof schema.text === "function") {
                return schema.text(json.text, json.marks || null);
            }
            return new Node("text", json.attrs || null, null, json.marks || [], json.text);
        }

        const children = json.children
            ? json.children.map(c => Node.fromJSON(schema, c))
            : null;
        return new Node(json.type, json.attrs || null, children, json.marks || null);
    }

    /**
     * Iterate over nodes in a position range.
     *
     * Calls callback(node, pos, parent, index) for each node that
     * overlaps the [from, to) range. If callback returns false,
     * descending into that node's children is skipped.
     *
     * @param {number} from - Start position (inclusive)
     * @param {number} to - End position (exclusive)
     * @param {function} callback - (node, pos, parent, index) => boolean|void
     * @param {number} [startPos=0] - Position offset of this node
     */
    nodesBetween(from, to, callback, startPos = 0) {
        if (this.type === "text") return;
        if (!this.children) return;

        let pos = startPos;
        // For container nodes, content starts at pos + 1 (after opening boundary)
        if (this.type !== "text" && this.children.length > 0) {
            // If this is not the root call (i.e., startPos was set by parent),
            // we need to account for the opening boundary
            // However, for the document root (top-level call), pos 0 is before first child
        }

        // For the document root, content starts at position 0
        // For nested containers, the parent already positioned us at content start
        let contentStart = startPos;
        // If called on a non-document container, opening boundary was already counted by parent
        // The caller is responsible for positioning at the content start

        for (let i = 0; i < this.children.length; i++) {
            const child = this.children[i];
            const childSize = child.nodeSize;
            const childEnd = contentStart + childSize;

            if (childEnd > from && contentStart < to) {
                const descend = callback(child, contentStart, this, i);
                if (descend !== false && child.children && child.children.length > 0) {
                    // Descend into container child: content starts at contentStart + 1
                    child.nodesBetween(from, to, callback, contentStart + 1);
                }
            }

            contentStart = childEnd;
        }
    }

    /**
     * Resolve an integer position to a ResolvedPos.
     *
     * Walks the document tree counting positions through node boundaries
     * and text characters using ProseMirror-style position counting.
     *
     * @param {number} pos - Integer position to resolve
     * @returns {ResolvedPos}
     */
    resolve(pos) {
        if (pos < 0 || pos > this.contentSize) {
            throw new RangeError(
                `Position ${pos} out of range (0..${this.contentSize})`
            );
        }
        return _resolve(this, pos, 0, []);
    }
}


// --- Private helpers ---

/**
 * Shallow object equality.
 * @param {object} a
 * @param {object} b
 * @returns {boolean}
 */
function _objEq(a, b) {
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
 * Recursively resolve a position within a node tree.
 * @param {Node} node - Current node
 * @param {number} pos - Remaining position to resolve within this node's content
 * @param {number} absPos - Absolute position of node's content start
 * @param {Array} path - Path of {node, index, offset} accumulated so far
 * @returns {ResolvedPos}
 */
function _resolve(node, pos, absPos, path) {
    // If this is a text node, resolve within it
    if (node.type === "text") {
        const newPath = [...path, { node, index: 0, offset: pos }];
        return new ResolvedPos(absPos + pos, newPath, node, pos);
    }

    // Build path entry for this node
    const pathEntry = { node, index: 0, offset: pos };
    const currentPath = [...path, pathEntry];

    // Walk children to find which child contains the position
    if (node.children) {
        let offset = 0;
        for (let i = 0; i < node.children.length; i++) {
            const child = node.children[i];
            const childSize = child.nodeSize;

            if (pos < offset + childSize) {
                pathEntry.index = i;

                if (child.type === "text") {
                    // Position falls within text node
                    const textOffset = pos - offset;
                    const textPath = [...currentPath, { node: child, index: 0, offset: textOffset }];
                    return new ResolvedPos(absPos + pos, textPath, node, pos);
                }

                if (child.children && child.children.length > 0) {
                    // Position falls within a container child
                    // pos - offset is the offset into the child (including opening boundary)
                    const intoChild = pos - offset;
                    if (intoChild === 0) {
                        // At the opening boundary — position is before first child content
                        return new ResolvedPos(absPos + pos, currentPath, node, pos);
                    }
                    // Descend: subtract opening boundary (1) to get position within child content
                    return _resolve(child, intoChild - 1, absPos + offset + 1, currentPath);
                }

                // Leaf node (like horizontalRule) — position is at this leaf
                return new ResolvedPos(absPos + pos, currentPath, node, pos);
            }

            offset += childSize;
        }
    }

    // Position is at the end of this node's content
    pathEntry.index = node.children ? node.children.length : 0;
    return new ResolvedPos(absPos + pos, currentPath, node, pos);
}
