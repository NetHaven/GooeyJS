import GooeyElement from '../../../../GooeyElement.js';
import Template from '../../../../util/Template.js';

/**
 * FilterBlur Component
 *
 * Applies a Gaussian blur filter function.
 *
 * @example
 * <gooeyui-filterblur radius="5px"></gooeyui-filterblur>
 */
export default class FilterBlur extends GooeyElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        Template.activate("ui-FilterBlur", this.shadowRoot);
    }

    // ========== Properties ==========

    get radius() {
        return this.getAttribute("radius") || "0px";
    }

    set radius(val) {
        this.setAttribute("radius", String(val));
    }

    // ========== Public Methods ==========

    /**
     * Returns the CSS filter function value
     * @returns {string}
     */
    toCSSValue() {
        return `blur(${this.radius})`;
    }
}
