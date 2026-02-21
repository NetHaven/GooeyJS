import UIComponent from '../../UIComponent.js';
import CodeBlockEvent from '../../../events/CodeBlockEvent.js';
import Template from '../../../util/Template.js';
import TokenizerRegistry from '../../../util/syntax/TokenizerRegistry.js';
import Logger from '../../../logging/Logger.js';

/**
 * CodeBlock component for displaying code snippets with line numbers,
 * copy button, language label, and optional syntax highlighting.
 *
 * Usage:
 * <gooeyui-codeblock language="html" syntaxhighlight>
 * <div class="main">Hello</div>
 * </gooeyui-codeblock>
 */
export default class CodeBlock extends UIComponent {
    constructor() {
        super();

        Template.activate("ui-CodeBlock", this.shadowRoot);

        // Query internal elements
        this.container = this.shadowRoot.querySelector(".codeblock-container");
        this.header = this.shadowRoot.querySelector(".codeblock-header");
        this.languageLabel = this.shadowRoot.querySelector(".language-label");
        this.copyButton = this.shadowRoot.querySelector(".copy-button");
        this.lineNumbers = this.shadowRoot.querySelector(".line-numbers");
        this.codeContent = this.shadowRoot.querySelector(".code-content");
        this.codeHighlighted = this.shadowRoot.querySelector(".code-highlighted");
        this.highlightedCode = this.codeHighlighted.querySelector("code");
        this._slot = this.shadowRoot.querySelector("slot");

        // Syntax highlighting state
        this._highlightPending = false;
        this._tokenizer = null;
        this._tokenizerLanguage = null;

        // Initialize attributes
        if (this.hasAttribute("language")) {
            this.language = this.getAttribute("language");
        }

        // Default linenumbers to true if not specified
        if (!this.hasAttribute("linenumbers")) {
            this.setAttribute("linenumbers", "true");
        }
        this._updateLineNumbersVisibility();

        // Default copybutton to true if not specified
        if (!this.hasAttribute("copybutton")) {
            this.setAttribute("copybutton", "true");
        }
        this._updateCopyButtonVisibility();

        // Register events
        this.addValidEvent(CodeBlockEvent.COPY);
        this.addValidEvent(CodeBlockEvent.HIGHLIGHT_ERROR);

        // Set up copy button click handler
        this.copyButton.addEventListener("click", () => {
            if (!this.disabled) {
                this._copyToClipboard();
            }
        });

        // Listen for slot content changes to update line numbers and highlighting
        if (this._slot) {
            this._slot.addEventListener("slotchange", () => {
                this._updateLineNumbers();
                this._requestHighlight();
            });
        }

        // Initial line number update
        this._updateLineNumbers();

        // Update header visibility based on language and copybutton
        this._updateHeaderVisibility();

        // Initial syntax highlighting if attributes are already set
        this._requestHighlight();
    }

    attributeChangedCallback(name, oldValue, newValue) {
        super.attributeChangedCallback?.(name, oldValue, newValue);
        if (oldValue === newValue) return;

        switch (name) {
            case 'language':
                this._updateLanguageLabel();
                this._updateHeaderVisibility();
                this._requestHighlight();
                break;
            case 'syntaxhighlight':
                this._updateHighlightVisibility();
                this._requestHighlight();
                break;
            case 'linenumbers':
                this._updateLineNumbersVisibility();
                break;
            case 'copybutton':
                this._updateCopyButtonVisibility();
                this._updateHeaderVisibility();
                break;
            case 'disabled':
                this._updateDisabledState();
                break;
        }
    }

    /**
     * Get the code content from the slot
     */
    get code() {
        if (!this._slot) return this.textContent || '';
        const nodes = this._slot.assignedNodes();
        return nodes.map(n => n.textContent).join('');
    }

    /**
     * Set the code content programmatically
     */
    set code(val) {
        // Clear existing light DOM content and set new content
        // Setting textContent triggers slotchange, which calls
        // _updateLineNumbers() and _requestHighlight() automatically
        this.textContent = val;
    }

    get language() {
        return this.getAttribute("language");
    }

    set language(val) {
        if (val) {
            this.setAttribute("language", val);
        } else {
            this.removeAttribute("language");
        }
        this._updateLanguageLabel();
        this._updateHeaderVisibility();
    }

    get linenumbers() {
        return this.getAttribute("linenumbers") !== "false";
    }

    set linenumbers(val) {
        this.setAttribute("linenumbers", val ? "true" : "false");
        this._updateLineNumbersVisibility();
    }

    get copybutton() {
        return this.getAttribute("copybutton") !== "false";
    }

    set copybutton(val) {
        this.setAttribute("copybutton", val ? "true" : "false");
        this._updateCopyButtonVisibility();
        this._updateHeaderVisibility();
    }

    /**
     * Whether syntax highlighting is enabled.
     * @returns {boolean}
     */
    get syntaxhighlight() {
        return this.hasAttribute("syntaxhighlight");
    }

    /**
     * Enable or disable syntax highlighting.
     * @param {boolean} val
     */
    set syntaxhighlight(val) {
        if (val) {
            this.setAttribute("syntaxhighlight", "");
        } else {
            this.removeAttribute("syntaxhighlight");
        }
    }

    // ---- Syntax Highlighting ----

    /**
     * Request a syntax highlight update. Debounces rapid calls via microtask.
     * @private
     */
    _requestHighlight() {
        if (this._highlightPending) return;
        this._highlightPending = true;

        queueMicrotask(() => {
            this._highlightPending = false;
            this._performHighlight();
        });
    }

    /**
     * Perform the actual syntax highlighting.
     * If syntaxhighlight is off or language is not set, shows plain slot content.
     * Otherwise, loads the tokenizer (lazy), tokenizes, and renders.
     * @private
     */
    async _performHighlight() {
        if (!this.syntaxhighlight || !this.language) {
            this._showPlainCode();
            return;
        }

        const language = this.language.toLowerCase();

        if (!TokenizerRegistry.hasTokenizer(language)) {
            this._showPlainCode();
            return;
        }

        try {
            if (!this._tokenizer || this._tokenizerLanguage !== language) {
                this._tokenizer = await TokenizerRegistry.getTokenizer(language);
                this._tokenizerLanguage = language;
            }

            if (!this._tokenizer) {
                this._showPlainCode();
                return;
            }

            const code = this.code;
            const tokens = this._tokenizer.tokenize(code);
            const highlightedHTML = this._tokenizer.render(tokens);

            this.highlightedCode.innerHTML = highlightedHTML;
            this._showHighlightedCode();
            this._updateLineNumbers();

        } catch (error) {
            Logger.error({ code: "CODEBLOCK_HIGHLIGHT_FAILED", language, err: error }, "Syntax highlighting failed for language '%s'", language);
            this.fireEvent(CodeBlockEvent.HIGHLIGHT_ERROR, {
                language: language,
                error: error.message
            });
            this._showPlainCode();
        }
    }

    /**
     * Show the plain slot-based code view, hide the highlighted view.
     * @private
     */
    _showPlainCode() {
        this.codeContent.style.display = '';
        this.codeHighlighted.style.display = 'none';
    }

    /**
     * Show the highlighted code view, hide the plain slot view.
     * @private
     */
    _showHighlightedCode() {
        this.codeContent.style.display = 'none';
        this.codeHighlighted.style.display = '';
    }

    /**
     * Update visibility when syntaxhighlight attribute changes.
     * Clears highlighted content when disabled to free memory.
     * @private
     */
    _updateHighlightVisibility() {
        if (!this.syntaxhighlight) {
            this._showPlainCode();
            this.highlightedCode.innerHTML = '';
            this._tokenizer = null;
            this._tokenizerLanguage = null;
        }
    }

    // ---- Existing Private Methods ----

    /**
     * Copy the code content to clipboard (always copies raw text)
     */
    async _copyToClipboard() {
        const code = this.code;

        try {
            await navigator.clipboard.writeText(code);

            // Visual feedback - temporarily change button text
            const originalText = this.copyButton.textContent;
            this.copyButton.textContent = "Copied!";
            setTimeout(() => {
                this.copyButton.textContent = originalText;
            }, 2000);

            this.fireEvent(CodeBlockEvent.COPY, { code });
        } catch (err) {
            Logger.error({ code: "CODEBLOCK_CLIPBOARD_FAILED", err }, "Failed to copy code to clipboard");
        }
    }

    /**
     * Update line numbers based on code content
     */
    _updateLineNumbers() {
        const code = this.code;
        const lines = code.split('\n');

        // Handle trailing newline - if code ends with newline, don't count empty last line
        const lineCount = code.endsWith('\n') ? lines.length - 1 : lines.length;

        // Generate line numbers
        let lineNumbersHTML = '';
        for (let i = 1; i <= Math.max(1, lineCount); i++) {
            lineNumbersHTML += `<span>${i}</span>\n`;
        }

        this.lineNumbers.innerHTML = lineNumbersHTML;
    }

    /**
     * Show/hide line numbers based on attribute
     */
    _updateLineNumbersVisibility() {
        if (this.linenumbers) {
            this.lineNumbers.style.display = '';
        } else {
            this.lineNumbers.style.display = 'none';
        }
    }

    /**
     * Show/hide copy button based on attribute
     */
    _updateCopyButtonVisibility() {
        if (this.copybutton) {
            this.copyButton.style.display = '';
        } else {
            this.copyButton.style.display = 'none';
        }
    }

    /**
     * Update language label display
     */
    _updateLanguageLabel() {
        const language = this.language;
        if (language) {
            this.languageLabel.textContent = language;
            this.languageLabel.style.display = '';
        } else {
            this.languageLabel.textContent = '';
            this.languageLabel.style.display = 'none';
        }
    }

    /**
     * Show/hide header based on whether language or copybutton is shown
     */
    _updateHeaderVisibility() {
        const hasLanguage = !!this.language;
        const hasCopyButton = this.copybutton;

        if (hasLanguage || hasCopyButton) {
            this.header.style.display = '';
        } else {
            this.header.style.display = 'none';
        }
    }

    /**
     * Update disabled state for interactive elements
     */
    _updateDisabledState() {
        if (this.disabled) {
            this.copyButton.disabled = true;
            this.container.setAttribute("disabled", "");
        } else {
            this.copyButton.disabled = false;
            this.container.removeAttribute("disabled");
        }
    }
}
