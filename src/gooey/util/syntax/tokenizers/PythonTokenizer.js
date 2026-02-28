import Tokenizer from '../Tokenizer.js';
import TokenType from '../TokenType.js';

/**
 * PythonTokenizer - Tokenizes Python source code.
 *
 * Produces tokens of these types:
 *   KEYWORD     - reserved words (def, class, import, if, for, while, etc.)
 *   STRING      - string literals ('...', "...", '''...''', """...""", f-strings, r-strings, b-strings)
 *   NUMBER      - numeric literals (42, 3.14, 0xff, 0b101, 1_000, 1j)
 *   COMMENT     - single-line comments (#)
 *   OPERATOR    - operators (+, -, **, //, ->, etc.)
 *   PUNCTUATION - delimiters ({, }, (, ), [, ], ;, ,, .)
 *   ENTITY      - @decorators and built-in function names
 *   TEXT        - identifiers, whitespace, and other content
 */
export default class PythonTokenizer extends Tokenizer {

    static KEYWORDS = new Set([
        'False', 'None', 'True', 'and', 'as', 'assert', 'async', 'await',
        'break', 'class', 'continue', 'def', 'del', 'elif', 'else', 'except',
        'finally', 'for', 'from', 'global', 'if', 'import', 'in', 'is',
        'lambda', 'nonlocal', 'not', 'or', 'pass', 'raise', 'return', 'try',
        'while', 'with', 'yield'
    ]);

    static BUILTINS = new Set([
        'print', 'len', 'range', 'type', 'int', 'float', 'str', 'list',
        'dict', 'tuple', 'set', 'bool', 'input', 'open', 'map', 'filter',
        'zip', 'enumerate', 'sorted', 'reversed', 'abs', 'max', 'min', 'sum',
        'any', 'all', 'isinstance', 'issubclass', 'hasattr', 'getattr',
        'setattr', 'super', 'property', 'classmethod', 'staticmethod',
        'ValueError', 'TypeError', 'KeyError', 'IndexError', 'AttributeError',
        'Exception', 'RuntimeError', 'StopIteration', 'NotImplementedError',
        'FileNotFoundError', 'ImportError', 'OSError'
    ]);

    // String prefix characters (case-insensitive combinations)
    static STRING_PREFIXES = new Set([
        'f', 'r', 'b', 'u', 'fr', 'rf', 'br', 'rb', 'F', 'R', 'B', 'U',
        'Fr', 'fR', 'FR', 'Rf', 'rF', 'RF', 'Br', 'bR', 'BR', 'Rb', 'rB', 'RB'
    ]);

    constructor(language) {
        super(language || "python");
    }

    /**
     * Tokenize Python source code.
     * @param {string} code - Raw Python source
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

            // Comment: # to end of line
            if (ch === '#') {
                const end = code.indexOf('\n', pos);
                const closePos = end === -1 ? len : end;
                tokens.push({ type: TokenType.COMMENT, value: code.slice(pos, closePos) });
                pos = closePos;
                continue;
            }

            // Decorator: @ at start of line (after optional whitespace)
            if (ch === '@' && this._isDecoratorContext(code, pos)) {
                const decMatch = code.slice(pos).match(/^@[a-zA-Z_]\w*(?:\.[a-zA-Z_]\w*)*/);
                if (decMatch) {
                    tokens.push({ type: TokenType.ENTITY, value: decMatch[0] });
                    pos += decMatch[0].length;
                    continue;
                }
            }

            // String literals (including prefixed strings: f, r, b, u, fr, rf, br, rb)
            if (this._isStringStart(code, pos)) {
                const strResult = this._tokenizePythonString(code, pos);
                tokens.push({ type: TokenType.STRING, value: strResult.value });
                pos = strResult.end;
                continue;
            }

            // Plain strings (no prefix)
            if (ch === '"' || ch === "'") {
                const strResult = this._tokenizeQuotedString(code, pos, ch);
                tokens.push({ type: TokenType.STRING, value: strResult.value });
                pos = strResult.end;
                continue;
            }

            // Numbers (including complex: 1j)
            if (/[0-9]/.test(ch) || (ch === '.' && pos + 1 < len && /[0-9]/.test(code[pos + 1]))) {
                const numMatch = code.slice(pos).match(
                    /^(?:0[xX][0-9a-fA-F][0-9a-fA-F_]*|0[bB][01][01_]*|0[oO][0-7][0-7_]*|(?:[0-9][0-9_]*\.?[0-9_]*|\.[0-9][0-9_]*)(?:[eE][+-]?[0-9_]+)?)[jJ]?/
                );
                if (numMatch && numMatch[0]) {
                    tokens.push({ type: TokenType.NUMBER, value: numMatch[0] });
                    pos += numMatch[0].length;
                    continue;
                }
            }

            // Identifiers, keywords, and builtins
            if (/[a-zA-Z_]/.test(ch)) {
                const idMatch = code.slice(pos).match(/^[a-zA-Z_]\w*/);
                if (idMatch) {
                    const word = idMatch[0];
                    let type;
                    if (PythonTokenizer.KEYWORDS.has(word)) {
                        type = TokenType.KEYWORD;
                    } else if (PythonTokenizer.BUILTINS.has(word)) {
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
            if (op3 === '**=' || op3 === '//=' || op3 === '<<=' || op3 === '>>=') {
                tokens.push({ type: TokenType.OPERATOR, value: op3 });
                pos += 3;
                continue;
            }

            // Two-character operators
            const op2 = code.slice(pos, pos + 2);
            if (op2 === '**' || op2 === '//' || op2 === '==' || op2 === '!=' ||
                op2 === '<=' || op2 === '>=' || op2 === '+=' || op2 === '-=' ||
                op2 === '*=' || op2 === '/=' || op2 === '%=' || op2 === '&=' ||
                op2 === '|=' || op2 === '^=' || op2 === '->' || op2 === '<<' ||
                op2 === '>>') {
                tokens.push({ type: TokenType.OPERATOR, value: op2 });
                pos += 2;
                continue;
            }

            // Single-character operators
            if ('+-*/%=<>!&|^~:@'.includes(ch)) {
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
     * Check if @ is in decorator context (start of line after optional whitespace).
     * @param {string} code - Full source
     * @param {number} pos - Position of @
     * @returns {boolean}
     * @private
     */
    _isDecoratorContext(code, pos) {
        if (pos === 0) return true;
        // Walk backwards to see if only whitespace since last newline
        for (let i = pos - 1; i >= 0; i--) {
            if (code[i] === '\n') return true;
            if (code[i] !== ' ' && code[i] !== '\t') return false;
        }
        return true; // Start of file
    }

    /**
     * Check if current position starts a prefixed string literal.
     * @param {string} code - Full source
     * @param {number} pos - Current position
     * @returns {boolean}
     * @private
     */
    _isStringStart(code, pos) {
        const ch = code[pos];
        if (!'fFrRbBuU'.includes(ch)) return false;

        // Check 2-char prefix first
        if (pos + 2 < code.length) {
            const prefix2 = code.slice(pos, pos + 2);
            if (PythonTokenizer.STRING_PREFIXES.has(prefix2)) {
                const afterPrefix = code[pos + 2];
                if (afterPrefix === '"' || afterPrefix === "'") return true;
            }
        }

        // Check 1-char prefix
        if (pos + 1 < code.length) {
            const afterPrefix = code[pos + 1];
            if (afterPrefix === '"' || afterPrefix === "'") return true;
        }

        return false;
    }

    /**
     * Tokenize a prefixed Python string (f"...", r'...', b"...", etc.)
     * @param {string} code - Full source
     * @param {number} pos - Position of string prefix
     * @returns {{value: string, end: number}}
     * @private
     */
    _tokenizePythonString(code, pos) {
        // Determine prefix length
        let prefixLen = 1;
        const ch2 = code.slice(pos, pos + 2);
        if (PythonTokenizer.STRING_PREFIXES.has(ch2) &&
            pos + 2 < code.length &&
            (code[pos + 2] === '"' || code[pos + 2] === "'")) {
            prefixLen = 2;
        }

        const quotePos = pos + prefixLen;
        const quote = code[quotePos];

        const result = this._tokenizeQuotedString(code, quotePos, quote);
        return {
            value: code.slice(pos, result.end),
            end: result.end
        };
    }

    /**
     * Tokenize a quoted string (single, double, triple-quoted).
     * @param {string} code - Full source
     * @param {number} pos - Position of opening quote
     * @param {string} quote - The quote character (' or ")
     * @returns {{value: string, end: number}}
     * @private
     */
    _tokenizeQuotedString(code, pos, quote) {
        const len = code.length;

        // Check for triple-quoted string
        if (pos + 2 < len && code[pos + 1] === quote && code[pos + 2] === quote) {
            const tripleQuote = quote + quote + quote;
            let i = pos + 3;
            while (i < len) {
                if (code[i] === '\\') {
                    i += 2;
                    continue;
                }
                if (code.slice(i, i + 3) === tripleQuote) {
                    i += 3;
                    return { value: code.slice(pos, i), end: i };
                }
                i++;
            }
            // Unterminated triple-quoted string
            return { value: code.slice(pos), end: len };
        }

        // Single-quoted string (single line)
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
