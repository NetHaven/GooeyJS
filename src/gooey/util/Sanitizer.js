/**
 * Shared HTML sanitization utility with configurable profiles.
 *
 * Provides DOM-based allowlist sanitization to prevent XSS attacks.
 * All components that inject user-provided HTML should use this utility
 * rather than implementing inline sanitizers.
 *
 * @module Sanitizer
 */

/**
 * Default tag allowlist (union of all component needs).
 * @type {Set<string>}
 */
const ALLOWED_TAGS = new Set([
    'b', 'i', 'u', 'em', 'strong', 'span', 'p', 'br',
    'ul', 'ol', 'li', 'a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'blockquote', 'code', 'pre', 'table', 'thead', 'tbody', 'tr', 'td', 'th',
    'div', 'hr', 'small', 'sub', 'sup', 'mark', 'del', 'ins'
]);

/**
 * Safe attributes -- NO 'style' by default (FIX-11).
 * Components that need style support must opt in via allowStyle option.
 * @type {Set<string>}
 */
const ALLOWED_ATTRS = new Set([
    'class', 'id', 'href', 'target', 'title',
    'colspan', 'rowspan', 'align', 'valign'
]);

/**
 * Safe CSS properties for filtered style attribute when allowStyle is true.
 * @type {Set<string>}
 */
const ALLOWED_STYLE_PROPERTIES = new Set([
    'color', 'background-color', 'font-weight', 'font-style',
    'text-decoration', 'text-align', 'margin', 'padding',
    'border', 'display', 'width', 'height', 'font-size',
    'font-family', 'line-height', 'vertical-align', 'margin-left'
]);

/**
 * URL attributes that may contain dangerous schemes.
 * @type {Set<string>}
 */
const URL_ATTRIBUTES = new Set([
    'href', 'src', 'action', 'formaction', 'data', 'codebase'
]);

/**
 * Regex matching dangerous URL schemes including HTML-entity-encoded variants.
 * @type {RegExp}
 */
const DANGEROUS_URL_RE = /^\s*(javascript|vbscript|data\s*:\s*text\/html)\s*:/i;

/**
 * Decode HTML entities to detect obfuscated URL schemes.
 * @param {string} str
 * @returns {string}
 */
function _decodeHTMLEntities(str) {
    if (!str) return '';
    return str
        .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
        .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)));
}

export default class Sanitizer {
    /**
     * Sanitize HTML string using DOM-based allowlist.
     *
     * @param {string} html - Raw HTML
     * @param {Object} [options] - Configuration
     * @param {Set} [options.allowedTags] - Override tag allowlist
     * @param {Set} [options.allowedAttrs] - Override attribute allowlist
     * @param {boolean} [options.allowStyle] - Allow filtered style attribute (default false)
     * @returns {string} Sanitized HTML
     */
    static sanitize(html, options = {}) {
        if (!html) return '';

        const tags = options.allowedTags || ALLOWED_TAGS;
        const attrs = options.allowedAttrs || ALLOWED_ATTRS;
        const allowStyle = options.allowStyle || false;

        const temp = document.createElement('div');
        temp.innerHTML = html;

        const walker = document.createTreeWalker(temp, NodeFilter.SHOW_ELEMENT);
        const toRemove = [];

        let node = walker.nextNode();
        while (node) {
            const tagName = node.tagName.toLowerCase();
            if (!tags.has(tagName)) {
                toRemove.push(node);
            } else {
                Sanitizer._cleanAttributes(node, attrs, allowStyle);
            }
            node = walker.nextNode();
        }

        // Replace disallowed elements with their text content
        for (const el of toRemove) {
            const text = document.createTextNode(el.textContent);
            if (el.parentNode) {
                el.parentNode.replaceChild(text, el);
            }
        }

        return temp.innerHTML;
    }

    /**
     * Clean attributes on an element, removing dangerous ones.
     *
     * @param {Element} el - Element to clean
     * @param {Set} allowedAttrs - Allowed attribute names
     * @param {boolean} allowStyle - Whether to permit filtered style
     * @private
     */
    static _cleanAttributes(el, allowedAttrs, allowStyle) {
        const attrsToRemove = [];

        for (const attr of Array.from(el.attributes)) {
            const name = attr.name.toLowerCase();
            const value = attr.value;

            // Strip on* event handler attributes
            if (name.startsWith('on')) {
                attrsToRemove.push(attr.name);
                continue;
            }

            // Handle style attribute
            if (name === 'style') {
                if (allowStyle) {
                    const filtered = Sanitizer._filterStyle(value);
                    if (filtered) {
                        el.setAttribute('style', filtered);
                    } else {
                        attrsToRemove.push(attr.name);
                    }
                } else {
                    attrsToRemove.push(attr.name);
                }
                continue;
            }

            // Check URL attributes for dangerous schemes
            if (URL_ATTRIBUTES.has(name)) {
                const decoded = _decodeHTMLEntities(value);
                if (DANGEROUS_URL_RE.test(decoded)) {
                    attrsToRemove.push(attr.name);
                    continue;
                }
            }

            // Remove attributes not in allowlist
            if (!allowedAttrs.has(name)) {
                attrsToRemove.push(attr.name);
            }
        }

        for (const attrName of attrsToRemove) {
            el.removeAttribute(attrName);
        }
    }

    /**
     * Filter a CSS style string to only allowed properties.
     *
     * @param {string} styleValue - Raw style attribute value
     * @returns {string} Filtered style string, or empty string
     */
    static _filterStyle(styleValue) {
        if (!styleValue) return '';

        const parts = styleValue.split(';').filter(Boolean);
        const allowed = [];

        for (const part of parts) {
            const colonIdx = part.indexOf(':');
            if (colonIdx === -1) continue;

            const prop = part.slice(0, colonIdx).trim().toLowerCase();
            const value = part.slice(colonIdx + 1).trim();

            if (ALLOWED_STYLE_PROPERTIES.has(prop) && value) {
                allowed.push(`${prop}: ${value}`);
            }
        }

        return allowed.length > 0 ? allowed.join('; ') : '';
    }
}
