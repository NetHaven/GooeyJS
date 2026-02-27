import GooeyElement from '../../../../GooeyElement.js';
import Template from '../../../../util/Template.js';

/**
 * GradientStop Component
 *
 * Defines a single color stop within a Gradient component.
 *
 * @example
 * <gooeyui-gradientstop color="#ff0000" position="50%"></gooeyui-gradientstop>
 */
export default class GradientStop extends GooeyElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        Template.activate("ui-GradientStop", this.shadowRoot);
    }

    // ========== Properties ==========

    get color() {
        return this.getAttribute("color") || "#000000";
    }

    set color(val) {
        this.setAttribute("color", val);
    }

    get position() {
        return this.getAttribute("position");
    }

    set position(val) {
        if (val) {
            this.setAttribute("position", val);
        } else {
            this.removeAttribute("position");
        }
    }

    get hint() {
        return this.getAttribute("hint");
    }

    set hint(val) {
        if (val) {
            this.setAttribute("hint", val);
        } else {
            this.removeAttribute("hint");
        }
    }

    // ========== Public Methods ==========

    /**
     * Returns the CSS representation of this stop
     * @returns {string}
     */
    toCSSValue() {
        let value = this.color;

        if (this.hint) {
            value += ` ${this.hint}`;
        }

        if (this.position) {
            value += ` ${this.position}`;
        }

        return value;
    }
}
