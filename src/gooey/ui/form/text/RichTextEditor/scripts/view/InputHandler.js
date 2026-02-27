import { insertText, extendSelection, splitBlock, insertHardBreak } from "../state/Commands.js";
import { Selection } from "../model/Position.js";

/**
 * Set of navigation keys that support Shift-selection extension.
 * When Shift is held with these keys, the base command is wrapped
 * with extendSelection to extend the selection instead of collapsing it.
 */
const NAVIGATION_KEYS = new Set([
    "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown",
    "Home", "End"
]);

/**
 * InputHandler manages the hidden textarea that captures keyboard input.
 *
 * It captures keydown events and matches them against the keymap,
 * handles text input via the input event, and manages IME/composition
 * input (CJK, dictation, emoji pickers).
 *
 * This is a plain class (not a web component).
 */
export default class InputHandler {

    /**
     * @param {HTMLTextAreaElement} textarea - Hidden textarea element
     * @param {import('./EditorView.js').default} view - EditorView reference
     * @param {object} keymap - Keymap object mapping key strings to commands
     */
    constructor(textarea, view, keymap) {
        /** @type {HTMLTextAreaElement} */
        this.textarea = textarea;

        /** @type {import('./EditorView.js').default} */
        this.view = view;

        /** @type {object} */
        this.keymap = keymap || {};

        /** @type {boolean} Whether currently in IME composition */
        this._composing = false;

        /** @type {boolean} Whether input processing is disabled */
        this._disabled = false;

        /** @type {boolean} Whether input is read-only (allow selection but not text) */
        this._readOnly = false;

        // Bound handlers for cleanup
        this._onKeyDown = this._handleKeyDown.bind(this);
        this._onInput = this._handleInput.bind(this);
        this._onCompositionStart = this._handleCompositionStart.bind(this);
        this._onCompositionUpdate = this._handleCompositionUpdate.bind(this);
        this._onCompositionEnd = this._handleCompositionEnd.bind(this);

        // Attach listeners
        this.textarea.addEventListener("keydown", this._onKeyDown);
        this.textarea.addEventListener("input", this._onInput);
        this.textarea.addEventListener("compositionstart", this._onCompositionStart);
        this.textarea.addEventListener("compositionupdate", this._onCompositionUpdate);
        this.textarea.addEventListener("compositionend", this._onCompositionEnd);

        // Enable browser spellcheck and autocorrect on the hidden textarea.
        // Since the textarea captures all text input, corrections flow
        // through the normal input event pipeline.
        this.textarea.setAttribute("spellcheck", "true");
        this.textarea.setAttribute("autocorrect", "on");
        this.textarea.setAttribute("autocomplete", "off");
        this.textarea.setAttribute("autocapitalize", "sentences");
    }

    /**
     * Focus the hidden textarea.
     * Called when user clicks the editor area.
     */
    focus() {
        this.textarea.focus({ preventScroll: true });
    }

    /**
     * Blur the textarea.
     */
    blur() {
        this.textarea.blur();
    }

    /**
     * Check if the textarea has focus.
     * @returns {boolean}
     */
    hasFocus() {
        return document.activeElement === this.textarea ||
               (this.textarea.getRootNode && document.activeElement ===
                this.textarea.getRootNode().activeElement);
    }

    /**
     * Update the textarea position near the cursor for IME popup positioning.
     *
     * @param {{ left: number, top: number }} coords - Pixel coordinates
     */
    updatePosition(coords) {
        if (!coords) return;

        // Get the offset parent's rect for relative positioning
        const parentRect = this.textarea.offsetParent
            ? this.textarea.offsetParent.getBoundingClientRect()
            : { left: 0, top: 0 };

        this.textarea.style.left = `${coords.left - parentRect.left}px`;
        this.textarea.style.top = `${coords.top - parentRect.top}px`;
    }

    /**
     * Add a key binding dynamically.
     *
     * Used by EditorView to add arrow up/down commands that need
     * the view reference for coordinate mapping.
     *
     * @param {string} key - Key string (e.g., "ArrowUp")
     * @param {function} command - Command function (state, dispatch) => boolean
     */
    addKeyBinding(key, command) {
        this.keymap[key] = command;
    }

    /**
     * Remove a key binding.
     *
     * @param {string} key - Key string to remove
     */
    removeKeyBinding(key) {
        delete this.keymap[key];
    }

    /**
     * Set disabled state.
     * @param {boolean} disabled
     */
    set disabled(disabled) {
        this._disabled = !!disabled;
    }

    /**
     * Get disabled state.
     * @returns {boolean}
     */
    get disabled() {
        return this._disabled;
    }

    /**
     * Set read-only state.
     * @param {boolean} readOnly
     */
    set readOnly(readOnly) {
        this._readOnly = !!readOnly;
    }

    /**
     * Get read-only state.
     * @returns {boolean}
     */
    get readOnly() {
        return this._readOnly;
    }

    /**
     * Set spellcheck enabled state on the hidden textarea.
     * @param {boolean} enabled
     */
    setSpellcheck(enabled) {
        this.textarea.spellcheck = !!enabled;
        this.textarea.setAttribute("spellcheck", enabled ? "true" : "false");
    }

    /**
     * Set autocorrect enabled state on the hidden textarea.
     * @param {boolean} enabled
     */
    setAutocorrect(enabled) {
        this.textarea.setAttribute("autocorrect", enabled ? "on" : "off");
    }

    /**
     * Remove all listeners and clean up.
     */
    destroy() {
        this.textarea.removeEventListener("keydown", this._onKeyDown);
        this.textarea.removeEventListener("input", this._onInput);
        this.textarea.removeEventListener("compositionstart", this._onCompositionStart);
        this.textarea.removeEventListener("compositionupdate", this._onCompositionUpdate);
        this.textarea.removeEventListener("compositionend", this._onCompositionEnd);
        this.view = null;
        this.keymap = null;
    }

    // =========================================================================
    // Event handlers
    // =========================================================================

    /**
     * Handle keydown events. Match against keymap and dispatch commands.
     *
     * Shift+navigation keys are handled specially: the base movement
     * command is wrapped with extendSelection to extend the selection
     * instead of collapsing it.
     *
     * @param {KeyboardEvent} event
     * @private
     */
    _handleKeyDown(event) {
        if (this._disabled) return;

        // During composition, let the IME handle keys
        if (this._composing) return;

        // Handle Tab key for indentation
        if (event.key === "Tab" && !event.shiftKey && !this._readOnly) {
            event.preventDefault();
            this._dispatchInsertText("  ");
            this.textarea.value = "";
            return;
        }

        // Handle Shift+navigation keys for selection extension
        if (event.shiftKey && NAVIGATION_KEYS.has(event.key)) {
            // Build the key string WITHOUT the Shift modifier
            // to find the base navigation command
            const baseKeyStr = this._buildBaseKeyString(event);
            const baseCommand = this.keymap[baseKeyStr];

            if (baseCommand) {
                const wrappedCommand = extendSelection(baseCommand);
                const state = this.view.state;
                const dispatch = (tr) => {
                    if (this.view.dispatch) {
                        this.view.dispatch(tr);
                    }
                };

                const handled = wrappedCommand(state, dispatch);
                if (handled) {
                    event.preventDefault();
                    this.textarea.value = "";
                    return;
                }
            }
        }

        const keyStr = this._buildKeyString(event);
        const command = this.keymap[keyStr];

        if (command) {
            const state = this.view.state;
            const dispatch = (tr) => {
                if (this.view.dispatch) {
                    this.view.dispatch(tr);
                }
            };

            const handled = command(state, dispatch);
            if (handled) {
                event.preventDefault();
                // Clear textarea after command execution
                this.textarea.value = "";
                return;
            }
        }

        // Handle Enter key for block splitting and Shift-Enter for hard break
        if (event.key === "Enter" && !this._readOnly) {
            event.preventDefault();
            if (event.shiftKey) {
                const cmd = insertHardBreak;
                cmd(this.view.state, (tr) => this.view.dispatch(tr));
            } else {
                const cmd = splitBlock;
                cmd(this.view.state, (tr) => this.view.dispatch(tr));
            }
            this.textarea.value = "";
            return;
        }
    }

    /**
     * Handle input events (text typed into textarea).
     *
     * During composition, we skip this — compositionend handles it.
     *
     * @param {InputEvent} event
     * @private
     */
    _handleInput(event) {
        if (this._disabled || this._readOnly) {
            this.textarea.value = "";
            return;
        }

        // Skip during composition — wait for compositionend
        if (this._composing) return;

        const text = this.textarea.value;
        if (text) {
            this._dispatchInsertText(text);
            this.textarea.value = "";
        }
    }

    /**
     * Handle compositionstart (IME input begins).
     *
     * @param {CompositionEvent} event
     * @private
     */
    _handleCompositionStart(event) {
        this._composing = true;
    }

    /**
     * Handle compositionupdate (IME input in progress).
     *
     * @param {CompositionEvent} event
     * @private
     */
    _handleCompositionUpdate(event) {
        // During composition, we don't process input — the textarea
        // shows the composing text and the IME popup is visible.
    }

    /**
     * Handle compositionend (IME input finalized).
     *
     * @param {CompositionEvent} event
     * @private
     */
    _handleCompositionEnd(event) {
        this._composing = false;

        if (this._disabled || this._readOnly) {
            this.textarea.value = "";
            return;
        }

        // Read the composed text and dispatch
        const text = this.textarea.value;
        if (text) {
            this._dispatchInsertText(text);
            this.textarea.value = "";
        }
    }

    // =========================================================================
    // Helpers
    // =========================================================================

    /**
     * Dispatch an insertText command for the given text.
     *
     * If the editor state has stored marks, they are applied to the
     * inserted text range after insertion.
     *
     * @param {string} text
     * @private
     */
    _dispatchInsertText(text) {
        if (!this.view || !this.view.dispatch) return;

        const state = this.view.state;
        const storedMarks = state.marks;

        if (storedMarks && storedMarks.length > 0) {
            // Insert text with stored marks applied
            const { from, to } = state.selection;
            const tr = state.transaction;

            // Delete selection range first if not empty
            if (from !== to) {
                tr.deleteRange(from, to);
            }

            tr.insertText(text, from);
            // Apply stored marks to the inserted text range
            for (const mark of storedMarks) {
                tr.addMark(from, from + text.length, mark);
            }
            tr.setSelection(Selection.cursor(from + text.length));
            // Clear stored marks after applying
            tr.setStoredMarks([]);

            this.view.dispatch(tr);
        } else {
            const cmd = insertText(text);
            cmd(state, (tr) => {
                this.view.dispatch(tr);
            });
        }
    }

    /**
     * Build a normalized key string from a KeyboardEvent.
     *
     * Handles modifier keys and produces strings like "Ctrl-b", "Mod-a", etc.
     * Uses the same normalization as the Commands keymap.
     *
     * @param {KeyboardEvent} event
     * @returns {string}
     * @private
     */
    _buildKeyString(event) {
        const parts = [];
        const isMac = InputHandler._isMac();

        if (event.ctrlKey && !isMac) parts.push("Ctrl");
        if (event.metaKey && isMac) parts.push("Ctrl"); // Normalize Meta to Ctrl on Mac
        if (event.altKey) parts.push("Alt");
        if (event.shiftKey) parts.push("Shift");

        let key = event.key;

        // Normalize single-character keys to lowercase for matching
        // but keep special keys as-is
        if (key.length === 1) {
            key = key.toLowerCase();
        }

        // Map Mod- prefix: the keymap uses "Mod-" which resolves to
        // Ctrl on non-Mac and Meta on Mac. Since we normalize Meta->Ctrl
        // above on Mac, "Ctrl" in parts always matches "Mod-" bindings.

        parts.push(key);

        // Also produce a variant using "Mod-" prefix for lookup
        // since baseKeymap uses "Mod-a" style
        const keyStr = parts.join("-");

        // The keymap may use either "Mod-" or "Ctrl-"/"Meta-" prefix
        // We need to check both. Return the Mod- version first as that's
        // the canonical form used by baseKeymap.
        return keyStr;
    }

    /**
     * Build a key string for a navigation key WITHOUT the Shift modifier.
     *
     * Used when Shift is held with a navigation key to find the base
     * movement command (which will then be wrapped with extendSelection).
     *
     * @param {KeyboardEvent} event
     * @returns {string}
     * @private
     */
    _buildBaseKeyString(event) {
        const parts = [];
        const isMac = InputHandler._isMac();

        // Include modifiers EXCEPT Shift
        if (event.ctrlKey && !isMac) parts.push("Ctrl");
        if (event.metaKey && isMac) parts.push("Ctrl");
        if (event.altKey) parts.push("Alt");

        let key = event.key;
        if (key.length === 1) {
            key = key.toLowerCase();
        }

        parts.push(key);
        return parts.join("-");
    }

    /**
     * Detect Mac platform.
     * @returns {boolean}
     * @private
     */
    static _isMac() {
        if (typeof navigator === "undefined") return false;
        return /Mac|iPod|iPhone|iPad/.test(navigator.platform || "");
    }
}
