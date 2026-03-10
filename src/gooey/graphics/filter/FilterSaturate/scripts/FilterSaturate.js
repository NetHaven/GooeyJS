import GooeyElement from '../../../../GooeyElement.js';
import Template from '../../../../util/Template.js';

/**
 * FilterSaturate Component
 *
 * Applies a CSS saturate() filter function.
 *
 * @example
 * <gooeyui-filtersaturate amount="2"></gooeyui-filtersaturate>
 */
export default class FilterSaturate extends GooeyElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        Template.activate("ui-FilterSaturate", this.shadowRoot);
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
        return `saturate(${this.amount})`;
    }
}
