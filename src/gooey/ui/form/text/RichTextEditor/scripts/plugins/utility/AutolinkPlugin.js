/**
 * AutolinkPlugin detects typed URLs and automatically wraps them in link marks.
 *
 * Uses the inputRules() hook with a URL pattern. When the user types a URL
 * followed by a space, the handler wraps the URL text in a `link` mark
 * with { href: matchedURL }.
 */

import { setMark } from "../../state/Commands.js";


export default class AutolinkPlugin {

    static get pluginName() {
        return "autolink";
    }

    /**
     * Called when plugin is registered with the editor.
     * @param {object} editor - RichTextEditor instance
     */
    init(editor) {
        this._editor = editor;
    }

    /**
     * Return input rules for auto-linking URLs.
     *
     * When the user types a URL followed by a space, the URL text
     * is wrapped in a link mark.
     *
     * @returns {Array<{pattern: RegExp, handler: function}>}
     */
    inputRules() {
        return [
            {
                // Matches a URL followed by a space at the end of input
                pattern: /((?:https?:\/\/)[^\s]+)\s$/,
                handler: (state, match, start, end, dispatch) => {
                    if (!dispatch) return true;

                    const url = match[1];
                    const urlStart = start + match.index;
                    const urlEnd = urlStart + url.length;

                    const tr = state.transaction;

                    // Create link mark with href attribute
                    let linkMark;
                    if (state.schema && typeof state.schema.mark === "function") {
                        linkMark = state.schema.mark("link", { href: url });
                    } else {
                        linkMark = Object.freeze({
                            type: "link",
                            attrs: Object.freeze({ href: url })
                        });
                    }

                    // Apply link mark to the URL text (not including the trailing space)
                    tr.addMark(urlStart, urlEnd, linkMark);
                    dispatch(tr);
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
