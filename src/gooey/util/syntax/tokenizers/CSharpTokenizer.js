import Tokenizer from '../Tokenizer.js';
import TokenType from '../TokenType.js';

/**
 * CSharpTokenizer - Tokenizes C# source code.
 *
 * Produces tokens of these types:
 *   KEYWORD     - reserved words, contextual keywords, and LINQ keywords
 *   STRING      - string literals ("...", @"...", $"...", char literals '.')
 *   NUMBER      - numeric literals (42, 3.14, 0xff, 0b101, 1_000, suffixes)
 *   COMMENT     - line comments (//), block comments, XML doc comments (///)
 *   OPERATOR    - operators (=>, ??, ?., ::, ->, etc.)
 *   PUNCTUATION - delimiters ({, }, (, ), [, ], ;, ,, .)
 *   ENTITY      - types, preprocessor directives (#region, #if, etc.)
 *   TEXT        - identifiers, whitespace, and other content
 */
export default class CSharpTokenizer extends Tokenizer {

    static KEYWORDS = new Set([
        'abstract', 'as', 'base', 'bool', 'break', 'byte', 'case', 'catch',
        'char', 'checked', 'class', 'const', 'continue', 'decimal', 'default',
        'delegate', 'do', 'double', 'else', 'enum', 'event', 'explicit',
        'extern', 'false', 'finally', 'fixed', 'float', 'for', 'foreach',
        'goto', 'if', 'implicit', 'in', 'int', 'interface', 'internal', 'is',
        'lock', 'long', 'namespace', 'new', 'null', 'object', 'operator',
        'out', 'override', 'params', 'private', 'protected', 'public',
        'readonly', 'ref', 'return', 'sbyte', 'sealed', 'short', 'sizeof',
        'stackalloc', 'static', 'string', 'struct', 'switch', 'this', 'throw',
        'true', 'try', 'typeof', 'uint', 'ulong', 'unchecked', 'unsafe',
        'ushort', 'using', 'virtual', 'void', 'volatile', 'while',
        // Contextual keywords
        'var', 'dynamic', 'async', 'await', 'yield', 'get', 'set', 'init',
        'value', 'partial', 'where', 'when', 'record', 'required', 'file',
        'global', 'scoped', 'nameof', 'not', 'and', 'or', 'with', 'managed',
        'unmanaged',
        // LINQ keywords
        'from', 'select', 'orderby', 'ascending', 'descending', 'group',
        'by', 'into', 'join', 'on', 'equals', 'let'
    ]);

    static TYPES = new Set([
        'String', 'Int32', 'Int64', 'Boolean', 'Double', 'Single', 'Decimal',
        'Char', 'Byte', 'Object', 'Type', 'Console', 'Math', 'Array', 'List',
        'Dictionary', 'HashSet', 'Task', 'Action', 'Func', 'IEnumerable',
        'IList', 'IDictionary', 'IDisposable', 'Exception', 'ArgumentException',
        'InvalidOperationException', 'NotImplementedException', 'Nullable',
        'Guid', 'DateTime', 'TimeSpan', 'Tuple', 'ValueTuple', 'Span',
        'Memory', 'ReadOnlySpan'
    ]);

    static PREPROCESSOR_DIRECTIVES = new Set([
        'region', 'endregion', 'if', 'else', 'endif', 'define', 'undef',
        'pragma', 'nullable'
    ]);

    constructor(language) {
        super(language || "csharp");
    }

    /**
     * Tokenize C# source code.
     * @param {string} code - Raw C# source
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

            // Preprocessor directives: #region, #if, etc.
            if (ch === '#' && this._isLineStart(code, pos)) {
                const dirMatch = code.slice(pos).match(/^#\s*([a-zA-Z]+)/);
                if (dirMatch && CSharpTokenizer.PREPROCESSOR_DIRECTIVES.has(dirMatch[1])) {
                    const end = code.indexOf('\n', pos);
                    const closePos = end === -1 ? len : end;
                    tokens.push({ type: TokenType.ENTITY, value: code.slice(pos, closePos) });
                    pos = closePos;
                    continue;
                }
            }

            // XML doc comments: /// to end of line
            if (ch === '/' && pos + 2 < len && code[pos + 1] === '/' && code[pos + 2] === '/') {
                const end = code.indexOf('\n', pos);
                const closePos = end === -1 ? len : end;
                tokens.push({ type: TokenType.COMMENT, value: code.slice(pos, closePos) });
                pos = closePos;
                continue;
            }

            // Line comments: // to end of line
            if (ch === '/' && pos + 1 < len && code[pos + 1] === '/') {
                const end = code.indexOf('\n', pos);
                const closePos = end === -1 ? len : end;
                tokens.push({ type: TokenType.COMMENT, value: code.slice(pos, closePos) });
                pos = closePos;
                continue;
            }

            // Block comments: /* ... */
            if (ch === '/' && pos + 1 < len && code[pos + 1] === '*') {
                const result = this._tokenizeBlockComment(code, pos);
                tokens.push({ type: TokenType.COMMENT, value: result.value });
                pos = result.end;
                continue;
            }

            // Verbatim string: @"..."
            if (ch === '@' && pos + 1 < len && code[pos + 1] === '"') {
                const result = this._tokenizeVerbatimString(code, pos);
                tokens.push({ type: TokenType.STRING, value: result.value });
                pos = result.end;
                continue;
            }

            // Interpolated verbatim string: $@"..." or @$"..."
            if (((ch === '$' && pos + 1 < len && code[pos + 1] === '@') ||
                 (ch === '@' && pos + 1 < len && code[pos + 1] === '$')) &&
                pos + 2 < len && code[pos + 2] === '"') {
                const result = this._tokenizeVerbatimString(code, pos + 1);
                tokens.push({ type: TokenType.STRING, value: code.slice(pos, result.end) });
                pos = result.end;
                continue;
            }

            // Interpolated string: $"..."
            if (ch === '$' && pos + 1 < len && code[pos + 1] === '"') {
                const result = this._tokenizeRegularString(code, pos + 1);
                tokens.push({ type: TokenType.STRING, value: code.slice(pos, result.end) });
                pos = result.end;
                continue;
            }

            // Regular string: "..."
            if (ch === '"') {
                // Check for raw string literal (triple+ quotes)
                if (pos + 2 < len && code[pos + 1] === '"' && code[pos + 2] === '"') {
                    const result = this._tokenizeRawString(code, pos);
                    tokens.push({ type: TokenType.STRING, value: result.value });
                    pos = result.end;
                    continue;
                }
                const result = this._tokenizeRegularString(code, pos);
                tokens.push({ type: TokenType.STRING, value: result.value });
                pos = result.end;
                continue;
            }

            // Char literal: '.'
            if (ch === "'") {
                const result = this._tokenizeCharLiteral(code, pos);
                tokens.push({ type: TokenType.STRING, value: result.value });
                pos = result.end;
                continue;
            }

            // Numbers
            if (/[0-9]/.test(ch) || (ch === '.' && pos + 1 < len && /[0-9]/.test(code[pos + 1]))) {
                const numMatch = code.slice(pos).match(
                    /^(?:0[xX][0-9a-fA-F][0-9a-fA-F_]*|0[bB][01][01_]*|(?:[0-9][0-9_]*\.?[0-9_]*|\.[0-9][0-9_]*)(?:[eE][+-]?[0-9_]+)?)(?:[uU]?[lL]{0,2}|[fFdDmM])?/
                );
                if (numMatch && numMatch[0]) {
                    tokens.push({ type: TokenType.NUMBER, value: numMatch[0] });
                    pos += numMatch[0].length;
                    continue;
                }
            }

            // Identifiers, keywords, and types
            if (/[a-zA-Z_]/.test(ch)) {
                const idMatch = code.slice(pos).match(/^[a-zA-Z_]\w*/);
                if (idMatch) {
                    const word = idMatch[0];
                    let type;
                    if (CSharpTokenizer.KEYWORDS.has(word)) {
                        type = TokenType.KEYWORD;
                    } else if (CSharpTokenizer.TYPES.has(word)) {
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
            if (op4 === '>>>=' || op4 === '<<=' + code[pos + 3]) {
                // Only >>>=
                if (op4 === '>>>=') {
                    tokens.push({ type: TokenType.OPERATOR, value: op4 });
                    pos += 4;
                    continue;
                }
            }

            // Three-character operators
            const op3 = code.slice(pos, pos + 3);
            if (op3 === '>>>' || op3 === '<<=' || op3 === '>>=' || op3 === '??=') {
                tokens.push({ type: TokenType.OPERATOR, value: op3 });
                pos += 3;
                continue;
            }

            // Two-character operators
            const op2 = code.slice(pos, pos + 2);
            if (op2 === '=>' || op2 === '??' || op2 === '?.' || op2 === '::' ||
                op2 === '->' || op2 === '==' || op2 === '!=' || op2 === '<=' ||
                op2 === '>=' || op2 === '&&' || op2 === '||' || op2 === '<<' ||
                op2 === '>>' || op2 === '+=' || op2 === '-=' || op2 === '*=' ||
                op2 === '/=' || op2 === '%=' || op2 === '&=' || op2 === '|=' ||
                op2 === '^=') {
                tokens.push({ type: TokenType.OPERATOR, value: op2 });
                pos += 2;
                continue;
            }

            // Single-character operators
            if ('+-*/%=<>!&|^~?'.includes(ch)) {
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
     * Check if position is at the start of a line (after optional whitespace).
     * @param {string} code - Full source
     * @param {number} pos - Current position
     * @returns {boolean}
     * @private
     */
    _isLineStart(code, pos) {
        if (pos === 0) return true;
        for (let i = pos - 1; i >= 0; i--) {
            if (code[i] === '\n') return true;
            if (code[i] !== ' ' && code[i] !== '\t') return false;
        }
        return true;
    }

    /**
     * Tokenize a block comment (non-nested in C#).
     * @param {string} code - Full source
     * @param {number} pos - Position of opening /*
     * @returns {{value: string, end: number}}
     * @private
     */
    _tokenizeBlockComment(code, pos) {
        const len = code.length;
        let i = pos + 2;

        while (i < len) {
            if (code[i] === '*' && i + 1 < len && code[i + 1] === '/') {
                i += 2;
                return { value: code.slice(pos, i), end: i };
            }
            i++;
        }

        // Unterminated block comment
        return { value: code.slice(pos), end: len };
    }

    /**
     * Tokenize a verbatim string: @"..." where "" is the escape for ".
     * @param {string} code - Full source
     * @param {number} pos - Position of @
     * @returns {{value: string, end: number}}
     * @private
     */
    _tokenizeVerbatimString(code, pos) {
        const len = code.length;
        let i = pos + 2; // skip @"

        while (i < len) {
            if (code[i] === '"') {
                // "" is escaped quote inside verbatim string
                if (i + 1 < len && code[i + 1] === '"') {
                    i += 2;
                    continue;
                }
                // End of verbatim string
                i++;
                return { value: code.slice(pos, i), end: i };
            }
            i++;
        }

        // Unterminated verbatim string
        return { value: code.slice(pos), end: len };
    }

    /**
     * Tokenize a regular string: "..." with backslash escapes.
     * @param {string} code - Full source
     * @param {number} pos - Position of opening "
     * @returns {{value: string, end: number}}
     * @private
     */
    _tokenizeRegularString(code, pos) {
        const len = code.length;
        let i = pos + 1;

        while (i < len) {
            if (code[i] === '\\') {
                i += 2;
                continue;
            }
            if (code[i] === '"') {
                i++;
                return { value: code.slice(pos, i), end: i };
            }
            if (code[i] === '\n') break; // Unterminated
            i++;
        }

        return { value: code.slice(pos, i), end: i };
    }

    /**
     * Tokenize a raw string literal: """...""" (triple+ quotes).
     * @param {string} code - Full source
     * @param {number} pos - Position of first "
     * @returns {{value: string, end: number}}
     * @private
     */
    _tokenizeRawString(code, pos) {
        const len = code.length;
        let i = pos;

        // Count opening quotes
        let quoteCount = 0;
        while (i < len && code[i] === '"') {
            quoteCount++;
            i++;
        }

        // Find matching closing quotes
        const closePattern = '"'.repeat(quoteCount);
        while (i < len) {
            if (code[i] === '"') {
                let count = 0;
                let j = i;
                while (j < len && code[j] === '"') {
                    count++;
                    j++;
                }
                if (count >= quoteCount) {
                    return { value: code.slice(pos, i + quoteCount), end: i + quoteCount };
                }
                i = j;
                continue;
            }
            i++;
        }

        // Unterminated raw string
        return { value: code.slice(pos), end: len };
    }

    /**
     * Tokenize a char literal: 'x', '\n', '\u0041'.
     * @param {string} code - Full source
     * @param {number} pos - Position of opening '
     * @returns {{value: string, end: number}}
     * @private
     */
    _tokenizeCharLiteral(code, pos) {
        const len = code.length;
        let i = pos + 1;

        if (i < len && code[i] === '\\') {
            // Escaped char
            i += 2;
            // Handle unicode escapes \uXXXX
            if (i - 1 < len && code[i - 1] === 'u') {
                while (i < len && /[0-9a-fA-F]/.test(code[i])) i++;
            }
            if (i < len && code[i] === "'") {
                i++;
                return { value: code.slice(pos, i), end: i };
            }
        } else if (i < len && code[i] !== "'" && i + 1 < len && code[i + 1] === "'") {
            // Simple char: 'x'
            i += 2;
            return { value: code.slice(pos, i), end: i };
        }

        // Not a valid char literal, treat as operator
        return { value: "'", end: pos + 1 };
    }
}
