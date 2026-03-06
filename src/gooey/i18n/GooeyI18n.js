import I18nEvent from "../events/i18n/I18nEvent.js";
import MessageFormat from "./MessageFormat.js";

/**
 * Set of primary language subtags that use right-to-left script direction.
 * @type {Set<string>}
 */
const RTL_LOCALES = new Set([
    "ar", "he", "fa", "ur", "ps", "sd", "ckb", "dv", "yi", "ku", "ug", "syr", "arc"
]);

/**
 * GooeyI18n - Static singleton providing the core internationalization runtime.
 *
 * Follows the same static utility pattern as ComponentRegistry and MetaLoader:
 * no instantiation, all static methods and properties.
 *
 * Provides:
 * - Initialization with locale, fallback, and messages
 * - Translation lookup with namespace, context, plural, and fallback resolution
 * - Basic {name} interpolation with XSS escaping
 * - Locale switching with callback notification
 * - Text direction (LTR/RTL) query
 * - Resource management (set/merge/get/remove locale messages)
 * - Lazy locale loading with retry and timeout
 * - Callback registration for locale changes and missing keys
 *
 * @example
 * GooeyI18n.init({
 *     locale: 'en',
 *     fallbackLocale: 'en',
 *     messages: { en: { greeting: 'Hello, {name}!' } }
 * });
 * GooeyI18n.t('greeting', { name: 'Alice' }); // "Hello, Alice!"
 */
export default class GooeyI18n {

    // ── Internal State ──────────────────────────────────────────────────

    /** @type {string} Current active locale */
    static _locale = "";

    /** @type {string|string[]} Fallback locale or ordered fallback chain */
    static _fallbackLocale = "";

    /**
     * Message store: { locale: { namespace: { key: value } } }
     * Default namespace is "translation".
     * @type {Object}
     */
    static _messages = {};

    /** @type {boolean} Whether init() has been called */
    static _initialized = false;

    /**
     * Options from init().
     * @type {{
     *   missingKeyHandler?: function,
     *   escapeParameterHtml: boolean,
     *   silentTranslationWarn: boolean,
     *   silentFallbackWarn: boolean,
     *   nsSeparator: string,
     *   keySeparator: string
     * }}
     */
    static _options = {
        missingKeyHandler: null,
        escapeParameterHtml: true,
        silentTranslationWarn: false,
        silentFallbackWarn: false,
        nsSeparator: ":",
        keySeparator: "."
    };

    /** @type {Set<function>} Locale change callbacks */
    static _localeChangedCallbacks = new Set();

    /** @type {Set<function>} Missing key callbacks */
    static _missingKeyCallbacks = new Set();

    /** @type {Map<string, string>} Locale string to URL for deferred loading */
    static _lazyLocales = new Map();

    /** @type {Map<string, Object>} URL to parsed JSON cache */
    static _resourceCache = new Map();

    /** @type {Map<string, Promise>} Locale string to in-flight load Promise */
    static _loadingLocales = new Map();

    /**
     * Named datetime format definitions keyed by locale.
     * Structure: { locale: { formatName: IntlDateTimeFormatOptions } }
     * @type {Object}
     */
    static _datetimeFormats = {};

    /**
     * Named number format definitions keyed by locale.
     * Structure: { locale: { formatName: IntlNumberFormatOptions } }
     * @type {Object}
     */
    static _numberFormats = {};

    /**
     * Cached Intl formatter instances keyed by constructor type.
     * Each Map is keyed by a composite string of locale + JSON options.
     * @type {Object<string, Map<string, Object>>}
     */
    static _formatterCache = {
        dateTime: new Map(),
        number: new Map(),
        plural: new Map(),
        relativeTime: new Map(),
        list: new Map(),
        displayNames: new Map()
    };

    /**
     * Default rich text element factories for ICU MessageFormat.
     * Phase 61 Plan 02 uses this for tag processing in compiled messages.
     * @type {Object|null}
     */
    static _defaultRichTextElements = null;

    // ── Initialization ──────────────────────────────────────────────────

    /**
     * Initialize the i18n system with locale, fallback, and messages.
     *
     * @param {Object} options - Initialization options
     * @param {string} options.locale - Active locale identifier (BCP 47)
     * @param {string|string[]} [options.fallbackLocale=""] - Fallback locale(s)
     * @param {Object} [options.messages={}] - Message bundles keyed by locale
     * @param {function} [options.missingKeyHandler] - Called when a key is not found
     * @param {boolean} [options.escapeParameterHtml=true] - HTML-escape interpolated values
     * @param {boolean} [options.silentTranslationWarn=false] - Suppress missing key warnings
     * @param {boolean} [options.silentFallbackWarn=false] - Suppress fallback warnings
     * @param {string} [options.nsSeparator=":"] - Namespace separator character
     * @param {string} [options.keySeparator="."] - Nested key path separator character
     * @param {Object} [options.datetimeFormats={}] - Named datetime format presets keyed by locale
     * @param {Object} [options.numberFormats={}] - Named number format presets keyed by locale
     * @param {Object} [options.defaultRichTextElements=null] - Default rich text element factories for MessageFormat
     */
    static init(options = {}) {
        const {
            locale = "",
            fallbackLocale = "",
            messages = {},
            missingKeyHandler = null,
            escapeParameterHtml = true,
            silentTranslationWarn = false,
            silentFallbackWarn = false,
            nsSeparator = ":",
            keySeparator = ".",
            datetimeFormats = {},
            numberFormats = {},
            defaultRichTextElements = null
        } = options;

        // Store options
        this._options = {
            missingKeyHandler,
            escapeParameterHtml,
            silentTranslationWarn,
            silentFallbackWarn,
            nsSeparator,
            keySeparator
        };

        // Process messages: wrap under "translation" namespace if not already namespaced
        for (const loc of Object.keys(messages)) {
            this._messages[loc] = { translation: messages[loc] };
        }

        // Process named datetime format presets
        for (const loc of Object.keys(datetimeFormats)) {
            this.setDatetimeFormats(loc, datetimeFormats[loc]);
        }

        // Process named number format presets
        for (const loc of Object.keys(numberFormats)) {
            this.setNumberFormats(loc, numberFormats[loc]);
        }

        // Store default rich text elements for Plan 02
        this._defaultRichTextElements = defaultRichTextElements;

        this._locale = locale;
        this._fallbackLocale = fallbackLocale;
        this._initialized = true;

        // Set document-level locale and direction
        if (typeof document !== "undefined") {
            document.documentElement.lang = locale;
            document.documentElement.dir = this.dir(locale);
        }

        // Notify locale changed callbacks (oldLocale is null on init)
        this._invokeLocaleChangedCallbacks(locale, null);
    }

    // ── Locale Getter/Setter ────────────────────────────────────────────

    /**
     * Get the current active locale.
     * @returns {string}
     */
    static get locale() {
        return this._locale;
    }

    /**
     * Set the active locale. If messages are not yet loaded and a lazy URL
     * is registered, triggers an async fetch before completing the switch.
     *
     * @param {string} value - BCP 47 locale identifier
     */
    static set locale(value) {
        if (value === this._locale) return;

        const oldLocale = this._locale;

        // Check if messages exist for the new locale
        if (!this._messages[value]) {
            // Check lazy locales for a registered URL
            const url = this._lazyLocales.get(value);
            if (url) {
                this._loadLocaleFromURL(value, url).then(() => {
                    this._completeLocaleSwitch(value, oldLocale);
                });
                return;
            }
        }

        this._completeLocaleSwitch(value, oldLocale);
    }

    /**
     * Complete the locale switch after messages are available.
     * @param {string} locale - New locale
     * @param {string} oldLocale - Previous locale
     * @private
     */
    static _completeLocaleSwitch(locale, oldLocale) {
        this._locale = locale;

        if (typeof document !== "undefined") {
            document.documentElement.lang = locale;
            document.documentElement.dir = this.dir(locale);
        }

        this._invokeLocaleChangedCallbacks(locale, oldLocale);
    }

    // ── Fallback Locale ─────────────────────────────────────────────────

    /**
     * Get the fallback locale(s).
     * @returns {string|string[]}
     */
    static get fallbackLocale() {
        return this._fallbackLocale;
    }

    /**
     * Set the fallback locale(s). Accepts a single string or an array.
     * @param {string|string[]} value
     */
    static set fallbackLocale(value) {
        this._fallbackLocale = value;
    }

    // ── Read-Only Properties ────────────────────────────────────────────

    /**
     * Get the list of locales that have loaded messages.
     * @returns {string[]}
     */
    static get availableLocales() {
        return Object.keys(this._messages);
    }

    /**
     * Whether init() has been called.
     * @returns {boolean}
     */
    static get isInitialized() {
        return this._initialized;
    }

    // ── Direction ───────────────────────────────────────────────────────

    /**
     * Get the text direction for a locale.
     *
     * @param {string} [locale] - Locale to check (defaults to current locale)
     * @returns {"ltr"|"rtl"} Text direction
     */
    static dir(locale) {
        const loc = locale || this._locale;
        if (!loc) return "ltr";

        // Extract primary language subtag (split by '-' or '_', take first)
        const primarySubtag = loc.split(/[-_]/)[0].toLowerCase();
        return RTL_LOCALES.has(primarySubtag) ? "rtl" : "ltr";
    }

    // ── Translation Existence ───────────────────────────────────────────

    /**
     * Check whether a translation key exists.
     *
     * @param {string} key - Translation key (may include namespace prefix)
     * @param {string} [locale] - Locale to check (defaults to current locale)
     * @returns {boolean} True if the key resolves to a value
     */
    static te(key, locale) {
        const loc = locale || this._locale;
        const { namespace, keypath } = this._parseKey(key);
        return this._resolveKey(loc, namespace, keypath) !== undefined;
    }

    // ── Translation ─────────────────────────────────────────────────────

    /**
     * Translate a key to a localized string.
     *
     * Implements the key resolution algorithm:
     * 1. Fallback keys (array of keys)
     * 2. Namespace resolution (ns:key or default namespace)
     * 3. Context resolution (key_context suffix)
     * 4. Locale chain (current + fallback locales)
     * 5. Nested keypath (dot-separated traversal)
     * 6. Plural resolution (Intl.PluralRules)
     * 7. Basic {name} interpolation with XSS escaping
     * 8. Missing key handling (defaultValue, handler, return key)
     *
     * @param {string|string[]} key - Translation key or array of fallback keys
     * @param {Object} [options={}] - Translation options
     * @param {string} [options.locale] - Override locale for this call
     * @param {string|string[]} [options.fallbackLocale] - Override fallback for this call
     * @param {string} [options.defaultValue] - Returned if key is not found
     * @param {string} [options.namespace] - Namespace override
     * @param {number} [options.count] - Triggers pluralization
     * @param {string} [options.context] - Context suffix for key lookup
     * @param {boolean} [options.escapeValue] - Override HTML escaping per call
     * @returns {string} Translated string, or the key itself if not found
     */
    static t(key, options = {}) {
        // Step 1: Fallback keys -- if key is an array, try each until one resolves
        if (Array.isArray(key)) {
            for (const k of key) {
                const result = this.t(k, options);
                // If result is not the key itself, it resolved
                if (result !== k) return result;
            }
            // All keys failed; return last key as missing
            const lastKey = key[key.length - 1];
            return this._handleMissingKey(options.locale || this._locale, lastKey, options);
        }

        // Step 2: Namespace resolution
        const { namespace: parsedNs, keypath } = this._parseKey(key);
        const namespace = options.namespace || parsedNs;

        // Step 4: Build locale chain
        const localeChain = this._buildLocaleChain(options);

        // Step 3 + 5 + 6: Try each locale in chain
        for (const loc of localeChain) {
            // Step 3: Context resolution -- try key_context first
            if (options.context) {
                const contextKeypath = keypath + "_" + options.context;
                const contextValue = this._resolveKey(loc, namespace, contextKeypath);
                const contextResult = this._processResolvedValue(contextValue, loc, options);
                if (contextResult !== undefined) return contextResult;
            }

            // Step 5: Nested keypath resolution
            const value = this._resolveKey(loc, namespace, keypath);
            const result = this._processResolvedValue(value, loc, options);
            if (result !== undefined) return result;
        }

        // Step 8: Missing key handling
        return this._handleMissingKey(options.locale || this._locale, key, options);
    }

    // ── Resource Management ─────────────────────────────────────────────

    /**
     * Set all messages for a locale (replaces existing).
     * Messages are wrapped under the default "translation" namespace.
     *
     * @param {string} locale - Locale identifier
     * @param {Object} messages - Message object
     */
    static setLocaleMessages(locale, messages) {
        this._messages[locale] = { translation: messages };
    }

    /**
     * Deep merge messages into an existing locale's default namespace.
     * Creates the locale entry if it does not exist.
     *
     * @param {string} locale - Locale identifier
     * @param {Object} messages - Message object to merge
     */
    static mergeLocaleMessages(locale, messages) {
        if (!this._messages[locale]) {
            this._messages[locale] = { translation: {} };
        }
        this._messages[locale].translation = this._deepMerge(
            this._messages[locale].translation,
            messages
        );
    }

    /**
     * Get the messages for a locale's default namespace.
     *
     * @param {string} locale - Locale identifier
     * @returns {Object|undefined} Message object or undefined
     */
    static getLocaleMessages(locale) {
        return this._messages[locale]?.translation;
    }

    /**
     * Check whether messages exist for a locale.
     *
     * @param {string} locale - Locale identifier
     * @returns {boolean}
     */
    static hasLocaleMessages(locale) {
        return locale in this._messages;
    }

    /**
     * Remove all messages for a locale.
     *
     * @param {string} locale - Locale identifier
     */
    static removeLocaleMessages(locale) {
        delete this._messages[locale];
    }

    /**
     * Set all messages for a specific namespace within a locale (replaces existing).
     * Enables component-local message registration under a tag-name namespace.
     *
     * @param {string} locale - Locale identifier
     * @param {string} namespace - Namespace key (e.g., component tag name)
     * @param {Object} messages - Message object
     */
    static setNamespaceMessages(locale, namespace, messages) {
        if (!this._messages[locale]) {
            this._messages[locale] = {};
        }
        this._messages[locale][namespace] = messages;
    }

    /**
     * Deep merge messages into an existing namespace for a locale.
     * Creates the locale and namespace entries if they do not exist.
     *
     * @param {string} locale - Locale identifier
     * @param {string} namespace - Namespace key
     * @param {Object} messages - Message object to merge
     */
    static mergeNamespaceMessages(locale, namespace, messages) {
        if (!this._messages[locale]) {
            this._messages[locale] = {};
        }
        if (!this._messages[locale][namespace]) {
            this._messages[locale][namespace] = {};
        }
        this._messages[locale][namespace] = this._deepMerge(
            this._messages[locale][namespace],
            messages
        );
    }

    /**
     * Scan a DOM root for elements with data-i18n and data-i18n-attr attributes
     * and apply translations. Safe to call repeatedly (idempotent).
     *
     * @param {Element|ShadowRoot} root - DOM root to scan (typically a ShadowRoot)
     * @param {Object} [options={}] - Options
     * @param {string} [options.scope] - Namespace scope for scoped translation lookup
     */
    static translateRoot(root, options = {}) {
        if (!root) return;

        const scope = options.scope;

        // Translate textContent via data-i18n
        const textElements = root.querySelectorAll("[data-i18n]");
        for (const el of textElements) {
            const key = el.getAttribute("data-i18n");
            if (!key) continue;

            let translated;
            if (scope) {
                // Try scoped translation first
                translated = this.t(key, { namespace: scope });
                // If result equals the key, it was not found in scope -- fall back to global
                if (translated === key) {
                    translated = this.t(key);
                }
            } else {
                translated = this.t(key);
            }

            el.textContent = translated;
        }

        // Translate attributes via data-i18n-attr (format: "attrName:key,attrName:key")
        const attrElements = root.querySelectorAll("[data-i18n-attr]");
        for (const el of attrElements) {
            const attrValue = el.getAttribute("data-i18n-attr");
            if (!attrValue) continue;

            const pairs = attrValue.split(",");
            for (const pair of pairs) {
                const colonIdx = pair.indexOf(":");
                if (colonIdx === -1) continue;

                const attrName = pair.substring(0, colonIdx).trim();
                const key = pair.substring(colonIdx + 1).trim();
                if (!attrName || !key) continue;

                let translated;
                if (scope) {
                    translated = this.t(key, { namespace: scope });
                    if (translated === key) {
                        translated = this.t(key);
                    }
                } else {
                    translated = this.t(key);
                }

                el.setAttribute(attrName, translated);
            }
        }
    }

    // ── Named Format Presets ────────────────────────────────────────────

    /**
     * Replace all datetime format presets for a locale.
     *
     * @param {string} locale - Locale identifier
     * @param {Object} formats - Named format definitions (e.g., { short: { year: 'numeric', month: 'short' } })
     */
    static setDatetimeFormats(locale, formats) {
        this._datetimeFormats[locale] = formats;
    }

    /**
     * Replace all number format presets for a locale.
     *
     * @param {string} locale - Locale identifier
     * @param {Object} formats - Named format definitions (e.g., { currency: { style: 'currency', currency: 'USD' } })
     */
    static setNumberFormats(locale, formats) {
        this._numberFormats[locale] = formats;
    }

    /**
     * Deep merge additional datetime format presets into existing for a locale.
     *
     * @param {string} locale - Locale identifier
     * @param {Object} formats - Named format definitions to merge
     */
    static mergeDatetimeFormats(locale, formats) {
        if (!this._datetimeFormats[locale]) {
            this._datetimeFormats[locale] = {};
        }
        this._datetimeFormats[locale] = this._deepMerge(
            this._datetimeFormats[locale],
            formats
        );
    }

    /**
     * Deep merge additional number format presets into existing for a locale.
     *
     * @param {string} locale - Locale identifier
     * @param {Object} formats - Named format definitions to merge
     */
    static mergeNumberFormats(locale, formats) {
        if (!this._numberFormats[locale]) {
            this._numberFormats[locale] = {};
        }
        this._numberFormats[locale] = this._deepMerge(
            this._numberFormats[locale],
            formats
        );
    }

    /**
     * Get the datetime format presets for a locale.
     *
     * @param {string} locale - Locale identifier
     * @returns {Object|undefined} Format definitions or undefined
     */
    static getDatetimeFormats(locale) {
        return this._datetimeFormats[locale];
    }

    /**
     * Get the number format presets for a locale.
     *
     * @param {string} locale - Locale identifier
     * @returns {Object|undefined} Format definitions or undefined
     */
    static getNumberFormats(locale) {
        return this._numberFormats[locale];
    }

    // ── Formatter Cache Management ───────────────────────────────────────

    /**
     * Clear all cached Intl formatter instances.
     * Call after locale changes if cached formatters are no longer needed.
     */
    static clearFormatterCache() {
        for (const cache of Object.values(this._formatterCache)) {
            cache.clear();
        }
    }

    /**
     * Clear the MessageFormat AST cache.
     */
    static clearMessageCache() {
        MessageFormat.clearCache();
    }

    /**
     * Clear all caches (formatter instances and message ASTs).
     */
    static clearAllCaches() {
        this.clearFormatterCache();
        this.clearMessageCache();
    }

    // ── Formatting Methods ────────────────────────────────────────────

    /**
     * Format a date value using named presets or raw Intl.DateTimeFormat options.
     *
     * @param {Date|number|string} value - Date object, timestamp, or ISO date string
     * @param {string|Object} [format] - Named format key or Intl.DateTimeFormat options
     * @param {Object} [options={}] - Additional options
     * @param {string} [options.locale] - Locale override
     * @param {boolean} [options.parts] - If true, return formatToParts array
     * @returns {string|Array} Formatted date string, or parts array if options.parts is true
     */
    static d(value, format, options = {}) {
        const locale = options.locale || this._locale;

        // Convert value to Date if needed
        if (!(value instanceof Date)) {
            value = new Date(value);
        }

        // Resolve format options
        let formatOptions;
        if (typeof format === "string") {
            // Look up named format preset
            const presets = this._datetimeFormats[locale];
            formatOptions = presets?.[format];
            if (!formatOptions) {
                // Use format string as dateStyle shortcut
                formatOptions = { dateStyle: format };
            }
        } else if (format && typeof format === "object") {
            formatOptions = format;
        } else {
            formatOptions = {};
        }

        const formatter = this._getOrCreateFormatter(
            this._formatterCache.dateTime,
            Intl.DateTimeFormat,
            locale,
            formatOptions
        );

        return options.parts
            ? formatter.formatToParts(value)
            : formatter.format(value);
    }

    /**
     * Format a number using named presets or raw Intl.NumberFormat options.
     *
     * @param {number} value - Number to format
     * @param {string|Object} [format] - Named format key or Intl.NumberFormat options
     * @param {Object} [options={}] - Additional options
     * @param {string} [options.locale] - Locale override
     * @param {boolean} [options.parts] - If true, return formatToParts array
     * @returns {string|Array} Formatted number string, or parts array if options.parts is true
     */
    static n(value, format, options = {}) {
        const locale = options.locale || this._locale;

        // Resolve format options
        let formatOptions;
        if (typeof format === "string") {
            // Look up named format preset
            const presets = this._numberFormats[locale];
            formatOptions = presets?.[format];
            if (!formatOptions) {
                // No preset found, return plain string
                return String(value);
            }
        } else if (format && typeof format === "object") {
            formatOptions = format;
        } else {
            formatOptions = {};
        }

        const formatter = this._getOrCreateFormatter(
            this._formatterCache.number,
            Intl.NumberFormat,
            locale,
            formatOptions
        );

        return options.parts
            ? formatter.formatToParts(value)
            : formatter.format(value);
    }

    /**
     * Format a relative time value using Intl.RelativeTimeFormat.
     *
     * @param {number} value - Relative time value (negative = past, positive = future)
     * @param {string} unit - Time unit ('second', 'minute', 'hour', 'day', 'week', 'month', 'year')
     * @param {Object} [options={}] - Additional options
     * @param {string} [options.locale] - Locale override
     * @param {string} [options.style] - Format style ('long', 'short', 'narrow')
     * @param {string} [options.numeric] - Numeric display ('always', 'auto')
     * @returns {string} Formatted relative time string
     */
    static rt(value, unit, options = {}) {
        const locale = options.locale || this._locale;

        // Build Intl options, filtering out non-Intl properties
        const intlOptions = {};
        if (options.style !== undefined) intlOptions.style = options.style;
        if (options.numeric !== undefined) intlOptions.numeric = options.numeric;

        const formatter = this._getOrCreateFormatter(
            this._formatterCache.relativeTime,
            Intl.RelativeTimeFormat,
            locale,
            intlOptions
        );

        return formatter.format(value, unit);
    }

    /**
     * Format a list of items using Intl.ListFormat.
     *
     * @param {string[]} items - Array of strings to format as a list
     * @param {Object} [options={}] - Additional options
     * @param {string} [options.locale] - Locale override
     * @param {string} [options.type] - List type ('conjunction', 'disjunction', 'unit'), defaults to 'conjunction'
     * @param {string} [options.style] - List style ('long', 'short', 'narrow')
     * @returns {string} Formatted list string
     */
    static list(items, options = {}) {
        const locale = options.locale || this._locale;

        const intlOptions = {};
        intlOptions.type = options.type || "conjunction";
        if (options.style !== undefined) intlOptions.style = options.style;

        const formatter = this._getOrCreateFormatter(
            this._formatterCache.list,
            Intl.ListFormat,
            locale,
            intlOptions
        );

        return formatter.format(items);
    }

    /**
     * Format a display name for a language, region, currency, or script code.
     *
     * @param {string} code - Code to display (e.g., 'en', 'US', 'USD', 'Latn')
     * @param {Object} [options={}] - Options (type is required)
     * @param {string} [options.locale] - Locale override
     * @param {string} options.type - Display name type ('language', 'region', 'currency', 'script')
     * @param {string} [options.style] - Display style ('long', 'short', 'narrow')
     * @param {string} [options.languageDisplay] - Language display mode ('dialect', 'standard')
     * @returns {string|undefined} Display name string, or undefined if code is not recognized
     */
    static displayName(code, options = {}) {
        const locale = options.locale || this._locale;

        const intlOptions = {};
        if (options.type !== undefined) intlOptions.type = options.type;
        if (options.style !== undefined) intlOptions.style = options.style;
        if (options.languageDisplay !== undefined) intlOptions.languageDisplay = options.languageDisplay;

        const formatter = this._getOrCreateFormatter(
            this._formatterCache.displayNames,
            Intl.DisplayNames,
            locale,
            intlOptions
        );

        return formatter.of(code);
    }

    // ── Lazy Loading ────────────────────────────────────────────────────

    /**
     * Register a URL for deferred locale loading.
     * The locale will be fetched when it becomes active.
     *
     * @param {string} locale - Locale identifier
     * @param {string} url - URL to JSON locale file
     */
    static registerLocale(locale, url) {
        this._lazyLocales.set(locale, url);
    }

    /**
     * Load locale messages from a URL immediately.
     * Uses retry (3 attempts, exponential backoff) and timeout (10s).
     * Caches the result in _resourceCache. Deduplicates concurrent loads.
     *
     * @param {string} locale - Locale identifier
     * @param {string} url - URL to JSON locale file
     * @returns {Promise<void>} Resolves when messages are loaded and stored
     */
    static loadLocale(locale, url) {
        return this._loadLocaleFromURL(locale, url);
    }

    // ── Callback Registration ───────────────────────────────────────────

    /**
     * Register a callback for locale changes.
     * The callback receives { locale, oldLocale, direction }.
     *
     * @param {function} callback - Listener function
     * @returns {function} Cleanup function that removes the callback
     */
    static onLocaleChanged(callback) {
        this._localeChangedCallbacks.add(callback);
        return () => {
            this._localeChangedCallbacks.delete(callback);
        };
    }

    /**
     * Register a callback for missing translation keys.
     * The callback receives { locale, key, namespace, defaultValue }.
     *
     * @param {function} callback - Listener function
     * @returns {function} Cleanup function that removes the callback
     */
    static onMissingKey(callback) {
        this._missingKeyCallbacks.add(callback);
        return () => {
            this._missingKeyCallbacks.delete(callback);
        };
    }

    // ── Stub Hooks (Phase 61+) ──────────────────────────────────────────

    /**
     * Compile a message string with interpolation values.
     * Phase 60: basic {name} placeholder replacement.
     * Phase 61: replaced with ICU MessageFormat parsing.
     *
     * @param {string} str - Message string with placeholders
     * @param {Object} values - Interpolation values
     * @param {string} locale - Locale for locale-aware formatting
     * @returns {string} Compiled message
     * @private
     */
    static _compileMessage(str, values, locale) {
        if (!str || typeof str !== "string") return str;

        // Fast path: no values and no ICU syntax -- return as-is
        if (!values || (typeof values === "object" && Object.keys(values).length === 0)) {
            if (!/[{]/.test(str) && !/\$t\(/.test(str)) return str;
        }

        const options = {
            escapeValue: (values && values.escapeValue !== false) && this._options.escapeParameterHtml !== false,
            ignoreTag: values && values.ignoreTag === true,
            defaultRichTextElements: this._defaultRichTextElements || {}
        };

        return MessageFormat.format(str, values, locale, options);
    }

    /**
     * Post-process a translated value.
     * Phase 60: no-op, returns value as-is.
     * Phase 63: fills in post-processing pipeline.
     *
     * @param {string} value - Translated string
     * @param {Object} options - Translation options
     * @returns {string} Processed string
     * @private
     */
    static _postProcess(value, options) {
        return value;
    }

    // ── Private Helpers ─────────────────────────────────────────────────

    /**
     * Get or create a cached Intl formatter instance.
     *
     * @param {Map} cache - The specific cache Map (e.g., _formatterCache.dateTime)
     * @param {function} Constructor - Intl constructor (e.g., Intl.DateTimeFormat)
     * @param {string} locale - Locale for the formatter
     * @param {Object} options - Intl constructor options
     * @returns {Object} Cached or newly created formatter instance
     * @private
     */
    static _getOrCreateFormatter(cache, Constructor, locale, options) {
        const key = locale + JSON.stringify(options);

        let formatter = cache.get(key);
        if (formatter) return formatter;

        formatter = new Constructor(locale, options);
        cache.set(key, formatter);
        return formatter;
    }

    /**
     * Parse a translation key into namespace and keypath.
     *
     * @param {string} key - Full key (may contain namespace prefix)
     * @returns {{ namespace: string, keypath: string }}
     * @private
     */
    static _parseKey(key) {
        const sep = this._options.nsSeparator || ":";
        const idx = key.indexOf(sep);
        if (idx > -1) {
            return {
                namespace: key.substring(0, idx),
                keypath: key.substring(idx + sep.length)
            };
        }
        return { namespace: "translation", keypath: key };
    }

    /**
     * Resolve a key through namespace and nested keypath traversal.
     *
     * @param {string} locale - Locale to look up
     * @param {string} namespace - Message namespace
     * @param {string} keypath - Dot-separated key path
     * @returns {*} Resolved value or undefined
     * @private
     */
    static _resolveKey(locale, namespace, keypath) {
        const nsMessages = this._messages[locale]?.[namespace];
        if (!nsMessages) return undefined;

        const sep = this._options.keySeparator || ".";
        const parts = keypath.split(sep);
        let current = nsMessages;

        for (const part of parts) {
            if (current == null || typeof current !== "object") return undefined;
            current = current[part];
        }

        return current;
    }

    /**
     * Process a resolved value: handle pluralization, interpolation, post-processing.
     *
     * @param {*} value - Resolved message value
     * @param {string} locale - Active locale for this resolution
     * @param {Object} options - Translation options
     * @returns {string|undefined} Processed string, or undefined if value is undefined
     * @private
     */
    static _processResolvedValue(value, locale, options) {
        if (value === undefined) return undefined;

        // Step 6: Plural resolution
        if (options.count !== undefined && value !== null && typeof value === "object") {
            value = this._resolvePlural(value, options.count, locale);
            if (value === undefined) return undefined;
        }

        // If value is not a string at this point, convert it
        if (typeof value !== "string") {
            // Objects/arrays without count -- return undefined to continue chain
            if (typeof value === "object") return undefined;
            value = String(value);
        }

        // Step 7: Basic interpolation via _compileMessage
        value = this._compileMessage(value, options, locale);

        // Post-processing stub
        value = this._postProcess(value, options);

        return value;
    }

    /**
     * Resolve a plural form from an object with plural keys.
     * Checks exact keys (=0, =1, =2) first, then Intl.PluralRules categories.
     *
     * @param {Object} pluralObj - Object with plural form keys
     * @param {number} count - Count value
     * @param {string} locale - Locale for Intl.PluralRules
     * @returns {string|undefined} Selected plural form
     * @private
     */
    static _resolvePlural(pluralObj, count, locale) {
        // Check exact match keys first
        const exactKey = "=" + count;
        if (exactKey in pluralObj) return pluralObj[exactKey];

        // Use Intl.PluralRules to select category (cached for performance)
        try {
            const rules = this._getOrCreateFormatter(
                this._formatterCache.plural,
                Intl.PluralRules,
                locale,
                {}
            );
            const category = rules.select(count);
            if (category in pluralObj) return pluralObj[category];
        } catch (e) {
            // Fallback if Intl.PluralRules is not available or locale is invalid
        }

        // Final fallback to "other"
        if ("other" in pluralObj) return pluralObj["other"];

        return undefined;
    }

    /**
     * Build the ordered locale chain for resolution.
     *
     * @param {Object} options - Translation options (may override locale/fallback)
     * @returns {string[]} Ordered array of locales to try
     * @private
     */
    static _buildLocaleChain(options) {
        const primary = options.locale || this._locale;
        const fallbacks = this._getFallbackChain(options.fallbackLocale);

        const chain = [primary];
        for (const fb of fallbacks) {
            if (!chain.includes(fb)) {
                chain.push(fb);
            }
        }
        return chain;
    }

    /**
     * Normalize fallback locale(s) to an array.
     *
     * @param {string|string[]} [override] - Override fallback value
     * @returns {string[]} Fallback chain as array
     * @private
     */
    static _getFallbackChain(override) {
        const source = override !== undefined ? override : this._fallbackLocale;
        if (!source) return [];
        if (Array.isArray(source)) return source;
        return [source];
    }

    /**
     * Handle a missing translation key.
     *
     * @param {string} locale - Locale that was searched
     * @param {string} key - Key that was not found
     * @param {Object} options - Translation options
     * @returns {string} Default value or the key itself
     * @private
     */
    static _handleMissingKey(locale, key, options) {
        // Use defaultValue if provided
        if (options.defaultValue !== undefined) return options.defaultValue;

        // Invoke missingKeyHandler if defined
        if (typeof this._options.missingKeyHandler === "function") {
            this._options.missingKeyHandler(locale, key);
        }

        // Invoke missing key callbacks
        const { namespace } = this._parseKey(key);
        for (const cb of this._missingKeyCallbacks) {
            cb({ locale, key, namespace, defaultValue: options.defaultValue });
        }

        // Return the key itself
        return key;
    }

    /**
     * Escape HTML special characters in a string to prevent XSS.
     * Non-string values pass through unchanged.
     *
     * @param {*} str - Value to escape
     * @returns {string} Escaped string
     * @private
     */
    static _escapeHtml(str) {
        if (typeof str !== "string") return String(str);

        return str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;")
            .replace(/`/g, "&#96;");
    }

    /**
     * Invoke all registered locale changed callbacks.
     *
     * @param {string} locale - New locale
     * @param {string|null} oldLocale - Previous locale
     * @private
     */
    static _invokeLocaleChangedCallbacks(locale, oldLocale) {
        const payload = {
            locale,
            oldLocale,
            direction: this.dir(locale)
        };
        for (const cb of this._localeChangedCallbacks) {
            cb(payload);
        }
    }

    /**
     * Load locale messages from a URL with retry and timeout.
     * Follows the same fetch + retry + timeout pattern as Template.load().
     *
     * @param {string} locale - Locale identifier
     * @param {string} url - URL to JSON locale file
     * @returns {Promise<void>}
     * @private
     */
    static _loadLocaleFromURL(locale, url) {
        // Deduplicate concurrent loads
        const existing = this._loadingLocales.get(locale);
        if (existing) return existing;

        // Check resource cache
        const cached = this._resourceCache.get(url);
        if (cached) {
            this.setLocaleMessages(locale, cached);
            return Promise.resolve();
        }

        const MAX_RETRIES = 3;
        const TIMEOUT_MS = 10000;

        const promise = (async () => {
            let lastError;

            for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

                    const response = await fetch(url, {
                        method: "GET",
                        signal: controller.signal,
                        cache: "default",
                        headers: {
                            "Accept": "application/json,*/*"
                        }
                    });

                    clearTimeout(timeoutId);

                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }

                    const messages = await response.json();

                    // Cache the result
                    this._resourceCache.set(url, messages);

                    // Store messages
                    this.setLocaleMessages(locale, messages);

                    return;
                } catch (err) {
                    lastError = err;

                    // Don't retry on abort (timeout)
                    if (err.name === "AbortError") {
                        lastError = new Error(`Timeout loading locale "${locale}" from ${url}`);
                        // Still retry on timeout
                    }

                    // Exponential backoff before retry
                    if (attempt < MAX_RETRIES - 1) {
                        const delay = Math.pow(2, attempt) * 200;
                        await new Promise(resolve => setTimeout(resolve, delay));
                    }
                }
            }

            throw lastError;
        })();

        this._loadingLocales.set(locale, promise);

        // Clean up loading state when done (success or failure)
        promise.finally(() => {
            this._loadingLocales.delete(locale);
        });

        return promise;
    }

    /**
     * Deep merge source object into target object.
     * Creates a new merged object without mutating target.
     *
     * @param {Object} target - Base object
     * @param {Object} source - Object to merge in
     * @returns {Object} Merged result
     * @private
     */
    static _deepMerge(target, source) {
        const result = { ...target };

        for (const key of Object.keys(source)) {
            if (
                source[key] !== null &&
                typeof source[key] === "object" &&
                !Array.isArray(source[key]) &&
                target[key] !== null &&
                typeof target[key] === "object" &&
                !Array.isArray(target[key])
            ) {
                result[key] = this._deepMerge(target[key], source[key]);
            } else {
                result[key] = source[key];
            }
        }

        return result;
    }
}
