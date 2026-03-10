import GooeyElement from '../../../../GooeyElement.js';
import Template from '../../../../util/Template.js';

/**
 * FilterUrl Component
 *
 * References an SVG filter via URL.
 *
 * @example
 * <gooeyui-filterurl href="#svgFilter"></gooeyui-filterurl>
 */
export default class FilterUrl extends GooeyElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        Template.activate("ui-FilterUrl", this.shadowRoot);
    }

    // ========== Properties ==========

    get href() {
        return this.getAttribute("href");
    }

    set href(val) {
        if (val) {
            this.setAttribute("href", val);
        } else {
            this.removeAttribute("href");
        }
    }

    // ========== Public Methods ==========

    /**
     * Returns the CSS filter function value
     * @returns {string}
     */
    toCSSValue() {
        return `url(${this.href})`;
    }
}
