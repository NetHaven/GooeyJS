import GooeyElement from '../../../GooeyElement.js';
import Template from '../../../util/Template.js';
import MetaLoader from '../../../util/MetaLoader.js';
import ComponentRegistry from '../../../util/ComponentRegistry.js';
import GooeyI18n from '../../GooeyI18n.js';
import I18nEvent from '../../../events/i18n/I18nEvent.js';

/**
 * Locale Component
 *
 * A non-visual component that defines locale messages for the i18n system.
 * Used as a child of <gooey-i18n> to declare translations declaratively.
 *
 * Supports three modes:
 * - Inline: JSON messages in the element's text content
 * - Eager external: Fetches from a URL immediately on connect
 * - Lazy external: Registers URL for deferred loading when locale activates
 *
 * @example
 * <!-- Inline messages -->
 * <gooey-locale lang="en">{"greeting": "Hello"}</gooey-locale>
 *
 * <!-- Eager external -->
 * <gooey-locale lang="fr" src="locales/fr.json"></gooey-locale>
 *
 * <!-- Lazy external -->
 * <gooey-locale lang="de" src="locales/de.json" lazy></gooey-locale>
 */
export default class Locale extends GooeyElement {
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
        Template.activate("i18n-Locale", this.shadowRoot);
    }

    // =========== Properties ===========

    /**
     * Get the language identifier for this locale.
     * @returns {string|null}
     */
    get lang() {
        return this.getAttribute('lang');
    }

    /**
     * Set the language identifier for this locale.
     * @param {string} val - BCP 47 locale identifier
     */
    set lang(val) {
        if (val) {
            this.setAttribute('lang', val);
        } else {
            this.removeAttribute('lang');
        }
    }

    /**
     * Get the external source URL for locale messages.
     * @returns {string|null}
     */
    get src() {
        return this.getAttribute('src');
    }

    /**
     * Set the external source URL for locale messages.
     * @param {string} val - URL to JSON locale file
     */
    set src(val) {
        if (val) {
            this.setAttribute('src', val);
        } else {
            this.removeAttribute('src');
        }
    }

    /**
     * Get whether this locale uses lazy loading.
     * @returns {boolean}
     */
    get lazy() {
        return this.hasAttribute('lazy');
    }

    /**
     * Set whether this locale uses lazy loading.
     * @param {boolean} val
     */
    set lazy(val) {
        if (val) {
            this.setAttribute('lazy', '');
        } else {
            this.removeAttribute('lazy');
        }
    }

    /**
     * Get the namespace for this locale's messages.
     * @returns {string}
     */
    get namespace() {
        return this.getAttribute('namespace') || 'translation';
    }

    /**
     * Set the namespace for this locale's messages.
     * @param {string} val
     */
    set namespace(val) {
        if (val) {
            this.setAttribute('namespace', val);
        } else {
            this.removeAttribute('namespace');
        }
    }

    // =========== Web Component Lifecycle ===========

    connectedCallback() {
        if (this.src && this.lazy) {
            // Lazy: register URL for deferred loading
            GooeyI18n.registerLocale(this.lang, this.src);
        } else if (this.src) {
            // Eager external: fetch immediately
            this._loadExternal();
        } else {
            // Inline: parse textContent as JSON
            this._loadInline();
        }
    }

    disconnectedCallback() {
        // Minimal cleanup -- parent I18n handles removal via MutationObserver
    }

    // =========== Private Methods ===========

    /**
     * Get the parent <gooey-i18n> element.
     * @returns {HTMLElement|null}
     */
    _getI18nParent() {
        return this.closest('gooey-i18n');
    }

    /**
     * Load inline messages from the element's text content.
     * Parses JSON and registers with GooeyI18n.
     */
    _loadInline() {
        const text = this.textContent.trim();
        if (!text) return;

        try {
            const parsed = JSON.parse(text);
            GooeyI18n.setNamespaceMessages(this.lang, this.namespace, parsed);
        } catch (error) {
            const parent = this._getI18nParent();
            if (parent && typeof parent.fireEvent === 'function') {
                parent.fireEvent(I18nEvent.ERROR, {
                    error,
                    locale: this.lang,
                    src: null,
                    code: 'PARSE_ERROR'
                });
            }
        }
    }

    /**
     * Load external messages from the src URL.
     * Uses GooeyI18n.loadLocale which handles retry/timeout/caching.
     */
    async _loadExternal() {
        const parent = this._getI18nParent();
        const ns = this.namespace;

        try {
            // Use loadNamespace to store under the correct namespace
            await GooeyI18n.loadNamespace(this.lang, ns, this.src);

            // Fire LOCALE_LOADED on parent if it's an Observable
            if (parent && typeof parent.fireEvent === 'function') {
                const messages = GooeyI18n.getLocaleMessages(this.lang);
                const messageCount = messages ? Object.keys(messages).length : 0;

                parent.fireEvent(I18nEvent.LOCALE_LOADED, {
                    locale: this.lang,
                    src: this.src,
                    namespace: ns,
                    messageCount
                });
            }
        } catch (error) {
            if (parent && typeof parent.fireEvent === 'function') {
                parent.fireEvent(I18nEvent.ERROR, {
                    error,
                    locale: this.lang,
                    src: this.src,
                    code: 'LOAD_ERROR'
                });
            }
        }
    }
}
