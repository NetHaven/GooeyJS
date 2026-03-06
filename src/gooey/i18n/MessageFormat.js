import GooeyI18n from "./GooeyI18n.js";

/**
 * MessageFormat - ICU MessageFormat parser and formatter.
 *
 * Static utility class (same pattern as GooeyI18n). Parses ICU message syntax
 * into an AST, then evaluates the AST with provided values and locale.
 *
 * Supports:
 * - Simple argument interpolation: {name}
 * - Plural: {count, plural, =0 {none} one {# item} other {# items}}
 * - Select: {gender, select, male {He} female {She} other {They}}
 * - Selectordinal: {pos, selectordinal, one {#st} two {#nd} few {#rd} other {#th}}
 * - Rich text tags: <bold>text</bold>
 * - Nested references: $t(key)
 * - Inline date/number: {val, date, short} / {val, number, currency}
 * - Escape sequences: '' for literal apostrophe, '{escaped}'
 * - Octothorpe # in plural/selectordinal branches
 *
 * @example
 * MessageFormat.format('{count, plural, one {# item} other {# items}}', { count: 5 }, 'en', {});
 * // "5 items"
 */
export default class MessageFormat {

    // ── Cache ────────────────────────────────────────────────────────────

    /** @type {Map<string, Array>} Message string to parsed AST cache */
    static _astCache = new Map();

    // ── Public API ───────────────────────────────────────────────────────

    /**
     * Parse an ICU message string into an AST (array of nodes).
     * Results are cached by the raw message string.
     *
     * @param {string} message - ICU message string
     * @returns {Array} Parsed AST nodes
     */
    static parse(message) {
        const cached = this._astCache.get(message);
        if (cached) return cached;

        try {
            const parser = new Parser(message);
            const ast = parser.parseMessage(false, false);
            this._astCache.set(message, ast);
            return ast;
        } catch (e) {
            console.warn("MessageFormat parse error:", e.message, "in:", message);
            const fallback = [{ type: "text", value: message }];
            this._astCache.set(message, fallback);
            return fallback;
        }
    }

    /**
     * Parse and evaluate an ICU message string.
     *
     * @param {string} message - ICU message string
     * @param {Object} values - Interpolation values
     * @param {string} locale - BCP 47 locale for plural rules
     * @param {Object} [options={}] - Format options
     * @param {boolean} [options.escapeValue] - Whether to HTML-escape interpolated values
     * @param {boolean} [options.ignoreTag] - If true, treat tags as literal text
     * @param {Object} [options.defaultRichTextElements] - Default tag handler functions
     * @returns {string} Formatted string
     */
    static format(message, values, locale, options = {}) {
        const ast = this.parse(message);
        const ctx = new EvalContext(values || {}, locale, options, null);
        return ctx.evaluate(ast);
    }

    /**
     * Compile a message into a reusable formatting function.
     *
     * @param {string} message - ICU message string
     * @returns {function(Object, string, Object): string} Compiled formatter
     */
    static compile(message) {
        const ast = this.parse(message);
        return (values, locale, options = {}) => {
            const ctx = new EvalContext(values || {}, locale, options, null);
            return ctx.evaluate(ast);
        };
    }

    /**
     * Clear the AST cache.
     */
    static clearCache() {
        this._astCache.clear();
    }
}


// ── Parser ───────────────────────────────────────────────────────────────

/**
 * Recursive descent parser for ICU MessageFormat syntax.
 * @private
 */
class Parser {

    /**
     * @param {string} message - Raw ICU message string
     */
    constructor(message) {
        this._msg = message;
        this._pos = 0;
        this._len = message.length;
    }

    /**
     * Parse the message (or a sub-message within braces).
     *
     * @param {boolean} inPlural - Whether we are inside a plural/selectordinal branch
     * @param {boolean} ignoreTag - Whether to treat tags as literal text
     * @returns {Array} AST nodes
     */
    parseMessage(inPlural, ignoreTag) {
        const nodes = [];
        let textStart = this._pos;

        while (this._pos < this._len) {
            const ch = this._msg[this._pos];

            // End of sub-message in branch
            if (ch === "}") {
                break;
            }

            // Escape sequences (ICU apostrophe quoting)
            if (ch === "'") {
                // Flush preceding text
                if (this._pos > textStart) {
                    nodes.push({ type: "text", value: this._msg.slice(textStart, this._pos) });
                }

                const escaped = this._parseEscape();
                nodes.push({ type: "text", value: escaped });
                textStart = this._pos;
                continue;
            }

            // Argument or ICU construct
            if (ch === "{") {
                // Flush preceding text
                if (this._pos > textStart) {
                    nodes.push({ type: "text", value: this._msg.slice(textStart, this._pos) });
                }

                nodes.push(this._parseArgument(inPlural, ignoreTag));
                textStart = this._pos;
                continue;
            }

            // Octothorpe inside plural/selectordinal
            if (ch === "#" && inPlural) {
                if (this._pos > textStart) {
                    nodes.push({ type: "text", value: this._msg.slice(textStart, this._pos) });
                }
                nodes.push({ type: "octothorpe" });
                this._pos++;
                textStart = this._pos;
                continue;
            }

            // Rich text tags
            if (ch === "<" && !ignoreTag) {
                // Check for closing tag
                if (this._pos + 1 < this._len && this._msg[this._pos + 1] === "/") {
                    // Closing tag -- stop; the tag opener will handle matching
                    break;
                }

                // Check if this looks like an opening tag (letter after <)
                if (this._pos + 1 < this._len && /[a-zA-Z]/.test(this._msg[this._pos + 1])) {
                    if (this._pos > textStart) {
                        nodes.push({ type: "text", value: this._msg.slice(textStart, this._pos) });
                    }
                    nodes.push(this._parseTag(inPlural));
                    textStart = this._pos;
                    continue;
                }
            }

            // Nested reference $t(key)
            if (ch === "$" && this._pos + 2 < this._len &&
                this._msg[this._pos + 1] === "t" && this._msg[this._pos + 2] === "(") {
                if (this._pos > textStart) {
                    nodes.push({ type: "text", value: this._msg.slice(textStart, this._pos) });
                }
                nodes.push(this._parseNesting());
                textStart = this._pos;
                continue;
            }

            this._pos++;
        }

        // Flush remaining text
        if (this._pos > textStart) {
            nodes.push({ type: "text", value: this._msg.slice(textStart, this._pos) });
        }

        return nodes;
    }

    /**
     * Parse an ICU apostrophe escape sequence.
     * @returns {string} The unescaped literal text
     * @private
     */
    _parseEscape() {
        this._pos++; // skip opening apostrophe

        // Doubled apostrophe '' => literal apostrophe
        if (this._pos < this._len && this._msg[this._pos] === "'") {
            this._pos++;
            return "'";
        }

        // Apostrophe before special char starts quoted section
        const nextCh = this._pos < this._len ? this._msg[this._pos] : "";
        if ("{}<>#".includes(nextCh)) {
            // Quoted section until next unescaped apostrophe or end
            let result = "";
            while (this._pos < this._len) {
                const c = this._msg[this._pos];
                if (c === "'") {
                    this._pos++;
                    // Check for doubled apostrophe inside quoted section
                    if (this._pos < this._len && this._msg[this._pos] === "'") {
                        result += "'";
                        this._pos++;
                    } else {
                        // End of quoted section
                        break;
                    }
                } else {
                    result += c;
                    this._pos++;
                }
            }
            return result;
        }

        // Apostrophe not before special char -- literal apostrophe
        return "'";
    }

    /**
     * Parse an argument: {name}, {name, type}, or {name, type, style/branches}.
     * @param {boolean} inPlural
     * @param {boolean} ignoreTag
     * @returns {Object} AST node
     * @private
     */
    _parseArgument(inPlural, ignoreTag) {
        this._pos++; // skip opening {
        this._skipWhitespace();

        // Read argument name
        const name = this._readIdentifier();
        this._skipWhitespace();

        const ch = this._msg[this._pos];

        // Simple argument {name}
        if (ch === "}") {
            this._pos++;
            return { type: "argument", name };
        }

        // Typed argument {name, type, ...}
        if (ch === ",") {
            this._pos++; // skip comma
            this._skipWhitespace();
            const argType = this._readIdentifier().toLowerCase();
            this._skipWhitespace();

            switch (argType) {
                case "plural":
                    return this._parseBranches(name, "plural", inPlural, ignoreTag);
                case "select":
                    return this._parseBranches(name, "select", inPlural, ignoreTag);
                case "selectordinal":
                    return this._parseBranches(name, "selectordinal", inPlural, ignoreTag);
                case "date":
                    return this._parseStyleArg(name, "dateArg");
                case "number":
                    return this._parseStyleArg(name, "numberArg");
                default:
                    // Unknown type -- treat as simple argument
                    this._skipToClosingBrace();
                    return { type: "argument", name };
            }
        }

        // Unexpected character -- skip to closing brace
        this._skipToClosingBrace();
        return { type: "argument", name };
    }

    /**
     * Parse plural/select/selectordinal branches.
     * @param {string} name - Argument name
     * @param {string} nodeType - "plural", "select", or "selectordinal"
     * @param {boolean} parentInPlural
     * @param {boolean} ignoreTag
     * @returns {Object} AST node
     * @private
     */
    _parseBranches(name, nodeType, parentInPlural, ignoreTag) {
        // Expect comma before branches
        if (this._msg[this._pos] === ",") {
            this._pos++;
        }
        this._skipWhitespace();

        const branches = {};
        const branchInPlural = nodeType === "plural" || nodeType === "selectordinal";

        while (this._pos < this._len && this._msg[this._pos] !== "}") {
            this._skipWhitespace();
            if (this._pos >= this._len || this._msg[this._pos] === "}") break;

            // Read branch key (e.g., "=0", "one", "other", "male")
            const key = this._readBranchKey();
            this._skipWhitespace();

            // Expect opening brace for branch content
            if (this._msg[this._pos] === "{") {
                this._pos++; // skip {
                const content = this.parseMessage(branchInPlural, ignoreTag);
                // Skip closing }
                if (this._pos < this._len && this._msg[this._pos] === "}") {
                    this._pos++;
                }
                branches[key] = content;
            }

            this._skipWhitespace();
        }

        // Skip closing } of the whole construct
        if (this._pos < this._len && this._msg[this._pos] === "}") {
            this._pos++;
        }

        return { type: nodeType, name, branches };
    }

    /**
     * Parse an inline date or number argument style.
     * @param {string} name - Argument name
     * @param {string} nodeType - "dateArg" or "numberArg"
     * @returns {Object} AST node
     * @private
     */
    _parseStyleArg(name, nodeType) {
        let style = null;

        if (this._msg[this._pos] === ",") {
            this._pos++; // skip comma
            this._skipWhitespace();
            // Read style name until closing brace
            const start = this._pos;
            while (this._pos < this._len && this._msg[this._pos] !== "}") {
                this._pos++;
            }
            style = this._msg.slice(start, this._pos).trim() || null;
        }

        // Skip closing }
        if (this._pos < this._len && this._msg[this._pos] === "}") {
            this._pos++;
        }

        return { type: nodeType, name, style };
    }

    /**
     * Parse a rich text tag: <tagName>content</tagName>
     * @param {boolean} inPlural
     * @returns {Object} AST node
     * @private
     */
    _parseTag(inPlural) {
        this._pos++; // skip <

        // Read tag name
        const tagName = this._readTagName();

        // Skip to closing >
        while (this._pos < this._len && this._msg[this._pos] !== ">") {
            this._pos++;
        }
        if (this._pos < this._len) this._pos++; // skip >

        // Parse content until closing tag
        const content = this.parseMessage(inPlural, false);

        // Expect </tagName>
        if (this._pos < this._len && this._msg[this._pos] === "<" &&
            this._pos + 1 < this._len && this._msg[this._pos + 1] === "/") {
            this._pos += 2; // skip </
            // Skip tag name and >
            while (this._pos < this._len && this._msg[this._pos] !== ">") {
                this._pos++;
            }
            if (this._pos < this._len) this._pos++; // skip >
        }

        return { type: "tag", name: tagName, children: content };
    }

    /**
     * Parse a nested reference: $t(key)
     * @returns {Object} AST node
     * @private
     */
    _parseNesting() {
        this._pos += 3; // skip $t(

        const start = this._pos;
        while (this._pos < this._len && this._msg[this._pos] !== ")") {
            this._pos++;
        }
        const key = this._msg.slice(start, this._pos).trim();

        if (this._pos < this._len) this._pos++; // skip )

        return { type: "nesting", key };
    }

    /**
     * Read an identifier (argument name or type keyword).
     * @returns {string}
     * @private
     */
    _readIdentifier() {
        const start = this._pos;
        while (this._pos < this._len && /[\w]/.test(this._msg[this._pos])) {
            this._pos++;
        }
        return this._msg.slice(start, this._pos);
    }

    /**
     * Read a branch key (e.g., "=0", "one", "other", "male").
     * @returns {string}
     * @private
     */
    _readBranchKey() {
        const start = this._pos;
        while (this._pos < this._len &&
               this._msg[this._pos] !== "{" &&
               this._msg[this._pos] !== "}" &&
               this._msg[this._pos] !== " " &&
               this._msg[this._pos] !== "\t" &&
               this._msg[this._pos] !== "\n" &&
               this._msg[this._pos] !== "\r") {
            this._pos++;
        }
        return this._msg.slice(start, this._pos).trim();
    }

    /**
     * Read a tag name.
     * @returns {string}
     * @private
     */
    _readTagName() {
        const start = this._pos;
        while (this._pos < this._len && /[a-zA-Z0-9_-]/.test(this._msg[this._pos])) {
            this._pos++;
        }
        return this._msg.slice(start, this._pos);
    }

    /**
     * Skip whitespace characters.
     * @private
     */
    _skipWhitespace() {
        while (this._pos < this._len && /\s/.test(this._msg[this._pos])) {
            this._pos++;
        }
    }

    /**
     * Skip to the next closing brace (handling nested braces).
     * @private
     */
    _skipToClosingBrace() {
        let depth = 1;
        while (this._pos < this._len && depth > 0) {
            if (this._msg[this._pos] === "{") depth++;
            else if (this._msg[this._pos] === "}") depth--;
            if (depth > 0) this._pos++;
        }
        if (this._pos < this._len) this._pos++; // skip final }
    }
}


// ── Evaluator ────────────────────────────────────────────────────────────

/**
 * Evaluation context for walking an AST and producing formatted output.
 * @private
 */
class EvalContext {

    /**
     * @param {Object} values - Interpolation values
     * @param {string} locale - BCP 47 locale
     * @param {Object} options - Format options
     * @param {number|null} pluralCount - Current plural count (for # replacement)
     */
    constructor(values, locale, options, pluralCount) {
        this._values = values;
        this._locale = locale;
        this._options = options;
        this._pluralCount = pluralCount;
    }

    /**
     * Evaluate an array of AST nodes to a string.
     * @param {Array} nodes - AST nodes
     * @returns {string}
     */
    evaluate(nodes) {
        let result = "";
        for (const node of nodes) {
            result += this._evalNode(node);
        }
        return result;
    }

    /**
     * Evaluate a single AST node.
     * @param {Object} node
     * @returns {string}
     * @private
     */
    _evalNode(node) {
        switch (node.type) {
            case "text":
                return node.value;

            case "argument":
                return this._evalArgument(node);

            case "plural":
                return this._evalPlural(node);

            case "select":
                return this._evalSelect(node);

            case "selectordinal":
                return this._evalSelectOrdinal(node);

            case "octothorpe":
                return this._pluralCount !== null ? String(this._pluralCount) : "#";

            case "tag":
                return this._evalTag(node);

            case "nesting":
                return this._evalNesting(node, 0);

            case "dateArg":
                return this._evalDateArg(node);

            case "numberArg":
                return this._evalNumberArg(node);

            default:
                return "";
        }
    }

    /**
     * Evaluate a simple argument node.
     * @param {Object} node
     * @returns {string}
     * @private
     */
    _evalArgument(node) {
        const val = this._values[node.name];
        if (val === undefined || val === null) return "{" + node.name + "}";

        const str = String(val);

        // Determine whether to escape
        const shouldEscape = this._values.escapeValue !== false &&
            GooeyI18n._options.escapeParameterHtml !== false;

        return shouldEscape ? this._escapeHtml(str) : str;
    }

    /**
     * Evaluate a plural node.
     * @param {Object} node
     * @returns {string}
     * @private
     */
    _evalPlural(node) {
        const count = Number(this._values[node.name]) || 0;
        const branches = node.branches;

        // Check exact match first
        const exactKey = "=" + count;
        let branch = branches[exactKey];

        if (!branch) {
            // Use Intl.PluralRules
            const rules = GooeyI18n._getOrCreateFormatter(
                GooeyI18n._formatterCache.plural,
                Intl.PluralRules,
                this._locale,
                {}
            );
            const category = rules.select(count);
            branch = branches[category] || branches["other"];
        }

        if (!branch) return "";

        // Evaluate branch with plural count context
        const ctx = new EvalContext(this._values, this._locale, this._options, count);
        return ctx.evaluate(branch);
    }

    /**
     * Evaluate a select node.
     * @param {Object} node
     * @returns {string}
     * @private
     */
    _evalSelect(node) {
        const val = String(this._values[node.name] ?? "");
        const branches = node.branches;
        const branch = branches[val] || branches["other"];

        if (!branch) return "";

        const ctx = new EvalContext(this._values, this._locale, this._options, this._pluralCount);
        return ctx.evaluate(branch);
    }

    /**
     * Evaluate a selectordinal node.
     * @param {Object} node
     * @returns {string}
     * @private
     */
    _evalSelectOrdinal(node) {
        const count = Number(this._values[node.name]) || 0;
        const branches = node.branches;

        // Check exact match first
        const exactKey = "=" + count;
        let branch = branches[exactKey];

        if (!branch) {
            // Use ordinal PluralRules
            const ordinalOpts = { type: "ordinal" };
            const rules = GooeyI18n._getOrCreateFormatter(
                GooeyI18n._formatterCache.plural,
                Intl.PluralRules,
                this._locale,
                ordinalOpts
            );
            const category = rules.select(count);
            branch = branches[category] || branches["other"];
        }

        if (!branch) return "";

        const ctx = new EvalContext(this._values, this._locale, this._options, count);
        return ctx.evaluate(branch);
    }

    /**
     * Evaluate a rich text tag node.
     * @param {Object} node
     * @returns {string}
     * @private
     */
    _evalTag(node) {
        // Evaluate children to string
        const ctx = new EvalContext(this._values, this._locale, this._options, this._pluralCount);
        const childContent = ctx.evaluate(node.children);

        // Look up tag handler
        const handler = this._values[node.name] ||
            (this._options.defaultRichTextElements && this._options.defaultRichTextElements[node.name]);

        if (typeof handler === "function") {
            return handler(childContent);
        }

        // No handler -- return children as-is
        return childContent;
    }

    /**
     * Evaluate a nested reference node.
     * @param {Object} node
     * @param {number} depth - Current nesting depth
     * @returns {string}
     * @private
     */
    _evalNesting(node, depth) {
        if (depth >= 10) {
            console.warn("MessageFormat: max nesting depth (10) reached for key:", node.key);
            return "$t(" + node.key + ")";
        }
        return GooeyI18n.t(node.key);
    }

    /**
     * Evaluate an inline date argument.
     * @param {Object} node
     * @returns {string}
     * @private
     */
    _evalDateArg(node) {
        const val = this._values[node.name];
        if (val === undefined || val === null) return "";
        return GooeyI18n.d(val, node.style, { locale: this._locale });
    }

    /**
     * Evaluate an inline number argument.
     * @param {Object} node
     * @returns {string}
     * @private
     */
    _evalNumberArg(node) {
        const val = this._values[node.name];
        if (val === undefined || val === null) return "";
        return GooeyI18n.n(val, node.style, { locale: this._locale });
    }

    /**
     * Escape HTML special characters.
     * @param {string} str
     * @returns {string}
     * @private
     */
    _escapeHtml(str) {
        return str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;")
            .replace(/`/g, "&#96;");
    }
}
