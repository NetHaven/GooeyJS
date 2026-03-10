import GooeyElement from '../../../../GooeyElement.js';
import Template from '../../../../util/Template.js';

/**
 * FilterDropShadow Component
 *
 * Applies a drop shadow filter function with x/y offset, blur radius, and optional color.
 *
 * @example
 * <gooeyui-filterdropshadow x="2px" y="4px" blur="6px" color="red"></gooeyui-filterdropshadow>
 */
export default class FilterDropShadow extends GooeyElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        Template.activate("ui-FilterDropShadow", this.shadowRoot);
    }

    // ========== Properties ==========

    get x() {
        return this.getAttribute("x") || "0px";
    }

    set x(val) {
        this.setAttribute("x", String(val));
    }

    get y() {
        return this.getAttribute("y") || "0px";
    }

    set y(val) {
        this.setAttribute("y", String(val));
    }

    get blur() {
        return this.getAttribute("blur") || "0px";
    }

    set blur(val) {
        this.setAttribute("blur", String(val));
    }

    get color() {
        return this.getAttribute("color");
    }

    set color(val) {
        if (val) {
            this.setAttribute("color", val);
        } else {
            this.removeAttribute("color");
        }
    }

    // ========== Public Methods ==========

    /**
     * Returns the CSS filter function value
     * @returns {string}
     */
    toCSSValue() {
        let value = `${this.x} ${this.y} ${this.blur}`;
        if (this.color) {
            value += ` ${this.color}`;
        }
        return `drop-shadow(${value})`;
    }
}
