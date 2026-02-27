import GooeyElement from '../../../../GooeyElement.js';
import Template from '../../../../util/Template.js';
import GradientType from '../../GradientType.js';
import GradientDirection from '../../GradientDirection.js';
import GradientShape from '../../GradientShape.js';
import GradientSize from '../../GradientSize.js';

/**
 * Gradient Component
 *
 * A definition component for CSS gradients that can be referenced
 * by other components for background styling.
 *
 * @example
 * <gooeyui-gradient id="myGradient" type="linear" angle="45deg"
 *     stops="#ff0000, #0000ff">
 * </gooeyui-gradient>
 */
export default class Gradient extends GooeyElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        Template.activate("ui-Gradient", this.shadowRoot);
    }

    // ========== Properties ==========

    get type() {
        return this.getAttribute("type") || GradientType.LINEAR;
    }

    set type(val) {
        switch (val) {
            case GradientType.LINEAR:
            case GradientType.RADIAL:
            case GradientType.CONIC:
                this.setAttribute("type", val);
        }
    }

    get repeating() {
        return this.hasAttribute("repeating");
    }

    set repeating(val) {
        if (val) {
            this.setAttribute("repeating", "");
        } else {
            this.removeAttribute("repeating");
        }
    }

    get angle() {
        return this.getAttribute("angle") || "180deg";
    }

    set angle(val) {
        this.setAttribute("angle", val);
    }

    get shape() {
        return this.getAttribute("shape") || GradientShape.ELLIPSE;
    }

    set shape(val) {
        switch (val) {
            case GradientShape.CIRCLE:
            case GradientShape.ELLIPSE:
                this.setAttribute("shape", val);
        }
    }

    get size() {
        return this.getAttribute("size") || GradientSize.FARTHEST_CORNER;
    }

    set size(val) {
        switch (val) {
            case GradientSize.CLOSEST_CORNER:
            case GradientSize.CLOSEST_SIDE:
            case GradientSize.FARTHEST_CORNER:
            case GradientSize.FARTHEST_SIDE:
                this.setAttribute("size", val);
        }
    }

    get position() {
        return this.getAttribute("position") || "center";
    }

    set position(val) {
        this.setAttribute("position", val);
    }

    get from() {
        return this.getAttribute("from") || "0deg";
    }

    set from(val) {
        this.setAttribute("from", val);
    }

    get stops() {
        return this.getAttribute("stops");
    }

    set stops(val) {
        if (val) {
            this.setAttribute("stops", val);
        } else {
            this.removeAttribute("stops");
        }
    }

    /**
     * Returns all GradientStop children
     * @returns {Array<HTMLElement>}
     */
    get gradientStops() {
        return Array.from(this.querySelectorAll("gooeyui-gradientstop"));
    }

    // ========== Public Methods ==========

    /**
     * Generates the CSS gradient string
     * @returns {string} Complete CSS gradient value
     */
    toCSSValue() {
        const functionName = this._getGradientFunctionName();
        const params = this._buildGradientParams();
        const colorStops = this._getColorStops();

        return `${functionName}(${params}${colorStops})`;
    }

    /**
     * Applies this gradient as background-image to target element
     * @param {HTMLElement} target - Element to apply gradient to
     */
    applyTo(target) {
        target.style.backgroundImage = this.toCSSValue();
    }

    // ========== Private Methods ==========

    _getGradientFunctionName() {
        const prefix = this.repeating ? 'repeating-' : '';
        return `${prefix}${this.type}-gradient`;
    }

    _buildGradientParams() {
        switch (this.type) {
            case GradientType.LINEAR:
                return this._buildLinearParams();
            case GradientType.RADIAL:
                return this._buildRadialParams();
            case GradientType.CONIC:
                return this._buildConicParams();
            default:
                return '';
        }
    }

    _buildLinearParams() {
        const angle = this.angle;
        // Handle keyword directions and angle values
        return `${angle}, `;
    }

    _buildRadialParams() {
        const parts = [];

        // Shape
        parts.push(this.shape);

        // Size
        parts.push(this.size);

        // Position
        parts.push(`at ${this.position}`);

        return parts.join(' ') + ', ';
    }

    _buildConicParams() {
        const parts = [];

        // From angle
        if (this.from && this.from !== '0deg') {
            parts.push(`from ${this.from}`);
        }

        // Position
        parts.push(`at ${this.position}`);

        return parts.join(' ') + ', ';
    }

    _getColorStops() {
        // Check for child GradientStop elements first
        const stopElements = this.gradientStops;

        if (stopElements.length > 0) {
            return stopElements
                .map(stop => stop.toCSSValue())
                .join(', ');
        }

        // Fall back to stops attribute
        return this.stops || '#000000, #ffffff';
    }

    // ========== Static Methods ==========

    /**
     * Creates a gradient CSS value programmatically
     * @param {Object} config - Gradient configuration
     * @returns {string} CSS gradient value
     */
    static create(config) {
        const {
            type = GradientType.LINEAR,
            repeating = false,
            angle = '180deg',
            shape = GradientShape.ELLIPSE,
            size = GradientSize.FARTHEST_CORNER,
            position = 'center',
            from = '0deg',
            stops = ['#000000', '#ffffff']
        } = config;

        const prefix = repeating ? 'repeating-' : '';
        const funcName = `${prefix}${type}-gradient`;

        let params = '';
        switch (type) {
            case GradientType.LINEAR:
                params = `${angle}, `;
                break;
            case GradientType.RADIAL:
                params = `${shape} ${size} at ${position}, `;
                break;
            case GradientType.CONIC:
                params = from !== '0deg'
                    ? `from ${from} at ${position}, `
                    : `at ${position}, `;
                break;
        }

        const stopsStr = Array.isArray(stops) ? stops.join(', ') : stops;

        return `${funcName}(${params}${stopsStr})`;
    }
}
