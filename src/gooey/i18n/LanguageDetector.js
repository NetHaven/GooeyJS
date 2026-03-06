import GooeyI18n from "./GooeyI18n.js";

/**
 * LanguageDetector - Static utility for automatic language detection from browser sources.
 *
 * Follows the same static utility pattern as ComponentRegistry and MetaLoader:
 * no instantiation, all static methods.
 *
 * Detects the user's preferred language from multiple browser sources
 * (querystring, cookie, localStorage, sessionStorage, html[lang], navigator)
 * and resolves against available locales with progressive BCP 47 fallback.
 *
 * @example
 * const locale = LanguageDetector.detect({ order: ['navigator', 'htmlLang'] });
 * LanguageDetector.persist('fr');
 * LanguageDetector.detectAndApply({ order: ['cookie', 'navigator'] });
 */
export default class LanguageDetector {

    /** @type {string[]} Default detection source priority order */
    static _defaultOrder = [
        'querystring', 'cookie', 'localStorage', 'sessionStorage', 'htmlLang', 'navigator'
    ];

    /** @type {Object} Registry mapping source names to detection functions */
    static _sources = {
        querystring: (opts) => LanguageDetector._detectFromQuerystring(opts),
        cookie: (opts) => LanguageDetector._detectFromCookie(opts),
        localStorage: (opts) => LanguageDetector._detectFromLocalStorage(opts),
        sessionStorage: (opts) => LanguageDetector._detectFromSessionStorage(opts),
        htmlLang: () => LanguageDetector._detectFromHtmlLang(),
        navigator: () => LanguageDetector._detectFromNavigator()
    };

    // ── Detection Sources ───────────────────────────────────────────────

    /**
     * Detect locale from URL querystring parameter.
     * @param {Object} options
     * @param {string} [options.queryParam='lang'] - Query parameter name
     * @returns {string|null}
     * @private
     */
    static _detectFromQuerystring(options = {}) {
        try {
            const params = new URLSearchParams(window.location.search);
            return params.get(options.queryParam || 'lang') || null;
        } catch (e) {
            return null;
        }
    }

    /**
     * Detect locale from a browser cookie.
     * @param {Object} options
     * @param {string} [options.cookieName='gooey_lang'] - Cookie name
     * @returns {string|null}
     * @private
     */
    static _detectFromCookie(options = {}) {
        try {
            const name = options.cookieName || 'gooey_lang';
            const cookies = document.cookie.split(';');
            for (const cookie of cookies) {
                const [key, value] = cookie.trim().split('=');
                if (key === name && value) {
                    return value;
                }
            }
            return null;
        } catch (e) {
            return null;
        }
    }

    /**
     * Detect locale from localStorage.
     * @param {Object} options
     * @param {string} [options.storageKey='gooey_lang'] - Storage key name
     * @returns {string|null}
     * @private
     */
    static _detectFromLocalStorage(options = {}) {
        try {
            return localStorage.getItem(options.storageKey || 'gooey_lang') || null;
        } catch (e) {
            return null;
        }
    }

    /**
     * Detect locale from sessionStorage.
     * @param {Object} options
     * @param {string} [options.storageKey='gooey_lang'] - Storage key name
     * @returns {string|null}
     * @private
     */
    static _detectFromSessionStorage(options = {}) {
        try {
            return sessionStorage.getItem(options.storageKey || 'gooey_lang') || null;
        } catch (e) {
            return null;
        }
    }

    /**
     * Detect locale from the document's html[lang] attribute.
     * @returns {string|null}
     * @private
     */
    static _detectFromHtmlLang() {
        try {
            const lang = document.documentElement.lang;
            return lang || null;
        } catch (e) {
            return null;
        }
    }

    /**
     * Detect locale from navigator.languages or navigator.language.
     * Returns an array of languages for multi-language support.
     * @returns {string[]|null}
     * @private
     */
    static _detectFromNavigator() {
        try {
            if (navigator.languages && navigator.languages.length > 0) {
                return Array.from(navigator.languages);
            }
            if (navigator.language) {
                return [navigator.language];
            }
            return null;
        } catch (e) {
            return null;
        }
    }

    // ── Resolution ──────────────────────────────────────────────────────

    /**
     * Resolve a BCP 47 language tag against a list of supported locales.
     * Uses progressive fallback: strips subtags from right to left.
     * E.g., 'zh-Hant-TW' tries 'zh-hant-tw', 'zh-hant', 'zh'.
     *
     * @param {string} tag - BCP 47 language tag to resolve
     * @param {string[]} supportedLocales - Array of supported locale strings
     * @returns {string|null} Matching supported locale (preserving original case) or null
     */
    static _resolveLocale(tag, supportedLocales) {
        if (!tag || !supportedLocales || supportedLocales.length === 0) {
            return null;
        }

        const normalized = tag.trim().toLowerCase();

        // Build lookup map: lowercase -> original case
        const lowerMap = new Map();
        for (const loc of supportedLocales) {
            lowerMap.set(loc.toLowerCase(), loc);
        }

        // Progressive fallback: try exact, then strip subtags
        const parts = normalized.split('-');
        for (let i = parts.length; i > 0; i--) {
            const candidate = parts.slice(0, i).join('-');
            if (lowerMap.has(candidate)) {
                return lowerMap.get(candidate);
            }
        }

        return null;
    }

    // ── Public API ──────────────────────────────────────────────────────

    /**
     * Detect the user's preferred locale from browser sources.
     *
     * @param {Object} [options={}]
     * @param {string[]} [options.order] - Detection source names in priority order
     * @param {string} [options.queryParam='lang'] - Querystring parameter name
     * @param {string} [options.cookieName='gooey_lang'] - Cookie name
     * @param {string} [options.storageKey='gooey_lang'] - Storage key name
     * @param {string[]} [options.supportedLocales] - Constrain to these locales; defaults to GooeyI18n.availableLocales
     * @returns {string|null} Detected locale or null if none matched
     */
    static detect(options = {}) {
        const order = options.order || this._defaultOrder;
        const supportedLocales = options.supportedLocales || GooeyI18n.availableLocales;

        for (const sourceName of order) {
            const sourceFn = this._sources[sourceName];
            if (!sourceFn) continue;

            const result = sourceFn(options);

            if (result === null || result === undefined) continue;

            // Navigator source returns an array of languages
            if (Array.isArray(result)) {
                for (const lang of result) {
                    const resolved = this._resolveLocale(lang, supportedLocales);
                    if (resolved) return resolved;
                }
                continue;
            }

            // Single value from other sources
            const resolved = this._resolveLocale(result, supportedLocales);
            if (resolved) return resolved;
        }

        return null;
    }

    /**
     * Persist the selected locale to cookie and/or localStorage.
     *
     * @param {string} locale - Locale to persist
     * @param {Object} [options={}]
     * @param {boolean} [options.cookie] - Set to false to skip cookie. Defaults to true.
     * @param {boolean} [options.localStorage] - Set to false to skip localStorage. Defaults to true.
     * @param {string} [options.cookieName='gooey_lang'] - Cookie name
     * @param {string} [options.storageKey='gooey_lang'] - Storage key name
     */
    static persist(locale, options = {}) {
        if (options.cookie !== false) {
            try {
                const cookieName = options.cookieName || 'gooey_lang';
                document.cookie = `${cookieName}=${locale};path=/;max-age=31536000;SameSite=Lax`;
            } catch (e) {
                // Cookie may not be available in some contexts
            }
        }

        if (options.localStorage !== false) {
            try {
                localStorage.setItem(options.storageKey || 'gooey_lang', locale);
            } catch (e) {
                // localStorage may throw in private browsing
            }
        }
    }

    /**
     * Convenience method: detect locale and apply it to GooeyI18n.
     * Optionally persists the detected locale.
     *
     * @param {Object} [options={}] - Same options as detect(), plus:
     * @param {boolean} [options.persist=false] - Whether to persist the detected locale
     * @returns {string|null} The detected locale or null
     */
    static detectAndApply(options = {}) {
        const detected = this.detect(options);

        if (detected) {
            GooeyI18n.locale = detected;

            if (options.persist) {
                this.persist(detected, options);
            }
        }

        return detected;
    }
}
