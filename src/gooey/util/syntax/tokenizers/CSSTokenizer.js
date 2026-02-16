import Tokenizer from '../Tokenizer.js';
import TokenType from '../TokenType.js';

/**
 * CSSTokenizer - Tokenizes CSS source code.
 *
 * Token type mapping for CSS constructs:
 *   KEYWORD     - at-rules (@media, @keyframes, @import, etc.)
 *   TAG_NAME    - selectors (element names, .class, #id, ::pseudo)
 *   ATTR_NAME   - property names (color, display, background, etc.)
 *   ATTR_VALUE  - property values (after colon, before semicolon)
 *   STRING      - quoted strings ("...", '...')
 *   NUMBER      - numeric values with optional units (10px, 1.5em, #fff)
 *   COMMENT     - block comments
 *   PUNCTUATION - delimiters ({, }, ;, :, (, ), etc.)
 *   OPERATOR    - combinators (>, +, ~)
 *   TEXT        - whitespace and other content
 */
export default class CSSTokenizer extends Tokenizer {

    static AT_RULES = new Set([
        '@charset', '@import', '@namespace', '@media', '@supports', '@document',
        '@page', '@font-face', '@keyframes', '@counter-style', '@layer',
        '@property', '@container', '@scope', '@starting-style'
    ]);

    constructor(language) {
        super(language || "css");
    }

    /**
     * Tokenize CSS source code.
     * Uses a state machine to distinguish selectors from property declarations.
     * @param {string} code - Raw CSS source
     * @returns {Array<{type: string, value: string}>}
     */
    tokenize(code) {
        const tokens = [];
        let pos = 0;
        const len = code.length;

        // State: 'selector' (outside braces) or 'block' (inside braces)
        let state = 'selector';
        // Sub-state within block: 'property' or 'value'
        let blockState = 'property';

        while (pos < len) {
            const ch = code[pos];

            // Whitespace
            if (/\s/.test(ch)) {
                const wsMatch = code.slice(pos).match(/^\s+/);
                tokens.push({ type: TokenType.TEXT, value: wsMatch[0] });
                pos += wsMatch[0].length;
                continue;
            }

            // Comment: /* ... */
            if (ch === '/' && pos + 1 < len && code[pos + 1] === '*') {
                const end = code.indexOf('*/', pos + 2);
                const closePos = end === -1 ? len : end + 2;
                tokens.push({ type: TokenType.COMMENT, value: code.slice(pos, closePos) });
                pos = closePos;
                continue;
            }

            // String literals
            if (ch === '"' || ch === "'") {
                pos = this._tokenizeString(code, pos, ch, tokens);
                continue;
            }

            // At-rules
            if (ch === '@') {
                const atMatch = code.slice(pos).match(/^@[a-zA-Z][\w-]*/);
                if (atMatch) {
                    tokens.push({ type: TokenType.KEYWORD, value: atMatch[0] });
                    pos += atMatch[0].length;
                    continue;
                }
                tokens.push({ type: TokenType.TEXT, value: ch });
                pos++;
                continue;
            }

            // Opening brace - transition to block state
            if (ch === '{') {
                tokens.push({ type: TokenType.PUNCTUATION, value: ch });
                pos++;
                state = 'block';
                blockState = 'property';
                continue;
            }

            // Closing brace - transition back to selector state
            if (ch === '}') {
                tokens.push({ type: TokenType.PUNCTUATION, value: ch });
                pos++;
                state = 'selector';
                continue;
            }

            // Inside a declaration block
            if (state === 'block') {
                // Colon - transition from property to value
                if (ch === ':' && blockState === 'property') {
                    tokens.push({ type: TokenType.PUNCTUATION, value: ch });
                    pos++;
                    blockState = 'value';
                    continue;
                }

                // Semicolon - transition back to property
                if (ch === ';') {
                    tokens.push({ type: TokenType.PUNCTUATION, value: ch });
                    pos++;
                    blockState = 'property';
                    continue;
                }

                if (blockState === 'property') {
                    pos = this._tokenizeProperty(code, pos, tokens);
                    continue;
                }

                if (blockState === 'value') {
                    pos = this._tokenizeValue(code, pos, tokens);
                    continue;
                }
            }

            // Selector context
            if (state === 'selector') {
                pos = this._tokenizeSelector(code, pos, tokens);
                continue;
            }

            // Fallback
            tokens.push({ type: TokenType.TEXT, value: ch });
            pos++;
        }

        return tokens;
    }

    /**
     * Tokenize a CSS selector fragment.
     * @param {string} code - Full source
     * @param {number} pos - Current position
     * @param {Array} tokens - Token array
     * @returns {number} New position
     * @private
     */
    _tokenizeSelector(code, pos, tokens) {
        const ch = code[pos];

        // Combinators
        if (ch === '>' || ch === '+' || ch === '~') {
            tokens.push({ type: TokenType.OPERATOR, value: ch });
            return pos + 1;
        }

        // Parentheses (for pseudo-class functions like :nth-child())
        if (ch === '(' || ch === ')') {
            tokens.push({ type: TokenType.PUNCTUATION, value: ch });
            return pos + 1;
        }

        // Comma
        if (ch === ',') {
            tokens.push({ type: TokenType.PUNCTUATION, value: ch });
            return pos + 1;
        }

        // Semicolon (for @import and similar)
        if (ch === ';') {
            tokens.push({ type: TokenType.PUNCTUATION, value: ch });
            return pos + 1;
        }

        // Selector text: element names, .class, #id, ::pseudo, [attr], *
        const selMatch = code.slice(pos).match(
            /^(?:::?[\w-]+(?:\([^)]*\))?|\.[\w-]+|#[\w-]+|\[[\w-]+(?:[~|^$*]?=(?:"[^"]*"|'[^']*'|[\w-]+))?\]|\*|[\w-]+)/
        );
        if (selMatch) {
            tokens.push({ type: TokenType.TAG_NAME, value: selMatch[0] });
            return pos + selMatch[0].length;
        }

        // Any other character
        tokens.push({ type: TokenType.TEXT, value: ch });
        return pos + 1;
    }

    /**
     * Tokenize a CSS property name.
     * @param {string} code - Full source
     * @param {number} pos - Current position
     * @param {Array} tokens - Token array
     * @returns {number} New position
     * @private
     */
    _tokenizeProperty(code, pos, tokens) {
        const ch = code[pos];

        // Custom properties (--var-name)
        const customPropMatch = code.slice(pos).match(/^--[\w-]+/);
        if (customPropMatch) {
            tokens.push({ type: TokenType.ATTR_NAME, value: customPropMatch[0] });
            return pos + customPropMatch[0].length;
        }

        // Standard property name
        const propMatch = code.slice(pos).match(/^[a-zA-Z-][\w-]*/);
        if (propMatch) {
            tokens.push({ type: TokenType.ATTR_NAME, value: propMatch[0] });
            return pos + propMatch[0].length;
        }

        // Any other character
        tokens.push({ type: TokenType.TEXT, value: ch });
        return pos + 1;
    }

    /**
     * Tokenize a CSS property value.
     * @param {string} code - Full source
     * @param {number} pos - Current position
     * @param {Array} tokens - Token array
     * @returns {number} New position
     * @private
     */
    _tokenizeValue(code, pos, tokens) {
        const ch = code[pos];
        const len = code.length;

        // String literals
        if (ch === '"' || ch === "'") {
            return this._tokenizeString(code, pos, ch, tokens);
        }

        // Comment within value
        if (ch === '/' && pos + 1 < len && code[pos + 1] === '*') {
            const end = code.indexOf('*/', pos + 2);
            const closePos = end === -1 ? len : end + 2;
            tokens.push({ type: TokenType.COMMENT, value: code.slice(pos, closePos) });
            return closePos;
        }

        // Color hex value: #fff or #ffffff or #ffffffaa
        if (ch === '#') {
            const hexMatch = code.slice(pos).match(/^#[0-9a-fA-F]{3,8}/);
            if (hexMatch) {
                tokens.push({ type: TokenType.NUMBER, value: hexMatch[0] });
                return pos + hexMatch[0].length;
            }
        }

        // Numbers with optional units
        if (/[0-9.]/.test(ch)) {
            const numMatch = code.slice(pos).match(
                /^-?(?:[0-9]+\.?[0-9]*|\.[0-9]+)(?:[eE][+-]?[0-9]+)?(?:%|[a-zA-Z]+)?/
            );
            if (numMatch && numMatch[0]) {
                tokens.push({ type: TokenType.NUMBER, value: numMatch[0] });
                return pos + numMatch[0].length;
            }
        }

        // Parentheses (for functions like rgb(), calc())
        if (ch === '(' || ch === ')') {
            tokens.push({ type: TokenType.PUNCTUATION, value: ch });
            return pos + 1;
        }

        // Comma (for value lists)
        if (ch === ',') {
            tokens.push({ type: TokenType.PUNCTUATION, value: ch });
            return pos + 1;
        }

        // !important
        if (ch === '!' && code.slice(pos, pos + 10).toLowerCase() === '!important') {
            tokens.push({ type: TokenType.KEYWORD, value: code.slice(pos, pos + 10) });
            return pos + 10;
        }

        // var() references and function names
        const funcMatch = code.slice(pos).match(/^[\w-]+(?=\()/);
        if (funcMatch) {
            tokens.push({ type: TokenType.KEYWORD, value: funcMatch[0] });
            return pos + funcMatch[0].length;
        }

        // Value words (color names, keywords like auto, inherit, etc.)
        const wordMatch = code.slice(pos).match(/^[\w-]+/);
        if (wordMatch) {
            tokens.push({ type: TokenType.ATTR_VALUE, value: wordMatch[0] });
            return pos + wordMatch[0].length;
        }

        // Operators in values (/ for shorthand like border, font)
        if (ch === '/') {
            tokens.push({ type: TokenType.OPERATOR, value: ch });
            return pos + 1;
        }

        // Negative sign before number
        if (ch === '-' && pos + 1 < len && /[0-9.]/.test(code[pos + 1])) {
            const numMatch = code.slice(pos).match(
                /^-(?:[0-9]+\.?[0-9]*|\.[0-9]+)(?:[eE][+-]?[0-9]+)?(?:%|[a-zA-Z]+)?/
            );
            if (numMatch) {
                tokens.push({ type: TokenType.NUMBER, value: numMatch[0] });
                return pos + numMatch[0].length;
            }
        }

        // Any other character
        tokens.push({ type: TokenType.TEXT, value: ch });
        return pos + 1;
    }

    /**
     * Tokenize a quoted string.
     * @param {string} code - Full source
     * @param {number} pos - Position of opening quote
     * @param {string} quote - The quote character (' or ")
     * @param {Array} tokens - Token array
     * @returns {number} New position after the string
     * @private
     */
    _tokenizeString(code, pos, quote, tokens) {
        let i = pos + 1;
        const len = code.length;

        while (i < len) {
            if (code[i] === '\\') {
                i += 2;
                continue;
            }
            if (code[i] === quote) {
                i++;
                break;
            }
            if (code[i] === '\n') break;
            i++;
        }

        tokens.push({ type: TokenType.STRING, value: code.slice(pos, i) });
        return i;
    }
}
