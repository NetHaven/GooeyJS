/**
 * AutoformatPlugin provides markdown-like input rules for the RichTextEditor.
 *
 * Defines patterns that transform typed text into formatted content:
 * - **text** -> bold, *text* / _text_ -> italic, ~~text~~ -> strikethrough
 * - `text` -> inline code
 * - # -> H1, ## -> H2, ... ###### -> H6
 * - - / * -> bullet list, 1. -> ordered list
 * - > -> blockquote, --- -> horizontal rule
 *
 * Uses the inputRules() hook to return pattern-based transforms.
 * Each input rule has: { pattern: RegExp, handler: (state, match, start, end, dispatch) => boolean }
 */

import {
    toggleMark,
    heading,
    toggleBulletList,
    toggleOrderedList,
    wrapInBlockquote,
    insertHorizontalRule,
    setBlockType
} from "../../state/Commands.js";


export default class AutoformatPlugin {

    static get pluginName() {
        return "autoformat";
    }

    /**
     * Called when plugin is registered with the editor.
     * @param {object} editor - RichTextEditor instance
     */
    init(editor) {
        this._editor = editor;
    }

    /**
     * Return input rules for markdown-like shortcuts.
     *
     * Each rule: { pattern: RegExp, handler: (state, match, start, end, dispatch) => boolean }
     * - pattern: tested against the text before the cursor in the current text block
     * - handler: receives state, the regex match, start/end positions of the match, and dispatch
     *
     * @returns {Array<{pattern: RegExp, handler: function}>}
     */
    inputRules() {
        return [
            // --- Inline mark rules ---

            // **text** -> bold
            {
                pattern: /\*\*([^*]+)\*\*$/,
                handler: (state, match, start, end, dispatch) => {
                    if (!dispatch) return true;
                    const tr = state.transaction;
                    const markStart = start + match.index;
                    const markEnd = markStart + match[0].length;
                    const textStart = markStart + 2; // after **
                    const textEnd = markEnd - 2;     // before **

                    // Remove the markdown delimiters and apply bold mark
                    tr.delete(textEnd, markEnd);
                    tr.delete(markStart, textStart);

                    // Apply bold mark to the inner text
                    const { Mark } = _getMarkClass(state);
                    const boldMark = Mark ? Mark.create("bold") : { type: "bold" };
                    tr.addMark(markStart, markStart + (textEnd - textStart), boldMark);
                    dispatch(tr);
                    return true;
                }
            },

            // ~~text~~ -> strikethrough
            {
                pattern: /~~([^~]+)~~$/,
                handler: (state, match, start, end, dispatch) => {
                    if (!dispatch) return true;
                    const tr = state.transaction;
                    const markStart = start + match.index;
                    const markEnd = markStart + match[0].length;
                    const textStart = markStart + 2;
                    const textEnd = markEnd - 2;

                    tr.delete(textEnd, markEnd);
                    tr.delete(markStart, textStart);

                    const { Mark } = _getMarkClass(state);
                    const strikeMark = Mark ? Mark.create("strikethrough") : { type: "strikethrough" };
                    tr.addMark(markStart, markStart + (textEnd - textStart), strikeMark);
                    dispatch(tr);
                    return true;
                }
            },

            // *text* -> italic (single asterisk, must not be preceded by another *)
            {
                pattern: /(?<!\*)\*([^*]+)\*$/,
                handler: (state, match, start, end, dispatch) => {
                    if (!dispatch) return true;
                    const tr = state.transaction;
                    const markStart = start + match.index;
                    const markEnd = markStart + match[0].length;
                    const textStart = markStart + 1;
                    const textEnd = markEnd - 1;

                    tr.delete(textEnd, markEnd);
                    tr.delete(markStart, textStart);

                    const { Mark } = _getMarkClass(state);
                    const italicMark = Mark ? Mark.create("italic") : { type: "italic" };
                    tr.addMark(markStart, markStart + (textEnd - textStart), italicMark);
                    dispatch(tr);
                    return true;
                }
            },

            // _text_ -> italic (underscore variant)
            {
                pattern: /(?<!_)_([^_]+)_$/,
                handler: (state, match, start, end, dispatch) => {
                    if (!dispatch) return true;
                    const tr = state.transaction;
                    const markStart = start + match.index;
                    const markEnd = markStart + match[0].length;
                    const textStart = markStart + 1;
                    const textEnd = markEnd - 1;

                    tr.delete(textEnd, markEnd);
                    tr.delete(markStart, textStart);

                    const { Mark } = _getMarkClass(state);
                    const italicMark = Mark ? Mark.create("italic") : { type: "italic" };
                    tr.addMark(markStart, markStart + (textEnd - textStart), italicMark);
                    dispatch(tr);
                    return true;
                }
            },

            // `text` -> inline code
            {
                pattern: /`([^`]+)`$/,
                handler: (state, match, start, end, dispatch) => {
                    if (!dispatch) return true;
                    const tr = state.transaction;
                    const markStart = start + match.index;
                    const markEnd = markStart + match[0].length;
                    const textStart = markStart + 1;
                    const textEnd = markEnd - 1;

                    tr.delete(textEnd, markEnd);
                    tr.delete(markStart, textStart);

                    const { Mark } = _getMarkClass(state);
                    const codeMark = Mark ? Mark.create("code") : { type: "code" };
                    tr.addMark(markStart, markStart + (textEnd - textStart), codeMark);
                    dispatch(tr);
                    return true;
                }
            },

            // --- Block-level rules (triggered at line start) ---

            // # through ###### at line start -> heading level 1-6
            {
                pattern: /^(#{1,6}) $/,
                handler: (state, match, start, end, dispatch) => {
                    const level = match[1].length;
                    if (!dispatch) return true;
                    const tr = state.transaction;
                    // Delete the "# " text
                    tr.delete(start + match.index, start + match.index + match[0].length);
                    dispatch(tr);
                    // Apply heading block type via command
                    heading(level)(state, dispatch);
                    return true;
                }
            },

            // - or * at line start -> bullet list
            {
                pattern: /^[-*] $/,
                handler: (state, match, start, end, dispatch) => {
                    if (!dispatch) return true;
                    const tr = state.transaction;
                    tr.delete(start + match.index, start + match.index + match[0].length);
                    dispatch(tr);
                    toggleBulletList(state, dispatch);
                    return true;
                }
            },

            // 1. at line start -> ordered list
            {
                pattern: /^1\. $/,
                handler: (state, match, start, end, dispatch) => {
                    if (!dispatch) return true;
                    const tr = state.transaction;
                    tr.delete(start + match.index, start + match.index + match[0].length);
                    dispatch(tr);
                    toggleOrderedList(state, dispatch);
                    return true;
                }
            },

            // > at line start -> blockquote
            {
                pattern: /^> $/,
                handler: (state, match, start, end, dispatch) => {
                    if (!dispatch) return true;
                    const tr = state.transaction;
                    tr.delete(start + match.index, start + match.index + match[0].length);
                    dispatch(tr);
                    wrapInBlockquote(state, dispatch);
                    return true;
                }
            },

            // --- at line start -> horizontal rule
            {
                pattern: /^---$/,
                handler: (state, match, start, end, dispatch) => {
                    if (!dispatch) return true;
                    const tr = state.transaction;
                    tr.delete(start + match.index, start + match.index + match[0].length);
                    dispatch(tr);
                    insertHorizontalRule(state, dispatch);
                    return true;
                }
            }
        ];
    }

    /**
     * Cleanup when plugin is unregistered.
     */
    destroy() {
        this._editor = null;
    }
}


// =============================================================================
// Private helpers
// =============================================================================

/**
 * Get the Mark class from state's schema or use a basic fallback.
 * @param {object} state - EditorState
 * @returns {{ Mark: {create: function}|null }}
 */
function _getMarkClass(state) {
    if (state.schema && typeof state.schema.mark === "function") {
        return {
            Mark: {
                create: (type, attrs) => state.schema.mark(type, attrs)
            }
        };
    }
    // Fallback: return plain mark objects
    return {
        Mark: {
            create: (type, attrs) => {
                const mark = attrs && Object.keys(attrs).length > 0
                    ? Object.freeze({ type, attrs: Object.freeze({ ...attrs }) })
                    : Object.freeze({ type });
                return mark;
            }
        }
    };
}
