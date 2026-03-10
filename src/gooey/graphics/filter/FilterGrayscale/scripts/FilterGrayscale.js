import GooeyElement from '../../../../GooeyElement.js';
import Template from '../../../../util/Template.js';

/**
 * FilterGrayscale Component
 *
 * Applies a CSS grayscale() filter function.
 *
 * @example
 * <gooeyui-filtergrayscale amount="0.5"></gooeyui-filtergrayscale>
 */
export default class FilterGrayscale extends GooeyElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        Template.activate("ui-FilterGrayscale", this.shadowRoot);
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
        return `grayscale(${this.amount})`;
    }
}
