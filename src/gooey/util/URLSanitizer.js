/**
 * Shared URL sanitization utility for scheme and origin validation.
 *
 * Provides static methods to validate and sanitize URLs against dangerous
 * schemes (javascript:, vbscript:, data:) and enforce same-origin policies.
 * Used by i18n, navigation, RTE, and media components to prevent URL-based XSS.
 *
 * Separate from Sanitizer.js which handles HTML content sanitization.
 *
 * @module URLSanitizer
 */

/**
 * Control character regex for stripping before URL parsing.
 * Characters 0x00-0x1F and 0x7F can be used to obfuscate schemes.
 * @type {RegExp}
 */
const CONTROL_CHARS_RE = /[\x00-\x1f\x7f]/g;

/**
 * Allowed URL schemes (protocol values as returned by URL.protocol, with trailing colon).
 * @type {Set<string>}
 */
const ALLOWED_SCHEMES = new Set(['http:', 'https:', 'mailto:', 'tel:', 'ftp:']);

/**
 * Dangerous schemes specifically blocked for asset URLs.
 * Superset check: any scheme not in ALLOWED_ASSET_SCHEMES is rejected.
 * @type {Set<string>}
 */
const ALLOWED_ASSET_SCHEMES = new Set(['http:', 'https:']);

/**
 * Pattern for allowed data: URL media types.
 * Only base64-encoded images of approved formats are permitted.
 * @type {RegExp}
 */
const ALLOWED_DATA_MEDIA_RE = /^data:image\/(png|jpeg|gif|webp|svg\+xml);base64,/;

export default class URLSanitizer {

    /**
     * Sanitize a URL string, returning the canonical URL or null if unsafe.
     *
     * Processing steps:
     * 1. Strip control characters (0x00-0x1F, 0x7F)
     * 2. Trim whitespace
     * 3. Parse with URL constructor to canonicalize
     * 4. Reject dangerous schemes (javascript:, vbscript:, data:)
     * 5. Optionally allow data: URLs for approved media types
     * 6. Optionally enforce same-origin policy
     *
     * @param {string} value - URL string to sanitize
     * @param {Object} [options] - Configuration options
     * @param {boolean} [options.sameOriginOnly=false] - Reject cross-origin URLs
     * @param {boolean} [options.allowDataMedia=false] - Allow data: URLs for approved image types
     * @returns {string|null} Canonical URL string, or null if rejected
     */
    static sanitizeURL(value, options = {}) {
        if (!value || typeof value !== 'string') return null;

        // Strip control characters and trim
        const normalized = value.replace(CONTROL_CHARS_RE, '').trim();
        if (!normalized) return null;

        let parsed;
        try {
            parsed = new URL(normalized, document.baseURI);
        } catch {
            // Malformed URL
            return null;
        }

        const protocol = parsed.protocol.toLowerCase();

        // Check for data: scheme
        if (protocol === 'data:') {
            if (options.allowDataMedia && ALLOWED_DATA_MEDIA_RE.test(normalized)) {
                return normalized;
            }
            return null;
        }

        // Reject dangerous schemes
        if (!ALLOWED_SCHEMES.has(protocol)) {
            // Check if this was a relative URL that resolved to an allowed scheme
            // Relative URLs resolve against document.baseURI which is http:/https:
            // so they'll have an allowed protocol. Truly dangerous schemes like
            // javascript: and vbscript: will not be in ALLOWED_SCHEMES.
            return null;
        }

        // Same-origin enforcement
        if (options.sameOriginOnly) {
            if (parsed.origin !== location.origin) {
                return null;
            }
        }

        return parsed.href;
    }

    /**
     * Check whether a URL is allowed without returning the sanitized value.
     * Boolean convenience wrapper around sanitizeURL.
     *
     * @param {string} value - URL string to check
     * @param {Object} [options] - Same options as sanitizeURL
     * @returns {boolean} true if URL passes validation
     */
    static isAllowedURL(value, options = {}) {
        return URLSanitizer.sanitizeURL(value, options) !== null;
    }

    /**
     * Validate a URL for use as an asset source (icon, image, background, filter).
     *
     * Stricter than sanitizeURL: defaults to same-origin, rejects protocol-relative
     * URLs, rejects leading/trailing whitespace as obfuscation, and only allows
     * http:/https: schemes (no mailto:, tel:, data:, blob:, javascript:, vbscript:).
     *
     * @param {string} url - URL string to validate
     * @param {Object} [options] - Configuration options
     * @param {boolean} [options.allowCrossOrigin=false] - Allow cross-origin asset URLs
     * @returns {string|null} Canonicalized URL string, or null if rejected
     */
    static validateAssetURL(url, options = {}) {
        if (!url || typeof url !== 'string') return null;

        // Reject if input had leading/trailing whitespace (defense against obfuscation)
        if (url !== url.trim()) return null;

        // Reject URLs with control characters (0x00-0x1F, 0x7F)
        if (CONTROL_CHARS_RE.test(url)) return null;

        // Reject protocol-relative URLs starting with //
        if (url.startsWith('//')) return null;

        let parsed;
        try {
            parsed = new URL(url, document.baseURI);
        } catch {
            return null;
        }

        // Only allow http: and https: schemes for assets
        if (!ALLOWED_ASSET_SCHEMES.has(parsed.protocol.toLowerCase())) {
            return null;
        }

        // Same-origin enforcement (default)
        if (!options.allowCrossOrigin) {
            if (parsed.origin !== location.origin) {
                return null;
            }
        }

        return parsed.href;
    }

    /**
     * Check if a URL's origin matches the current page origin or any origin
     * in the provided allowlist.
     *
     * @param {string} url - URL string to validate
     * @param {string[]} [allowlist=[]] - Array of allowed origin strings
     *        (e.g., ['https://cdn.example.com', 'https://api.example.com'])
     * @returns {boolean} true if origin matches current page or allowlist
     */
    static validateOrigin(url, allowlist = []) {
        if (!url || typeof url !== 'string') return false;

        const normalized = url.replace(CONTROL_CHARS_RE, '').trim();
        if (!normalized) return false;

        let parsed;
        try {
            parsed = new URL(normalized, document.baseURI);
        } catch {
            return false;
        }

        // Same-origin check
        if (parsed.origin === location.origin) {
            return true;
        }

        // Allowlist check
        for (const allowed of allowlist) {
            if (parsed.origin === allowed) {
                return true;
            }
        }

        return false;
    }
}
