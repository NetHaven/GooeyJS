import GooeyElement from '../../../../GooeyElement.js';
import Template from '../../../../util/Template.js';

/**
 * FilterOpacity Component
 *
 * Applies a CSS opacity() filter function.
 *
 * @example
 * <gooeyui-filteropacity amount="0.5"></gooeyui-filteropacity>
 */
export default class FilterOpacity extends GooeyElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        Template.activate("ui-FilterOpacity", this.shadowRoot);
    }

    // ========== Properties ==========

    get amount() {
        return this.getAttribute("amount") || "1";
    }

    set amount(val) {
        this.setAttribute("amount", String(val));
    }

    // ========== Public Methods ==========

    /**
     * Returns the CSS filter function string
     * @returns {string}
     */
    toCSSValue() {
        return `opacity(${this.amount})`;
    }
}
