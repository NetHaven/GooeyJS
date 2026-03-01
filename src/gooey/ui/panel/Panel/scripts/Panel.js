import Container from '../../../Container.js';
import LayoutType from '../../../layout/Layout/scripts/LayoutType.js';
import Template from '../../../../util/Template.js';

// Allowed HTML tags and their permitted attributes
const ALLOWED_TAGS = new Set(['b', 'i', 'u', 'em', 'strong', 'span', 'p', 'br',
    'ul', 'ol', 'li', 'a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'blockquote', 'code', 'pre', 'table', 'thead', 'tbody', 'tr', 'td', 'th',
    'div', 'hr', 'small', 'sub', 'sup', 'mark', 'del', 'ins']);

const ALLOWED_ATTRS = new Set(['class', 'id', 'style', 'href', 'target', 'title',
    'colspan', 'rowspan', 'align', 'valign']);

/**
 * Sanitize HTML using a DOM-based allowlist approach.
 * Parses input as HTML directly (does not pre-escape), then removes
 * elements not in ALLOWED_TAGS (replacing them with their text content)
 * and strips disallowed, on* event, and javascript: URL attributes.
 * @param {string} html - Raw HTML string
 * @returns {string} Sanitized HTML with safe markup preserved
 */
function sanitizeHTML(html) {
    if (!html) return '';

    // Parse as HTML directly (do NOT pre-escape as textContent)
    const temp = document.createElement('div');
    temp.innerHTML = html;

    // Walk and sanitize all elements
    const walker = document.createTreeWalker(temp, NodeFilter.SHOW_ELEMENT);
    const toRemove = [];

    let node = walker.nextNode();
    while (node) {
        const tagName = node.tagName.toLowerCase();
        if (!ALLOWED_TAGS.has(tagName)) {
            toRemove.push(node);
        } else {
            // Remove disallowed attributes
            Array.from(node.attributes).forEach(attr => {
                const name = attr.name.toLowerCase();
                const value = attr.value;
                if (!ALLOWED_ATTRS.has(name) || name.startsWith('on')) {
                    node.removeAttribute(attr.name);
                } else if (value && value.trim().toLowerCase().startsWith('javascript:')) {
                    node.removeAttribute(attr.name);
                }
            });
        }
        node = walker.nextNode();
    }

    // Remove disallowed elements (replace with their text content to preserve text)
    toRemove.forEach(el => {
        const text = document.createTextNode(el.textContent);
        el.parentNode?.replaceChild(text, el);
    });

    return temp.innerHTML;
}

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
