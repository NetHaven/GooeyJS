import GooeyElement from '../../../../GooeyElement.js';
import Template from '../../../../util/Template.js';

/**
 * FilterInvert Component
 *
 * Applies a CSS invert() filter function.
 *
 * @example
 * <gooeyui-filterinvert amount="1"></gooeyui-filterinvert>
 */
export default class FilterInvert extends GooeyElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        Template.activate("ui-FilterInvert", this.shadowRoot);
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
        return `invert(${this.amount})`;
    }
}
