import GooeyElement from '../../../../GooeyElement.js';
import Template from '../../../../util/Template.js';
import URLSanitizer from '../../../../util/URLSanitizer.js';

/**
 * FilterUrl Component
 *
 * References an SVG filter via URL.
 *
 * @example
 * <gooeyui-filterurl href="#svgFilter"></gooeyui-filterurl>
 */
export default class FilterUrl extends GooeyElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        Template.activate("ui-FilterUrl", this.shadowRoot);
    }

    // ========== Properties ==========

    get href() {
        return this.getAttribute("href");
    }

    set href(val) {
        if (val) {
            const safeVal = URLSanitizer.validateAssetURL(val);
            if (safeVal) {
                this.setAttribute("href", safeVal);
            } else {
                this.removeAttribute("href");
            }
        } else {
            this.removeAttribute("href");
        }
    }

    // ========== Public Methods ==========

    /**
     * Returns the CSS filter function value
     * @returns {string}
     */
    toCSSValue() {
        const safe = this.href ? URLSanitizer.validateAssetURL(this.href) : null;
        if (!safe) return '';
        return `url(${safe})`;
    }
}
