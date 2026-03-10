import GooeyElement from '../../../../GooeyElement.js';
import Template from '../../../../util/Template.js';

/**
 * FilterContrast Component
 *
 * Applies a CSS contrast() filter function.
 *
 * @example
 * <gooeyui-filtercontrast amount="1.5"></gooeyui-filtercontrast>
 */
export default class FilterContrast extends GooeyElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        Template.activate("ui-FilterContrast", this.shadowRoot);
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
        return `contrast(${this.amount})`;
    }
}
