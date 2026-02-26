import GooeyElement from '../../GooeyElement.js';
import ThemeManager from '../../util/ThemeManager.js';
import ThemeEvent from '../../events/ThemeEvent.js';
import Logger from '../../logging/Logger.js';

/**
 * Declarative theme registration and activation component.
 *
 * A non-visual component that loads theme CSS, auto-discovers per-component
 * overrides from ComponentRegistry metadata, and registers the complete
 * theme configuration with ThemeManager.
 *
 * Per-component overrides are automatically discovered from META.goo
 * `themes.available` declarations. Explicit `<gooey-theme-override>` children
 * are optional and only needed for non-standard CSS file paths (they take
 * precedence over auto-discovered overrides for the same component).
 *
 * Usage:
 * ```html
 * <!-- Standard: overrides auto-discovered from META.goo -->
 * <gooey-theme name="classic" href="themes/classic.css" active></gooey-theme>
 *
 * <!-- With explicit override for non-standard path -->
 * <gooey-theme name="custom" href="themes/custom.css" active>
 *     <gooey-theme-override target="gooeyui-button" href="custom/button-override.css"></gooey-theme-override>
 * </gooey-theme>
 * ```
 *
 * Attributes:
 * - name: Theme identifier (e.g., "classic", "dark")
 * - href: Path to theme CSS file with :root custom property overrides
 * - extends: Name of parent theme to inherit from
 * - active: Boolean attribute -- when present, activates this theme
 * - fonts: Base directory path for theme font files (e.g., "themes/classic-fonts")
 * - font-faces: JSON array of font descriptors to load via FontFace API
 *
 * Events:
 * - theme-loading: Fired when the theme begins loading CSS
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

        /** @type {CSSStyleSheet|null} CSSStyleSheet for this theme's custom properties */
        this._themeSheet = null;

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

    /** @returns {string|null} Theme CSS file path */
    get href() {
        return this.getAttribute('href');
    }

    /** @param {string} val Theme CSS file path */
    set href(val) {
        this.setAttribute('href', val);
    }

    /** @returns {string|null} Base directory path for theme font files */
    get fonts() {
        return this.getAttribute('fonts');
    }

    /** @param {string} val Base directory path for theme font files */
    set fonts(val) {
        this.setAttribute('fonts', val);
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
     * Load theme CSS, auto-discover and collect overrides, and register
     * with ThemeManager.
     *
     * Override collection uses three phases:
     * 1. Auto-discover from ComponentRegistry metadata (META.goo themes.available)
     * 2. Collect explicit `<gooey-theme-override>` children
     * 3. Merge: explicit overrides take precedence over auto-discovered
     *
     * If the `active` attribute is set, activation happens at the end
     * of this method after loading completes (avoids race conditions).
     *
     * @private
     */
    async _registerTheme() {
        const name = this.getAttribute('name');
        const themePath = this.href;

        if (!name) {
            Logger.warn(
                { code: "THEME_NO_NAME" },
                "gooey-theme missing 'name' attribute"
            );
            return;
        }

        this.fireEvent(ThemeEvent.LOADING, {
            name,
            href: themePath,
            component: this
        });

        try {
            // Load theme CSS if provided
            if (themePath) {
                const response = await fetch(themePath);
                if (!response.ok) {
                    throw new Error(`Theme CSS not found: ${themePath} (HTTP ${response.status})`);
                }
                const cssText = await response.text();
                this._themeSheet = new CSSStyleSheet();
                this._themeSheet.replaceSync(cssText);
            }

            // Load theme fonts if specified (on-demand via FontFace API)
            const fontsPath = this.getAttribute('fonts');
            if (fontsPath) {
                await this._loadFonts(fontsPath);
            }

            // Phase 1: Auto-discover overrides from ComponentRegistry metadata
            const autoDiscovered = await ThemeManager.discoverOverrides(name);

            // Phase 2: Collect explicit overrides from child gooey-theme-override elements
            const explicitOverrides = new Map();
            const overrideEls = this.querySelectorAll(':scope > gooey-theme-override');
            for (const el of overrideEls) {
                if (el.target && el.href) {
                    const sheet = await el.loadCSS();
                    explicitOverrides.set(el.target.toLowerCase(), sheet);
                }
            }

            // Phase 3: Merge (auto-discovered first, then explicit wins for same target)
            this._overrides = new Map(autoDiscovered);
            for (const [tagName, sheet] of explicitOverrides) {
                this._overrides.set(tagName, sheet);
            }

            // Register with ThemeManager
            ThemeManager.registerThemeConfig(this.getAttribute('name'), {
                themeSheet: this._themeSheet,
                overrides: this._overrides,
                extends: this.getAttribute('extends') || null
            });

            this._loaded = true;

            this.fireEvent(ThemeEvent.LOADED, {
                name,
                href: themePath,
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

    // ---- Font loading ----

    /**
     * Load theme fonts on-demand via the FontFace API.
     *
     * Parses the `font-faces` attribute as a JSON array of font descriptors,
     * loads each WOFF2 file from the given base directory, and registers
     * the loaded fonts on `document.fonts` so they are available inside
     * all Shadow DOM contexts.
     *
     * Fonts that are already registered (from a previous activation) are
     * skipped to ensure idempotent behavior.
     *
     * @param {string} fontsPath - Base directory path for font files
     * @private
     */
    async _loadFonts(fontsPath) {
        const fontsAttr = this.getAttribute('font-faces');
        if (!fontsAttr) return;

        let fontFaces;
        try {
            fontFaces = JSON.parse(fontsAttr);
        } catch (e) {
            Logger.warn(
                { code: "THEME_FONT_PARSE_ERROR" },
                "Invalid font-faces JSON: %s",
                e.message
            );
            return;
        }

        for (const { family, file, weight, style } of fontFaces) {
            // Skip if already registered
            let exists = false;
            for (const f of document.fonts) {
                if (f.family === family) {
                    exists = true;
                    break;
                }
            }
            if (exists) continue;

            try {
                const url = `${fontsPath}/${file}`;
                const fontFace = new FontFace(family, `url(${url})`, {
                    weight: weight || 'normal',
                    style: style || 'normal',
                    display: 'swap'
                });
                const loadedFace = await fontFace.load();
                document.fonts.add(loadedFace);
            } catch (err) {
                Logger.warn(
                    { code: "THEME_FONT_LOAD_FAILED", family },
                    "Failed to load font %s: %s",
                    family,
                    err.message
                );
            }
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
                    themeSheet: this._themeSheet,
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
                themeSheet: this._themeSheet,
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
