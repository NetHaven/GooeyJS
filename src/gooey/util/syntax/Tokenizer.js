/**
 * Tokenizer - Abstract base class for syntax highlighting tokenizers.
 *
 * Subclasses must implement:
 *   tokenize(code) -> Token[]
 *
 * A Token is a plain object: { type: string, value: string }
 * where type is a TokenType constant.
 */
export default class Tokenizer {

    /**
     * @param {string} language - The language identifier (e.g. "html", "javascript")
     */
    constructor(language) {
        if (new.target === Tokenizer) {
            throw new Error("Tokenizer is abstract and cannot be instantiated directly.");
        }
        this._language = language;
    }

    /**
     * The language this tokenizer handles.
     * @returns {string}
     */
    get language() {
        return this._language;
    }

    /**
     * Tokenize a string of source code into an array of tokens.
     * Each token is { type: string, value: string }.
     *
     * @param {string} code - Raw source code text
     * @returns {Array<{type: string, value: string}>} Ordered array of tokens
     * @abstract
     */
    tokenize(code) {
        throw new Error("Subclasses must implement tokenize()");
    }

    /**
     * Render an array of tokens into an HTML string of <span> elements.
     * Text tokens are rendered as plain escaped text nodes.
     *
     * @param {Array<{type: string, value: string}>} tokens
     * @returns {string} HTML string safe for innerHTML assignment
     */
    render(tokens) {
        return tokens.map(token => {
            const escaped = Tokenizer.escapeHTML(token.value);
            if (token.type === "text") {
                return escaped;
            }
            return `<span class="syntax-${token.type}">${escaped}</span>`;
        }).join('');
    }

    /**
     * Escape HTML special characters to prevent XSS when rendering tokens.
     * @param {string} str - Raw text
     * @returns {string} Escaped text safe for innerHTML
     */
    static escapeHTML(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
}
