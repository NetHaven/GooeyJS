import GooeyElement from '../../GooeyElement.js';
import Logger from '../../logging/Logger.js';

/**
 * ThemeOverride component for per-component structural CSS overrides.
 *
 * A non-visual child element of `<gooey-theme>` that loads structural CSS
 * for a specific component type. When loaded, creates a shared CSSStyleSheet
 * that ThemeManager injects into matching component shadow roots.
 *
 * Usage:
 * ```html
 * <gooey-theme name="classic" href="themes/classic.css" active>
 *     <gooey-theme-override target="gooeyui-button" href="gooey/ui/button/Button/themes/classic.css"></gooey-theme-override>
 *     <gooey-theme-override target="gooeyui-window" href="gooey/ui/window/Window/themes/classic.css"></gooey-theme-override>
 * </gooey-theme>
 * ```
 *
 * Attributes:
 * - target: The custom element tag name to apply the override to (e.g., "gooeyui-button")
 * - href: Path to the structural CSS file
 *
 * @extends GooeyElement
 */
export default class ThemeOverride extends GooeyElement {

    constructor() {
        super();

        // Non-visual: hide from layout
        this.style.display = 'none';

        /** @type {string|null} Loaded CSS text */
        this._cssText = null;

        /** @type {CSSStyleSheet|null} Shared CSSStyleSheet instance */
        this._sheet = null;

        /** @type {boolean} Whether CSS has been loaded */
        this._loaded = false;
    }

    connectedCallback() {
        super.connectedCallback?.();
        this._notifyParentTheme();
    }

    disconnectedCallback() {
        super.disconnectedCallback?.();
    }

    // ---- Property accessors ----

    /**
     * Get the target component tag name.
     * @returns {string|null}
     */
    get target() {
        return this.getAttribute('target');
    }

    /**
     * Set the target component tag name.
     * @param {string} val
     */
    set target(val) {
        this.setAttribute('target', val);
    }

    /**
     * Get the CSS file path.
     * @returns {string|null}
     */
    get href() {
        return this.getAttribute('href');
    }

    /**
     * Set the CSS file path.
     * @param {string} val
     */
    set href(val) {
        this.setAttribute('href', val);
    }

    /**
     * Whether the CSS has been loaded.
     * @returns {boolean}
     */
    get loaded() {
        return this._loaded;
    }

    // ---- CSS loading ----

    /**
     * Load the CSS file from href and create a shared CSSStyleSheet.
     *
     * Fetches the CSS text, creates a CSSStyleSheet via replaceSync(),
     * and caches it for reuse. Subsequent calls return the cached sheet.
     *
     * @returns {Promise<CSSStyleSheet>} The created/cached CSSStyleSheet
     * @throws {Error} If href is missing or the fetch fails
     */
    async loadCSS() {
        // Return cached sheet if already loaded
        if (this._sheet) return this._sheet;

        // Validate href
        if (!this.href) {
            throw new Error("ThemeOverride missing href attribute");
        }

        // Fetch CSS text
        const response = await fetch(this.href);
        if (!response.ok) {
            throw new Error(`Theme override CSS not found: ${this.href} (HTTP ${response.status})`);
        }

        // Create shared CSSStyleSheet
        this._cssText = await response.text();
        this._sheet = new CSSStyleSheet();
        this._sheet.replaceSync(this._cssText);
        this._loaded = true;

        Logger.debug(
            { code: "THEME_OVERRIDE_LOADED", target: this.target, href: this.href },
            "Theme override loaded: %s -> %s",
            this.target, this.href
        );

        return this._sheet;
    }

    // ---- Parent communication ----

    /**
     * Notify the parent `<gooey-theme>` element that this override was added.
     *
     * Uses `closest('gooey-theme')` to find the parent theme element in the
     * regular DOM (not shadow DOM). If found and the parent has a
     * `_handleOverrideAdded` method, calls it with this element.
     *
     * @private
     */
    _notifyParentTheme() {
        const parent = this.closest('gooey-theme');
        if (parent && typeof parent._handleOverrideAdded === 'function') {
            parent._handleOverrideAdded(this);
        }
    }
}
