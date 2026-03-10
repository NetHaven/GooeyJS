import GooeyElement from '../../../../GooeyElement.js';
import Template from '../../../../util/Template.js';

/**
 * FilterHueRotate Component
 *
 * Applies a hue rotation filter function.
 *
 * @example
 * <gooeyui-filterhuerotate angle="90deg"></gooeyui-filterhuerotate>
 */
export default class FilterHueRotate extends GooeyElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        Template.activate("ui-FilterHueRotate", this.shadowRoot);
    }

    // ========== Properties ==========

    get angle() {
        return this.getAttribute("angle") || "0deg";
    }

    set angle(val) {
        this.setAttribute("angle", String(val));
    }

    // ========== Public Methods ==========

    /**
     * Returns the CSS filter function value
     * @returns {string}
     */
    toCSSValue() {
        return `hue-rotate(${this.angle})`;
    }
}
