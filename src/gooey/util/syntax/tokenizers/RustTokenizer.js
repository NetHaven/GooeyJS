import Tokenizer from '../Tokenizer.js';
import TokenType from '../TokenType.js';

/**
 * RustTokenizer - Tokenizes Rust source code.
 *
 * Produces tokens of these types:
 *   KEYWORD     - reserved words (fn, let, mut, struct, impl, trait, etc.)
 *   STRING      - string literals ("...", r"...", r#"..."#, b"...", char literals)
 *   NUMBER      - numeric literals (42, 3.14, 0xff, 0b101, 1_000, type suffixes)
 *   COMMENT     - line comments (//) and block comments (/* ... *​/, nested)
 *   OPERATOR    - operators (+, -, ->, =>, ::, .., etc.)
 *   PUNCTUATION - delimiters ({, }, (, ), [, ], ;, ,, .)
 *   ENTITY      - types, lifetimes ('a), macros (name!), attributes (#[...])
 *   TEXT        - identifiers, whitespace, and other content
 */
export default class RustTokenizer extends Tokenizer {

    static KEYWORDS = new Set([
        'fn', 'let', 'mut', 'const', 'static', 'struct', 'enum', 'impl',
        'trait', 'type', 'mod', 'pub', 'crate', 'self', 'super', 'use',
        'as', 'where', 'match', 'if', 'else', 'while', 'loop', 'for',
        'in', 'break', 'continue', 'return', 'async', 'await', 'move',
        'unsafe', 'extern', 'ref', 'dyn', 'box'
    ]);

    static TYPES = new Set([
        'i8', 'i16', 'i32', 'i64', 'i128', 'isize',
        'u8', 'u16', 'u32', 'u64', 'u128', 'usize',
        'f32', 'f64', 'bool', 'char', 'str',
        'String', 'Vec', 'Option', 'Result', 'Box', 'Rc', 'Arc',
        'HashMap', 'HashSet', 'Some', 'None', 'Ok', 'Err', 'Self',
        'true', 'false'
    ]);

    constructor(language) {
        super(language || "rust");
    }

    /**
     * Tokenize Rust source code.
     * @param {string} code - Raw Rust source
     * @returns {Array<{type: string, value: string}>}
     */
    tokenize(code) {
        const tokens = [];
        let pos = 0;
        const len = code.length;

        while (pos < len) {
            const ch = code[pos];

            // Whitespace
            if (/\s/.test(ch)) {
                const wsMatch = code.slice(pos).match(/^\s+/);
                tokens.push({ type: TokenType.TEXT, value: wsMatch[0] });
                pos += wsMatch[0].length;
                continue;
            }

            // Line comments
            if (ch === '/' && pos + 1 < len && code[pos + 1] === '/') {
                const end = code.indexOf('\n', pos);
                const closePos = end === -1 ? len : end;
                tokens.push({ type: TokenType.COMMENT, value: code.slice(pos, closePos) });
                pos = closePos;
                continue;
            }

            // Block comments (with nesting)
            if (ch === '/' && pos + 1 < len && code[pos + 1] === '*') {
                const result = this._tokenizeBlockComment(code, pos);
                tokens.push({ type: TokenType.COMMENT, value: result.value });
                pos = result.end;
                continue;
            }

            // Attributes: #[...] and #![...]
            if (ch === '#' && pos + 1 < len && (code[pos + 1] === '[' || (code[pos + 1] === '!' && pos + 2 < len && code[pos + 2] === '['))) {
                const result = this._tokenizeAttribute(code, pos);
                tokens.push({ type: TokenType.ENTITY, value: result.value });
                pos = result.end;
                continue;
            }

            // Raw strings: r"...", r#"..."#, br"...", b"..."
            if ((ch === 'r' || ch === 'b') && pos + 1 < len) {
                const rawResult = this._tryRawOrByteString(code, pos);
                if (rawResult) {
                    tokens.push({ type: TokenType.STRING, value: rawResult.value });
                    pos = rawResult.end;
                    continue;
                }
            }

            // String literals
            if (ch === '"') {
                const result = this._tokenizeString(code, pos);
                tokens.push({ type: TokenType.STRING, value: result.value });
                pos = result.end;
                continue;
            }

            // Lifetime or char literal: 'a, 'static, 'x'
            if (ch === "'") {
                const result = this._tokenizeLifetimeOrChar(code, pos);
                tokens.push(result.token);
                pos = result.end;
                continue;
            }

            // Numbers
            if (/[0-9]/.test(ch) || (ch === '.' && pos + 1 < len && /[0-9]/.test(code[pos + 1]))) {
                const numMatch = code.slice(pos).match(
                    /^(?:0[xX][0-9a-fA-F][0-9a-fA-F_]*|0[bB][01][01_]*|0[oO][0-7][0-7_]*|(?:[0-9][0-9_]*\.?[0-9_]*|\.[0-9][0-9_]*)(?:[eE][+-]?[0-9_]+)?)(?:u8|u16|u32|u64|u128|usize|i8|i16|i32|i64|i128|isize|f32|f64)?/
                );
                if (numMatch && numMatch[0]) {
                    tokens.push({ type: TokenType.NUMBER, value: numMatch[0] });
                    pos += numMatch[0].length;
                    continue;
                }
            }

            // Identifiers, keywords, types, and macros
            if (/[a-zA-Z_]/.test(ch)) {
                const idMatch = code.slice(pos).match(/^[a-zA-Z_]\w*/);
                if (idMatch) {
                    const word = idMatch[0];
                    const afterWord = pos + word.length;

                    // Macro: word followed by !
                    if (afterWord < len && code[afterWord] === '!') {
                        tokens.push({ type: TokenType.ENTITY, value: word + '!' });
                        pos = afterWord + 1;
                        continue;
                    }

                    let type;
                    if (RustTokenizer.KEYWORDS.has(word)) {
                        type = TokenType.KEYWORD;
                    } else if (RustTokenizer.TYPES.has(word)) {
                        type = TokenType.ENTITY;
                    } else {
                        type = TokenType.TEXT;
                    }
                    tokens.push({ type, value: word });
                    pos += word.length;
                    continue;
                }
            }

            // Three-character operators
            const op3 = code.slice(pos, pos + 3);
            if (op3 === '..=' || op3 === '<<=' || op3 === '>>=') {
                tokens.push({ type: TokenType.OPERATOR, value: op3 });
                pos += 3;
                continue;
            }

            // Two-character operators
            const op2 = code.slice(pos, pos + 2);
            if (op2 === '->' || op2 === '=>' || op2 === '::' || op2 === '..' ||
                op2 === '&&' || op2 === '||' || op2 === '==' || op2 === '!=' ||
                op2 === '<=' || op2 === '>=' || op2 === '<<' || op2 === '>>' ||
                op2 === '+=' || op2 === '-=' || op2 === '*=' || op2 === '/=' ||
                op2 === '%=' || op2 === '&=' || op2 === '|=' || op2 === '^=') {
                tokens.push({ type: TokenType.OPERATOR, value: op2 });
                pos += 2;
                continue;
            }

            // Single-character operators
            if ('+-*/%=<>!&|^~'.includes(ch)) {
                tokens.push({ type: TokenType.OPERATOR, value: ch });
                pos += 1;
                continue;
            }

            // Punctuation
            if ('{}()[];,.'.includes(ch)) {
                tokens.push({ type: TokenType.PUNCTUATION, value: ch });
                pos += 1;
                continue;
            }

            // Any other character
            tokens.push({ type: TokenType.TEXT, value: ch });
            pos += 1;
        }

        return tokens;
    }

    /**
     * Tokenize a nested block comment.
     * @param {string} code - Full source
     * @param {number} pos - Position of opening /​*
     * @returns {{value: string, end: number}}
     * @private
     */
    _tokenizeBlockComment(code, pos) {
        const len = code.length;
        let depth = 1;
        let i = pos + 2;

        while (i < len && depth > 0) {
            if (code[i] === '/' && i + 1 < len && code[i + 1] === '*') {
                depth++;
                i += 2;
            } else if (code[i] === '*' && i + 1 < len && code[i + 1] === '/') {
                depth--;
                i += 2;
            } else {
                i++;
            }
        }

        return { value: code.slice(pos, i), end: i };
    }

    /**
     * Tokenize an attribute: #[...] or #![...]
     * Handles nested brackets.
     * @param {string} code - Full source
     * @param {number} pos - Position of #
     * @returns {{value: string, end: number}}
     * @private
     */
    _tokenizeAttribute(code, pos) {
        const len = code.length;
        let i = pos + 1;

        // Skip optional !
        if (i < len && code[i] === '!') i++;

        // Must have [
        if (i >= len || code[i] !== '[') {
            return { value: '#', end: pos + 1 };
        }

        let depth = 1;
        i++; // skip opening [

        while (i < len && depth > 0) {
            if (code[i] === '[') depth++;
            else if (code[i] === ']') depth--;
            i++;
        }

        return { value: code.slice(pos, i), end: i };
    }

    /**
     * Try to parse a raw string (r"...", r#"..."#) or byte string (b"...", br"...").
     * @param {string} code - Full source
     * @param {number} pos - Position of r or b
     * @returns {{value: string, end: number}|null}
     * @private
     */
    _tryRawOrByteString(code, pos) {
        const len = code.length;
        let i = pos;
        const ch = code[i];

        // b"..." or b'...'
        if (ch === 'b' && i + 1 < len && (code[i + 1] === '"' || code[i + 1] === "'")) {
            const quote = code[i + 1];
            const result = this._tokenizeString(code, i + 1);
            return { value: code.slice(pos, result.end), end: result.end };
        }

        // br"..." or br#"..."#
        if (ch === 'b' && i + 1 < len && code[i + 1] === 'r') {
            i++; // skip b, now on r
        }

        if (code[i] !== 'r') return null;

        i++; // skip r

        // Count # signs
        let hashCount = 0;
        while (i < len && code[i] === '#') {
            hashCount++;
            i++;
        }

        if (i >= len || code[i] !== '"') return null;
        i++; // skip opening "

        // Find closing "###
        const closePattern = '"' + '#'.repeat(hashCount);
        while (i < len) {
            if (code[i] === '"') {
                let hashes = 0;
                let j = i + 1;
                while (j < len && code[j] === '#' && hashes < hashCount) {
                    hashes++;
                    j++;
                }
                if (hashes === hashCount) {
                    return { value: code.slice(pos, j), end: j };
                }
            }
            i++;
        }

        // Unterminated raw string
        return { value: code.slice(pos), end: len };
    }

    /**
     * Tokenize a double-quoted string with escape handling.
     * @param {string} code - Full source
     * @param {number} pos - Position of opening "
     * @returns {{value: string, end: number}}
     * @private
     */
    _tokenizeString(code, pos) {
        const len = code.length;
        const quote = code[pos];
        let i = pos + 1;

        while (i < len) {
            if (code[i] === '\\') {
                i += 2;
                continue;
            }
            if (code[i] === quote) {
                i++;
                return { value: code.slice(pos, i), end: i };
            }
            if (code[i] === '\n') break; // Unterminated
            i++;
        }

        return { value: code.slice(pos, i), end: i };
    }

    /**
     * Tokenize a lifetime ('a, 'static) or char literal ('x', '\n').
     * @param {string} code - Full source
     * @param {number} pos - Position of opening '
     * @returns {{token: {type: string, value: string}, end: number}}
     * @private
     */
    _tokenizeLifetimeOrChar(code, pos) {
        const len = code.length;

        // Check for char literal: 'x' or '\n' or '\''
        if (pos + 2 < len) {
            // Escaped char: '\x'
            if (code[pos + 1] === '\\') {
                let i = pos + 2;
                // Skip escape sequence
                if (i < len) i++;
                // Handle unicode escapes \u{...}
                if (code[pos + 2] === 'u' && i < len && code[i] === '{') {
                    while (i < len && code[i] !== '}') i++;
                    if (i < len) i++; // skip }
                }
                if (i < len && code[i] === "'") {
                    i++;
                    return { token: { type: TokenType.STRING, value: code.slice(pos, i) }, end: i };
                }
            }

            // Simple char: 'x'
            if (code[pos + 2] === "'" && code[pos + 1] !== "'") {
                return { token: { type: TokenType.STRING, value: code.slice(pos, pos + 3) }, end: pos + 3 };
            }
        }

        // Lifetime: 'a, 'static, 'b
        if (pos + 1 < len && /[a-zA-Z_]/.test(code[pos + 1])) {
            const match = code.slice(pos).match(/^'[a-zA-Z_]\w*/);
            if (match) {
                return { token: { type: TokenType.ENTITY, value: match[0] }, end: pos + match[0].length };
            }
        }

        // Bare single quote (unusual)
        return { token: { type: TokenType.OPERATOR, value: "'" }, end: pos + 1 };
    }
}
