import Logger from '../logging/Logger.js';
import ThemeEvent from '../events/ThemeEvent.js';
import MetaLoader from './MetaLoader.js';
import ComponentRegistry from './ComponentRegistry.js';

/**
 * Singleton theme manager for GooeyJS theme architecture.
 *
 * Manages active theme state, registered theme definitions, a lazily-created
 * CSSStyleSheet for runtime overrides, and WeakRef-based tracking of
 * live UIComponent instances for theme broadcast.
 *
 * This is a static-only class following the ComponentRegistry pattern --
 * no instantiation needed.
 *
 * Phase 22: Foundation (registerTheme, registerInstance, getThemeSheet, getLiveInstances)
 * Phase 23: Theme switching engine (registerThemeConfig, setTheme, applyThemeToInstance,
 *           extends chain resolution, sheet removal)
 */
export default class ThemeManager {

    // ---- Static fields ----

    /** @type {string} Currently active theme name */
    static _activeTheme = 'base';

    /**
     * Registered themes: name -> definition.
     *
     * Each definition may have:
     * - Phase 22 format: { themeCSS: string }
     * - Phase 23 format: { themeSheet: CSSStyleSheet|null, overrides: Map, extends: string|null }
     * - Both fields may coexist (backward compat).
     *
     * @type {Map<string, object>}
     */
    static _themes = new Map();

    /** @type {CSSStyleSheet|null} Lazily created stylesheet for runtime theme overrides */
    static _themeSheet = null;

    /** @type {Set<WeakRef>} WeakRef set tracking live UIComponent instances */
    static _instances = new Set();

    /** @type {CSSStyleSheet[]} Theme sheets currently on document.adoptedStyleSheets (for removal) */
    static _activeThemeSheets = [];

    /** @type {Map<string, CSSStyleSheet>} Active structural overrides: tagName -> CSSStyleSheet */
    static _activeOverrides = new Map();

    // ---- Theme state ----

    /**
     * Get the currently active theme name.
     *
     * @returns {string} Active theme name (default: 'base')
     */
    static get activeTheme() {
        return this._activeTheme;
    }

    // ---- Theme registration ----

    /**
     * Register a theme with its CSS content (Phase 22 API).
     *
     * Kept for backward compatibility. Stores the CSS text in the theme
     * definition. The CSSStyleSheet is created lazily during setTheme()
     * if needed.
     *
     * @param {string} name - Theme name (e.g., 'base', 'dark', 'classic')
     * @param {string} themeCSSText - CSS text containing :root custom property overrides
     */
    static registerTheme(name, themeCSSText) {
        const existing = this._themes.get(name);
        if (existing) {
            existing.themeCSS = themeCSSText;
            this._themes.set(name, existing);
        } else {
            this._themes.set(name, { themeCSS: themeCSSText });
        }
        Logger.debug({ code: "THEME_REGISTERED", name }, "Theme registered: %s", name);
    }

    /**
     * Register a theme with a full config object (Phase 23 API).
     *
     * Config properties:
     * - themeSheet {CSSStyleSheet|null} - Pre-created theme stylesheet
     * - overrides {Map<string, CSSStyleSheet>} - Per-component structural overrides
     * - extends {string|null} - Name of parent theme to extend
     *
     * @param {string} name - Theme name
     * @param {object} config - Theme configuration
     */
    static registerThemeConfig(name, config) {
        const existing = this._themes.get(name) || {};
        existing.themeSheet = config.themeSheet || null;
        existing.overrides = config.overrides || new Map();
        existing.extends = config.extends || null;
        this._themes.set(name, existing);
        Logger.debug({ code: "THEME_CONFIG_REGISTERED", name }, "Theme config registered: %s", name);
    }

    /**
     * Check if a theme is registered.
     *
     * @param {string} name - Theme name to check
     * @returns {boolean} True if the theme is registered
     */
    static hasTheme(name) {
        return this._themes.has(name);
    }

    // ---- Theme switching engine ----

    /**
     * Set the active theme (THEME-07, THEME-08).
     *
     * Removes the current theme's sheets and structural overrides,
     * then applies the new theme globally via document.adoptedStyleSheets
     * and structural overrides to all live component shadow roots.
     *
     * Passing 'base' reverts to the default theme (removes all theme sheets).
     *
     * Uses atomic staging pattern: builds complete theme configuration
     * before mutating any state, preventing inconsistent state on failure.
     *
     * @param {string} name - Theme name to activate ('base' to revert)
     * @throws {Error} If the theme is not registered
     */
    static async setTheme(name) {
        // No-op if already active
        if (name === this._activeTheme) return;

        // Stage: Build new theme configuration before mutating state
        const stagedConfig = {
            name,
            themeSheets: [],
            overrides: new Map()
        };

        // Validate theme exists (before any state changes)
        if (name !== 'base' && !this._themes.has(name)) {
            throw new Error(`Theme "${name}" is not registered`);
        }

        // Build extends chain and collect theme sheets (staging only)
        if (name !== 'base') {
            const chain = this._resolveExtendsChain(name);

            // Collect theme sheets from all themes in chain (ancestor first)
            for (const themeName of chain) {
                const def = this._themes.get(themeName);
                if (!def) continue;

                if (def.themeSheet) {
                    stagedConfig.themeSheets.push(def.themeSheet);
                } else if (def.themeCSS) {
                    // Phase 22 format: create CSSStyleSheet from CSS text and cache it
                    const sheet = new CSSStyleSheet();
                    sheet.replaceSync(def.themeCSS);
                    def.themeSheet = sheet;
                    stagedConfig.themeSheets.push(sheet);
                }
            }

            // Collect overrides from all themes in chain (child overrides win for same target)
            for (const themeName of chain) {
                const def = this._themes.get(themeName);
                if (def && def.overrides) {
                    for (const [tagName, sheet] of def.overrides) {
                        stagedConfig.overrides.set(tagName, sheet);
                    }
                }
            }
        }

        // Commit: Only after successful staging, swap active theme
        // Remove current theme sheets and overrides
        this._removeActiveThemeSheets();
        this._removeAllOverrides();

        // Update active theme state
        this._activeTheme = stagedConfig.name;
        this._activeThemeSheets = stagedConfig.themeSheets;
        this._activeOverrides = stagedConfig.overrides;

        // Apply to document using compatibility helper
        if (this._activeThemeSheets.length > 0) {
            this._applyStylesheet(document, this._activeThemeSheets);
        }

        // Apply overrides to all live instances
        if (this._activeOverrides.size > 0) {
            const liveInstances = this.getLiveInstances();
            for (const instance of liveInstances) {
                const tagName = instance.tagName.toLowerCase();
                const overrideSheet = this._activeOverrides.get(tagName);
                if (overrideSheet && instance.shadowRoot) {
                    this._applyStylesheet(instance.shadowRoot, overrideSheet);
                }
            }
        }

        Logger.info({ code: "THEME_CHANGED", theme: name }, "Theme changed to: %s", name);
    }

    /**
     * Apply the active theme's structural override to a single component instance.
     *
     * Called from UIComponent constructor for late-constructed components
     * (THEME-10). If the active theme is 'base', this is a no-op.
     *
     * If the component's override isn't in _activeOverrides (e.g., component
     * loaded after theme activation), checks ComponentRegistry to see if it
     * supports the active theme and loads CSS on-demand.
     *
     * @param {HTMLElement} instance - UIComponent instance to apply theme to
     */
    static async applyThemeToInstance(instance) {
        if (this._activeTheme === 'base') return;

        const tagName = instance.tagName.toLowerCase();
        let overrideSheet = this._activeOverrides.get(tagName);

        // On-demand discovery for late-loading components
        if (!overrideSheet) {
            const meta = ComponentRegistry.getMeta(tagName);
            const componentPath = ComponentRegistry.getComponentPath(tagName);

            if (meta && componentPath) {
                const availableThemes = meta.themes?.available || [];
                if (availableThemes.includes(this._activeTheme)) {
                    try {
                        const cssResult = await MetaLoader.loadThemeCSS(componentPath, this._activeTheme);
                        if (cssResult && cssResult.sheet) {
                            overrideSheet = cssResult.sheet;
                            this._activeOverrides.set(tagName, overrideSheet);
                        }
                    } catch (error) {
                        Logger.warn(
                            error,
                            { code: "THEME_LATE_OVERRIDE_FAILED", tagName, theme: this._activeTheme },
                            "Failed to load theme override for late-loading '%s': %s",
                            tagName, error.message
                        );
                    }
                }
            }
        }

        if (overrideSheet && instance.shadowRoot) {
            this._applyStylesheet(instance.shadowRoot, overrideSheet);
        }
    }

    // ---- Private: sheet management ----

    /**
     * Apply stylesheet to shadow root or document with browser compatibility fallback.
     *
     * Modern browsers: Use adoptedStyleSheets (constructable stylesheets)
     * Older browsers: Fall back to <style> element injection
     *
     * @param {ShadowRoot|Document} root - Target shadow root or document
     * @param {CSSStyleSheet|CSSStyleSheet[]} sheets - Stylesheet(s) to apply
     * @private
     */
    static _applyStylesheet(root, sheets) {
        const sheetArray = Array.isArray(sheets) ? sheets : [sheets];

        // Try constructable stylesheets first (modern browsers)
        if ('adoptedStyleSheets' in root) {
            try {
                root.adoptedStyleSheets = [...root.adoptedStyleSheets, ...sheetArray];
                return;
            } catch (e) {
                Logger.warn({ code: "ADOPTED_STYLESHEETS_FAILED" }, "adoptedStyleSheets failed, falling back to <style>");
            }
        }

        // Fallback: Inject <style> elements
        for (const sheet of sheetArray) {
            const style = document.createElement('style');
            // Extract CSS text from CSSStyleSheet
            const cssText = Array.from(sheet.cssRules).map(rule => rule.cssText).join('\n');
            style.textContent = cssText;
            root.appendChild(style);
        }
    }

    /**
     * Remove the active theme's sheets from document.adoptedStyleSheets.
     *
     * Filters out only the sheets tracked in _activeThemeSheets (by reference),
     * preserving any non-theme sheets that other code may have added.
     *
     * @private
     */
    static _removeActiveThemeSheets() {
        if (this._activeThemeSheets.length === 0) return;

        const sheetsToRemove = new Set(this._activeThemeSheets);
        document.adoptedStyleSheets = document.adoptedStyleSheets.filter(
            s => !sheetsToRemove.has(s)
        );
        this._activeThemeSheets = [];
    }

    /**
     * Remove the active theme's structural overrides from all live shadow roots.
     *
     * Iterates all live UIComponent instances and filters their shadow root
     * adoptedStyleSheets to remove any sheets that belong to the active theme's
     * override map.
     *
     * @private
     */
    static _removeAllOverrides() {
        if (this._activeOverrides.size === 0) return;

        const overrideSheets = new Set(this._activeOverrides.values());
        const liveInstances = this.getLiveInstances();

        for (const instance of liveInstances) {
            if (instance.shadowRoot) {
                instance.shadowRoot.adoptedStyleSheets =
                    instance.shadowRoot.adoptedStyleSheets.filter(
                        sheet => !overrideSheets.has(sheet)
                    );
            }
        }

        this._activeOverrides = new Map();
    }

    /**
     * Resolve the extends chain for a theme (THEME-09).
     *
     * Walks the extends references from the target theme up to the root
     * ancestor, building an array ordered ancestor-first. Uses a visited
     * Set to detect and break circular extends chains.
     *
     * @param {string} name - Theme name to resolve
     * @returns {string[]} Ordered chain from root ancestor to target theme
     * @private
     */
    static _resolveExtendsChain(name) {
        const chain = [];
        const visited = new Set();
        let current = name;

        while (current && !visited.has(current)) {
            visited.add(current);
            chain.unshift(current); // prepend: ancestor first
            const def = this._themes.get(current);
            current = def?.extends || null;
        }

        // Detect circular extends
        if (current && visited.has(current)) {
            Logger.warn(
                { code: "THEME_CIRCULAR_EXTENDS", theme: name, cycle: current },
                "Circular extends detected for theme '%s' at '%s' -- chain broken",
                name, current
            );
        }

        return chain;
    }

    // ---- Auto-discovery ----

    /**
     * Auto-discover theme overrides from ComponentRegistry metadata.
     *
     * Iterates all registered components, checks if they declare the given
     * theme in their META.goo themes.available array, and loads the CSS
     * for matching components via MetaLoader (with caching).
     *
     * @param {string} themeName - Theme name to discover overrides for (e.g., 'classic')
     * @returns {Promise<Map<string, CSSStyleSheet>>} tagName -> CSSStyleSheet
     */
    static async discoverOverrides(themeName) {
        const overrides = new Map();
        const tagNames = ComponentRegistry.getRegisteredTagNames();

        const loadPromises = tagNames.map(async (tagName) => {
            const meta = ComponentRegistry.getMeta(tagName);
            const componentPath = ComponentRegistry.getComponentPath(tagName);
            if (!meta || !componentPath) return null;

            const availableThemes = meta.themes?.available || [];
            if (!availableThemes.includes(themeName)) return null;

            try {
                const cssResult = await MetaLoader.loadThemeCSS(componentPath, themeName);
                if (cssResult && cssResult.sheet) {
                    return { tagName, sheet: cssResult.sheet };
                }
            } catch (error) {
                Logger.warn(
                    error,
                    { code: "THEME_AUTO_DISCOVER_FAILED", tagName, theme: themeName },
                    "Failed to auto-discover theme '%s' for '%s': %s",
                    themeName, tagName, error.message
                );
            }
            return null;
        });

        const results = await Promise.all(loadPromises);
        for (const result of results) {
            if (result) {
                overrides.set(result.tagName, result.sheet);
            }
        }

        Logger.debug(
            { code: "THEME_OVERRIDES_DISCOVERED", theme: themeName, count: overrides.size },
            "Auto-discovered %d theme overrides for '%s'",
            overrides.size, themeName
        );

        return overrides;
    }

    // ---- Theme CSSStyleSheet ----

    /**
     * Get the theme CSSStyleSheet, creating it lazily on first access.
     *
     * This sheet is intended for runtime theme overrides via
     * document.adoptedStyleSheets. It is created empty and populated
     * when a theme is applied.
     *
     * @returns {CSSStyleSheet} Shared constructable stylesheet for theme overrides
     */
    static getThemeSheet() {
        if (!this._themeSheet) {
            this._themeSheet = new CSSStyleSheet();
        }
        return this._themeSheet;
    }

    // ---- Instance tracking ----

    /**
     * Register a live UIComponent instance via WeakRef.
     *
     * Instances are tracked so that theme switches can broadcast to all
     * live components. WeakRef ensures that tracking does not prevent
     * garbage collection of disconnected components.
     *
     * Periodic cleanup of dead refs is amortized: only runs when the set
     * exceeds 50 entries and the count is a multiple of 10.
     *
     * @param {HTMLElement} instance - UIComponent instance to track
     */
    static registerInstance(instance) {
        if (this._instances.size > 50 && this._instances.size % 10 === 0) {
            this._cleanDeadRefs();
        }
        this._instances.add(new WeakRef(instance));
    }

    /**
     * Get all live (non-garbage-collected) UIComponent instances.
     *
     * Iterates the WeakRef set, dereferences each entry, and returns
     * only those that are still alive.
     *
     * @returns {HTMLElement[]} Array of live UIComponent instances
     */
    static getLiveInstances() {
        const live = [];
        for (const ref of this._instances) {
            const instance = ref.deref();
            if (instance) {
                live.push(instance);
            }
        }
        return live;
    }

    /**
     * Remove dead WeakRefs from the instance tracking set.
     *
     * Iterates the set and deletes any entry whose WeakRef target
     * has been garbage collected (deref() returns undefined).
     *
     * @private
     */
    static _cleanDeadRefs() {
        for (const ref of this._instances) {
            if (!ref.deref()) {
                this._instances.delete(ref);
            }
        }
    }
}
