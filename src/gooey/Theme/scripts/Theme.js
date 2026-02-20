import GooeyElement from '../../GooeyElement.js';
import ThemeManager from '../../util/ThemeManager.js';
import ThemeEvent from '../../events/ThemeEvent.js';
import Logger from '../../logging/Logger.js';

/**
 * Declarative theme registration and activation component.
 *
 * A non-visual component that loads token CSS, collects structural overrides
 * from child `<gooey-theme-override>` elements, and registers the complete
 * theme configuration with ThemeManager.
 *
 * Usage:
 * ```html
 * <gooey-theme name="classic" tokens="themes/classic/tokens.css" active>
 *     <gooey-theme-override target="gooeyui-button" href="themes/classic/button.css"></gooey-theme-override>
 *     <gooey-theme-override target="gooeyui-window" href="themes/classic/window.css"></gooey-theme-override>
 * </gooey-theme>
 * ```
 *
 * Attributes:
 * - name: Theme identifier (e.g., "classic", "dark")
 * - tokens: Path to token CSS file with :root custom property overrides
 * - extends: Name of parent theme to inherit tokens from
 * - active: Boolean attribute -- when present, activates this theme
 *
 * Events:
 * - theme-loading: Fired when the theme begins loading token CSS
 * - theme-loaded: Fired when the theme is fully loaded and registered
 * - theme-error: Fired when theme loading fails
 *
 * @extends GooeyElement
 */
export default class Theme extends GooeyElement {

    constructor() {
        super();

        // Non-visual: hide from layout
        this.style.display = 'none';

        /** @type {boolean} Whether theme has finished loading */
        this._loaded = false;

        /** @type {CSSStyleSheet|null} CSSStyleSheet for this theme's tokens */
        this._tokenSheet = null;

        /** @type {Map<string, CSSStyleSheet>} target tagName -> CSSStyleSheet from child overrides */
        this._overrides = new Map();

        /** @type {MutationObserver|null} Watches for gooey-theme-override child additions/removals */
        this._observer = null;

        // Register valid lifecycle events
        this.addValidEvent(ThemeEvent.LOADING);
        this.addValidEvent(ThemeEvent.LOADED);
        this.addValidEvent(ThemeEvent.ERROR);
    }

    connectedCallback() {
        super.connectedCallback?.();
        this._collectOverrides();
        this._setupObserver();
        this._registerTheme();
    }

    disconnectedCallback() {
        // Disconnect the MutationObserver
        if (this._observer) {
            this._observer.disconnect();
            this._observer = null;
        }

        // If this was the active theme, revert to base
        if (ThemeManager.activeTheme === this.getAttribute('name')) {
            ThemeManager.setTheme('base');
        }

        super.disconnectedCallback?.();
    }

    attributeChangedCallback(name, oldValue, newValue) {
        // Guard against infinite recursion
        if (oldValue === newValue) return;

        super.attributeChangedCallback?.(name, oldValue, newValue);

        switch (name) {
            case 'active':
                if (newValue !== null) {
                    // Attribute added: activate this theme
                    this._activate();
                } else {
                    // Attribute removed: deactivate this theme
                    this._deactivate();
                }
                break;
        }
    }

    // ---- Property accessors ----

    /** @returns {string|null} Theme name */
    get name() {
        return this.getAttribute('name');
    }

    /** @param {string} val Theme name */
    set name(val) {
        this.setAttribute('name', val);
    }

    /** @returns {string|null} Token CSS file path */
    get tokens() {
        return this.getAttribute('tokens');
    }

    /** @param {string} val Token CSS file path */
    set tokens(val) {
        this.setAttribute('tokens', val);
    }

    /** @returns {string|null} Parent theme name (extends is a reserved word) */
    get extends_() {
        return this.getAttribute('extends');
    }

    /** @returns {boolean} Whether this theme is active */
    get active() {
        return this.hasAttribute('active');
    }

    /** @param {boolean} val Activate or deactivate this theme */
    set active(val) {
        if (val) {
            this.setAttribute('active', '');
        } else {
            this.removeAttribute('active');
        }
    }

    // ---- Theme registration ----

    /**
     * Load token CSS, collect overrides, and register with ThemeManager.
     *
     * If the `active` attribute is set, activation happens at the end
     * of this method after loading completes (avoids race conditions).
     *
     * @private
     */
    async _registerTheme() {
        const name = this.getAttribute('name');
        const tokensPath = this.tokens;

        if (!name) {
            Logger.warn(
                { code: "THEME_NO_NAME" },
                "gooey-theme missing 'name' attribute"
            );
            return;
        }

        this.fireEvent(ThemeEvent.LOADING, {
            name,
            tokens: tokensPath,
            component: this
        });

        try {
            // Load token CSS if provided
            if (tokensPath) {
                const response = await fetch(tokensPath);
                if (!response.ok) {
                    throw new Error(`Token CSS not found: ${tokensPath} (HTTP ${response.status})`);
                }
                const cssText = await response.text();
                this._tokenSheet = new CSSStyleSheet();
                this._tokenSheet.replaceSync(cssText);
            }

            // Collect and load overrides from child gooey-theme-override elements
            const overrideEls = this.querySelectorAll(':scope > gooey-theme-override');
            for (const el of overrideEls) {
                if (el.target && el.href) {
                    const sheet = await el.loadCSS();
                    this._overrides.set(el.target.toLowerCase(), sheet);
                }
            }

            // Register with ThemeManager
            ThemeManager.registerThemeConfig(this.getAttribute('name'), {
                tokenSheet: this._tokenSheet,
                overrides: this._overrides,
                extends: this.getAttribute('extends') || null
            });

            this._loaded = true;

            this.fireEvent(ThemeEvent.LOADED, {
                name,
                tokens: tokensPath,
                component: this
            });

            // If declared with active attribute, activate now that loading is complete
            if (this.hasAttribute('active')) {
                await this._activate();
            }
        } catch (error) {
            Logger.error(
                error,
                { code: "THEME_LOAD_FAILED", name },
                "Failed to load theme %s",
                name
            );
            this.fireEvent(ThemeEvent.ERROR, {
                name,
                error: error.message,
                component: this
            });
        }
    }

    // ---- Activation / deactivation ----

    /**
     * Activate this theme (radio-button behavior: THEME-11).
     *
     * Removes `active` from all other `<gooey-theme>` elements,
     * then delegates to ThemeManager.setTheme().
     *
     * @private
     */
    async _activate() {
        // Don't activate until loading is complete
        if (!this._loaded) return;

        const name = this.getAttribute('name');

        // Radio-button behavior: deactivate all other gooey-theme elements
        document.querySelectorAll('gooey-theme[active]').forEach(el => {
            if (el !== this) {
                el.removeAttribute('active');
            }
        });

        await ThemeManager.setTheme(name);
    }

    /**
     * Deactivate this theme, reverting to base if it was the active one.
     *
     * @private
     */
    _deactivate() {
        const name = this.getAttribute('name');
        if (ThemeManager.activeTheme === name) {
            ThemeManager.setTheme('base');
        }
    }

    // ---- Override child management ----

    /**
     * Collect existing gooey-theme-override children.
     *
     * Overrides are loaded in _registerTheme() via querySelectorAll;
     * this method ensures the DOM is ready for that traversal.
     *
     * @private
     */
    _collectOverrides() {
        // Overrides are loaded in _registerTheme(), this just ensures DOM is ready
    }

    /**
     * Set up MutationObserver to watch for dynamic gooey-theme-override
     * child additions and removals (following Store pattern).
     *
     * @private
     */
    _setupObserver() {
        this._observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList') {
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === Node.ELEMENT_NODE && node.tagName.toLowerCase() === 'gooey-theme-override') {
                            this._handleOverrideAdded(node);
                        }
                    }
                    for (const node of mutation.removedNodes) {
                        if (node.nodeType === Node.ELEMENT_NODE && node.tagName.toLowerCase() === 'gooey-theme-override') {
                            this._handleOverrideRemoved(node);
                        }
                    }
                }
            }
        });
        this._observer.observe(this, { childList: true, subtree: false });
    }

    /**
     * Handle a gooey-theme-override child being added dynamically.
     *
     * Loads the override CSS, updates the theme config, and re-applies
     * the theme if this theme is currently active.
     *
     * @param {HTMLElement} overrideEl - The gooey-theme-override element
     * @private
     */
    async _handleOverrideAdded(overrideEl) {
        if (!overrideEl.target || !overrideEl.href) return;

        try {
            const sheet = await overrideEl.loadCSS();
            this._overrides.set(overrideEl.target.toLowerCase(), sheet);

            // Re-register config with updated overrides
            if (this._loaded) {
                ThemeManager.registerThemeConfig(this.getAttribute('name'), {
                    tokenSheet: this._tokenSheet,
                    overrides: this._overrides,
                    extends: this.getAttribute('extends') || null
                });
            }

            // Re-apply if this theme is currently active
            if (ThemeManager.activeTheme === this.getAttribute('name')) {
                await ThemeManager.setTheme(this.getAttribute('name'));
            }
        } catch (error) {
            Logger.warn(
                error,
                { code: "THEME_OVERRIDE_ADD_FAILED", target: overrideEl.target },
                "Failed to add theme override for %s",
                overrideEl.target
            );
        }
    }

    /**
     * Handle a gooey-theme-override child being removed.
     *
     * Removes the override from the map, updates the theme config,
     * and re-applies the theme if currently active.
     *
     * @param {HTMLElement} overrideEl - The gooey-theme-override element
     * @private
     */
    _handleOverrideRemoved(overrideEl) {
        if (overrideEl.target) {
            this._overrides.delete(overrideEl.target.toLowerCase());
        }

        // Re-register config with updated overrides
        if (this._loaded) {
            ThemeManager.registerThemeConfig(this.getAttribute('name'), {
                tokenSheet: this._tokenSheet,
                overrides: this._overrides,
                extends: this.getAttribute('extends') || null
            });
        }

        // Re-apply if this theme is currently active
        if (ThemeManager.activeTheme === this.getAttribute('name')) {
            ThemeManager.setTheme(this.getAttribute('name'));
        }
    }
}
