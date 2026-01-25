import UIComponent from '../../UIComponent.js';
import CodeBlockEvent from '../../../events/CodeBlockEvent.js';
import Template from '../../../util/Template.js';

/**
 * CodeBlock component for displaying code snippets with line numbers,
 * copy button, and language label.
 *
 * Usage:
 * <gooeyui-codeblock language="javascript">
 * function hello() {
 *     console.log("Hello, World!");
 * }
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
        this.slot = this.shadowRoot.querySelector("slot");

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

        // Set up copy button click handler
        this.copyButton.addEventListener("click", () => {
            if (!this.disabled) {
                this._copyToClipboard();
            }
        });

        // Listen for slot content changes to update line numbers
        this.slot.addEventListener("slotchange", () => {
            this._updateLineNumbers();
        });

        // Initial line number update
        this._updateLineNumbers();

        // Update header visibility based on language and copybutton
        this._updateHeaderVisibility();
    }

    attributeChangedCallback(name, oldValue, newValue) {
        super.attributeChangedCallback?.(name, oldValue, newValue);
        if (oldValue === newValue) return;

        switch (name) {
            case 'language':
                this._updateLanguageLabel();
                this._updateHeaderVisibility();
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
        const nodes = this.slot.assignedNodes();
        return nodes.map(n => n.textContent).join('');
    }

    /**
     * Set the code content programmatically
     */
    set code(val) {
        // Clear existing light DOM content and set new content
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
     * Copy the code content to clipboard
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
            console.error("Failed to copy code to clipboard:", err);
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
