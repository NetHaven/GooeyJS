import Tokenizer from '../Tokenizer.js';
import TokenType from '../TokenType.js';

/**
 * HTMLTokenizer - Tokenizes HTML/XML source code.
 *
 * Produces tokens of these types:
 *   DOCTYPE    - <!DOCTYPE ...>
 *   COMMENT    - <!-- ... -->
 *   TAG_NAME   - element names (div, span, etc.)
 *   ATTR_NAME  - attribute names (class, id, etc.)
 *   ATTR_VALUE - attribute values including quotes
 *   PUNCTUATION - <, >, />, =, etc.
 *   ENTITY     - &amp; &lt; &#123; etc.
 *   TEXT       - plain text content between tags
 */
export default class HTMLTokenizer extends Tokenizer {

    constructor(language) {
        super(language || "html");
    }

    /**
     * Tokenize HTML source code.
     * @param {string} code - Raw HTML source
     * @returns {Array<{type: string, value: string}>}
     */
    tokenize(code) {
        const tokens = [];
        let pos = 0;
        const len = code.length;

        while (pos < len) {
            // Comment: <!-- ... -->
            if (code.startsWith('<!--', pos)) {
                const end = code.indexOf('-->', pos + 4);
                const closePos = end === -1 ? len : end + 3;
                tokens.push({ type: TokenType.COMMENT, value: code.slice(pos, closePos) });
                pos = closePos;
                continue;
            }

            // DOCTYPE: <!DOCTYPE ...>
            if (code.slice(pos, pos + 9).toUpperCase() === '<!DOCTYPE') {
                const end = code.indexOf('>', pos);
                const closePos = end === -1 ? len : end + 1;
                tokens.push({ type: TokenType.DOCTYPE, value: code.slice(pos, closePos) });
                pos = closePos;
                continue;
            }

            // CDATA: <![CDATA[ ... ]]>
            if (code.startsWith('<![CDATA[', pos)) {
                const end = code.indexOf(']]>', pos + 9);
                const closePos = end === -1 ? len : end + 3;
                tokens.push({ type: TokenType.COMMENT, value: code.slice(pos, closePos) });
                pos = closePos;
                continue;
            }

            // Tag (opening, closing, or self-closing)
            if (code[pos] === '<' && pos + 1 < len && code[pos + 1] !== '!') {
                pos = this._tokenizeTag(code, pos, tokens);
                continue;
            }

            // Entity: &...;
            if (code[pos] === '&') {
                const entityMatch = code.slice(pos).match(/^&(?:#x[0-9a-fA-F]+|#[0-9]+|[a-zA-Z]+);/);
                if (entityMatch) {
                    tokens.push({ type: TokenType.ENTITY, value: entityMatch[0] });
                    pos += entityMatch[0].length;
                    continue;
                }
            }

            // Plain text - accumulate until next < or &
            const textEnd = this._findNextSpecial(code, pos + 1);
            tokens.push({ type: TokenType.TEXT, value: code.slice(pos, textEnd) });
            pos = textEnd;
        }

        return tokens;
    }

    /**
     * Tokenize a single HTML tag starting at the '<' character.
     * Produces PUNCTUATION, TAG_NAME, ATTR_NAME, ATTR_VALUE tokens.
     * @param {string} code - Full source code
     * @param {number} pos - Position of the '<' character
     * @param {Array} tokens - Token array to append to
     * @returns {number} New position after the tag
     * @private
     */
    _tokenizeTag(code, pos, tokens) {
        const len = code.length;

        // Opening < or </
        if (code[pos + 1] === '/') {
            tokens.push({ type: TokenType.PUNCTUATION, value: '</' });
            pos += 2;
        } else {
            tokens.push({ type: TokenType.PUNCTUATION, value: '<' });
            pos += 1;
        }

        // Skip whitespace
        pos = this._skipWhitespace(code, pos, tokens);

        // Tag name
        const tagNameMatch = code.slice(pos).match(/^[a-zA-Z][a-zA-Z0-9\-]*/);
        if (tagNameMatch) {
            tokens.push({ type: TokenType.TAG_NAME, value: tagNameMatch[0] });
            pos += tagNameMatch[0].length;
        }

        // Attributes and closing
        while (pos < len) {
            // Skip whitespace
            pos = this._skipWhitespace(code, pos, tokens);

            if (pos >= len) break;

            // Self-closing />
            if (code.startsWith('/>', pos)) {
                tokens.push({ type: TokenType.PUNCTUATION, value: '/>' });
                pos += 2;
                break;
            }

            // Closing >
            if (code[pos] === '>') {
                tokens.push({ type: TokenType.PUNCTUATION, value: '>' });
                pos += 1;
                break;
            }

            // Attribute name
            const attrNameMatch = code.slice(pos).match(/^[a-zA-Z_:][\w:.\-]*/);
            if (attrNameMatch) {
                tokens.push({ type: TokenType.ATTR_NAME, value: attrNameMatch[0] });
                pos += attrNameMatch[0].length;

                // Skip whitespace
                pos = this._skipWhitespace(code, pos, tokens);

                // = sign
                if (pos < len && code[pos] === '=') {
                    tokens.push({ type: TokenType.PUNCTUATION, value: '=' });
                    pos += 1;

                    // Skip whitespace
                    pos = this._skipWhitespace(code, pos, tokens);

                    // Attribute value
                    if (pos < len) {
                        if (code[pos] === '"') {
                            const end = code.indexOf('"', pos + 1);
                            const closePos = end === -1 ? len : end + 1;
                            tokens.push({ type: TokenType.ATTR_VALUE, value: code.slice(pos, closePos) });
                            pos = closePos;
                        } else if (code[pos] === "'") {
                            const end = code.indexOf("'", pos + 1);
                            const closePos = end === -1 ? len : end + 1;
                            tokens.push({ type: TokenType.ATTR_VALUE, value: code.slice(pos, closePos) });
                            pos = closePos;
                        } else {
                            // Unquoted attribute value
                            const unquotedMatch = code.slice(pos).match(/^[^\s>'"=`]+/);
                            if (unquotedMatch) {
                                tokens.push({ type: TokenType.ATTR_VALUE, value: unquotedMatch[0] });
                                pos += unquotedMatch[0].length;
                            }
                        }
                    }
                }
                continue;
            }

            // Unknown character inside tag - consume to avoid infinite loop
            tokens.push({ type: TokenType.TEXT, value: code[pos] });
            pos += 1;
        }

        return pos;
    }

    /**
     * Skip whitespace characters, emitting them as TEXT tokens to preserve formatting.
     * @param {string} code - Full source code
     * @param {number} pos - Current position
     * @param {Array} tokens - Token array to append to
     * @returns {number} New position after whitespace
     * @private
     */
    _skipWhitespace(code, pos, tokens) {
        const wsMatch = code.slice(pos).match(/^\s+/);
        if (wsMatch) {
            tokens.push({ type: TokenType.TEXT, value: wsMatch[0] });
            pos += wsMatch[0].length;
        }
        return pos;
    }

    /**
     * Find the next position of < or & starting from pos.
     * @param {string} code - Full source code
     * @param {number} pos - Position to start searching from
     * @returns {number} Position of next special char, or end of string
     * @private
     */
    _findNextSpecial(code, pos) {
        const len = code.length;
        while (pos < len) {
            if (code[pos] === '<' || code[pos] === '&') return pos;
            pos++;
        }
        return len;
    }
}
