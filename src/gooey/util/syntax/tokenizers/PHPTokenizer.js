import Tokenizer from '../Tokenizer.js';
import TokenType from '../TokenType.js';

/**
 * PHPTokenizer - Tokenizes PHP source code.
 *
 * Produces tokens of these types:
 *   KEYWORD     - reserved words (function, class, echo, if, foreach, etc.)
 *   STRING      - string literals ('...', "...", heredoc, nowdoc)
 *   NUMBER      - numeric literals (42, 3.14, 0xff, 0b101)
 *   COMMENT     - single-line (//, #) and multi-line comments
 *   OPERATOR    - operators (+, -, ===, =>, ->, etc.)
 *   PUNCTUATION - delimiters ({, }, (, ), [, ], ;, ,, @)
 *   DOCTYPE     - PHP open/close tags (<?php, ?>)
 *   ENTITY      - $variables and built-in function names
 *   TEXT        - identifiers, whitespace, and other content
 */
export default class PHPTokenizer extends Tokenizer {

    static KEYWORDS = new Set([
        'abstract', 'and', 'array', 'as', 'break', 'callable', 'case', 'catch',
        'class', 'clone', 'const', 'continue', 'declare', 'default', 'die', 'do',
        'echo', 'else', 'elseif', 'empty', 'enddeclare', 'endfor', 'endforeach',
        'endif', 'endswitch', 'endwhile', 'enum', 'eval', 'exit', 'extends',
        'false', 'final', 'finally', 'fn', 'for', 'foreach', 'function', 'global',
        'goto', 'if', 'implements', 'include', 'include_once', 'instanceof',
        'insteadof', 'interface', 'isset', 'list', 'match', 'namespace', 'new',
        'null', 'or', 'print', 'private', 'protected', 'public', 'readonly',
        'require', 'require_once', 'return', 'static', 'switch', 'this', 'throw',
        'trait', 'true', 'try', 'unset', 'use', 'var', 'while', 'xor', 'yield'
    ]);

    static BUILTINS = new Set([
        'array_push', 'array_pop', 'array_map', 'array_filter', 'array_merge',
        'count', 'strlen', 'strpos', 'str_replace', 'substr', 'implode', 'explode',
        'is_array', 'is_string', 'is_int', 'is_null', 'json_encode', 'json_decode',
        'var_dump', 'print_r', 'sprintf', 'preg_match', 'preg_replace',
        'file_get_contents', 'file_put_contents', 'trim', 'strtolower', 'strtoupper',
        'intval', 'floatval', 'date', 'time', 'sort', 'usort', 'in_array',
        'array_key_exists', 'array_keys', 'array_values', 'header'
    ]);

    constructor(language) {
        super(language || "php");
    }

    /**
     * Tokenize PHP source code.
     * @param {string} code - Raw PHP source
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

            // PHP open tag: <?php or <?=
            if (ch === '<' && code[pos + 1] === '?') {
                if (code.slice(pos, pos + 5) === '<?php') {
                    tokens.push({ type: TokenType.DOCTYPE, value: '<?php' });
                    pos += 5;
                    continue;
                }
                if (code.slice(pos, pos + 3) === '<?=') {
                    tokens.push({ type: TokenType.DOCTYPE, value: '<?=' });
                    pos += 3;
                    continue;
                }
            }

            // PHP close tag: ?>
            if (ch === '?' && pos + 1 < len && code[pos + 1] === '>') {
                tokens.push({ type: TokenType.DOCTYPE, value: '?>' });
                pos += 2;
                continue;
            }

            // Single-line comment: // or #
            if (ch === '/' && pos + 1 < len && code[pos + 1] === '/') {
                const end = code.indexOf('\n', pos);
                const closePos = end === -1 ? len : end;
                tokens.push({ type: TokenType.COMMENT, value: code.slice(pos, closePos) });
                pos = closePos;
                continue;
            }

            if (ch === '#' && !(pos + 1 < len && code[pos + 1] === '[')) {
                // # comment (but not #[ attribute syntax)
                const end = code.indexOf('\n', pos);
                const closePos = end === -1 ? len : end;
                tokens.push({ type: TokenType.COMMENT, value: code.slice(pos, closePos) });
                pos = closePos;
                continue;
            }

            // Multi-line comment: /* */
            if (ch === '/' && pos + 1 < len && code[pos + 1] === '*') {
                const end = code.indexOf('*/', pos + 2);
                const closePos = end === -1 ? len : end + 2;
                tokens.push({ type: TokenType.COMMENT, value: code.slice(pos, closePos) });
                pos = closePos;
                continue;
            }

            // Heredoc and nowdoc: <<<LABEL or <<<'LABEL'
            if (ch === '<' && code.slice(pos, pos + 3) === '<<<') {
                const heredocResult = this._tokenizeHeredoc(code, pos);
                if (heredocResult) {
                    tokens.push({ type: TokenType.STRING, value: heredocResult.value });
                    pos = heredocResult.end;
                    continue;
                }
            }

            // Single-quoted strings
            if (ch === "'") {
                pos = this._tokenizeString(code, pos, "'", tokens, false);
                continue;
            }

            // Double-quoted strings
            if (ch === '"') {
                pos = this._tokenizeString(code, pos, '"', tokens, true);
                continue;
            }

            // Variables: $identifier
            if (ch === '$' && pos + 1 < len && /[a-zA-Z_]/.test(code[pos + 1])) {
                const varMatch = code.slice(pos).match(/^\$[a-zA-Z_]\w*/);
                if (varMatch) {
                    tokens.push({ type: TokenType.ENTITY, value: varMatch[0] });
                    pos += varMatch[0].length;
                    continue;
                }
            }

            // Numbers
            if (/[0-9]/.test(ch) || (ch === '.' && pos + 1 < len && /[0-9]/.test(code[pos + 1]))) {
                const numMatch = code.slice(pos).match(
                    /^(?:0[xX][0-9a-fA-F][0-9a-fA-F_]*|0[bB][01][01_]*|0[oO][0-7][0-7_]*|(?:[0-9][0-9_]*\.?[0-9_]*|\.[0-9][0-9_]*)(?:[eE][+-]?[0-9_]+)?)/
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
                    if (PHPTokenizer.KEYWORDS.has(word.toLowerCase())) {
                        type = TokenType.KEYWORD;
                    } else if (PHPTokenizer.BUILTINS.has(word)) {
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
            if (op3 === '===' || op3 === '!==' || op3 === '<=>' || op3 === '...' ||
                op3 === '??=' || op3 === '.=' + '' || op3 === '<<=' || op3 === '>>=') {
                tokens.push({ type: TokenType.OPERATOR, value: op3 });
                pos += 3;
                continue;
            }

            // Two-character operators
            const op2 = code.slice(pos, pos + 2);
            if (op2 === '==' || op2 === '!=' || op2 === '<=' || op2 === '>=' ||
                op2 === '&&' || op2 === '||' || op2 === '??' || op2 === '**' ||
                op2 === '->' || op2 === '=>' || op2 === '::' || op2 === '++' ||
                op2 === '--' || op2 === '<<' || op2 === '>>' || op2 === '+=' ||
                op2 === '-=' || op2 === '*=' || op2 === '/=' || op2 === '%=' ||
                op2 === '&=' || op2 === '|=' || op2 === '^=' || op2 === '.=') {
                tokens.push({ type: TokenType.OPERATOR, value: op2 });
                pos += 2;
                continue;
            }

            // Single-character operators
            if ('+-*/%=<>!&|^~?:.'.includes(ch)) {
                tokens.push({ type: TokenType.OPERATOR, value: ch });
                pos += 1;
                continue;
            }

            // Punctuation (including @)
            if ('{}()[];,@'.includes(ch)) {
                tokens.push({ type: TokenType.PUNCTUATION, value: ch });
                pos += 1;
                continue;
            }

            // Division operator (fallback for '/')
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
     * Tokenize a single or double-quoted string.
     * @param {string} code - Full source
     * @param {number} pos - Position of opening quote
     * @param {string} quote - The quote character (' or ")
     * @param {Array} tokens - Token array to append to
     * @param {boolean} allowEscapes - Whether to handle all escape sequences
     * @returns {number} New position after the string
     * @private
     */
    _tokenizeString(code, pos, quote, tokens, allowEscapes) {
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
            if (code[i] === '\n' && quote !== '`') break; // Unterminated string
            i++;
        }

        tokens.push({ type: TokenType.STRING, value: code.slice(pos, i) });
        return i;
    }

    /**
     * Tokenize a heredoc or nowdoc string.
     * @param {string} code - Full source
     * @param {number} pos - Position of '<<<'
     * @returns {{value: string, end: number}|null}
     * @private
     */
    _tokenizeHeredoc(code, pos) {
        // Match <<<LABEL or <<<'LABEL'
        const headerMatch = code.slice(pos).match(/^<<<[ \t]*'?([a-zA-Z_]\w*)'?[ \t]*\r?\n/);
        if (!headerMatch) return null;

        const label = headerMatch[1];
        const bodyStart = pos + headerMatch[0].length;

        // Find closing label at start of a line
        const closingPattern = new RegExp(`^[ \\t]*${label}[ \\t]*;?[ \\t]*(?:\\r?\\n|$)`, 'm');
        const bodySlice = code.slice(bodyStart);
        const closeMatch = bodySlice.match(closingPattern);

        if (!closeMatch) {
            // Unterminated heredoc - consume to end
            return { value: code.slice(pos), end: code.length };
        }

        const closeEnd = bodyStart + closeMatch.index + closeMatch[0].length;
        return { value: code.slice(pos, closeEnd), end: closeEnd };
    }
}
