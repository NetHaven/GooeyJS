import Container from '../../../Container.js';
import LayoutType from '../../../layout/Layout/scripts/LayoutType.js';
import Template from '../../../../util/Template.js';
import Sanitizer from '../../../../util/Sanitizer.js';

export default class Panel extends Container {
    constructor () {
        super();

        Template.activate("ui-Panel", this.shadowRoot);
    }

    connectedCallback() {
        super.connectedCallback?.();
        if (!this._panelInit) {
            this._panelInit = true;
            if (!this.hasAttribute("layout")) {
                this.layout = LayoutType.FLOW;
            }
            if (this.hasAttribute("title")) {
                this.title = this.getAttribute("title");
            }
        }
    }

    get title() {
        return this.getAttribute("title");
    }

    set title(val) {
        this.setAttribute("title", val);
    }

    /**
     * Set HTML content in the panel.
     * Creates a dynamic content container and replaces its content with provided HTML.
     * @param {string} html - HTML string to inject
     */
    setContent(html) {
        let contentEl = this.shadowRoot.querySelector('.ui-Panel-dynamic-content');
        if (!contentEl) {
            contentEl = document.createElement('div');
            contentEl.className = 'ui-Panel-dynamic-content';
            this.shadowRoot.appendChild(contentEl);
        }
        contentEl.innerHTML = Sanitizer.sanitize(html);
    }

    /**
     * Clear dynamic content from the panel.
     */
    clearContent() {
        const contentEl = this.shadowRoot.querySelector('.ui-Panel-dynamic-content');
        if (contentEl) {
            contentEl.innerHTML = '';
        }
    }

    /**
     * Get the dynamic content container element.
     * @returns {HTMLElement|null} The dynamic content container, or null if not created
     */
    getContentElement() {
        return this.shadowRoot.querySelector('.ui-Panel-dynamic-content');
    }
}
