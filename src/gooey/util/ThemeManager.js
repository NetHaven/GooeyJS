import Logger from '../logging/Logger.js';
import ThemeEvent from '../events/ThemeEvent.js';

/**
 * Singleton theme manager for GooeyJS design token architecture.
 *
 * Manages active theme state, registered theme definitions, a lazily-created
 * token CSSStyleSheet for runtime overrides, and WeakRef-based tracking of
 * live UIComponent instances for theme broadcast.
 *
 * This is a static-only class following the ComponentRegistry pattern --
 * no instantiation needed.
 *
 * Phase 22: Foundation (registerTheme, registerInstance, getTokenSheet, getLiveInstances)
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
     * - Phase 22 format: { tokensCSS: string }
     * - Phase 23 format: { tokenSheet: CSSStyleSheet|null, overrides: Map, extends: string|null }
     * - Both fields may coexist (backward compat).
     *
     * @type {Map<string, object>}
     */
    static _themes = new Map();

    /** @type {CSSStyleSheet|null} Lazily created stylesheet for runtime token overrides */
    static _tokenSheet = null;

    /** @type {Set<WeakRef>} WeakRef set tracking live UIComponent instances */
    static _instances = new Set();

    /** @type {CSSStyleSheet[]} Token sheets currently on document.adoptedStyleSheets (for removal) */
    static _activeTokenSheets = [];

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
     * Register a theme with its token CSS content (Phase 22 API).
     *
     * Kept for backward compatibility. Stores the CSS text in the theme
     * definition. The CSSStyleSheet is created lazily during setTheme()
     * if needed.
     *
     * @param {string} name - Theme name (e.g., 'base', 'dark', 'classic')
     * @param {string} tokensCSSText - CSS text containing :root token overrides
     */
    static registerTheme(name, tokensCSSText) {
        const existing = this._themes.get(name);
        if (existing) {
            existing.tokensCSS = tokensCSSText;
            this._themes.set(name, existing);
        } else {
            this._themes.set(name, { tokensCSS: tokensCSSText });
        }
        Logger.debug({ code: "THEME_REGISTERED", name }, "Theme registered: %s", name);
    }

    /**
     * Register a theme with a full config object (Phase 23 API).
     *
     * Config properties:
     * - tokenSheet {CSSStyleSheet|null} - Pre-created token stylesheet
     * - overrides {Map<string, CSSStyleSheet>} - Per-component structural overrides
     * - extends {string|null} - Name of parent theme to extend
     *
     * @param {string} name - Theme name
     * @param {object} config - Theme configuration
     */
    static registerThemeConfig(name, config) {
        const existing = this._themes.get(name) || {};
        existing.tokenSheet = config.tokenSheet || null;
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
     * Removes the current theme's token sheets and structural overrides,
     * then applies the new theme's tokens globally via document.adoptedStyleSheets
     * and structural overrides to all live component shadow roots.
     *
     * Passing 'base' reverts to the default theme (removes all theme sheets).
     *
     * @param {string} name - Theme name to activate ('base' to revert)
     * @throws {Error} If the theme is not registered
     */
    static async setTheme(name) {
        // No-op if already active
        if (name === this._activeTheme) return;

        // 1. Remove current theme sheets from document.adoptedStyleSheets
        this._removeActiveThemeSheets();

        // 2. Remove current theme's structural overrides from all live shadow roots
        this._removeAllOverrides();

        // 3. Revert to base: just clean up and return
        if (name === 'base') {
            this._activeTheme = 'base';
            return;
        }

        // 4. Validate theme exists
        const themeDef = this._themes.get(name);
        if (!themeDef) {
            throw new Error(`Theme "${name}" is not registered`);
        }

        // 5. Resolve extends chain (ancestor-first order)
        const chain = this._resolveExtendsChain(name);

        // 6. Collect token sheets from all themes in chain (ancestor first)
        const tokenSheets = [];
        for (const themeName of chain) {
            const def = this._themes.get(themeName);
            if (!def) continue;

            if (def.tokenSheet) {
                tokenSheets.push(def.tokenSheet);
            } else if (def.tokensCSS) {
                // Phase 22 format: create CSSStyleSheet from CSS text and cache it
                const sheet = new CSSStyleSheet();
                sheet.replaceSync(def.tokensCSS);
                def.tokenSheet = sheet;
                tokenSheets.push(sheet);
            }
        }

        // 7. Append token sheets to document.adoptedStyleSheets (preserve existing non-theme sheets)
        if (tokenSheets.length > 0) {
            document.adoptedStyleSheets = [
                ...document.adoptedStyleSheets,
                ...tokenSheets
            ];
        }
        this._activeTokenSheets = tokenSheets;

        // 8. Collect overrides from all themes in chain (child overrides win for same target)
        const overrideMap = new Map();
        for (const themeName of chain) {
            const def = this._themes.get(themeName);
            if (def && def.overrides) {
                for (const [tagName, sheet] of def.overrides) {
                    overrideMap.set(tagName, sheet);
                }
            }
        }

        // 9. Apply overrides to all live instances
        if (overrideMap.size > 0) {
            const liveInstances = this.getLiveInstances();
            for (const instance of liveInstances) {
                const tagName = instance.tagName.toLowerCase();
                const overrideSheet = overrideMap.get(tagName);
                if (overrideSheet && instance.shadowRoot) {
                    instance.shadowRoot.adoptedStyleSheets = [
                        ...instance.shadowRoot.adoptedStyleSheets,
                        overrideSheet
                    ];
                }
            }
        }

        // 10. Store active overrides and update active theme
        this._activeOverrides = overrideMap;
        this._activeTheme = name;
    }

    /**
     * Apply the active theme's structural override to a single component instance.
     *
     * Called from UIComponent constructor for late-constructed components
     * (THEME-10). If the active theme is 'base', this is a no-op.
     *
     * @param {HTMLElement} instance - UIComponent instance to apply theme to
     */
    static applyThemeToInstance(instance) {
        if (this._activeTheme === 'base') return;

        const tagName = instance.tagName.toLowerCase();
        const overrideSheet = this._activeOverrides.get(tagName);
        if (overrideSheet && instance.shadowRoot) {
            instance.shadowRoot.adoptedStyleSheets = [
                ...instance.shadowRoot.adoptedStyleSheets,
                overrideSheet
            ];
        }
    }

    // ---- Private: sheet management ----

    /**
     * Remove the active theme's token sheets from document.adoptedStyleSheets.
     *
     * Filters out only the sheets tracked in _activeTokenSheets (by reference),
     * preserving any non-theme sheets that other code may have added.
     *
     * @private
     */
    static _removeActiveThemeSheets() {
        if (this._activeTokenSheets.length === 0) return;

        const sheetsToRemove = new Set(this._activeTokenSheets);
        document.adoptedStyleSheets = document.adoptedStyleSheets.filter(
            s => !sheetsToRemove.has(s)
        );
        this._activeTokenSheets = [];
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

    // ---- Token CSSStyleSheet ----

    /**
     * Get the token CSSStyleSheet, creating it lazily on first access.
     *
     * This sheet is intended for runtime token overrides via
     * document.adoptedStyleSheets. It is created empty and populated
     * when a theme is applied.
     *
     * @returns {CSSStyleSheet} Shared constructable stylesheet for token overrides
     */
    static getTokenSheet() {
        if (!this._tokenSheet) {
            this._tokenSheet = new CSSStyleSheet();
        }
        return this._tokenSheet;
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
