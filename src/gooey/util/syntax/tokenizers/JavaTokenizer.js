import Tokenizer from '../Tokenizer.js';
import TokenType from '../TokenType.js';

/**
 * JavaTokenizer - Tokenizes Java source code.
 *
 * Produces tokens of these types:
 *   KEYWORD     - reserved words (public, class, static, void, if, for, etc.)
 *   STRING      - string literals ("...", text blocks \"""...\""", char literals '.')
 *   NUMBER      - numeric literals (42, 3.14, 0xff, 0b101, 1_000, L/f/d suffixes)
 *   COMMENT     - line comments (//), block comments (/* ... *​/), javadoc (/** ... *​/)
 *   OPERATOR    - operators (+, -, ->, ::, ==, >>>, etc.)
 *   PUNCTUATION - delimiters ({, }, (, ), [, ], ;, ,, .)
 *   ENTITY      - types, annotations (@Override), boolean/null literals
 *   TEXT        - identifiers, whitespace, and other content
 */
export default class JavaTokenizer extends Tokenizer {

    static KEYWORDS = new Set([
        'abstract', 'assert', 'break', 'case', 'catch', 'class', 'const',
        'continue', 'default', 'do', 'else', 'enum', 'extends', 'final',
        'finally', 'for', 'goto', 'if', 'implements', 'import', 'instanceof',
        'interface', 'native', 'new', 'package', 'private', 'protected',
        'public', 'return', 'static', 'strictfp', 'super', 'switch',
        'synchronized', 'this', 'throw', 'throws', 'transient', 'try',
        'volatile', 'while', 'var', 'yield', 'record', 'sealed', 'permits',
        'non-sealed'
    ]);

    static TYPES = new Set([
        'boolean', 'byte', 'char', 'short', 'int', 'long', 'float', 'double',
        'void', 'String', 'Integer', 'Long', 'Float', 'Double', 'Boolean',
        'Character', 'Byte', 'Short', 'Object', 'Class', 'System', 'Math',
        'Arrays', 'Collections', 'List', 'Map', 'Set', 'ArrayList', 'HashMap',
        'HashSet', 'true', 'false', 'null'
    ]);

    constructor(language) {
        super(language || "java");
    }

    /**
     * Tokenize Java source code.
     * @param {string} code - Raw Java source
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

            // Block comments and Javadoc
            if (ch === '/' && pos + 1 < len && code[pos + 1] === '*') {
                const result = this._tokenizeBlockComment(code, pos);
                tokens.push({ type: TokenType.COMMENT, value: result.value });
                pos = result.end;
                continue;
            }

            // Annotations: @identifier
            if (ch === '@' && pos + 1 < len && /[a-zA-Z_]/.test(code[pos + 1])) {
                const annMatch = code.slice(pos).match(/^@[a-zA-Z_]\w*(?:\.[a-zA-Z_]\w*)*/);
                if (annMatch) {
                    tokens.push({ type: TokenType.ENTITY, value: annMatch[0] });
                    pos += annMatch[0].length;
                    continue;
                }
            }

            // Text blocks (triple double-quote)
            if (ch === '"' && pos + 2 < len && code[pos + 1] === '"' && code[pos + 2] === '"') {
                const result = this._tokenizeTextBlock(code, pos);
                tokens.push({ type: TokenType.STRING, value: result.value });
                pos = result.end;
                continue;
            }

            // String literals
            if (ch === '"') {
                const result = this._tokenizeString(code, pos, '"');
                tokens.push({ type: TokenType.STRING, value: result.value });
                pos = result.end;
                continue;
            }

            // Char literals
            if (ch === "'") {
                const result = this._tokenizeString(code, pos, "'");
                tokens.push({ type: TokenType.STRING, value: result.value });
                pos = result.end;
                continue;
            }

            // Numbers
            if (/[0-9]/.test(ch) || (ch === '.' && pos + 1 < len && /[0-9]/.test(code[pos + 1]))) {
                const numMatch = code.slice(pos).match(
                    /^(?:0[xX][0-9a-fA-F][0-9a-fA-F_]*|0[bB][01][01_]*|0[0-7][0-7_]*|(?:[0-9][0-9_]*\.?[0-9_]*|\.[0-9][0-9_]*)(?:[eE][+-]?[0-9_]+)?)[lLfFdD]?/
                );
                if (numMatch && numMatch[0]) {
                    tokens.push({ type: TokenType.NUMBER, value: numMatch[0] });
                    pos += numMatch[0].length;
                    continue;
                }
            }

            // Identifiers, keywords, and types (including non-sealed)
            if (/[a-zA-Z_]/.test(ch)) {
                // Special case: non-sealed keyword
                if (code.slice(pos, pos + 10) === 'non-sealed' && (pos + 10 >= len || !/\w/.test(code[pos + 10]))) {
                    tokens.push({ type: TokenType.KEYWORD, value: 'non-sealed' });
                    pos += 10;
                    continue;
                }

                const idMatch = code.slice(pos).match(/^[a-zA-Z_]\w*/);
                if (idMatch) {
                    const word = idMatch[0];
                    let type;
                    if (JavaTokenizer.KEYWORDS.has(word)) {
                        type = TokenType.KEYWORD;
                    } else if (JavaTokenizer.TYPES.has(word)) {
                        type = TokenType.ENTITY;
                    } else {
                        type = TokenType.TEXT;
                    }
                    tokens.push({ type, value: word });
                    pos += word.length;
                    continue;
                }
            }

            // Four-character operators
            const op4 = code.slice(pos, pos + 4);
            if (op4 === '>>>=') {
                tokens.push({ type: TokenType.OPERATOR, value: op4 });
                pos += 4;
                continue;
            }

            // Three-character operators
            const op3 = code.slice(pos, pos + 3);
            if (op3 === '>>>' || op3 === '<<=' || op3 === '>>=') {
                tokens.push({ type: TokenType.OPERATOR, value: op3 });
                pos += 3;
                continue;
            }

            // Two-character operators
            const op2 = code.slice(pos, pos + 2);
            if (op2 === '->' || op2 === '::' || op2 === '&&' || op2 === '||' ||
                op2 === '==' || op2 === '!=' || op2 === '<=' || op2 === '>=' ||
                op2 === '<<' || op2 === '>>' || op2 === '+=' || op2 === '-=' ||
                op2 === '*=' || op2 === '/=' || op2 === '%=' || op2 === '&=' ||
                op2 === '|=' || op2 === '^=' || op2 === '++' || op2 === '--') {
                tokens.push({ type: TokenType.OPERATOR, value: op2 });
                pos += 2;
                continue;
            }

            // Single-character operators
            if ('+-*/%=<>!&|^~?:'.includes(ch)) {
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
     * Tokenize a block comment (or javadoc).
     * Java does not support nested block comments.
     * @param {string} code - Full source
     * @param {number} pos - Position of opening /​*
     * @returns {{value: string, end: number}}
     * @private
     */
    _tokenizeBlockComment(code, pos) {
        const len = code.length;
        let i = pos + 2;

        while (i < len) {
            if (code[i] === '*' && i + 1 < len && code[i + 1] === '/') {
                return { value: code.slice(pos, i + 2), end: i + 2 };
            }
            i++;
        }

        // Unterminated block comment
        return { value: code.slice(pos), end: len };
    }

    /**
     * Tokenize a text block (triple double-quote """).
     * @param {string} code - Full source
     * @param {number} pos - Position of opening """
     * @returns {{value: string, end: number}}
     * @private
     */
    _tokenizeTextBlock(code, pos) {
        const len = code.length;
        let i = pos + 3;

        while (i < len) {
            if (code[i] === '\\') {
                i += 2;
                continue;
            }
            if (code[i] === '"' && i + 2 < len && code[i + 1] === '"' && code[i + 2] === '"') {
                return { value: code.slice(pos, i + 3), end: i + 3 };
            }
            i++;
        }

        // Unterminated text block
        return { value: code.slice(pos), end: len };
    }

    /**
     * Tokenize a quoted string or char literal with escape handling.
     * @param {string} code - Full source
     * @param {number} pos - Position of opening quote
     * @param {string} quote - The quote character (' or ")
     * @returns {{value: string, end: number}}
     * @private
     */
    _tokenizeString(code, pos, quote) {
        const len = code.length;
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
}
