/**
 * SearchPlugin provides find and replace functionality for the RichTextEditor.
 *
 * Features:
 * - Inline floating find/replace panel with Mod-F / Mod-H keyboard shortcuts
 * - Case-sensitive, whole-word, and regex matching toggles
 * - Find next/previous navigation with match wrapping
 * - Replace current match and replace all matches (single undo transaction)
 * - Match highlighting via EditorView decorations (non-model overlays)
 * - Match count display with ARIA live region
 * - Debounced search input (100ms)
 * - Focus trapping within panel when open
 */

import { Selection } from '../model/Position.js';


/**
 * SearchPlugin manages search state, match highlighting, and panel UI.
 */
export default class SearchPlugin {

    /**
     * Unique plugin name for registry identification.
     * @returns {string}
     */
    static get pluginName() { return 'search'; }

    /**
     * @param {import('../RichTextEditor.js').default} [editor] - RichTextEditor instance (optional for PluginManager path)
     */
    constructor(editor) {
        /** @type {import('../RichTextEditor.js').default} */
        this.editor = editor || null;

        // Search state
        /** @type {string} Current search term */
        this._searchTerm = '';

        /** @type {string} Current replacement text */
        this._replaceTerm = '';

        /** @type {boolean} Case-sensitive matching */
        this._caseSensitive = false;

        /** @type {boolean} Whole word matching */
        this._wholeWord = false;

        /** @type {boolean} Regex mode */
        this._useRegex = false;

        /** @type {Array<{from: number, to: number}>} Match ranges */
        this._matches = [];

        /** @type {number} Current focused match index (-1 if none) */
        this._currentMatchIndex = -1;

        /** @type {string|null} Regex error message */
        this._regexError = null;

        // Panel state
        /** @type {HTMLElement|null} Panel DOM element */
        this._panelEl = null;

        /** @type {string|null} Panel mode: 'find', 'replace', or null */
        this._panelMode = null;

        /** @type {number} Debounce timer ID */
        this._debounceTimer = 0;

        // Panel element references
        /** @type {HTMLInputElement|null} */
        this._findInput = null;

        /** @type {HTMLInputElement|null} */
        this._replaceInput = null;

        /** @type {HTMLElement|null} */
        this._countEl = null;

        /** @type {HTMLElement|null} */
        this._errorEl = null;

        /** @type {HTMLElement|null} */
        this._replaceRow = null;
    }

    // =========================================================================
    // Panel Open/Close
    // =========================================================================

    /**
     * Open the find/replace panel.
     *
     * @param {string} mode - 'find' or 'replace'
     */
    open(mode) {
        if (!this._panelEl) {
            this._createPanel();
        }

        this._panelMode = mode;
        this._panelEl.classList.add('rte-find-panel-visible');

        // Show/hide replace row
        if (this._replaceRow) {
            this._replaceRow.style.display = mode === 'replace' ? 'flex' : 'none';
        }

        // Pre-fill search input with current selection text
        const { from, to, empty } = this.editor._state.selection;
        if (!empty && this._findInput) {
            const selectedText = this.editor.getSelectedText();
            if (selectedText && selectedText.length < 200) {
                this._findInput.value = selectedText;
                this._searchTerm = selectedText;
            }
        }

        // Focus the search input
        if (this._findInput) {
            this._findInput.focus();
            this._findInput.select();
        }

        // Run initial search if there's a term
        if (this._searchTerm) {
            this._updateSearch();
        }
    }

    /**
     * Close the find/replace panel.
     */
    close() {
        if (this._panelEl) {
            this._panelEl.classList.remove('rte-find-panel-visible');
        }
        this._panelMode = null;

        // Clear decorations
        this._clearDecorations();

        // Restore editor focus
        if (this.editor._inputHandler) {
            this.editor._inputHandler.focus();
        }
    }

    // =========================================================================
    // Search Logic
    // =========================================================================

    /**
     * Set the search term and options programmatically.
     *
     * @param {string} term - Search term
     * @param {object} [options] - Search options
     * @param {boolean} [options.caseSensitive]
     * @param {boolean} [options.wholeWord]
     * @param {boolean} [options.useRegex]
     */
    setSearchTerm(term, options = {}) {
        this._searchTerm = term || '';
        if (options.caseSensitive !== undefined) this._caseSensitive = options.caseSensitive;
        if (options.wholeWord !== undefined) this._wholeWord = options.wholeWord;
        if (options.useRegex !== undefined) this._useRegex = options.useRegex;
    }

    /**
     * Find all matches in the document.
     *
     * Extracts flat text with position mapping, builds a search regex,
     * and maps match offsets back to model positions.
     *
     * @returns {Array<{from: number, to: number}>} Array of match ranges
     * @private
     */
    _findMatches() {
        this._regexError = null;

        if (!this._searchTerm) return [];

        const doc = this.editor._state.doc;
        if (!doc || !doc.children) return [];

        // Build flat text string with position map
        const { text, posMap } = this._buildTextMap(doc);

        if (!text) return [];

        // Build search pattern
        let pattern;
        try {
            if (this._useRegex) {
                pattern = this._searchTerm;
            } else {
                // Escape regex special characters for literal search
                pattern = this._searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            }

            if (this._wholeWord) {
                pattern = `\\b${pattern}\\b`;
            }

            const flags = this._caseSensitive ? 'g' : 'gi';
            const regex = new RegExp(pattern, flags);

            // Find all matches in the flat text
            const matches = [];
            let match;
            while ((match = regex.exec(text)) !== null) {
                if (match[0].length === 0) {
                    regex.lastIndex++;
                    continue;
                }

                const textFrom = match.index;
                const textTo = match.index + match[0].length;

                // Map text offsets to model positions
                const modelFrom = this._textOffsetToPos(posMap, textFrom);
                const modelTo = this._textOffsetToPos(posMap, textTo);

                if (modelFrom !== null && modelTo !== null) {
                    matches.push({ from: modelFrom, to: modelTo });
                }
            }

            return matches;
        } catch (e) {
            this._regexError = e.message || 'Invalid regular expression';
            return [];
        }
    }

    /**
     * Build a flat text representation of the document with position mapping.
     *
     * Returns a flat string and an array mapping text offsets to model positions.
     *
     * @param {import('../model/Node.js').default} doc - Document node
     * @returns {{ text: string, posMap: Array<{textOffset: number, modelPos: number}> }}
     * @private
     */
    _buildTextMap(doc) {
        const parts = [];
        const posMap = [];
        let textOffset = 0;

        this._buildTextMapInner(doc, 0, parts, posMap, { offset: 0 });

        return { text: parts.join(''), posMap };
    }

    /**
     * Recursively build the text map from the document tree.
     *
     * @param {import('../model/Node.js').default} node - Current node
     * @param {number} modelPos - Current model position offset
     * @param {string[]} parts - Text accumulator
     * @param {Array} posMap - Position map accumulator
     * @param {{ offset: number }} textState - Text offset tracker
     * @returns {number} Updated model position
     * @private
     */
    _buildTextMapInner(node, modelPos, parts, posMap, textState) {
        if (node.type === 'text') {
            // Map each character's text offset to its model position
            posMap.push({ textOffset: textState.offset, modelPos });
            parts.push(node.text);
            textState.offset += node.text.length;
            return modelPos + node.text.length;
        }

        if (node.children === null) {
            // Leaf node (hr, hardBreak)
            return modelPos + node.nodeSize;
        }

        // Container node
        const contentStart = modelPos + (node.type === 'document' ? 0 : 1);
        let pos = contentStart;

        for (let i = 0; i < node.children.length; i++) {
            const child = node.children[i];

            // Add newline between blocks for text search
            if (i > 0 && child.type !== 'text' && child.children !== null) {
                parts.push('\n');
                posMap.push({ textOffset: textState.offset, modelPos: pos });
                textState.offset += 1;
            }

            pos = this._buildTextMapInner(child, pos, parts, posMap, textState);
        }

        // Closing boundary
        if (node.type !== 'document') {
            pos += 1;
        }

        return pos;
    }

    /**
     * Map a text offset to a model position using the position map.
     *
     * @param {Array<{textOffset: number, modelPos: number}>} posMap - Position map
     * @param {number} textOffset - Text offset to map
     * @returns {number|null} Model position
     * @private
     */
    _textOffsetToPos(posMap, textOffset) {
        if (posMap.length === 0) return null;

        // Binary search or linear scan for the closest mapping
        for (let i = posMap.length - 1; i >= 0; i--) {
            const entry = posMap[i];
            if (entry.textOffset <= textOffset) {
                return entry.modelPos + (textOffset - entry.textOffset);
            }
        }

        return posMap[0].modelPos;
    }

    /**
     * Recalculate matches, update UI and decorations.
     * @private
     */
    _updateSearch() {
        this._matches = this._findMatches();

        // Reset current match index
        if (this._matches.length > 0) {
            // Find the closest match to the current cursor position
            const { head } = this.editor._state.selection;
            this._currentMatchIndex = 0;
            for (let i = 0; i < this._matches.length; i++) {
                if (this._matches[i].from >= head) {
                    this._currentMatchIndex = i;
                    break;
                }
            }

            this.editor.fireEvent('searchfound', {
                total: this._matches.length,
                currentIndex: this._currentMatchIndex
            });
        } else {
            this._currentMatchIndex = -1;

            if (this._searchTerm) {
                this.editor.fireEvent('searchnotfound', {
                    searchTerm: this._searchTerm
                });
            }
        }

        this._renderDecorations();
        this._updateMatchCount();
        this._updateErrorDisplay();
    }

    // =========================================================================
    // Match Navigation
    // =========================================================================

    /**
     * Navigate to the next match (wraps to start).
     */
    findNext() {
        if (this._matches.length === 0) return;

        this._currentMatchIndex = (this._currentMatchIndex + 1) % this._matches.length;
        this._navigateToCurrentMatch();
    }

    /**
     * Navigate to the previous match (wraps to end).
     */
    findPrevious() {
        if (this._matches.length === 0) return;

        this._currentMatchIndex = this._currentMatchIndex <= 0
            ? this._matches.length - 1
            : this._currentMatchIndex - 1;
        this._navigateToCurrentMatch();
    }

    /**
     * Set editor selection to the current match and update decorations.
     * @private
     */
    _navigateToCurrentMatch() {
        if (this._currentMatchIndex < 0 || this._currentMatchIndex >= this._matches.length) return;

        const match = this._matches[this._currentMatchIndex];
        const tr = this.editor._state.transaction;
        tr.setSelection(Selection.create(match.from, match.to));
        this.editor._dispatch(tr);

        // Scroll match into view
        const coords = this.editor._view.coordsAtPos(match.from);
        if (coords) {
            const content = this.editor._content;
            if (content) {
                const contentRect = content.getBoundingClientRect();
                if (coords.top < contentRect.top || coords.bottom > contentRect.bottom) {
                    content.scrollTop += (coords.top - contentRect.top) - contentRect.height / 3;
                }
            }
        }

        this._renderDecorations();
        this._updateMatchCount();

        this.editor.fireEvent('searchfound', {
            total: this._matches.length,
            currentIndex: this._currentMatchIndex
        });
    }

    // =========================================================================
    // Replace Operations
    // =========================================================================

    /**
     * Replace the current match with the replacement text.
     */
    replaceCurrent() {
        if (this._matches.length === 0 || this._currentMatchIndex < 0) return;

        const match = this._matches[this._currentMatchIndex];
        const state = this.editor._state;

        let replacement = this._replaceTerm;

        // For regex mode with capture groups, resolve $1, $2 etc.
        if (this._useRegex && this._searchTerm) {
            try {
                const { text, posMap } = this._buildTextMap(state.doc);
                const flags = this._caseSensitive ? 'g' : 'gi';
                const regex = new RegExp(this._searchTerm, flags);

                // Find the specific match text
                let m;
                while ((m = regex.exec(text)) !== null) {
                    const modelFrom = this._textOffsetToPos(posMap, m.index);
                    if (modelFrom === match.from) {
                        replacement = m[0].replace(new RegExp(this._searchTerm, this._caseSensitive ? '' : 'i'), this._replaceTerm);
                        break;
                    }
                    if (m[0].length === 0) { regex.lastIndex++; }
                }
            } catch (e) {
                // Use literal replacement on regex error
            }
        }

        const tr = state.transaction;
        tr.deleteRange(match.from, match.to);
        if (replacement) {
            tr.insertText(replacement, match.from);
        }

        const newCursorPos = match.from + replacement.length;
        tr.setSelection(Selection.cursor(newCursorPos));
        this.editor._dispatch(tr);

        // Recalculate matches after replacement
        this._updateSearch();

        // Advance to the next match
        if (this._matches.length > 0 && this._currentMatchIndex >= this._matches.length) {
            this._currentMatchIndex = 0;
        }
        if (this._matches.length > 0) {
            this._navigateToCurrentMatch();
        }
    }

    /**
     * Replace all matches in a single transaction (single undo action).
     */
    replaceAll() {
        if (this._matches.length === 0) return;

        const state = this.editor._state;
        const totalReplacements = this._matches.length;
        let replacement = this._replaceTerm;

        // Process matches in reverse order to avoid position shifts
        const tr = state.transaction;
        const reversedMatches = [...this._matches].reverse();

        for (const match of reversedMatches) {
            let matchReplacement = replacement;

            // For regex mode, resolve capture groups for each match
            if (this._useRegex && this._searchTerm) {
                try {
                    const { text, posMap } = this._buildTextMap(tr.doc);
                    const flags = this._caseSensitive ? 'g' : 'gi';
                    const regex = new RegExp(this._searchTerm, flags);

                    let m;
                    while ((m = regex.exec(text)) !== null) {
                        const modelFrom = this._textOffsetToPos(posMap, m.index);
                        if (modelFrom === match.from) {
                            matchReplacement = m[0].replace(
                                new RegExp(this._searchTerm, this._caseSensitive ? '' : 'i'),
                                replacement
                            );
                            break;
                        }
                        if (m[0].length === 0) { regex.lastIndex++; }
                    }
                } catch (e) {
                    // Use literal replacement
                }
            }

            tr.deleteRange(match.from, match.to);
            if (matchReplacement) {
                tr.insertText(matchReplacement, match.from);
            }
        }

        this.editor._dispatch(tr);

        // Fire event
        this.editor.fireEvent('replacedone', {
            count: totalReplacements,
            searchTerm: this._searchTerm,
            replaceTerm: this._replaceTerm
        });

        // Recalculate (should be 0 matches now)
        this._updateSearch();
    }

    // =========================================================================
    // Decorations
    // =========================================================================

    /**
     * Render match highlight decorations via EditorView.
     * @private
     */
    _renderDecorations() {
        const view = this.editor._view;
        if (!view) return;

        if (this._matches.length === 0) {
            view.setDecorations([]);
            return;
        }

        const decorations = this._matches.map((match, idx) => ({
            from: match.from,
            to: match.to,
            attrs: {
                class: idx === this._currentMatchIndex
                    ? 'rte-search-match rte-search-match-current'
                    : 'rte-search-match'
            }
        }));

        view.setDecorations(decorations);
    }

    /**
     * Clear all search decorations.
     * @private
     */
    _clearDecorations() {
        const view = this.editor._view;
        if (view) {
            view.setDecorations([]);
        }
    }

    // =========================================================================
    // UI Updates
    // =========================================================================

    /**
     * Update the match count display in the panel.
     * @private
     */
    _updateMatchCount() {
        if (!this._countEl) return;

        if (this._matches.length === 0) {
            this._countEl.textContent = this._searchTerm ? 'No results' : '';
        } else {
            this._countEl.textContent = `${this._currentMatchIndex + 1} of ${this._matches.length}`;
        }
    }

    /**
     * Update regex error display.
     * @private
     */
    _updateErrorDisplay() {
        if (!this._errorEl) return;

        if (this._regexError) {
            this._errorEl.textContent = this._regexError;
            this._errorEl.classList.add('rte-find-error-visible');
        } else {
            this._errorEl.textContent = '';
            this._errorEl.classList.remove('rte-find-error-visible');
        }
    }

    // =========================================================================
    // Panel Creation
    // =========================================================================

    /**
     * Create the find/replace panel DOM.
     * @private
     */
    _createPanel() {
        const panel = document.createElement('div');
        panel.className = 'rte-find-panel';
        panel.setAttribute('role', 'dialog');
        panel.setAttribute('aria-label', 'Find and Replace');

        // --- Find row ---
        const findRow = document.createElement('div');
        findRow.className = 'rte-find-row';

        const findInput = document.createElement('input');
        findInput.type = 'text';
        findInput.className = 'rte-find-input';
        findInput.placeholder = 'Find';
        findInput.setAttribute('aria-label', 'Search');

        const countSpan = document.createElement('span');
        countSpan.className = 'rte-find-count';
        countSpan.setAttribute('role', 'status');
        countSpan.setAttribute('aria-live', 'polite');

        const prevBtn = document.createElement('button');
        prevBtn.className = 'rte-find-prev';
        prevBtn.title = 'Previous match (Shift+Enter)';
        prevBtn.setAttribute('aria-label', 'Previous');
        prevBtn.textContent = '\u25B2'; // up triangle

        const nextBtn = document.createElement('button');
        nextBtn.className = 'rte-find-next';
        nextBtn.title = 'Next match (Enter)';
        nextBtn.setAttribute('aria-label', 'Next');
        nextBtn.textContent = '\u25BC'; // down triangle

        const closeBtn = document.createElement('button');
        closeBtn.className = 'rte-find-close';
        closeBtn.title = 'Close (Escape)';
        closeBtn.setAttribute('aria-label', 'Close');
        closeBtn.textContent = '\u00D7'; // multiplication sign

        findRow.appendChild(findInput);
        findRow.appendChild(countSpan);
        findRow.appendChild(prevBtn);
        findRow.appendChild(nextBtn);
        findRow.appendChild(closeBtn);

        // --- Replace row ---
        const replaceRow = document.createElement('div');
        replaceRow.className = 'rte-replace-row';
        replaceRow.style.display = 'none';

        const replaceInput = document.createElement('input');
        replaceInput.type = 'text';
        replaceInput.className = 'rte-replace-input';
        replaceInput.placeholder = 'Replace';
        replaceInput.setAttribute('aria-label', 'Replace with');

        const replaceBtn = document.createElement('button');
        replaceBtn.className = 'rte-replace-btn';
        replaceBtn.title = 'Replace';
        replaceBtn.setAttribute('aria-label', 'Replace current');
        replaceBtn.textContent = 'Replace';

        const replaceAllBtn = document.createElement('button');
        replaceAllBtn.className = 'rte-replace-all-btn';
        replaceAllBtn.title = 'Replace All';
        replaceAllBtn.setAttribute('aria-label', 'Replace all');
        replaceAllBtn.textContent = 'All';

        replaceRow.appendChild(replaceInput);
        replaceRow.appendChild(replaceBtn);
        replaceRow.appendChild(replaceAllBtn);

        // --- Options row ---
        const optionsRow = document.createElement('div');
        optionsRow.className = 'rte-find-options';

        const caseLabel = this._createOptionLabel('Aa', 'Match case', this._caseSensitive);
        const wordLabel = this._createOptionLabel('|ab|', 'Whole word', this._wholeWord);
        const regexLabel = this._createOptionLabel('.*', 'Use regex', this._useRegex);

        optionsRow.appendChild(caseLabel);
        optionsRow.appendChild(wordLabel);
        optionsRow.appendChild(regexLabel);

        // --- Error display ---
        const errorEl = document.createElement('div');
        errorEl.className = 'rte-find-error';

        // --- Assemble panel ---
        panel.appendChild(findRow);
        panel.appendChild(replaceRow);
        panel.appendChild(optionsRow);
        panel.appendChild(errorEl);

        // Store references
        this._panelEl = panel;
        this._findInput = findInput;
        this._replaceInput = replaceInput;
        this._countEl = countSpan;
        this._errorEl = errorEl;
        this._replaceRow = replaceRow;

        // --- Wire events ---

        // Search input: debounced input
        findInput.addEventListener('input', () => {
            clearTimeout(this._debounceTimer);
            this._debounceTimer = setTimeout(() => {
                this._searchTerm = findInput.value;
                this._updateSearch();
            }, 100);
        });

        // Search input: Enter -> findNext, Shift+Enter -> findPrevious
        findInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (e.shiftKey) {
                    this.findPrevious();
                } else {
                    this.findNext();
                }
            }
            if (e.key === 'Escape') {
                e.preventDefault();
                this.close();
            }
            // Prevent keydown from bubbling to the editor's input handler
            e.stopPropagation();
        });

        // Replace input: Enter -> replaceCurrent
        replaceInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (e.ctrlKey || e.metaKey) {
                    this.replaceAll();
                } else {
                    this.replaceCurrent();
                }
            }
            if (e.key === 'Escape') {
                e.preventDefault();
                this.close();
            }
            e.stopPropagation();
        });

        replaceInput.addEventListener('input', () => {
            this._replaceTerm = replaceInput.value;
        });

        // Buttons
        prevBtn.addEventListener('click', () => this.findPrevious());
        nextBtn.addEventListener('click', () => this.findNext());
        closeBtn.addEventListener('click', () => this.close());
        replaceBtn.addEventListener('click', () => this.replaceCurrent());
        replaceAllBtn.addEventListener('click', () => this.replaceAll());

        // Option checkboxes
        const caseCheckbox = caseLabel.querySelector('input');
        const wordCheckbox = wordLabel.querySelector('input');
        const regexCheckbox = regexLabel.querySelector('input');

        caseCheckbox.addEventListener('change', () => {
            this._caseSensitive = caseCheckbox.checked;
            this._updateSearch();
        });

        wordCheckbox.addEventListener('change', () => {
            this._wholeWord = wordCheckbox.checked;
            this._updateSearch();
        });

        regexCheckbox.addEventListener('change', () => {
            this._useRegex = regexCheckbox.checked;
            this._updateSearch();
        });

        // Tab focus trapping
        panel.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                const focusable = panel.querySelectorAll('input, button');
                const first = focusable[0];
                const last = focusable[focusable.length - 1];

                if (e.shiftKey && document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
        });

        // Append to editor area (inside shadow root)
        if (this.editor._editorArea) {
            this.editor._editorArea.appendChild(panel);
        }
    }

    /**
     * Create an option toggle label with checkbox.
     *
     * @param {string} text - Label text
     * @param {string} title - Tooltip title
     * @param {boolean} checked - Initial checked state
     * @returns {HTMLElement}
     * @private
     */
    _createOptionLabel(text, title, checked) {
        const label = document.createElement('label');
        label.className = 'rte-find-option';
        label.title = title;

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = checked;

        const span = document.createElement('span');
        span.textContent = text;

        label.appendChild(checkbox);
        label.appendChild(span);

        return label;
    }

    // =========================================================================
    // Plugin interface methods
    // =========================================================================

    /**
     * Initialize the plugin with the editor instance.
     * Called by PluginManager after construction.
     * No-op if already initialized via constructor.
     *
     * @param {object} editor - RichTextEditor instance
     */
    init(editor) {
        if (this.editor) return;
        this.editor = editor;
    }

    /**
     * Return keybindings for find/replace.
     *
     * @returns {object} Keymap bindings
     */
    keymap() {
        return {
            'Mod-f': (state, dispatch) => { this.open('find'); return true; },
            'Mod-h': (state, dispatch) => { this.open('replace'); return true; }
        };
    }

    /**
     * Return toolbar item descriptors for find/replace.
     *
     * @returns {Array<object>}
     */
    toolbarItems() {
        return [
            { name: 'findReplace', type: 'button', command: () => this.open('find'), label: 'Find & Replace', icon: 'search' }
        ];
    }

    // =========================================================================
    // State Update Hook
    // =========================================================================

    /**
     * Called when editor state changes (document content updated).
     * Recalculates matches if the panel is open.
     */
    stateDidUpdate() {
        if (this._panelMode && this._searchTerm) {
            this._updateSearch();
        }
    }

    // =========================================================================
    // Cleanup
    // =========================================================================

    /**
     * Remove panel and clean up resources.
     */
    destroy() {
        clearTimeout(this._debounceTimer);

        if (this._panelEl && this._panelEl.parentNode) {
            this._panelEl.parentNode.removeChild(this._panelEl);
        }

        this._clearDecorations();
        this._panelEl = null;
        this._findInput = null;
        this._replaceInput = null;
        this._countEl = null;
        this._errorEl = null;
        this._replaceRow = null;
        this._matches = [];
        this.editor = null;
    }
}
