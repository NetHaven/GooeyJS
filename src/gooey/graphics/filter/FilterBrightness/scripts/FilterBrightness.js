import GooeyElement from '../../../../GooeyElement.js';
import Template from '../../../../util/Template.js';

/**
 * FilterBrightness Component
 *
 * Applies a CSS brightness() filter function.
 *
 * @example
 * <gooeyui-filterbrightness amount="1.5"></gooeyui-filterbrightness>
 */
export default class FilterBrightness extends GooeyElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        Template.activate("ui-FilterBrightness", this.shadowRoot);
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
        return `brightness(${this.amount})`;
    }
}
