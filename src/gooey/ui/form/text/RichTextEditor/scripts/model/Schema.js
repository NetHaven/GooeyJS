import Node, { Mark } from "./Node.js";

/**
 * Content expression parser and validator.
 *
 * Parses content expression strings like "block+", "inline*", "text*",
 * "listItem+" into rules that validate arrays of child nodes.
 */
class ContentExpression {

    /**
     * @param {string} expr - Content expression string (e.g., "block+", "inline*", "listItem+")
     */
    constructor(expr) {
        /** @type {string} Raw expression */
        this.expr = expr || "";

        /** @type {Array<{match: string, min: number, max: number}>} Parsed rules */
        this.rules = ContentExpression._parse(this.expr);

        Object.freeze(this.rules);
        Object.freeze(this);
    }

    /**
     * Parse a content expression into rules.
     * Supports: "block+", "inline*", "text*", "listItem+", "tableRow+", etc.
     * Also supports empty string (no children allowed).
     * @param {string} expr
     * @returns {Array<{match: string, min: number, max: number}>}
     */
    static _parse(expr) {
        if (!expr || expr.trim() === "") return [];

        const parts = expr.trim().split(/\s+/);
        const rules = [];

        for (const part of parts) {
            const quantMatch = part.match(/^([a-zA-Z_]+)([+*?]?)$/);
            if (!quantMatch) {
                throw new Error(`Invalid content expression: "${part}" in "${expr}"`);
            }

            const match = quantMatch[1];
            const quant = quantMatch[2];

            let min, max;
            switch (quant) {
                case "+": min = 1; max = Infinity; break;
                case "*": min = 0; max = Infinity; break;
                case "?": min = 0; max = 1; break;
                default:  min = 1; max = 1; break;
            }

            rules.push({ match, min, max });
        }

        return rules;
    }

    /**
     * Validate an array of child nodes against this content expression.
     * @param {Node[]} children - Array of child nodes
     * @param {object} nodeSpecs - The schema's node specs (for group lookups)
     * @returns {boolean}
     */
    validate(children, nodeSpecs) {
        if (this.rules.length === 0) {
            return !children || children.length === 0;
        }

        // For simplicity with single-rule expressions (the common case),
        // validate all children match the rule with proper count
        if (this.rules.length === 1) {
            const rule = this.rules[0];
            const count = children ? children.length : 0;

            if (count < rule.min) return false;
            if (count > rule.max) return false;

            // Check each child matches the rule
            for (const child of (children || [])) {
                if (!this._matchesRule(child, rule, nodeSpecs)) {
                    return false;
                }
            }
            return true;
        }

        // Multi-rule: each rule consumes children sequentially
        let childIdx = 0;
        for (const rule of this.rules) {
            let count = 0;
            while (childIdx < (children || []).length &&
                   this._matchesRule(children[childIdx], rule, nodeSpecs)) {
                count++;
                childIdx++;
                if (count >= rule.max) break;
            }
            if (count < rule.min) return false;
        }

        // All children must be consumed
        return childIdx === (children ? children.length : 0);
    }

    /**
     * Check if a child node matches a rule's match spec.
     * Match can be a group name (e.g., "block", "inline") or a specific type name.
     * @param {Node} child
     * @param {object} rule
     * @param {object} nodeSpecs
     * @returns {boolean}
     */
    _matchesRule(child, rule, nodeSpecs) {
        const matchName = rule.match;

        // Check if match is a group name
        if (matchName === "text") {
            return child.type === "text";
        }

        // Check if the child type's spec has a matching group
        const childSpec = nodeSpecs[child.type];
        if (childSpec && childSpec.group === matchName) {
            return true;
        }

        // Check if match is a direct type name
        if (child.type === matchName) {
            return true;
        }

        return false;
    }
}


/**
 * Schema defines valid document structure: node types, marks, content
 * constraints, attributes with defaults, and DOM serialization rules.
 *
 * The Schema creates and validates Node instances, ensuring the document
 * tree always conforms to the defined structure.
 */
export default class Schema {

    /**
     * @param {object} spec - Schema specification
     * @param {object} spec.nodes - Node type definitions
     * @param {object} spec.marks - Mark type definitions
     */
    constructor(spec) {
        if (!spec || !spec.nodes) {
            throw new Error("Schema requires a nodes specification");
        }

        /** @type {object} Node specs keyed by type name */
        this.nodes = {};

        /** @type {object} Mark specs keyed by type name */
        this.marks = {};

        /** @type {object} Parsed content expressions keyed by node type */
        this._contentExprs = {};

        // Process node specs
        for (const [name, nodeDef] of Object.entries(spec.nodes)) {
            this.nodes[name] = Object.freeze({
                content: nodeDef.content || null,
                group: nodeDef.group || null,
                attrs: nodeDef.attrs || null,
                toDOM: nodeDef.toDOM || null,
                parseDOM: nodeDef.parseDOM || null
            });

            // Parse content expression
            if (nodeDef.content) {
                this._contentExprs[name] = new ContentExpression(nodeDef.content);
            } else {
                this._contentExprs[name] = new ContentExpression("");
            }
        }

        // Process mark specs
        for (const [name, markDef] of Object.entries(spec.marks || {})) {
            this.marks[name] = Object.freeze({
                attrs: markDef.attrs || null,
                toDOM: markDef.toDOM || null,
                parseDOM: markDef.parseDOM || null
            });
        }

        Object.freeze(this.nodes);
        Object.freeze(this.marks);
        Object.freeze(this._contentExprs);
        Object.freeze(this);
    }

    /**
     * Get the top-level document node type name.
     * @returns {string}
     */
    get topNodeType() {
        return "document";
    }

    /**
     * Get a node spec by name. Throws if not found.
     * @param {string} name
     * @returns {object}
     */
    nodeType(name) {
        const spec = this.nodes[name];
        if (!spec) {
            throw new Error(`Unknown node type: "${name}"`);
        }
        return spec;
    }

    /**
     * Get a mark spec by name. Throws if not found.
     * @param {string} name
     * @returns {object}
     */
    markType(name) {
        const spec = this.marks[name];
        if (!spec) {
            throw new Error(`Unknown mark type: "${name}"`);
        }
        return spec;
    }

    /**
     * Create a validated Node.
     *
     * - Validates the type exists in the schema
     * - Fills in missing attrs with defaults from spec
     * - Validates children against the content expression
     *
     * @param {string} type - Node type name
     * @param {object|null} attrs - Node attributes
     * @param {Node[]|null} children - Child nodes
     * @param {object[]|null} marks - Marks (for text-like nodes)
     * @returns {Node}
     */
    node(type, attrs, children, marks) {
        const spec = this.nodeType(type); // throws if unknown

        // Build attrs with defaults
        const resolvedAttrs = this._resolveAttrs(spec.attrs, attrs);

        // Validate children against content expression
        if (type !== "text") {
            const contentExpr = this._contentExprs[type];
            if (contentExpr && !contentExpr.validate(children, this.nodes)) {
                const childTypes = children
                    ? children.map(c => c.type).join(", ")
                    : "(none)";
                throw new Error(
                    `Invalid content for "${type}": got [${childTypes}], ` +
                    `expected "${spec.content || '(empty)'}"`
                );
            }
        }

        return new Node(type, resolvedAttrs, children, marks);
    }

    /**
     * Shorthand for creating a text node.
     * @param {string} content - Text content
     * @param {object[]|null} marks - Optional marks
     * @returns {Node}
     */
    text(content, marks) {
        if (typeof content !== "string" || content.length === 0) {
            throw new Error("Text content must be a non-empty string");
        }
        // Validate marks if provided
        if (marks) {
            for (const m of marks) {
                if (m.type && !this.marks[m.type]) {
                    throw new Error(`Unknown mark type: "${m.type}"`);
                }
            }
        }
        return new Node("text", null, null, marks || [], content);
    }

    /**
     * Create a validated mark object.
     * @param {string} type - Mark type name
     * @param {object} [attrs] - Mark attributes
     * @returns {object} Frozen mark object
     */
    mark(type, attrs) {
        const spec = this.markType(type); // throws if unknown

        // Resolve attrs with defaults
        const resolvedAttrs = this._resolveAttrs(spec.attrs, attrs);
        return Mark.create(type, Object.keys(resolvedAttrs).length > 0 ? resolvedAttrs : undefined);
    }

    /**
     * Check if a children array satisfies a parent type's content expression.
     * @param {string} parentType - Parent node type name
     * @param {Node[]} children - Children to validate
     * @returns {boolean}
     */
    validContent(parentType, children) {
        const contentExpr = this._contentExprs[parentType];
        if (!contentExpr) return false;
        return contentExpr.validate(children, this.nodes);
    }

    /**
     * Resolve attributes against a spec's defaults.
     * Missing attributes are filled in with defaults; attrs without defaults
     * that are not provided will throw.
     *
     * @param {object|null} specAttrs - Attribute definitions from spec
     * @param {object|null} providedAttrs - User-provided attribute values
     * @returns {object} Resolved attributes
     */
    _resolveAttrs(specAttrs, providedAttrs) {
        if (!specAttrs) return providedAttrs || {};

        const result = {};
        for (const [name, def] of Object.entries(specAttrs)) {
            if (providedAttrs && providedAttrs[name] !== undefined) {
                result[name] = providedAttrs[name];
            } else if (def && def.default !== undefined) {
                result[name] = def.default;
            } else if (providedAttrs && providedAttrs[name] === undefined && def && !("default" in def)) {
                // Required attr without default — only throw if not provided at all
                // But allow undefined to pass through for optional attrs
                // If the attr spec has no default key at all, it's required
                throw new Error(`Missing required attribute "${name}"`);
            }
        }

        // Preserve any extra attrs not in spec
        if (providedAttrs) {
            for (const [name, value] of Object.entries(providedAttrs)) {
                if (!(name in result)) {
                    result[name] = value;
                }
            }
        }

        return result;
    }

    /**
     * Create the default schema with all node types and marks from
     * the RichTextEditor specification.
     *
     * @returns {Schema}
     */
    static default() {
        return new Schema({
            nodes: {
                document: {
                    content: "block+",
                    toDOM: () => ["div", { class: "rte-document" }, 0]
                },
                paragraph: {
                    content: "inline*",
                    group: "block",
                    attrs: {
                        align: { default: null },
                        indent: { default: 0 },
                        lineHeight: { default: null }
                    },
                    toDOM: (node) => {
                        const style = _buildBlockStyle(node.attrs);
                        return ["p", style ? { style } : {}, 0];
                    }
                },
                heading: {
                    content: "inline*",
                    group: "block",
                    attrs: {
                        level: { default: 1 },
                        align: { default: null },
                        indent: { default: 0 },
                        lineHeight: { default: null }
                    },
                    toDOM: (node) => {
                        const style = _buildBlockStyle(node.attrs);
                        return [`h${node.attrs.level}`, style ? { style } : {}, 0];
                    }
                },
                blockquote: {
                    content: "block+",
                    group: "block",
                    attrs: {
                        align: { default: null }
                    },
                    toDOM: (node) => {
                        const style = _buildBlockStyle(node.attrs);
                        return ["blockquote", style ? { style } : {}, 0];
                    }
                },
                bulletList: {
                    content: "listItem+",
                    group: "block",
                    toDOM: () => ["ul", {}, 0]
                },
                orderedList: {
                    content: "listItem+",
                    group: "block",
                    attrs: { start: { default: 1 } },
                    toDOM: (node) => ["ol", { start: node.attrs.start }, 0]
                },
                listItem: {
                    content: "block+",
                    attrs: {
                        align: { default: null },
                        indent: { default: 0 }
                    },
                    toDOM: (node) => {
                        const style = _buildBlockStyle(node.attrs);
                        return ["li", style ? { style } : {}, 0];
                    }
                },
                codeBlock: {
                    content: "text*",
                    group: "block",
                    attrs: { language: { default: null } },
                    toDOM: (node) => ["pre", {}, ["code", node.attrs.language ? { class: `language-${node.attrs.language}` } : {}, 0]]
                },
                horizontalRule: {
                    group: "block",
                    toDOM: () => ["hr"]
                },
                table: {
                    content: "tableRow+",
                    group: "block",
                    toDOM: () => ["table", {}, ["tbody", {}, 0]]
                },
                tableRow: {
                    content: "tableCell+",
                    toDOM: () => ["tr", {}, 0]
                },
                tableCell: {
                    content: "block+",
                    attrs: {
                        colspan: { default: 1 },
                        rowspan: { default: 1 },
                        header: { default: false }
                    },
                    toDOM: (node) => [
                        node.attrs.header ? "th" : "td",
                        {
                            colspan: node.attrs.colspan > 1 ? node.attrs.colspan : undefined,
                            rowspan: node.attrs.rowspan > 1 ? node.attrs.rowspan : undefined
                        },
                        0
                    ]
                },
                image: {
                    group: "block",
                    attrs: {
                        src: {},
                        alt: { default: "" },
                        title: { default: null },
                        width: { default: null },
                        height: { default: null }
                    },
                    toDOM: (node) => ["img", {
                        src: node.attrs.src,
                        alt: node.attrs.alt,
                        title: node.attrs.title,
                        width: node.attrs.width,
                        height: node.attrs.height
                    }]
                },
                hardBreak: {
                    group: "inline",
                    toDOM: () => ["br"]
                },
                text: {
                    group: "inline"
                }
            },
            marks: {
                bold: {
                    toDOM: () => ["strong", {}, 0],
                    parseDOM: [{ tag: "strong" }, { tag: "b" }, { style: "font-weight=bold" }]
                },
                italic: {
                    toDOM: () => ["em", {}, 0],
                    parseDOM: [{ tag: "em" }, { tag: "i" }, { style: "font-style=italic" }]
                },
                underline: {
                    toDOM: () => ["u", {}, 0],
                    parseDOM: [{ tag: "u" }, { style: "text-decoration=underline" }]
                },
                strikethrough: {
                    toDOM: () => ["s", {}, 0],
                    parseDOM: [{ tag: "s" }, { tag: "del" }, { style: "text-decoration=line-through" }]
                },
                code: {
                    toDOM: () => ["code", {}, 0],
                    parseDOM: [{ tag: "code" }]
                },
                subscript: {
                    toDOM: () => ["sub", {}, 0],
                    parseDOM: [{ tag: "sub" }]
                },
                superscript: {
                    toDOM: () => ["sup", {}, 0],
                    parseDOM: [{ tag: "sup" }]
                },
                link: {
                    attrs: {
                        href: {},
                        title: { default: null },
                        target: { default: null }
                    },
                    toDOM: (mark) => ["a", {
                        href: mark.attrs.href,
                        title: mark.attrs.title,
                        target: mark.attrs.target,
                        rel: mark.attrs.target === "_blank" ? "noopener noreferrer" : undefined
                    }, 0],
                    parseDOM: [{ tag: "a[href]" }]
                },
                textColor: {
                    attrs: { color: {} },
                    toDOM: (mark) => ["span", { style: `color: ${mark.attrs.color}` }, 0],
                    parseDOM: [{ style: "color" }]
                },
                backgroundColor: {
                    attrs: { color: {} },
                    toDOM: (mark) => ["span", { style: `background-color: ${mark.attrs.color}` }, 0],
                    parseDOM: [{ style: "background-color" }]
                },
                fontSize: {
                    attrs: { size: {} },
                    toDOM: (mark) => ["span", { style: `font-size: ${mark.attrs.size}` }, 0],
                    parseDOM: [{ style: "font-size" }]
                },
                fontFamily: {
                    attrs: { family: {} },
                    toDOM: (mark) => ["span", { style: `font-family: ${mark.attrs.family}` }, 0],
                    parseDOM: [{ style: "font-family" }]
                }
            }
        });
    }
}


// ============================================================================
// Block style helper
// ============================================================================

/**
 * Build a CSS style string from block attributes.
 *
 * @param {object} attrs - Block node attributes
 * @returns {string|null} CSS style string, or null if no styles needed
 */
function _buildBlockStyle(attrs) {
    const parts = [];

    if (attrs.align && attrs.align !== null) {
        parts.push(`text-align: ${attrs.align}`);
    }

    if (attrs.indent && attrs.indent > 0) {
        parts.push(`margin-left: ${attrs.indent * 40}px`);
    }

    if (attrs.lineHeight && attrs.lineHeight !== null) {
        parts.push(`line-height: ${attrs.lineHeight}`);
    }

    return parts.length > 0 ? parts.join("; ") : null;
}
