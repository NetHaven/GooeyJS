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
 * Phase 23: Theme switching (setTheme, applyTheme -- not yet implemented)
 */
export default class ThemeManager {

    // ---- Static fields ----

    /** @type {string} Currently active theme name */
    static _activeTheme = 'base';

    /** @type {Map<string, {tokensCSS: string}>} Registered themes: name -> definition */
    static _themes = new Map();

    /** @type {CSSStyleSheet|null} Lazily created stylesheet for runtime token overrides */
    static _tokenSheet = null;

    /** @type {Set<WeakRef>} WeakRef set tracking live UIComponent instances */
    static _instances = new Set();

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
     * Register a theme with its token CSS content.
     *
     * @param {string} name - Theme name (e.g., 'base', 'dark', 'classic')
     * @param {string} tokensCSSText - CSS text containing :root token overrides
     */
    static registerTheme(name, tokensCSSText) {
        this._themes.set(name, { tokensCSS: tokensCSSText });
        Logger.debug({ code: "THEME_REGISTERED", name }, "Theme registered: %s", name);
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

    // ---- Token CSSStyleSheet ----

    /**
     * Get the token CSSStyleSheet, creating it lazily on first access.
     *
     * This sheet is intended for runtime token overrides via
     * document.adoptedStyleSheets. It is created empty and populated
     * when a theme is applied (Phase 23).
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
