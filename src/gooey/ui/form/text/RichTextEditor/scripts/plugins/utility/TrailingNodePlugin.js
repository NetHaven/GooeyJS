/**
 * TrailingNodePlugin ensures the document always ends with an empty paragraph.
 *
 * Uses the filterTransaction(tr, state) hook to inspect every transaction.
 * After every transaction, checks if the document's last child is an empty
 * paragraph. If not, appends one to prevent cursor traps at the end of
 * the document.
 */

import Node from "../../model/Node.js";


export default class TrailingNodePlugin {

    static get pluginName() {
        return "trailingNode";
    }

    /**
     * Called when plugin is registered with the editor.
     * @param {object} editor - RichTextEditor instance
     */
    init(editor) {
        this._editor = editor;
    }

    /**
     * Inspect/modify transactions before they are applied.
     *
     * Checks if the document's last child is an empty paragraph.
     * If not, appends an empty paragraph at the end.
     *
     * @param {object} tr - Transaction
     * @param {object} state - Current EditorState
     * @returns {object} The transaction (possibly modified)
     */
    filterTransaction(tr, state) {
        const doc = tr.doc;
        if (!doc || !doc.children || doc.children.length === 0) {
            return tr;
        }

        const lastChild = doc.children[doc.children.length - 1];

        // Check if last child is an empty paragraph
        if (_isEmptyParagraph(lastChild)) {
            return tr; // Already has trailing empty paragraph
        }

        // Append an empty paragraph at the end of the document
        const emptyParagraph = new Node("paragraph", null, [], null);
        const docEndPos = doc.contentSize;
        tr.replaceRange(docEndPos, docEndPos, [emptyParagraph]);

        return tr;
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
 * Check if a node is an empty paragraph (no text content).
 * @param {object} node - Document node
 * @returns {boolean}
 */
function _isEmptyParagraph(node) {
    if (!node || node.type !== "paragraph") {
        return false;
    }
    // Empty paragraph: no children or all children are empty
    if (!node.children || node.children.length === 0) {
        return true;
    }
    // Check if all text content is empty
    return node.textContent === "";
}
