import Node from "./Node.js";

/**
 * Selection tracks cursor position or text selection in the document.
 *
 * Uses anchor/head semantics: anchor is where the selection started,
 * head is where it currently ends. When anchor === head, it is a cursor
 * (collapsed selection).
 */
export class Selection {

    /**
     * @param {number} anchor - Position where selection started
     * @param {number} head - Position where selection ends
     */
    constructor(anchor, head) {
        if (typeof anchor !== "number" || typeof head !== "number") {
            throw new Error("Selection anchor and head must be numbers");
        }

        /** @type {number} */
        this.anchor = anchor;

        /** @type {number} */
        this.head = head;

        Object.freeze(this);
    }

    /**
     * Start of the selected range (min of anchor and head).
     * @returns {number}
     */
    get from() {
        return Math.min(this.anchor, this.head);
    }

    /**
     * End of the selected range (max of anchor and head).
     * @returns {number}
     */
    get to() {
        return Math.max(this.anchor, this.head);
    }

    /**
     * Whether this is a cursor (no range selected).
     * @returns {boolean}
     */
    get empty() {
        return this.anchor === this.head;
    }

    /**
     * Equality check.
     * @param {Selection} other
     * @returns {boolean}
     */
    eq(other) {
        if (this === other) return true;
        if (!other || !(other instanceof Selection)) return false;
        return this.anchor === other.anchor && this.head === other.head;
    }

    /**
     * Remap this selection through a mapping.
     *
     * The mapping object must have a `map(pos)` method that remaps
     * integer positions through document changes.
     *
     * @param {object} mapping - Object with a map(pos) method
     * @returns {Selection}
     */
    map(mapping) {
        return new Selection(
            mapping.map(this.anchor),
            mapping.map(this.head)
        );
    }

    /**
     * Create a cursor selection (anchor === head).
     * @param {number} pos
     * @returns {Selection}
     */
    static cursor(pos) {
        return new Selection(pos, pos);
    }

    /**
     * Create a selection between two positions.
     * @param {number} anchor
     * @param {number} head
     * @returns {Selection}
     */
    static between(anchor, head) {
        return new Selection(anchor, head);
    }
}


/**
 * Range represents a simple from/to position pair in the document.
 */
export class Range {

    /**
     * @param {number} from - Start position
     * @param {number} to - End position
     */
    constructor(from, to) {
        if (typeof from !== "number" || typeof to !== "number") {
            throw new Error("Range from and to must be numbers");
        }

        /** @type {number} */
        this.from = from;

        /** @type {number} */
        this.to = to;

        Object.freeze(this);
    }

    /**
     * Size of the range.
     * @returns {number}
     */
    get size() {
        return this.to - this.from;
    }

    /**
     * Whether the range is empty (from === to).
     * @returns {boolean}
     */
    get empty() {
        return this.from === this.to;
    }

    /**
     * Equality check.
     * @param {Range} other
     * @returns {boolean}
     */
    eq(other) {
        if (this === other) return true;
        if (!other || !(other instanceof Range)) return false;
        return this.from === other.from && this.to === other.to;
    }
}


/**
 * Position utilities for working with integer positions in the document tree.
 *
 * Provides static methods for resolving positions, converting between
 * paths and positions, and related utilities.
 *
 * Position counting rules (ProseMirror-style):
 * - Position 0 is before the first child of the document
 * - Each container node boundary adds 1 (opening) and 1 (closing)
 * - Each text character adds 1
 * - Leaf nodes (like horizontalRule) count as 1
 */
export default class Position {

    /**
     * Resolve an integer position to a ResolvedPos object.
     *
     * Delegates to Node.resolve() which walks the document tree.
     *
     * @param {Node} doc - Document root node
     * @param {number} pos - Integer position to resolve
     * @returns {import('./Node.js').ResolvedPos}
     */
    static resolve(doc, pos) {
        return doc.resolve(pos);
    }

    /**
     * Convert a path array (indices from root) to an integer position.
     *
     * A path like [0, 2, 1] means: child 0 of root, then child 2,
     * then child 1.
     *
     * @param {Node} doc - Document root node
     * @param {number[]} path - Array of child indices
     * @returns {number} Integer position
     */
    static posAtPath(doc, path) {
        let pos = 0;
        let current = doc;

        for (let depth = 0; depth < path.length; depth++) {
            const index = path[depth];

            if (!current.children || index > current.children.length) {
                throw new RangeError(
                    `Invalid path: index ${index} at depth ${depth} ` +
                    `exceeds child count ${current.childCount}`
                );
            }

            // Add positions for all children before the target index
            for (let i = 0; i < index; i++) {
                pos += current.children[i].nodeSize;
            }

            // If this is the last path element, return position at this child
            if (depth === path.length - 1) {
                return pos;
            }

            // Need to descend deeper -- enter the container child
            if (index < current.children.length) {
                const child = current.children[index];
                if (child.type === "text") {
                    // Cannot descend into text node
                    return pos;
                }
                if (child.children !== null) {
                    // Enter the container (may be empty): +1 for opening boundary
                    pos += 1;
                    current = child;
                } else {
                    // Leaf node -- cannot descend further
                    return pos;
                }
            } else {
                // Index equals child count -- position is at end of content
                return pos;
            }
        }

        return pos;
    }

    /**
     * Convert an integer position to a path array.
     *
     * @param {Node} doc - Document root node
     * @param {number} pos - Integer position
     * @returns {number[]} Array of child indices from root
     */
    static pathAtPos(doc, pos) {
        const path = [];
        let current = doc;
        let remaining = pos;

        while (current.children && current.children.length > 0) {
            let found = false;

            for (let i = 0; i < current.children.length; i++) {
                const child = current.children[i];
                const childSize = child.nodeSize;

                if (remaining < childSize) {
                    path.push(i);

                    if (child.type === "text") {
                        // Position is within this text node -- path stops here
                        return path;
                    }

                    if (child.children !== null) {
                        if (remaining === 0) {
                            // Position is right at the opening boundary -- don't descend
                            return path;
                        }
                        // Enter the container: subtract 1 for opening boundary
                        remaining -= 1;
                        current = child;
                        found = true;
                        break;
                    }

                    // Leaf node
                    return path;
                }

                remaining -= childSize;
            }

            if (!found) {
                // Position is at end of current node's content
                path.push(current.children.length);
                break;
            }
        }

        return path;
    }
}
