/**
 * SourceEditPlugin toggles between WYSIWYG and HTML source editing mode.
 *
 * Provides a toolbar button that switches the editor between its normal
 * WYSIWYG editing surface and a raw HTML textarea. When switching to
 * source mode, the current document is serialized to HTML. When switching
 * back, the HTML is parsed through the editor's schema, dropping/normalizing
 * any content that violates schema rules.
 *
 * The textarea gets the CSS class `rte-source-textarea` and fills the editor area.
 */


export default class SourceEditPlugin {

    static get pluginName() {
        return "sourceEdit";
    }

    constructor() {
        /** @type {object|null} */
        this._editor = null;

        /** @type {HTMLTextAreaElement|null} */
        this._sourceTextarea = null;

        /** @type {boolean} */
        this._isSourceMode = false;
    }

    /**
     * Called when plugin is registered with the editor.
     * Creates the source textarea element (hidden initially).
     *
     * @param {object} editor - RichTextEditor instance
     */
    init(editor) {
        this._editor = editor;

        // Create the source editing textarea
        this._sourceTextarea = document.createElement("textarea");
        this._sourceTextarea.className = "rte-source-textarea";
        this._sourceTextarea.style.display = "none";
        this._sourceTextarea.spellcheck = false;
        this._sourceTextarea.autocomplete = "off";
        this._sourceTextarea.autocorrect = "off";
        this._sourceTextarea.autocapitalize = "off";

        // Append to editor area
        const editorArea = editor._editorArea;
        if (editorArea) {
            editorArea.appendChild(this._sourceTextarea);
        }
    }

    /**
     * Toggle between WYSIWYG and source editing mode.
     *
     * In WYSIWYG -> Source: serialize current doc to HTML, show textarea.
     * In Source -> WYSIWYG: parse HTML back through schema, update state.
     */
    toggle() {
        if (!this._editor || !this._sourceTextarea) return;

        if (this._isSourceMode) {
            this._exitSourceMode();
        } else {
            this._enterSourceMode();
        }
    }

    /**
     * Check if the editor is currently in source editing mode.
     * @returns {boolean}
     */
    get isSourceMode() {
        return this._isSourceMode;
    }

    /**
     * Return toolbar item descriptors for the source edit toggle.
     * @returns {Array<object>}
     */
    toolbarItems() {
        return [
            {
                name: "sourceEdit",
                type: "button",
                command: () => this.toggle(),
                label: "Source",
                icon: "sourceEdit",
                isActive: () => this._isSourceMode
            }
        ];
    }

    /**
     * Cleanup when plugin is unregistered.
     * Removes the textarea element and exits source mode if active.
     */
    destroy() {
        // Exit source mode first if active
        if (this._isSourceMode) {
            this._exitSourceMode();
        }

        // Remove textarea
        if (this._sourceTextarea && this._sourceTextarea.parentNode) {
            this._sourceTextarea.parentNode.removeChild(this._sourceTextarea);
        }

        this._sourceTextarea = null;
        this._editor = null;
    }

    // =========================================================================
    // Private
    // =========================================================================

    /**
     * Enter source editing mode.
     * Serializes the current document to HTML and shows the textarea.
     * @private
     */
    _enterSourceMode() {
        const editor = this._editor;
        if (!editor || !editor._state) return;

        // Serialize document to HTML
        const html = this._serializeToHTML(editor._state.doc);

        // Show textarea with HTML content
        this._sourceTextarea.value = html;
        this._sourceTextarea.style.display = "";

        // Hide WYSIWYG content area
        const content = editor._content;
        if (content) {
            content.style.display = "none";
        }

        // Hide selection layer
        const selectionLayer = editor._selectionLayer;
        if (selectionLayer) {
            selectionLayer.style.display = "none";
        }

        this._isSourceMode = true;
    }

    /**
     * Exit source editing mode.
     * Reads textarea value, parses HTML back through schema, updates state.
     * @private
     */
    _exitSourceMode() {
        const editor = this._editor;
        if (!editor) return;

        // Read HTML from textarea
        const html = this._sourceTextarea.value;

        // Parse HTML back through the editor's parsing pipeline
        // This normalizes/drops content that violates schema rules
        if (typeof editor._parseHTML === "function") {
            const doc = editor._parseHTML(html);
            if (doc) {
                const tr = editor._state.transaction;
                // Replace entire document content
                tr.replaceRange(0, editor._state.doc.contentSize, doc.children || []);
                if (typeof editor._dispatch === "function") {
                    editor._dispatch(tr);
                }
            }
        }

        // Hide textarea
        this._sourceTextarea.style.display = "none";

        // Show WYSIWYG content area
        const content = editor._content;
        if (content) {
            content.style.display = "";
        }

        // Show selection layer
        const selectionLayer = editor._selectionLayer;
        if (selectionLayer) {
            selectionLayer.style.display = "";
        }

        this._isSourceMode = false;
    }

    /**
     * Serialize a document node tree to an HTML string.
     *
     * Walks the node tree and produces corresponding HTML markup.
     * This is a basic serializer; the editor may provide a more
     * complete one via its own serialize method.
     *
     * @param {object} doc - Document root node
     * @returns {string}
     * @private
     */
    _serializeToHTML(doc) {
        // If editor has its own serializer, use it
        if (this._editor && typeof this._editor._serializeToHTML === "function") {
            return this._editor._serializeToHTML(doc);
        }

        // Fallback: basic serialization
        return _serializeNode(doc);
    }
}


// =============================================================================
// Private helpers
// =============================================================================

/**
 * Map of node types to their HTML tag names.
 * @type {Object<string, string>}
 */
const NODE_TAG_MAP = {
    paragraph: "p",
    heading: "h",  // appends level number
    blockquote: "blockquote",
    codeBlock: "pre",
    bulletList: "ul",
    orderedList: "ol",
    listItem: "li",
    table: "table",
    tableRow: "tr",
    tableCell: "td",
    tableHeaderCell: "th",
    horizontalRule: "hr",
    hardBreak: "br",
    image: "img",
    video: "video",
    embed: "iframe"
};

/**
 * Map of mark types to their HTML tag names.
 * @type {Object<string, string>}
 */
const MARK_TAG_MAP = {
    bold: "strong",
    italic: "em",
    underline: "u",
    strikethrough: "s",
    code: "code",
    subscript: "sub",
    superscript: "sup"
};

/**
 * Serialize a single node to HTML.
 * @param {object} node - Node to serialize
 * @returns {string}
 */
function _serializeNode(node) {
    if (!node) return "";

    // Text node
    if (node.type === "text") {
        let text = _escapeHTML(node.text || "");
        // Wrap in mark tags
        if (node.marks && node.marks.length > 0) {
            for (const mark of node.marks) {
                text = _wrapInMark(text, mark);
            }
        }
        return text;
    }

    // Document root
    if (node.type === "doc") {
        if (!node.children) return "";
        return node.children.map(child => _serializeNode(child)).join("\n");
    }

    // Leaf nodes
    if (node.type === "horizontalRule") return "<hr>";
    if (node.type === "hardBreak") return "<br>";

    if (node.type === "image") {
        const src = node.attrs.src || "";
        const alt = node.attrs.alt || "";
        const width = node.attrs.width ? ` width="${node.attrs.width}"` : "";
        const height = node.attrs.height ? ` height="${node.attrs.height}"` : "";
        return `<img src="${_escapeAttr(src)}" alt="${_escapeAttr(alt)}"${width}${height}>`;
    }

    // Container nodes
    const tag = _getTag(node);
    const attrs = _getAttrs(node);
    const children = node.children
        ? node.children.map(child => _serializeNode(child)).join("")
        : "";

    return `<${tag}${attrs}>${children}</${tag}>`;
}

/**
 * Get the HTML tag for a node.
 * @param {object} node
 * @returns {string}
 */
function _getTag(node) {
    if (node.type === "heading") {
        const level = node.attrs.level || 1;
        return `h${level}`;
    }
    return NODE_TAG_MAP[node.type] || "div";
}

/**
 * Get HTML attributes string for a node.
 * @param {object} node
 * @returns {string}
 */
function _getAttrs(node) {
    const parts = [];
    const attrs = node.attrs;

    if (attrs.align) {
        parts.push(`style="text-align: ${attrs.align}"`);
    }
    if (attrs.src) {
        parts.push(`src="${_escapeAttr(attrs.src)}"`);
    }
    if (attrs.href) {
        parts.push(`href="${_escapeAttr(attrs.href)}"`);
    }

    return parts.length > 0 ? " " + parts.join(" ") : "";
}

/**
 * Wrap text in a mark's HTML tags.
 * @param {string} text
 * @param {object} mark
 * @returns {string}
 */
function _wrapInMark(text, mark) {
    const tag = MARK_TAG_MAP[mark.type];

    if (tag) {
        return `<${tag}>${text}</${tag}>`;
    }

    // Link mark
    if (mark.type === "link" && mark.attrs && mark.attrs.href) {
        return `<a href="${_escapeAttr(mark.attrs.href)}">${text}</a>`;
    }

    // Style-based marks (color, fontSize, fontFamily, backgroundColor)
    if (mark.type === "textColor" && mark.attrs && mark.attrs.color) {
        return `<span style="color: ${mark.attrs.color}">${text}</span>`;
    }
    if (mark.type === "backgroundColor" && mark.attrs && mark.attrs.color) {
        return `<span style="background-color: ${mark.attrs.color}">${text}</span>`;
    }
    if (mark.type === "fontSize" && mark.attrs && mark.attrs.size) {
        return `<span style="font-size: ${mark.attrs.size}">${text}</span>`;
    }
    if (mark.type === "fontFamily" && mark.attrs && mark.attrs.family) {
        return `<span style="font-family: ${mark.attrs.family}">${text}</span>`;
    }

    return text;
}

/**
 * Escape HTML special characters.
 * @param {string} str
 * @returns {string}
 */
function _escapeHTML(str) {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

/**
 * Escape an HTML attribute value.
 * @param {string} str
 * @returns {string}
 */
function _escapeAttr(str) {
    return str
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}
