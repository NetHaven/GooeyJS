import { Mark } from "../model/Node.js";

/**
 * EditorView owns the DOM rendering surface. It renders the document
 * model as visible DOM elements, performs incremental diff/patch on
 * state updates, and provides coordinate-to-position mapping.
 *
 * This is a plain class (not a web component). It receives a container
 * DOM element and renders into it.
 */
export default class EditorView {

    /**
     * @param {HTMLElement} container - DOM element to render into (.rte-content)
     * @param {import('../state/EditorState.js').default} state - Initial editor state
     * @param {import('../model/Schema.js').default} schema - Schema reference
     * @param {object} [options] - Optional configuration
     */
    constructor(container, state, schema, options) {
        /** @type {HTMLElement} */
        this.container = container;

        /** @type {import('../state/EditorState.js').default} */
        this.state = state;

        /** @type {import('../model/Schema.js').default} */
        this.schema = schema;

        /** @type {object} */
        this.options = options || {};

        /**
         * Map from model Node to DOM Element for incremental updates.
         * Uses a WeakMap-like approach but with a regular Map since
         * frozen model nodes are recreated on each mutation.
         * @type {Map<import('../model/Node.js').default, Element>}
         */
        this._nodeToDom = new Map();

        /**
         * Reverse map: DOM Element to model Node.
         * @type {Map<Element, import('../model/Node.js').default>}
         */
        this._domToNode = new Map();

        /**
         * Dispatch function — set by the component that creates the view.
         * @type {function|null}
         */
        this.dispatch = null;

        // Perform initial render
        this._renderDoc(state.doc);
    }

    /**
     * Receive a new state, diff against previous doc, and patch the DOM.
     *
     * @param {import('../state/EditorState.js').default} newState
     */
    updateState(newState) {
        const oldDoc = this.state.doc;
        const newDoc = newState.doc;

        this.state = newState;

        if (oldDoc === newDoc) {
            // Document unchanged — nothing to render
            return;
        }

        this._diffAndPatch(oldDoc, newDoc);
    }

    /**
     * Map a model position to pixel coordinates.
     *
     * Strategy: find the DOM text node and offset corresponding to the
     * model position. Create a DOM Range, call getBoundingClientRect().
     *
     * @param {number} pos - Model position
     * @returns {{ left: number, top: number, bottom: number }|null}
     */
    coordsAtPos(pos) {
        const domInfo = this._domAtPos(pos);
        if (!domInfo) return null;

        try {
            const range = document.createRange();
            range.setStart(domInfo.node, domInfo.offset);
            range.setEnd(domInfo.node, domInfo.offset);
            const rect = range.getBoundingClientRect();

            if (rect.height === 0 && rect.width === 0) {
                // Fallback: if range is at an element boundary, use element rect
                const parent = domInfo.node.nodeType === Node.TEXT_NODE
                    ? domInfo.node.parentElement
                    : domInfo.node;
                if (parent) {
                    const parentRect = parent.getBoundingClientRect();
                    return {
                        left: parentRect.left,
                        top: parentRect.top,
                        bottom: parentRect.bottom
                    };
                }
                return null;
            }

            return {
                left: rect.left,
                top: rect.top,
                bottom: rect.bottom
            };
        } catch (e) {
            return null;
        }
    }

    /**
     * Map pixel coordinates to a model position.
     *
     * Uses caretPositionFromPoint or caretRangeFromPoint to find the
     * DOM node/offset, then maps back through the node-to-DOM mapping.
     *
     * @param {{ left: number, top: number }} coords - Pixel coordinates
     * @returns {number|null} Model position, or null if not found
     */
    posAtCoords(coords) {
        let domNode, domOffset;

        // Try caretPositionFromPoint (standard)
        if (document.caretPositionFromPoint) {
            const caret = document.caretPositionFromPoint(coords.left, coords.top);
            if (caret) {
                domNode = caret.offsetNode;
                domOffset = caret.offset;
            }
        }
        // Fallback to caretRangeFromPoint (WebKit/Blink)
        else if (document.caretRangeFromPoint) {
            const range = document.caretRangeFromPoint(coords.left, coords.top);
            if (range) {
                domNode = range.startContainer;
                domOffset = range.startOffset;
            }
        }

        if (!domNode) return null;

        return this._posFromDom(domNode, domOffset);
    }

    /**
     * Return the DOM element for a model node.
     *
     * @param {import('../model/Node.js').default} node - Model node
     * @returns {Element|null}
     */
    nodeDOM(node) {
        return this._nodeToDom.get(node) || null;
    }

    /**
     * Clean up DOM listeners and references.
     */
    destroy() {
        this._nodeToDom.clear();
        this._domToNode.clear();
        this.container.innerHTML = "";
        this.dispatch = null;
    }

    // =========================================================================
    // DOM Rendering
    // =========================================================================

    /**
     * Full initial render of a document tree.
     *
     * @param {import('../model/Node.js').default} doc - Document root node
     * @private
     */
    _renderDoc(doc) {
        this._nodeToDom.clear();
        this._domToNode.clear();
        this.container.innerHTML = "";

        // Render each child of the document node
        if (doc.children) {
            for (const child of doc.children) {
                const domEl = this._renderNode(child);
                if (domEl) {
                    this.container.appendChild(domEl);
                }
            }
        }
    }

    /**
     * Render a single model node to a DOM element.
     *
     * @param {import('../model/Node.js').default} node - Model node
     * @returns {Element|Text|null} DOM element or text node
     * @private
     */
    _renderNode(node) {
        if (node.type === "text") {
            return this._renderTextNode(node);
        }

        const spec = this.schema.nodes[node.type];
        if (!spec || !spec.toDOM) {
            // Unknown node type — render as a div
            const el = document.createElement("div");
            el.setAttribute("data-node-type", node.type);
            this._registerMapping(node, el);

            if (node.children) {
                for (const child of node.children) {
                    const childEl = this._renderNode(child);
                    if (childEl) el.appendChild(childEl);
                }
            }
            return el;
        }

        const domSpec = spec.toDOM(node);
        const el = this._createFromSpec(domSpec, node);
        return el;
    }

    /**
     * Render a text node, optionally wrapped in mark elements.
     *
     * @param {import('../model/Node.js').default} textNode - Text model node
     * @returns {Text|Element} DOM text node or mark-wrapped element
     * @private
     */
    _renderTextNode(textNode) {
        if (!textNode.marks || textNode.marks.length === 0) {
            const domText = document.createTextNode(textNode.text);
            this._registerMapping(textNode, domText);
            return domText;
        }

        return this._renderMarks(textNode);
    }

    /**
     * Wrap text content in mark elements based on the text node's marks.
     *
     * Marks are applied from outermost to innermost. The order follows
     * the sorted mark array from the model.
     *
     * @param {import('../model/Node.js').default} textNode - Text model node with marks
     * @returns {Element} Outermost mark wrapper element
     * @private
     */
    _renderMarks(textNode) {
        const textContent = document.createTextNode(textNode.text);
        let current = textContent;

        // Wrap from innermost to outermost (reverse order since marks
        // are sorted alphabetically and we build inside-out)
        const marks = [...textNode.marks].reverse();

        for (const mark of marks) {
            const markSpec = this.schema.marks[mark.type];
            if (markSpec && markSpec.toDOM) {
                const markDomSpec = markSpec.toDOM(mark);
                const wrapper = this._createElementFromSpec(markDomSpec);
                wrapper.appendChild(current);
                current = wrapper;
            }
        }

        this._registerMapping(textNode, current);
        return current;
    }

    /**
     * Create a DOM element from a toDOM spec.
     *
     * Spec format: ["tagName", { attrs }, ...children]
     * where 0 means "render children here".
     *
     * @param {Array} spec - DOM spec from schema
     * @param {import('../model/Node.js').default} node - Model node (for child rendering)
     * @returns {Element}
     * @private
     */
    _createFromSpec(spec, node) {
        if (!Array.isArray(spec)) {
            // Leaf that returns a non-array (shouldn't happen but handle gracefully)
            const el = document.createElement("span");
            el.textContent = String(spec);
            return el;
        }

        const tagName = spec[0];
        const el = document.createElement(tagName);

        let childInsertionPoint = null;
        let startIdx = 1;

        // Check if second element is an attrs object
        if (spec.length > 1 && spec[1] !== null && typeof spec[1] === "object" && !Array.isArray(spec[1]) && spec[1] !== 0) {
            const attrs = spec[1];
            for (const [key, value] of Object.entries(attrs)) {
                if (value !== undefined && value !== null) {
                    el.setAttribute(key, value);
                }
            }
            startIdx = 2;
        }

        // Process remaining spec entries
        for (let i = startIdx; i < spec.length; i++) {
            const entry = spec[i];

            if (entry === 0) {
                // Render node's children here
                childInsertionPoint = el;
            } else if (Array.isArray(entry)) {
                // Nested spec (e.g., codeBlock: ["pre", {}, ["code", {}, 0]])
                const nested = this._createFromSpecNested(entry, node);
                el.appendChild(nested);
                // Check if the nested element got the child insertion point
                if (nested._childInsertionPoint) {
                    childInsertionPoint = nested._childInsertionPoint;
                    delete nested._childInsertionPoint;
                }
            }
        }

        // If there's a child insertion point, render the node's children into it
        if (childInsertionPoint && node && node.children) {
            for (const child of node.children) {
                const childEl = this._renderNode(child);
                if (childEl) childInsertionPoint.appendChild(childEl);
            }
        }

        this._registerMapping(node, el);
        return el;
    }

    /**
     * Create nested DOM elements from a spec (helper for nested specs like codeBlock).
     *
     * @param {Array} spec - Nested DOM spec
     * @param {import('../model/Node.js').default} node - Model node for children
     * @returns {Element}
     * @private
     */
    _createFromSpecNested(spec, node) {
        const tagName = spec[0];
        const el = document.createElement(tagName);

        let startIdx = 1;

        if (spec.length > 1 && spec[1] !== null && typeof spec[1] === "object" && !Array.isArray(spec[1]) && spec[1] !== 0) {
            const attrs = spec[1];
            for (const [key, value] of Object.entries(attrs)) {
                if (value !== undefined && value !== null) {
                    el.setAttribute(key, value);
                }
            }
            startIdx = 2;
        }

        for (let i = startIdx; i < spec.length; i++) {
            const entry = spec[i];

            if (entry === 0) {
                // Mark this element as the child insertion point
                el._childInsertionPoint = el;
            } else if (Array.isArray(entry)) {
                const nested = this._createFromSpecNested(entry, node);
                el.appendChild(nested);
                if (nested._childInsertionPoint) {
                    el._childInsertionPoint = nested._childInsertionPoint;
                    delete nested._childInsertionPoint;
                }
            }
        }

        return el;
    }

    /**
     * Create a bare DOM element from a mark spec (no children handling).
     *
     * @param {Array} spec - Mark DOM spec
     * @returns {Element}
     * @private
     */
    _createElementFromSpec(spec) {
        if (!Array.isArray(spec)) {
            return document.createElement("span");
        }

        const tagName = spec[0];
        const el = document.createElement(tagName);

        if (spec.length > 1 && spec[1] !== null && typeof spec[1] === "object" && !Array.isArray(spec[1]) && spec[1] !== 0) {
            const attrs = spec[1];
            for (const [key, value] of Object.entries(attrs)) {
                if (value !== undefined && value !== null) {
                    el.setAttribute(key, value);
                }
            }
        }

        return el;
    }

    // =========================================================================
    // Incremental diff/patch
    // =========================================================================

    /**
     * Compare old and new document trees, patch only changed DOM nodes.
     *
     * Uses a simple recursive diff: for each changed node at a position,
     * replace/update the corresponding DOM element.
     *
     * @param {import('../model/Node.js').default} oldDoc
     * @param {import('../model/Node.js').default} newDoc
     * @private
     */
    _diffAndPatch(oldDoc, newDoc) {
        // Compare children of document node
        this._diffChildren(oldDoc, newDoc, this.container);
    }

    /**
     * Diff and patch the children of two corresponding nodes.
     *
     * @param {import('../model/Node.js').default} oldNode
     * @param {import('../model/Node.js').default} newNode
     * @param {Element} parentEl - DOM parent element
     * @private
     */
    _diffChildren(oldNode, newNode, parentEl) {
        const oldChildren = oldNode.children || [];
        const newChildren = newNode.children || [];

        const maxLen = Math.max(oldChildren.length, newChildren.length);

        for (let i = 0; i < maxLen; i++) {
            const oldChild = i < oldChildren.length ? oldChildren[i] : null;
            const newChild = i < newChildren.length ? newChildren[i] : null;

            if (!oldChild && newChild) {
                // New child added
                const newEl = this._renderNode(newChild);
                if (newEl) parentEl.appendChild(newEl);
            } else if (oldChild && !newChild) {
                // Old child removed
                const oldEl = this._nodeToDom.get(oldChild);
                if (oldEl && oldEl.parentNode === parentEl) {
                    parentEl.removeChild(oldEl);
                } else if (parentEl.childNodes[i]) {
                    parentEl.removeChild(parentEl.childNodes[i]);
                }
                this._unregisterMapping(oldChild);
            } else if (oldChild && newChild) {
                if (oldChild === newChild) {
                    // Same reference — no change
                    continue;
                }

                if (oldChild.type !== newChild.type) {
                    // Type changed — full replace
                    const newEl = this._renderNode(newChild);
                    const oldEl = this._nodeToDom.get(oldChild);
                    if (oldEl && oldEl.parentNode === parentEl) {
                        parentEl.replaceChild(newEl, oldEl);
                    } else if (parentEl.childNodes[i]) {
                        parentEl.replaceChild(newEl, parentEl.childNodes[i]);
                    } else {
                        parentEl.appendChild(newEl);
                    }
                    this._unregisterMapping(oldChild);
                } else if (newChild.type === "text") {
                    // Text node — check text and marks
                    this._patchTextNode(oldChild, newChild, parentEl, i);
                } else {
                    // Same type non-text node — check attrs and children
                    this._patchElement(oldChild, newChild, parentEl, i);
                }
            }
        }

        // Remove extra DOM children beyond the new children count
        while (parentEl.childNodes.length > newChildren.length) {
            parentEl.removeChild(parentEl.lastChild);
        }
    }

    /**
     * Patch a text node: update text content and/or mark wrappers.
     *
     * @param {import('../model/Node.js').default} oldNode
     * @param {import('../model/Node.js').default} newNode
     * @param {Element} parentEl
     * @param {number} index
     * @private
     */
    _patchTextNode(oldNode, newNode, parentEl, index) {
        const marksEqual = Mark.sameSet(oldNode.marks, newNode.marks);

        if (marksEqual && oldNode.text === newNode.text) {
            // Update mapping to new node reference
            const oldDom = this._nodeToDom.get(oldNode);
            if (oldDom) {
                this._unregisterMapping(oldNode);
                this._registerMapping(newNode, oldDom);
            }
            return;
        }

        if (marksEqual && oldNode.text !== newNode.text) {
            // Only text changed — update text content in place
            const oldDom = this._nodeToDom.get(oldNode);
            if (oldDom) {
                if (oldDom.nodeType === 3) {
                    // Direct text node
                    oldDom.textContent = newNode.text;
                } else {
                    // Marked text — find the deepest text node
                    const textNode = this._findTextNode(oldDom);
                    if (textNode) {
                        textNode.textContent = newNode.text;
                    }
                }
                this._unregisterMapping(oldNode);
                this._registerMapping(newNode, oldDom);
                return;
            }
        }

        // Marks changed — full re-render of text node
        const newDom = this._renderTextNode(newNode);
        const oldDom = this._nodeToDom.get(oldNode);
        if (oldDom && oldDom.parentNode === parentEl) {
            parentEl.replaceChild(newDom, oldDom);
        } else if (parentEl.childNodes[index]) {
            parentEl.replaceChild(newDom, parentEl.childNodes[index]);
        } else {
            parentEl.appendChild(newDom);
        }
        this._unregisterMapping(oldNode);
    }

    /**
     * Patch a non-text element node: update attrs and recurse on children.
     *
     * @param {import('../model/Node.js').default} oldNode
     * @param {import('../model/Node.js').default} newNode
     * @param {Element} parentEl
     * @param {number} index
     * @private
     */
    _patchElement(oldNode, newNode, parentEl, index) {
        let domEl = this._nodeToDom.get(oldNode);

        if (!domEl) {
            // No DOM mapping found — full re-render
            const newEl = this._renderNode(newNode);
            if (parentEl.childNodes[index]) {
                parentEl.replaceChild(newEl, parentEl.childNodes[index]);
            } else {
                parentEl.appendChild(newEl);
            }
            return;
        }

        // Check if attrs changed — if so, rebuild the element
        if (!this._attrsEqual(oldNode.attrs, newNode.attrs)) {
            const newEl = this._renderNode(newNode);
            if (domEl.parentNode === parentEl) {
                parentEl.replaceChild(newEl, domEl);
            }
            this._unregisterMapping(oldNode);
            return;
        }

        // Update node mapping
        this._unregisterMapping(oldNode);
        this._registerMapping(newNode, domEl);

        // Find the actual child container (for nested specs like codeBlock)
        const childContainer = this._findChildContainer(domEl);

        // Recursively diff children
        this._diffChildren(oldNode, newNode, childContainer);
    }

    // =========================================================================
    // Position <-> DOM mapping
    // =========================================================================

    /**
     * Find the DOM node and offset for a given model position.
     *
     * Walks the document tree to find which text node or element boundary
     * corresponds to the model position, then returns the matching DOM node.
     *
     * @param {number} pos - Model position
     * @returns {{ node: Node, offset: number }|null}
     * @private
     */
    _domAtPos(pos) {
        const doc = this.state.doc;
        if (!doc.children || doc.children.length === 0) {
            return { node: this.container, offset: 0 };
        }

        return this._domAtPosInner(doc, pos, 0, this.container);
    }

    /**
     * Recursively find DOM node/offset for a position.
     *
     * @param {import('../model/Node.js').default} node - Current model node
     * @param {number} pos - Target position
     * @param {number} contentStart - Position where this node's content starts
     * @param {Element} domParent - Corresponding DOM parent
     * @returns {{ node: Node, offset: number }|null}
     * @private
     */
    _domAtPosInner(node, pos, contentStart, domParent) {
        if (!node.children) return null;

        let offset = contentStart;
        let domIdx = 0;

        for (let i = 0; i < node.children.length; i++) {
            const child = node.children[i];
            const childSize = child.nodeSize;
            const childEnd = offset + childSize;

            if (pos < childEnd) {
                if (child.type === "text") {
                    const textOffset = pos - offset;
                    const domNode = this._findDomTextNode(domParent, domIdx);
                    if (domNode) {
                        return { node: domNode, offset: textOffset };
                    }
                    return null;
                }

                if (child.children !== null) {
                    const childContentStart = offset + 1;
                    if (pos === offset) {
                        // At the opening boundary of this child
                        return { node: domParent, offset: domIdx };
                    }

                    // Descend into child
                    const childDom = this._getChildDomElement(domParent, domIdx);
                    if (childDom) {
                        const childContainer = this._findChildContainer(childDom);
                        return this._domAtPosInner(child, pos, childContentStart, childContainer);
                    }
                    return null;
                }

                // Leaf node
                return { node: domParent, offset: domIdx };
            }

            offset = childEnd;
            domIdx++;
        }

        // Position is at the end of content
        return { node: domParent, offset: domParent.childNodes.length };
    }

    /**
     * Map a DOM node/offset back to a model position.
     *
     * @param {Node} domNode - DOM node
     * @param {number} domOffset - Offset within DOM node
     * @returns {number|null} Model position
     * @private
     */
    _posFromDom(domNode, domOffset) {
        // Walk up to find a node we have a mapping for
        let current = domNode;

        // If it's a text node, check the parent element
        if (current.nodeType === 3) {
            const parent = current.parentNode;
            if (!parent) return null;

            // Find the model node that maps to an ancestor
            const modelNode = this._findModelNodeForDom(parent);
            if (modelNode && modelNode.type === "text") {
                // Find the position of this text node in the document
                const textPos = this._findNodePos(this.state.doc, modelNode, 0);
                if (textPos !== null) {
                    return textPos + domOffset;
                }
            }

            // Try finding via container
            return this._posFromDomFallback(domNode, domOffset);
        }

        return this._posFromDomFallback(domNode, domOffset);
    }

    /**
     * Fallback position finding: walk the DOM tree to estimate position.
     *
     * @param {Node} domNode
     * @param {number} domOffset
     * @returns {number|null}
     * @private
     */
    _posFromDomFallback(domNode, domOffset) {
        // Walk the content container's children to count position
        const doc = this.state.doc;
        if (!doc.children) return 0;

        let target = domNode;
        if (target.nodeType === 3) {
            target = target.parentNode;
        }

        // Find which top-level child this DOM belongs to
        let pos = 0;
        for (let i = 0; i < doc.children.length; i++) {
            const child = doc.children[i];
            const childDom = this._nodeToDom.get(child);

            if (childDom && (childDom === target || childDom.contains(target))) {
                // Target is within this child
                pos += 1; // opening boundary
                return this._posFromDomInChild(child, target, domNode, domOffset, pos);
            }

            pos += child.nodeSize;
        }

        return pos;
    }

    /**
     * Find position within a child node's DOM.
     *
     * @param {import('../model/Node.js').default} node - Model node
     * @param {Node} targetEl - DOM element target
     * @param {Node} domNode - Original DOM node
     * @param {number} domOffset - Original DOM offset
     * @param {number} contentStart - Content start position
     * @returns {number}
     * @private
     */
    _posFromDomInChild(node, targetEl, domNode, domOffset, contentStart) {
        if (!node.children) return contentStart;

        let pos = contentStart;
        for (let i = 0; i < node.children.length; i++) {
            const child = node.children[i];

            if (child.type === "text") {
                const childDom = this._nodeToDom.get(child);
                if (childDom) {
                    const textDomNode = childDom.nodeType === 3
                        ? childDom
                        : this._findTextNode(childDom);

                    if (textDomNode === domNode) {
                        return pos + domOffset;
                    }
                    if (childDom === targetEl || (childDom.contains && childDom.contains(targetEl))) {
                        return pos + domOffset;
                    }
                }
                pos += child.nodeSize;
            } else if (child.children !== null) {
                const childDom = this._nodeToDom.get(child);
                if (childDom && (childDom === targetEl || childDom.contains(targetEl))) {
                    pos += 1; // opening boundary
                    return this._posFromDomInChild(child, targetEl, domNode, domOffset, pos);
                }
                pos += child.nodeSize;
            } else {
                pos += child.nodeSize;
            }
        }

        return pos;
    }

    // =========================================================================
    // Helpers
    // =========================================================================

    /**
     * Register a mapping between a model node and DOM element.
     *
     * @param {import('../model/Node.js').default} node
     * @param {Element|Text} domEl
     * @private
     */
    _registerMapping(node, domEl) {
        this._nodeToDom.set(node, domEl);
        this._domToNode.set(domEl, node);
    }

    /**
     * Unregister a node from the mapping.
     *
     * @param {import('../model/Node.js').default} node
     * @private
     */
    _unregisterMapping(node) {
        const dom = this._nodeToDom.get(node);
        if (dom) {
            this._domToNode.delete(dom);
        }
        this._nodeToDom.delete(node);
    }

    /**
     * Find the deepest text node within an element.
     *
     * @param {Node} el - DOM element
     * @returns {Text|null}
     * @private
     */
    _findTextNode(el) {
        if (el.nodeType === 3) return el;
        for (const child of el.childNodes) {
            const found = this._findTextNode(child);
            if (found) return found;
        }
        return null;
    }

    /**
     * Find the DOM text node at a given child index of a parent.
     *
     * Text nodes may be wrapped in mark elements, so we need to
     * find the actual Text node inside the wrapping.
     *
     * @param {Element} parentEl - DOM parent
     * @param {number} childIndex - Child index
     * @returns {Text|null}
     * @private
     */
    _findDomTextNode(parentEl, childIndex) {
        if (childIndex >= parentEl.childNodes.length) return null;
        const child = parentEl.childNodes[childIndex];
        if (child.nodeType === 3) return child;
        // Wrapped in mark elements — find the deepest text node
        return this._findTextNode(child);
    }

    /**
     * Get a child DOM element at a given index.
     *
     * @param {Element} parentEl
     * @param {number} index
     * @returns {Element|null}
     * @private
     */
    _getChildDomElement(parentEl, index) {
        if (index >= parentEl.childNodes.length) return null;
        const child = parentEl.childNodes[index];
        return child.nodeType === 1 ? child : null;
    }

    /**
     * Find the container element where children should be rendered.
     * For simple elements this is the element itself, but for nested
     * specs (like codeBlock: pre > code) it may be a descendant.
     *
     * @param {Element} el
     * @returns {Element}
     * @private
     */
    _findChildContainer(el) {
        // Heuristic: if the element has a single child element and
        // that child doesn't map to any model node, it might be a
        // structural wrapper. Use the deepest non-mapped element.
        if (el.childNodes.length === 1 && el.firstChild.nodeType === 1) {
            if (!this._domToNode.has(el.firstChild)) {
                return this._findChildContainer(el.firstChild);
            }
        }
        return el;
    }

    /**
     * Find a model node that corresponds to a DOM element.
     *
     * @param {Node} domEl - DOM element
     * @returns {import('../model/Node.js').default|null}
     * @private
     */
    _findModelNodeForDom(domEl) {
        let current = domEl;
        while (current) {
            const node = this._domToNode.get(current);
            if (node) return node;
            current = current.parentNode;
        }
        return null;
    }

    /**
     * Find the integer position of a model node within the document tree.
     *
     * @param {import('../model/Node.js').default} parent - Parent node to search
     * @param {import('../model/Node.js').default} target - Target node to find
     * @param {number} pos - Current position offset
     * @returns {number|null} Position, or null if not found
     * @private
     */
    _findNodePos(parent, target, pos) {
        if (!parent.children) return null;

        for (const child of parent.children) {
            if (child === target) return pos;

            if (child.type === "text") {
                pos += child.nodeSize;
            } else if (child.children !== null) {
                const found = this._findNodePos(child, target, pos + 1);
                if (found !== null) return found;
                pos += child.nodeSize;
            } else {
                pos += child.nodeSize;
            }
        }

        return null;
    }

    /**
     * Check if two attribute objects are equal.
     *
     * @param {object} a
     * @param {object} b
     * @returns {boolean}
     * @private
     */
    _attrsEqual(a, b) {
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
}
