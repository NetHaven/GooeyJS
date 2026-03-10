import GooeyElement from '../../../../GooeyElement.js';
import Template from '../../../../util/Template.js';
import FilterTarget from '../../FilterTarget.js';

/**
 * Filter Component
 *
 * A definition component for CSS filters that composes child filter
 * function components into a single CSS filter or backdrop-filter value.
 *
 * @example
 * <gooeyui-filter target="filter">
 *     <gooeyui-filterblur radius="5px"></gooeyui-filterblur>
 *     <gooeyui-filterbrightness amount="1.5"></gooeyui-filterbrightness>
 * </gooeyui-filter>
 */
export default class Filter extends GooeyElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        Template.activate("ui-Filter", this.shadowRoot);
    }

    // ========== Properties ==========

    /**
     * The CSS property to target: "filter" or "backdrop-filter"
     * @returns {string}
     */
    get target() {
        return this.getAttribute("target") || FilterTarget.ELEMENT;
    }

    set target(val) {
        switch (val) {
            case FilterTarget.ELEMENT:
            case FilterTarget.BACKDROP:
                this.setAttribute("target", val);
        }
    }

    /**
     * Shorthand CSS filter value string, bypasses child composition
     * @returns {string|null}
     */
    get value() {
        return this.getAttribute("value");
    }

    set value(val) {
        if (val) {
            this.setAttribute("value", val);
        } else {
            this.removeAttribute("value");
        }
    }

    /**
     * Returns all child filter function elements
     * @returns {NodeList}
     */
    get filterFunctions() {
        return this.querySelectorAll(
            "gooeyui-filterblur, " +
            "gooeyui-filterbrightness, " +
            "gooeyui-filtercontrast, " +
            "gooeyui-filterdropshadow, " +
            "gooeyui-filtergrayscale, " +
            "gooeyui-filterhuerotate, " +
            "gooeyui-filterinvert, " +
            "gooeyui-filteropacity, " +
            "gooeyui-filtersaturate, " +
            "gooeyui-filtersepia, " +
            "gooeyui-filterurl"
        );
    }

    // ========== Public Methods ==========

    /**
     * Generates the CSS filter value string from children or shorthand
     * @returns {string} Complete CSS filter value
     */
    toCSSValue() {
        // Shorthand bypass
        if (this.value) {
            return this.value;
        }

        const functions = this.filterFunctions;

        if (functions.length === 0) {
            return "none";
        }

        return Array.from(functions)
            .map(fn => fn.toCSSValue())
            .join(" ");
    }

    /**
     * Applies this filter to a target element
     * @param {HTMLElement} target - Element to apply filter to
     */
    applyTo(target) {
        target.style.setProperty(this.target, this.toCSSValue());
    }

    /**
     * Removes this filter from a target element
     * @param {HTMLElement} target - Element to remove filter from
     */
    removeFrom(target) {
        target.style.removeProperty(this.target);
    }

    // ========== Static Methods ==========

    /**
     * Creates a CSS filter value string programmatically
     * @param {Object} config - Filter configuration
     * @param {Array<Object>} config.functions - Array of filter function configs
     * @param {string} config.functions[].type - Filter function type
     * @param {Object} config.functions[].params - Filter function parameters
     * @returns {string} CSS filter value
     */
    static create(config) {
        const { functions = [] } = config;

        if (functions.length === 0) {
            return "none";
        }

        const parts = functions
            .map(fn => Filter._createFunction(fn.type, fn.params || {}))
            .filter(v => v !== "");

        return parts.length > 0 ? parts.join(" ") : "none";
    }

    /**
     * Creates a single CSS filter function string
     * @param {string} type - Filter function type
     * @param {Object} params - Function parameters
     * @returns {string} CSS filter function string
     * @private
     */
    static _createFunction(type, params) {
        switch (type) {
            case "blur":
                return `blur(${params.radius || "0px"})`;
            case "brightness":
                return `brightness(${params.amount ?? 1})`;
            case "contrast":
                return `contrast(${params.amount ?? 1})`;
            case "drop-shadow":
                return `drop-shadow(${params.x || "0px"} ${params.y || "0px"} ${params.blur || "0px"}${params.color ? " " + params.color : ""})`;
            case "grayscale":
                return `grayscale(${params.amount ?? 0})`;
            case "hue-rotate":
                return `hue-rotate(${params.angle || "0deg"})`;
            case "invert":
                return `invert(${params.amount ?? 0})`;
            case "opacity":
                return `opacity(${params.amount ?? 1})`;
            case "saturate":
                return `saturate(${params.amount ?? 1})`;
            case "sepia":
                return `sepia(${params.amount ?? 0})`;
            case "url":
                return `url(${params.href || ""})`;
            default:
                return "";
        }
    }
}
