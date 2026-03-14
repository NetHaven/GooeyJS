/**
 * Static utility for resolving icon references to DOM elements.
 *
 * Handles two reference formats:
 * - URL strings: validated through URLSanitizer, returned as img elements
 * - #id references: looked up in the DOM, cloned if they are gooeyui-icon elements
 *
 * Used by components with icon attributes to convert icon attribute values
 * into renderable DOM elements with consistent validation and precedence.
 *
 * @module IconResolver
 */

import URLSanitizer from "./URLSanitizer.js";

export default class IconResolver {

    /**
     * Resolve an icon reference to a DOM element.
     *
     * @param {string} reference - A URL string or "#id" reference
     * @returns {HTMLElement|undefined} An img element (for URLs), a cloned gooeyui-icon
     *          element (for #id references), or undefined if the reference is invalid
     */
    static resolve(reference) {
        if (!reference || typeof reference !== "string") {
            return undefined;
        }

        if (reference.startsWith("#")) {
            return IconResolver._resolveIdReference(reference);
        }

        return IconResolver._resolveURL(reference);
    }

    /**
     * Resolve an icon with precedence: slotted icon > #id/URL reference > hidden.
     *
     * @param {HTMLElement} host - The component element
     * @param {string} iconAttr - The icon attribute value
     * @returns {HTMLElement|undefined} The resolved icon element, or undefined if hidden
     */
    static resolveWithPrecedence(host, iconAttr) {
        // 1. Slotted icon takes highest precedence
        const slotted = host.querySelector('[slot="icon"]');
        if (slotted) {
            return slotted;
        }

        // 2. Resolve from attribute (#id or URL)
        if (iconAttr) {
            return IconResolver.resolve(iconAttr);
        }

        // 3. No icon — hidden
        return undefined;
    }

    /**
     * Resolve a #id reference to a cloned gooeyui-icon element.
     *
     * @param {string} reference - A "#id" string
     * @returns {HTMLElement|undefined} A cloned gooeyui-icon element, or undefined
     * @private
     */
    static _resolveIdReference(reference) {
        const id = reference.slice(1);
        const element = document.getElementById(id);

        if (!element) {
            return undefined;
        }

        if (element.tagName !== "GOOEYUI-ICON") {
            return undefined;
        }

        const clone = element.cloneNode(true);
        clone.removeAttribute("id");
        return clone;
    }

    /**
     * Resolve a URL string to an img element with validated src.
     *
     * @param {string} reference - A URL string
     * @returns {HTMLImageElement|undefined} An img element, or undefined if the URL is invalid
     * @private
     */
    static _resolveURL(reference) {
        const safeURL = URLSanitizer.validateAssetURL(reference);

        if (safeURL === null) {
            return undefined;
        }

        const img = document.createElement("img");
        img.src = safeURL;
        return img;
    }
}
