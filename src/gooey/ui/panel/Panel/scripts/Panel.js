import Container from '../../../Container.js';
import LayoutType from '../../../layout/Layout/scripts/LayoutType.js';
import Template from '../../../../util/Template.js';

/**
 * Sanitize HTML to prevent XSS attacks
 * Removes script tags, event handlers, and javascript: URLs
 * @param {string} html - Raw HTML string
 * @returns {string} Sanitized HTML
 */
function sanitizeHTML(html) {
    if (!html) return '';

    // Create temporary element to parse HTML
    const temp = document.createElement('div');
    temp.textContent = html; // First escape as text
    const escaped = temp.innerHTML;

    // Parse as HTML
    temp.innerHTML = escaped;

    // Remove dangerous elements
    const scripts = temp.querySelectorAll('script, iframe, object, embed');
    scripts.forEach(el => el.remove());

    // Remove event handlers and javascript: URLs
    const allElements = temp.querySelectorAll('*');
    allElements.forEach(el => {
        // Remove on* event attributes
        Array.from(el.attributes).forEach(attr => {
            if (attr.name.startsWith('on')) {
                el.removeAttribute(attr.name);
            }
            // Remove javascript: URLs
            if (attr.value && attr.value.trim().toLowerCase().startsWith('javascript:')) {
                el.removeAttribute(attr.name);
            }
        });
    });

    return temp.innerHTML;
}

export default class Panel extends Container {
    constructor () {
        super();

        Template.activate("ui-Panel", this.shadowRoot);
        this.layout = LayoutType.FLOW;

        // Add support for title attribute
        if (this.hasAttribute("title")) {
            this.title = this.getAttribute("title");
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
        contentEl.innerHTML = sanitizeHTML(html);
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
