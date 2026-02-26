import Node, { Mark } from "../model/Node.js";
import Schema from "../model/Schema.js";
import { Selection } from "../model/Position.js";
import Transaction from "./Transaction.js";

/**
 * EditorState is an immutable snapshot of the editor's current state.
 *
 * Contains the document tree, current selection, stored marks for next
 * input, and plugin state. All mutations produce a new EditorState
 * via transaction dispatch.
 */
export default class EditorState {

    /**
     * @param {Node} doc - Document root node
     * @param {Selection} selection - Current selection
     * @param {object[]} marks - Stored marks to apply on next text input
     * @param {object[]} plugins - Plugin state objects
     * @param {Schema} [schema] - Schema used to create this state
     */
    constructor(doc, selection, marks, plugins, schema) {
        if (!doc || !(doc instanceof Node)) {
            throw new Error("EditorState requires a valid document Node");
        }

        /** @type {Node} */
        this.doc = doc;

        /** @type {Selection} */
        this.selection = selection;

        /** @type {object[]} */
        this.marks = Object.freeze(marks || []);

        /** @type {object[]} */
        this.plugins = Object.freeze(plugins || []);

        /** @type {Schema|null} */
        this.schema = schema || null;

        Object.freeze(this);
    }

    /**
     * Create a new Transaction initialized from this state.
     * @returns {Transaction}
     */
    get transaction() {
        return new Transaction(this);
    }

    /**
     * Apply a Transaction to produce a new EditorState.
     *
     * Applies all steps in sequence to produce the new document,
     * maps the selection through all step maps, and carries forward
     * or overrides stored marks.
     *
     * @param {Transaction} tr - Transaction to apply
     * @returns {EditorState}
     */
    apply(tr) {
        // Get the resulting document after all steps
        let newDoc = tr.doc;

        // Map selection through all step maps, or use explicitly set selection
        let newSelection;
        if (tr._selection) {
            newSelection = tr._selection;
        } else {
            newSelection = this.selection.map(tr.mapping);
        }

        // Clamp selection to valid document range
        const maxPos = newDoc.contentSize;
        const clampedAnchor = Math.max(0, Math.min(newSelection.anchor, maxPos));
        const clampedHead = Math.max(0, Math.min(newSelection.head, maxPos));
        newSelection = new Selection(clampedAnchor, clampedHead);

        // Carry forward stored marks: use transaction's if explicitly set, else carry from state
        const newMarks = tr._storedMarks !== null ? tr._storedMarks : this.marks;

        return new EditorState(newDoc, newSelection, newMarks, this.plugins, this.schema);
    }

    /**
     * Factory: create an initial EditorState from a schema and optional content.
     *
     * @param {Schema} schema - Document schema
     * @param {Node|string|null} content - Initial content (Node, string, or null for empty paragraph)
     * @param {Selection} [selection] - Initial selection (defaults to cursor at position 1)
     * @returns {EditorState}
     */
    static create(schema, content, selection) {
        let doc;

        if (content instanceof Node) {
            doc = content;
        } else if (typeof content === "string" && content.length > 0) {
            // Parse as a single paragraph with text
            const textNode = schema.text(content);
            const para = schema.node("paragraph", null, [textNode]);
            doc = schema.node("document", null, [para]);
        } else {
            // Null or empty string: create document with one empty paragraph
            const para = schema.node("paragraph", null, []);
            doc = schema.node("document", null, [para]);
        }

        // Default selection: cursor at position 1 (start of first paragraph content)
        if (!selection) {
            selection = Selection.cursor(1);
        }

        return new EditorState(doc, selection, [], [], schema);
    }

    /**
     * Serialize this state to a plain JSON object.
     * @returns {object}
     */
    toJSON() {
        return {
            doc: this.doc.toJSON(),
            selection: {
                anchor: this.selection.anchor,
                head: this.selection.head
            },
            marks: this.marks.map(m =>
                m.attrs ? { type: m.type, attrs: { ...m.attrs } } : { type: m.type }
            )
        };
    }

    /**
     * Deserialize an EditorState from a plain JSON object.
     *
     * @param {Schema} schema - Schema for node reconstruction
     * @param {object} json - Serialized state
     * @returns {EditorState}
     */
    static fromJSON(schema, json) {
        if (!json || !json.doc) {
            throw new Error("Invalid EditorState JSON: missing doc");
        }

        const doc = Node.fromJSON(schema, json.doc);
        const sel = json.selection
            ? new Selection(json.selection.anchor, json.selection.head)
            : Selection.cursor(1);
        const marks = json.marks || [];

        return new EditorState(doc, sel, marks, [], schema);
    }
}
