import { Selection } from "../model/Position.js";

/**
 * SelectionManager renders custom cursor and selection highlights
 * as positioned overlays within the .rte-selection layer.
 *
 * It also handles mouse-based selection by listening to mousedown/
 * mousemove/mouseup on the content container, including:
 * - Single click: position cursor
 * - Double-click: select word
 * - Triple-click: select paragraph (entire block)
 *
 * This is a plain class (not a web component).
 */
export default class SelectionManager {

    /**
     * @param {HTMLElement} selectionLayer - The .rte-selection overlay container
     * @param {import('./EditorView.js').default} view - EditorView reference
     */
    constructor(selectionLayer, view) {
        /** @type {HTMLElement} */
        this.selectionLayer = selectionLayer;

        /** @type {import('./EditorView.js').default} */
        this.view = view;

        /** @type {HTMLElement|null} Current caret element */
        this._caretEl = null;

        /** @type {HTMLElement[]} Current highlight elements */
        this._highlightEls = [];

        /** @type {boolean} Whether mouse is currently selecting */
        this._selecting = false;

        /** @type {number|null} Anchor position during mouse selection */
        this._mouseAnchor = null;

        /** @type {number} Click count for double/triple-click detection */
        this._clickCount = 0;

        /** @type {number} Timestamp of the last mousedown */
        this._lastClickTime = 0;

        /** @type {{ x: number, y: number }|null} Position of last mousedown */
        this._lastClickPos = null;

        // Bound handlers for cleanup
        this._onMouseDown = this._handleMouseDown.bind(this);
        this._onMouseMove = this._handleMouseMove.bind(this);
        this._onMouseUp = this._handleMouseUp.bind(this);

        // Listen on the content container (not selection layer, which has pointer-events: none)
        const contentEl = this.view.container;
        if (contentEl) {
            contentEl.addEventListener("mousedown", this._onMouseDown);
        }
    }

    /**
     * Render the current selection: either a blinking caret (cursor)
     * or selection highlights (range).
     *
     * @param {import('../model/Position.js').Selection} selection
     */
    update(selection) {
        this._clearOverlays();

        if (!selection) return;

        if (selection.empty) {
            // Cursor: render blinking caret
            const coords = this.view.coordsAtPos(selection.anchor);
            if (coords) {
                this._renderCaret(coords);
            }
        } else {
            // Range: render selection highlights
            this._renderHighlights(selection.from, selection.to);
        }
    }

    /**
     * Clean up everything.
     */
    destroy() {
        this._clearOverlays();

        const contentEl = this.view ? this.view.container : null;
        if (contentEl) {
            contentEl.removeEventListener("mousedown", this._onMouseDown);
        }

        // Clean up any dangling document-level listeners
        document.removeEventListener("mousemove", this._onMouseMove);
        document.removeEventListener("mouseup", this._onMouseUp);

        this.view = null;
        this.selectionLayer = null;
    }

    // =========================================================================
    // Overlay rendering
    // =========================================================================

    /**
     * Create or update the caret div element at the given coordinates.
     *
     * @param {{ left: number, top: number, bottom: number }} coords
     * @private
     */
    _renderCaret(coords) {
        const layerRect = this.selectionLayer.getBoundingClientRect();

        const caret = document.createElement("div");
        caret.className = "rte-caret";
        caret.style.position = "absolute";
        caret.style.left = `${coords.left - layerRect.left}px`;
        caret.style.top = `${coords.top - layerRect.top}px`;
        caret.style.height = `${coords.bottom - coords.top}px`;
        caret.style.width = "2px";

        this.selectionLayer.appendChild(caret);
        this._caretEl = caret;
    }

    /**
     * Render selection highlight overlays for a range.
     *
     * For each position from `from` to `to`, compute the coordinates
     * and create highlight rectangles covering the text.
     *
     * @param {number} from - Start position
     * @param {number} to - End position
     * @private
     */
    _renderHighlights(from, to) {
        const layerRect = this.selectionLayer.getBoundingClientRect();

        // Get coordinates for from and to
        const fromCoords = this.view.coordsAtPos(from);
        const toCoords = this.view.coordsAtPos(to);

        if (!fromCoords || !toCoords) return;

        // Simple approach: if from and to are on the same line, single highlight
        // If on different lines, create per-line highlights
        if (Math.abs(fromCoords.top - toCoords.top) < 2) {
            // Same line
            this._createHighlightRect(
                fromCoords.left - layerRect.left,
                fromCoords.top - layerRect.top,
                toCoords.left - fromCoords.left,
                fromCoords.bottom - fromCoords.top
            );
        } else {
            // Multi-line: create rectangles for each line
            // First line: from cursor to right edge
            const containerRight = this.view.container.getBoundingClientRect().right;
            this._createHighlightRect(
                fromCoords.left - layerRect.left,
                fromCoords.top - layerRect.top,
                containerRight - fromCoords.left,
                fromCoords.bottom - fromCoords.top
            );

            // Middle lines: full width
            const lineHeight = fromCoords.bottom - fromCoords.top;
            let currentTop = fromCoords.bottom;
            while (currentTop < toCoords.top - 1) {
                const containerLeft = this.view.container.getBoundingClientRect().left;
                this._createHighlightRect(
                    containerLeft - layerRect.left,
                    currentTop - layerRect.top,
                    containerRight - containerLeft,
                    lineHeight
                );
                currentTop += lineHeight;
            }

            // Last line: from left edge to cursor
            const containerLeft = this.view.container.getBoundingClientRect().left;
            this._createHighlightRect(
                containerLeft - layerRect.left,
                toCoords.top - layerRect.top,
                toCoords.left - containerLeft,
                toCoords.bottom - toCoords.top
            );
        }
    }

    /**
     * Create a single highlight rectangle element.
     *
     * @param {number} left
     * @param {number} top
     * @param {number} width
     * @param {number} height
     * @private
     */
    _createHighlightRect(left, top, width, height) {
        if (width <= 0 || height <= 0) return;

        const highlight = document.createElement("div");
        highlight.className = "rte-highlight";
        highlight.style.position = "absolute";
        highlight.style.left = `${left}px`;
        highlight.style.top = `${top}px`;
        highlight.style.width = `${width}px`;
        highlight.style.height = `${height}px`;

        this.selectionLayer.appendChild(highlight);
        this._highlightEls.push(highlight);
    }

    /**
     * Remove all cursor and highlight overlay elements.
     * @private
     */
    _clearOverlays() {
        if (this._caretEl) {
            if (this._caretEl.parentNode) {
                this._caretEl.parentNode.removeChild(this._caretEl);
            }
            this._caretEl = null;
        }

        for (const el of this._highlightEls) {
            if (el.parentNode) {
                el.parentNode.removeChild(el);
            }
        }
        this._highlightEls = [];
    }

    // =========================================================================
    // Mouse selection
    // =========================================================================

    /**
     * Handle mousedown on the content container.
     *
     * Tracks click count for double-click (word select) and
     * triple-click (paragraph select) detection.
     *
     * @param {MouseEvent} event
     * @private
     */
    _handleMouseDown(event) {
        // Only handle left button
        if (event.button !== 0) return;

        const now = Date.now();
        const pos = this.view.posAtCoords({ left: event.clientX, top: event.clientY });
        if (pos === null) return;

        // Detect multi-clicks: within 500ms and 5px of last click
        if (this._lastClickPos &&
            (now - this._lastClickTime) < 500 &&
            Math.abs(event.clientX - this._lastClickPos.x) < 5 &&
            Math.abs(event.clientY - this._lastClickPos.y) < 5) {
            this._clickCount++;
        } else {
            this._clickCount = 1;
        }

        this._lastClickTime = now;
        this._lastClickPos = { x: event.clientX, y: event.clientY };

        // Route to appropriate handler based on click count
        if (this._clickCount === 3) {
            // Triple-click: select paragraph
            this._selectParagraph(pos);
            event.preventDefault();
            return;
        }

        if (this._clickCount === 2) {
            // Double-click: select word
            this._selectWord(pos);
            event.preventDefault();
            return;
        }

        // Single click: position cursor and start drag selection
        this._selecting = true;
        this._mouseAnchor = pos;

        // Set cursor immediately
        if (this.view.dispatch) {
            const tr = this.view.state.transaction;
            tr.setSelection(Selection.cursor(pos));
            this.view.dispatch(tr);
        }

        // Attach document-level listeners for move/up
        document.addEventListener("mousemove", this._onMouseMove);
        document.addEventListener("mouseup", this._onMouseUp);

        // Prevent default text selection
        event.preventDefault();
    }

    /**
     * Handle mousemove during selection.
     *
     * @param {MouseEvent} event
     * @private
     */
    _handleMouseMove(event) {
        if (!this._selecting || this._mouseAnchor === null) return;

        const pos = this.view.posAtCoords({ left: event.clientX, top: event.clientY });
        if (pos === null) return;

        // Update selection with anchor and new head
        if (this.view.dispatch) {
            const tr = this.view.state.transaction;
            tr.setSelection(Selection.between(this._mouseAnchor, pos));
            this.view.dispatch(tr);
        }
    }

    /**
     * Handle mouseup: finalize selection.
     *
     * @param {MouseEvent} event
     * @private
     */
    _handleMouseUp(event) {
        this._selecting = false;
        this._mouseAnchor = null;

        document.removeEventListener("mousemove", this._onMouseMove);
        document.removeEventListener("mouseup", this._onMouseUp);
    }

    // =========================================================================
    // Word and paragraph selection
    // =========================================================================

    /**
     * Select the word at the given document position (double-click).
     *
     * Scans backward and forward from the position to find word
     * boundaries using \w for word characters.
     *
     * @param {number} pos - Document position
     * @private
     */
    _selectWord(pos) {
        const doc = this.view.state.doc;
        let $pos;

        try {
            $pos = doc.resolve(pos);
        } catch (e) {
            return; // Invalid position
        }

        const parent = $pos.parent;
        if (!parent || parent.type === "document") return;

        const blockText = parent.textContent;
        const offset = $pos.parentOffset;
        const blockStart = pos - offset;

        if (blockText.length === 0) return;

        // Clamp offset to valid range
        const safeOffset = Math.min(offset, blockText.length);

        // Find word boundaries
        let wordStart = safeOffset;
        let wordEnd = safeOffset;

        // Scan backward to find word start
        while (wordStart > 0 && /\w/.test(blockText[wordStart - 1])) {
            wordStart--;
        }

        // Scan forward to find word end
        while (wordEnd < blockText.length && /\w/.test(blockText[wordEnd])) {
            wordEnd++;
        }

        // If no word characters found at position, select the non-word character
        if (wordStart === wordEnd) {
            if (safeOffset < blockText.length) {
                wordEnd = safeOffset + 1;
                wordStart = safeOffset;
            } else if (safeOffset > 0) {
                wordStart = safeOffset - 1;
                wordEnd = safeOffset;
            }
        }

        // Dispatch selection
        if (this.view.dispatch) {
            const tr = this.view.state.transaction;
            tr.setSelection(Selection.between(blockStart + wordStart, blockStart + wordEnd));
            this.view.dispatch(tr);
        }
    }

    /**
     * Select the entire paragraph/block at the given position (triple-click).
     *
     * Finds the parent block node and creates a selection spanning
     * the entire block content.
     *
     * @param {number} pos - Document position
     * @private
     */
    _selectParagraph(pos) {
        const doc = this.view.state.doc;
        let $pos;

        try {
            $pos = doc.resolve(pos);
        } catch (e) {
            return; // Invalid position
        }

        const parent = $pos.parent;
        if (!parent || parent.type === "document") return;

        const offset = $pos.parentOffset;
        const blockStart = pos - offset;
        const blockEnd = blockStart + parent.contentSize;

        // Dispatch selection spanning entire block content
        if (this.view.dispatch) {
            const tr = this.view.state.transaction;
            tr.setSelection(Selection.between(blockStart, blockEnd));
            this.view.dispatch(tr);
        }
    }
}
