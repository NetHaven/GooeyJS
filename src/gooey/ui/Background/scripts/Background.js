import GooeyElement from '../../../GooeyElement.js';
import Template from '../../../util/Template.js';
import BackgroundSize from './BackgroundSize.js';
import BackgroundRepeat from './BackgroundRepeat.js';
import BackgroundAttachment from './BackgroundAttachment.js';
import BackgroundBlend from './BackgroundBlend.js';

/**
 * Background Component
 *
 * A styling component that defines background properties which can be
 * referenced by other components via the background attribute.
 *
 * @example
 * <gooeyui-background id="heroBg" color="#3498db"></gooeyui-background>
 * <gooeyui-panel background="#heroBg">Content</gooeyui-panel>
 *
 * @example
 * <gooeyui-gradient id="myGradient" type="linear" stops="#ff0000, #0000ff"></gooeyui-gradient>
 * <gooeyui-background id="gradBg" gradient="#myGradient"></gooeyui-background>
 * <gooeyui-panel background="#gradBg">Gradient content</gooeyui-panel>
 */
export default class Background extends GooeyElement {
    constructor() {
        super();
        Template.activate("ui-Background", this.shadowRoot);
    }

    // ========== Properties ==========

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

    get image() {
        return this.getAttribute("image");
    }

    set image(val) {
        if (val) {
            this.setAttribute("image", val);
        } else {
            this.removeAttribute("image");
        }
    }

    get gradient() {
        return this.getAttribute("gradient");
    }

    set gradient(val) {
        if (val) {
            this.setAttribute("gradient", val);
        } else {
            this.removeAttribute("gradient");
        }
    }

    get size() {
        return this.getAttribute("size") || BackgroundSize.AUTO;
    }

    set size(val) {
        switch (val) {
            case BackgroundSize.AUTO:
            case BackgroundSize.COVER:
            case BackgroundSize.CONTAIN:
                this.setAttribute("size", val);
        }
    }

    get position() {
        return this.getAttribute("position") || "center";
    }

    set position(val) {
        this.setAttribute("position", val);
    }

    get repeat() {
        return this.getAttribute("repeat") || BackgroundRepeat.NO_REPEAT;
    }

    set repeat(val) {
        switch (val) {
            case BackgroundRepeat.REPEAT:
            case BackgroundRepeat.REPEAT_X:
            case BackgroundRepeat.REPEAT_Y:
            case BackgroundRepeat.NO_REPEAT:
            case BackgroundRepeat.SPACE:
            case BackgroundRepeat.ROUND:
                this.setAttribute("repeat", val);
        }
    }

    get attachment() {
        return this.getAttribute("attachment") || BackgroundAttachment.SCROLL;
    }

    set attachment(val) {
        switch (val) {
            case BackgroundAttachment.SCROLL:
            case BackgroundAttachment.FIXED:
            case BackgroundAttachment.LOCAL:
                this.setAttribute("attachment", val);
        }
    }

    get opacity() {
        const val = this.getAttribute("opacity");
        return val !== null ? parseFloat(val) : 1;
    }

    set opacity(val) {
        const numVal = parseFloat(val);
        if (!isNaN(numVal) && numVal >= 0 && numVal <= 1) {
            this.setAttribute("opacity", numVal.toString());
        }
    }

    get blend() {
        return this.getAttribute("blend") || BackgroundBlend.NORMAL;
    }

    set blend(val) {
        switch (val) {
            case BackgroundBlend.NORMAL:
            case BackgroundBlend.MULTIPLY:
            case BackgroundBlend.SCREEN:
            case BackgroundBlend.OVERLAY:
            case BackgroundBlend.DARKEN:
            case BackgroundBlend.LIGHTEN:
                this.setAttribute("blend", val);
        }
    }

    // ========== Public Methods ==========

    /**
     * Resolves the gradient reference and returns the CSS gradient value
     * @returns {string|null} CSS gradient value or null if not found
     */
    getGradientValue() {
        const gradientSelector = this.gradient;
        if (!gradientSelector) {
            return null;
        }

        const gradientElement = document.querySelector(gradientSelector);
        if (gradientElement && typeof gradientElement.toCSSValue === 'function') {
            return gradientElement.toCSSValue();
        }

        return null;
    }

    /**
     * Generates CSS style object for this background definition
     * @returns {Object} CSS property-value pairs
     */
    getStyles() {
        const styles = {};

        // Build background-image (gradient reference takes precedence, then image)
        const gradientValue = this.getGradientValue();
        if (gradientValue) {
            styles.backgroundImage = gradientValue;
        } else if (this.image) {
            styles.backgroundImage = `url('${this.image}')`;
        }

        // Background color
        if (this.color) {
            styles.backgroundColor = this.color;
        }

        // Image-related properties (apply if we have image or gradient)
        if (this.image || gradientValue) {
            styles.backgroundSize = this.size;
            styles.backgroundPosition = this.position;
            styles.backgroundRepeat = this.repeat;
            styles.backgroundAttachment = this.attachment;
        }

        // Blend mode
        if (this.blend !== BackgroundBlend.NORMAL) {
            styles.backgroundBlendMode = this.blend;
        }

        return styles;
    }

    /**
     * Generates CSS string for inline application
     * @returns {string} CSS style string
     */
    toCSSString() {
        const styles = this.getStyles();
        return Object.entries(styles)
            .map(([prop, val]) => `${this._camelToKebab(prop)}: ${val}`)
            .join('; ');
    }

    /**
     * Applies this background to a target element
     * @param {HTMLElement} target - Element to apply background to
     */
    applyTo(target) {
        const styles = this.getStyles();

        for (const [prop, val] of Object.entries(styles)) {
            target.style[prop] = val;
        }

        // Handle opacity via CSS custom property
        if (this.opacity < 1) {
            target.style.setProperty('--bg-opacity', this.opacity);
        }
    }

    /**
     * Converts camelCase to kebab-case
     * @param {string} str - camelCase string
     * @returns {string} kebab-case string
     * @private
     */
    _camelToKebab(str) {
        return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
    }
}
