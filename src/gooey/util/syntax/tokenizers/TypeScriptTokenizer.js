import JavaScriptTokenizer from './JavaScriptTokenizer.js';
import TokenType from '../TokenType.js';

/**
 * TypeScriptTokenizer - Tokenizes TypeScript source code.
 *
 * Extends JavaScriptTokenizer with TypeScript-specific keyword recognition.
 * Inherits all JS tokenization (strings, template literals, regex, operators)
 * and adds recognition of TypeScript type system keywords.
 *
 * Additional keywords recognized:
 *   type, interface, enum, namespace, declare, readonly, keyof, infer,
 *   never, unknown, any, is, asserts, as, satisfies, override, accessor
 *
 * Generic angle brackets (<Type>) are already handled as OPERATOR by the
 * parent JavaScriptTokenizer.
 */
export default class TypeScriptTokenizer extends JavaScriptTokenizer {

    /**
     * TypeScript-specific keywords not in the JavaScript keyword set.
     * These are post-processed from TEXT tokens to KEYWORD tokens.
     */
    static TS_KEYWORDS = new Set([
        'type', 'interface', 'namespace', 'declare', 'readonly', 'keyof',
        'infer', 'never', 'unknown', 'any', 'is', 'asserts', 'as',
        'satisfies', 'override', 'accessor'
    ]);

    constructor(language) {
        super(language || "typescript");
    }

    /**
     * Tokenize TypeScript source code.
     * Uses the parent JavaScriptTokenizer for all base tokenization,
     * then post-processes to recognize TS-specific keywords.
     *
     * @param {string} code - Raw TypeScript source
     * @returns {Array<{type: string, value: string}>}
     */
    tokenize(code) {
        // Use parent JS tokenizer for base tokenization
        const tokens = super.tokenize(code);

        // Post-process: promote TS-specific keywords from TEXT to KEYWORD
        for (let i = 0; i < tokens.length; i++) {
            if (tokens[i].type === TokenType.TEXT &&
                TypeScriptTokenizer.TS_KEYWORDS.has(tokens[i].value)) {
                tokens[i].type = TokenType.KEYWORD;
            }
        }

        return tokens;
    }
}
