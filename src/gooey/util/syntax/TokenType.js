/**
 * TokenType - Standard syntax token type constants.
 * Tokenizers produce tokens tagged with these types.
 * Each type maps to a CSS class "syntax-{type}" in the theme.
 */
export default class TokenType {
    static KEYWORD     = "keyword";
    static STRING      = "string";
    static NUMBER      = "number";
    static COMMENT     = "comment";
    static OPERATOR    = "operator";
    static PUNCTUATION = "punctuation";
    static TAG_NAME    = "tag-name";
    static ATTR_NAME   = "attr-name";
    static ATTR_VALUE  = "attr-value";
    static DOCTYPE     = "doctype";
    static ENTITY      = "entity";
    static TEXT        = "text";

    /**
     * Get the CSS class name for a token type.
     * @param {string} type - A TokenType constant value
     * @returns {string} CSS class name (e.g. "syntax-keyword")
     */
    static toClassName(type) {
        return `syntax-${type}`;
    }
}
