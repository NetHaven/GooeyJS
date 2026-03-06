import GooeyElement from '../../../GooeyElement.js';
import Template from '../../../util/Template.js';
import MetaLoader from '../../../util/MetaLoader.js';
import ComponentRegistry from '../../../util/ComponentRegistry.js';
import GooeyI18n from '../../GooeyI18n.js';
import LanguageDetector from '../../LanguageDetector.js';
import I18nEvent from '../../../events/i18n/I18nEvent.js';

/**
 * I18n Component
 *
 * A non-visual component that configures the GooeyI18n system declaratively.
 * Analogous to <gooeydata-store> -- acts as a container for child <gooey-locale>
 * elements and initializes the i18n runtime from markup attributes.
 *
 * Uses a MutationObserver to watch for dynamically added/removed <gooey-locale>
 * children, updating the i18n message store automatically.
 *
 * @example
 * <gooey-i18n locale="en" fallback="en">
 *     <gooey-locale lang="en">{"greeting": "Hello"}</gooey-locale>
 *     <gooey-locale lang="fr" src="locales/fr.json"></gooey-locale>
 *     <gooey-locale lang="de" src="locales/de.json" lazy></gooey-locale>
 * </gooey-i18n>
 */
export default class I18n extends GooeyElement {

    static get observedAttributes() {
        return ['locale', 'fallback', 'detect', 'escape-html', 'debug', 'ns-separator', 'key-separator', ...super.observedAttributes];
    }

    constructor() {
        super();

        // Create Shadow DOM for CSS encapsulation
        this.attachShadow({ mode: 'open' });

        // Inject theme CSS if available
        const tagName = this.tagName.toLowerCase();
        const cssResult = ComponentRegistry.getThemeCSS(tagName);
        if (cssResult) {
            MetaLoader.injectCSS(this.shadowRoot, cssResult);
        }

        // Activate template
        Template.activate("i18n-I18n", this.shadowRoot);

        // MutationObserver to watch for child gooey-locale changes
        this._observer = null;

        // Cleanup function for GooeyI18n locale change forwarding
        this._localeChangeCleanup = null;

        // Register valid events
        this.addValidEvent(I18nEvent.INITIALIZED);
        this.addValidEvent(I18nEvent.LOCALE_CHANGED);
        this.addValidEvent(I18nEvent.LOCALE_LOADING);
        this.addValidEvent(I18nEvent.LOCALE_LOADED);
        this.addValidEvent(I18nEvent.MISSING_KEY);
        this.addValidEvent(I18nEvent.ERROR);
        this.addValidEvent(I18nEvent.MESSAGES_ADDED);
        this.addValidEvent(I18nEvent.MESSAGES_REMOVED);
    }

    // =========== Properties ===========

    /**
     * Get the active locale.
     * @returns {string|null}
     */
    get locale() {
        return this.getAttribute('locale');
    }

    /**
     * Set the active locale.
     * @param {string} val - BCP 47 locale identifier
     */
    set locale(val) {
        if (val) {
            this.setAttribute('locale', val);
        } else {
            this.removeAttribute('locale');
        }
    }

    /**
     * Get the fallback locale(s) as a comma-separated string.
     * @returns {string|null}
     */
    get fallback() {
        return this.getAttribute('fallback');
    }

    /**
     * Set the fallback locale(s).
     * @param {string} val - Comma-separated locale identifiers
     */
    set fallback(val) {
        if (val) {
            this.setAttribute('fallback', val);
        } else {
            this.removeAttribute('fallback');
        }
    }

    /**
     * Get the language detection strategy.
     * @returns {string|null}
     */
    get detect() {
        return this.getAttribute('detect');
    }

    /**
     * Set the language detection strategy.
     * @param {string} val - Detection strategy name
     */
    set detect(val) {
        if (val) {
            this.setAttribute('detect', val);
        } else {
            this.removeAttribute('detect');
        }
    }

    /**
     * Get whether HTML escaping is enabled for interpolated values.
     * @returns {boolean}
     */
    get escapeHtml() {
        return this.getAttribute('escape-html') !== 'false';
    }

    /**
     * Set whether HTML escaping is enabled for interpolated values.
     * @param {boolean} val
     */
    set escapeHtml(val) {
        this.setAttribute('escape-html', val ? 'true' : 'false');
    }

    /**
     * Get whether debug mode is enabled.
     * @returns {boolean}
     */
    get debug() {
        return this.hasAttribute('debug') && this.getAttribute('debug') !== 'false';
    }

    /**
     * Set whether debug mode is enabled.
     * @param {boolean} val
     */
    set debug(val) {
        if (val) {
            this.setAttribute('debug', 'true');
        } else {
            this.removeAttribute('debug');
        }
    }

    /**
     * Get the namespace separator character.
     * @returns {string}
     */
    get nsSeparator() {
        return this.getAttribute('ns-separator') || ':';
    }

    /**
     * Set the namespace separator character.
     * @param {string} val
     */
    set nsSeparator(val) {
        if (val) {
            this.setAttribute('ns-separator', val);
        } else {
            this.removeAttribute('ns-separator');
        }
    }

    /**
     * Get the key path separator character.
     * @returns {string}
     */
    get keySeparator() {
        return this.getAttribute('key-separator') || '.';
    }

    /**
     * Set the key path separator character.
     * @param {string} val
     */
    set keySeparator(val) {
        if (val) {
            this.setAttribute('key-separator', val);
        } else {
            this.removeAttribute('key-separator');
        }
    }

    // =========== Web Component Lifecycle ===========

    async connectedCallback() {
        // Read attributes
        const locale = this.locale;
        const fallbackAttr = this.fallback;
        const escapeHtml = this.escapeHtml;
        const debug = this.debug;
        const nsSeparator = this.nsSeparator;
        const keySeparator = this.keySeparator;
        const detect = this.detect;

        // Parse fallback as comma-separated list
        const fallbackLocale = fallbackAttr
            ? fallbackAttr.split(',').map(s => s.trim()).filter(Boolean)
            : [];

        // Yield to microtask queue so child gooey-locale connectedCallbacks run first
        await Promise.resolve();

        // Build init options
        const initOptions = {
            locale: locale || '',
            fallbackLocale: fallbackLocale.length === 1 ? fallbackLocale[0] : fallbackLocale,
            messages: {},
            escapeParameterHtml: escapeHtml,
            silentTranslationWarn: false,
            silentFallbackWarn: false,
            nsSeparator,
            keySeparator
        };

        // Initialize GooeyI18n if not already initialized
        if (!GooeyI18n.isInitialized) {
            GooeyI18n.init(initOptions);
        } else {
            // Already initialized -- just sync locale and fallback if specified
            if (locale) {
                GooeyI18n.locale = locale;
            }
            if (fallbackLocale.length > 0) {
                GooeyI18n.fallbackLocale = fallbackLocale.length === 1 ? fallbackLocale[0] : fallbackLocale;
            }
        }

        // Language detection via LanguageDetector
        if (detect) {
            const order = detect.split(',').map(s => s.trim()).filter(Boolean);
            const detected = LanguageDetector.detect({ order });
            if (detected && detected !== locale) {
                GooeyI18n.locale = detected;
            }
        }

        // Set locale if specified (may trigger lazy loading)
        if (locale && GooeyI18n.locale !== locale) {
            GooeyI18n.locale = locale;
        }

        // Set up MutationObserver for child gooey-locale elements
        this._setupObserver();

        // Register for locale change forwarding from GooeyI18n to Observable events
        this._localeChangeCleanup = GooeyI18n.onLocaleChanged((payload) => {
            this.fireEvent(I18nEvent.LOCALE_CHANGED, payload);
        });

        // Fire initialized event
        this.fireEvent(I18nEvent.INITIALIZED, {
            locale: GooeyI18n.locale,
            availableLocales: GooeyI18n.availableLocales
        });
    }

    disconnectedCallback() {
        // Disconnect MutationObserver
        if (this._observer) {
            this._observer.disconnect();
            this._observer = null;
        }

        // Clean up locale change callback
        if (this._localeChangeCleanup) {
            this._localeChangeCleanup();
            this._localeChangeCleanup = null;
        }
    }

    attributeChangedCallback(name, oldValue, newValue) {
        // Guard against infinite recursion
        if (oldValue === newValue) return;

        super.attributeChangedCallback?.(name, oldValue, newValue);

        switch (name) {
            case 'locale':
                if (GooeyI18n.isInitialized) {
                    GooeyI18n.locale = newValue;
                }
                break;
            case 'fallback':
                if (GooeyI18n.isInitialized && newValue) {
                    GooeyI18n.fallbackLocale = newValue.split(',').map(s => s.trim()).filter(Boolean);
                }
                break;
        }
    }

    // =========== Observer Setup ===========

    /**
     * Set up MutationObserver to watch for child gooey-locale additions/removals.
     * Follows the Store._setupObserver() pattern.
     */
    _setupObserver() {
        this._observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList') {
                    // Handle added Locale elements
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === Node.ELEMENT_NODE &&
                            node.tagName.toLowerCase() === 'gooey-locale') {
                            // Locale's connectedCallback handles loading via GooeyI18n
                            this.fireEvent(I18nEvent.MESSAGES_ADDED, {
                                locale: node.lang,
                                namespace: node.getAttribute('namespace') || 'translation'
                            });
                        }
                    }

                    // Handle removed Locale elements
                    for (const node of mutation.removedNodes) {
                        if (node.nodeType === Node.ELEMENT_NODE &&
                            node.tagName.toLowerCase() === 'gooey-locale') {
                            GooeyI18n.removeLocaleMessages(node.lang);
                            this.fireEvent(I18nEvent.MESSAGES_REMOVED, {
                                locale: node.lang,
                                namespace: node.getAttribute('namespace') || 'translation'
                            });
                        }
                    }
                }
            }
        });

        // Only observe direct child additions/removals
        this._observer.observe(this, {
            childList: true,
            subtree: false
        });
    }
}
