import Tokenizer from '../Tokenizer.js';
import TokenType from '../TokenType.js';

/**
 * JavaScriptTokenizer - Tokenizes JavaScript/TypeScript source code.
 *
 * Produces tokens of these types:
 *   KEYWORD     - reserved words (function, const, if, return, etc.)
 *   STRING      - string literals ("...", '...', `...` template literals)
 *   NUMBER      - numeric literals (42, 3.14, 0xff, 0b101, 1_000)
 *   COMMENT     - single-line (//) and multi-line comments
 *   OPERATOR    - operators (+, -, ===, =>, etc.)
 *   PUNCTUATION - delimiters ({, }, (, ), [, ], ;, ,)
 *   TEXT        - identifiers, whitespace, and other content
 */
export default class JavaScriptTokenizer extends Tokenizer {

    static KEYWORDS = new Set([
        'abstract', 'arguments', 'async', 'await', 'break', 'case', 'catch',
        'class', 'const', 'continue', 'debugger', 'default', 'delete', 'do',
        'else', 'enum', 'export', 'extends', 'false', 'finally', 'for',
        'from', 'function', 'get', 'if', 'implements', 'import', 'in',
        'instanceof', 'interface', 'let', 'new', 'null', 'of', 'package',
        'private', 'protected', 'public', 'return', 'set', 'static', 'super',
        'switch', 'this', 'throw', 'true', 'try', 'typeof', 'undefined',
        'var', 'void', 'while', 'with', 'yield'
    ]);

    // Tokens after which '/' starts a regex, not division
    static REGEX_PREV_TOKENS = new Set([
        TokenType.OPERATOR, TokenType.KEYWORD
    ]);

    static REGEX_PREV_PUNCTUATION = new Set([
        '(', '[', '{', ',', ';', ':', '?', '!', '~'
    ]);

    constructor(language) {
        super(language || "javascript");
    }

    /**
     * Tokenize JavaScript source code.
     * @param {string} code - Raw JavaScript source
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

            // Single-line comment
            if (ch === '/' && pos + 1 < len && code[pos + 1] === '/') {
                const end = code.indexOf('\n', pos);
                const closePos = end === -1 ? len : end;
                tokens.push({ type: TokenType.COMMENT, value: code.slice(pos, closePos) });
                pos = closePos;
                continue;
            }

            // Multi-line comment
            if (ch === '/' && pos + 1 < len && code[pos + 1] === '*') {
                const end = code.indexOf('*/', pos + 2);
                const closePos = end === -1 ? len : end + 2;
                tokens.push({ type: TokenType.COMMENT, value: code.slice(pos, closePos) });
                pos = closePos;
                continue;
            }

            // Regex literal (context-sensitive: '/' after operator/keyword/punctuation)
            if (ch === '/' && this._canStartRegex(tokens)) {
                const result = this._tokenizeRegex(code, pos);
                if (result) {
                    tokens.push({ type: TokenType.STRING, value: result.value });
                    pos = result.end;
                    continue;
                }
            }

            // String literals
            if (ch === '"' || ch === "'") {
                pos = this._tokenizeString(code, pos, ch, tokens);
                continue;
            }

            // Template literal
            if (ch === '`') {
                pos = this._tokenizeTemplateLiteral(code, pos, tokens);
                continue;
            }

            // Numbers
            if (/[0-9]/.test(ch) || (ch === '.' && pos + 1 < len && /[0-9]/.test(code[pos + 1]))) {
                const numMatch = code.slice(pos).match(
                    /^(?:0[xX][0-9a-fA-F][0-9a-fA-F_]*|0[bB][01][01_]*|0[oO][0-7][0-7_]*|(?:[0-9][0-9_]*\.?[0-9_]*|\.[0-9][0-9_]*)(?:[eE][+-]?[0-9_]+)?)n?/
                );
                if (numMatch && numMatch[0]) {
                    tokens.push({ type: TokenType.NUMBER, value: numMatch[0] });
                    pos += numMatch[0].length;
                    continue;
                }
            }

            // Identifiers and keywords
            if (/[a-zA-Z_$]/.test(ch)) {
                const idMatch = code.slice(pos).match(/^[a-zA-Z_$][\w$]*/);
                if (idMatch) {
                    const word = idMatch[0];
                    const type = JavaScriptTokenizer.KEYWORDS.has(word)
                        ? TokenType.KEYWORD
                        : TokenType.TEXT;
                    tokens.push({ type, value: word });
                    pos += word.length;
                    continue;
                }
            }

            // Multi-character operators (ordered longest-first)
            const op3 = code.slice(pos, pos + 3);
            if (op3 === '>>>' || op3 === '===' || op3 === '!==' || op3 === '**=' ||
                op3 === '<<=' || op3 === '>>=' || op3 === '&&=' || op3 === '||=' ||
                op3 === '??=') {
                tokens.push({ type: TokenType.OPERATOR, value: op3 });
                pos += 3;
                continue;
            }

            const op2 = code.slice(pos, pos + 2);
            if (op2 === '=>' || op2 === '==' || op2 === '!=' || op2 === '<=' ||
                op2 === '>=' || op2 === '&&' || op2 === '||' || op2 === '??' ||
                op2 === '?.' || op2 === '+=' || op2 === '-=' || op2 === '*=' ||
                op2 === '/=' || op2 === '%=' || op2 === '**' || op2 === '++' ||
                op2 === '--' || op2 === '<<' || op2 === '>>' || op2 === '&=' ||
                op2 === '|=' || op2 === '^=') {
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

            // Division operator (fallback for '/' not caught above)
            if (ch === '/') {
                tokens.push({ type: TokenType.OPERATOR, value: ch });
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
     * Determine if '/' at current position can start a regex literal
     * based on the previous non-whitespace token.
     * @param {Array} tokens - Tokens emitted so far
     * @returns {boolean}
     * @private
     */
    _canStartRegex(tokens) {
        // Find the last non-whitespace token
        for (let i = tokens.length - 1; i >= 0; i--) {
            if (tokens[i].type === TokenType.TEXT && /^\s+$/.test(tokens[i].value)) {
                continue;
            }
            const prev = tokens[i];
            if (JavaScriptTokenizer.REGEX_PREV_TOKENS.has(prev.type)) {
                return true;
            }
            if (prev.type === TokenType.PUNCTUATION &&
                JavaScriptTokenizer.REGEX_PREV_PUNCTUATION.has(prev.value)) {
                return true;
            }
            return false;
        }
        // Start of input - '/' is regex
        return true;
    }

    /**
     * Attempt to tokenize a regex literal starting at pos.
     * @param {string} code - Full source
     * @param {number} pos - Position of opening '/'
     * @returns {{value: string, end: number}|null}
     * @private
     */
    _tokenizeRegex(code, pos) {
        let i = pos + 1;
        const len = code.length;
        let inCharClass = false;

        while (i < len) {
            const ch = code[i];
            if (ch === '\n') return null; // Regex can't span lines
            if (ch === '\\') {
                i += 2; // Skip escaped character
                continue;
            }
            if (ch === '[') {
                inCharClass = true;
                i++;
                continue;
            }
            if (ch === ']') {
                inCharClass = false;
                i++;
                continue;
            }
            if (ch === '/' && !inCharClass) {
                i++; // Past closing '/'
                // Consume flags
                while (i < len && /[gimsuy]/.test(code[i])) {
                    i++;
                }
                return { value: code.slice(pos, i), end: i };
            }
            i++;
        }
        return null;
    }

    /**
     * Tokenize a single or double-quoted string.
     * @param {string} code - Full source
     * @param {number} pos - Position of opening quote
     * @param {string} quote - The quote character (' or ")
     * @param {Array} tokens - Token array to append to
     * @returns {number} New position after the string
     * @private
     */
    _tokenizeString(code, pos, quote, tokens) {
        let i = pos + 1;
        const len = code.length;

        while (i < len) {
            if (code[i] === '\\') {
                i += 2; // Skip escape sequence
                continue;
            }
            if (code[i] === quote) {
                i++; // Past closing quote
                break;
            }
            if (code[i] === '\n') break; // Unterminated string
            i++;
        }

        tokens.push({ type: TokenType.STRING, value: code.slice(pos, i) });
        return i;
    }

    /**
     * Tokenize a template literal (backtick string).
     * Template expressions ${...} are tokenized recursively.
     * @param {string} code - Full source
     * @param {number} pos - Position of opening backtick
     * @param {Array} tokens - Token array to append to
     * @returns {number} New position after the template literal
     * @private
     */
    _tokenizeTemplateLiteral(code, pos, tokens) {
        let i = pos + 1;
        const len = code.length;
        let textStart = pos;

        while (i < len) {
            if (code[i] === '\\') {
                i += 2; // Skip escape sequence
                continue;
            }

            // Template expression ${...}
            if (code[i] === '$' && i + 1 < len && code[i + 1] === '{') {
                // Emit the template text up to ${
                tokens.push({ type: TokenType.STRING, value: code.slice(textStart, i) });
                // Emit ${ as punctuation
                tokens.push({ type: TokenType.PUNCTUATION, value: '${' });
                i += 2;

                // Tokenize the expression inside the braces
                let braceDepth = 1;
                const exprStart = i;
                while (i < len && braceDepth > 0) {
                    if (code[i] === '{') braceDepth++;
                    else if (code[i] === '}') braceDepth--;
                    if (braceDepth > 0) i++;
                }

                // Recursively tokenize the expression content
                const exprCode = code.slice(exprStart, i);
                const exprTokens = this.tokenize(exprCode);
                tokens.push(...exprTokens);

                // Emit closing }
                if (i < len && code[i] === '}') {
                    tokens.push({ type: TokenType.PUNCTUATION, value: '}' });
                    i++;
                }
                textStart = i;
                continue;
            }

            // Closing backtick
            if (code[i] === '`') {
                i++; // Past closing backtick
                tokens.push({ type: TokenType.STRING, value: code.slice(textStart, i) });
                return i;
            }

            i++;
        }

        // Unterminated template literal
        tokens.push({ type: TokenType.STRING, value: code.slice(textStart, i) });
        return i;
    }
}
