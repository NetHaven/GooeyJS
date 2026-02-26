import Template from './gooey/util/Template.js';
import MetaLoader from './gooey/util/MetaLoader.js';
import ComponentRegistry from './gooey/util/ComponentRegistry.js';
import ComponentEvent from './gooey/events/ComponentEvent.js';
import Logger from './gooey/logging/Logger.js';
import ThemeManager from './gooey/util/ThemeManager.js';

const SCRIPT_PATH = new URL(import.meta.url, document.baseURI);
const PATH = SCRIPT_PATH.href.substring(0, SCRIPT_PATH.href.lastIndexOf('/'));

export default class GooeyJS {
    static VERSION = "2.3";
    static Logger = Logger;
    static _initialized = false;
    static _instance = null;
    static _readyPromise = null;
    static _readyResolve = null;
    static _readyReject = null;

    /**
     * Promise that resolves when all components are registered and ready.
     * Rejects if any component fails to load, with error.failures containing details.
     * @type {Promise<GooeyJS>}
     * @example
     * try {
     *     const instance = await GooeyJS.ready;
     *     // All components loaded successfully
     *     console.log('Failures:', instance.loadFailures); // []
     * } catch (error) {
     *     // One or more components failed to load
     *     console.error('Failed components:', error.failures);
     * }
     */
    static get ready() {
        if (!GooeyJS._readyPromise) {
            GooeyJS._readyPromise = new Promise((resolve, reject) => {
                GooeyJS._readyResolve = resolve;
                GooeyJS._readyReject = reject;
            });
        }
        return GooeyJS._readyPromise;
    }

    /**
     * Initialize GooeyJS. Safe to call multiple times; only the first call takes effect.
     * @returns {GooeyJS} The singleton instance
     */
    static init() {
        if (GooeyJS._initialized) {
            return GooeyJS._instance;
        }
        GooeyJS._initialized = true;
        GooeyJS._instance = new GooeyJS();
        return GooeyJS._instance;
    }

    constructor() {
        let headEl, htmlEl, linkEl;

        // Core components loaded by default - only the minimum required for GooeyJS to function
        // All other components should be loaded dynamically using <gooey-component href="...">
        this.components = [{
            pkg: "gooey",
            elements: [
                { name: "Theme" },
                { name: "ThemeOverride" },
                { name: "Application" },
                { name: "Component" }
            ]
        }]

        // Track component load failures
        this.loadFailures = [];

        // Initialize logging system before component loading
        Logger.configure({
            level: "info",
            handlers: [new Logger.ConsoleHandler({ colors: true })]
        });

        // Ensure the ready promise exists before starting async initialization
        GooeyJS.ready;

        // Start async component registration and track completion
        this.createElements().then(() => {
            // Resolve the ready promise with instance (all components loaded successfully)
            if (GooeyJS._readyResolve) {
                GooeyJS._readyResolve(this);
                GooeyJS._readyResolve = null;
                GooeyJS._readyReject = null;
            }
            // Dispatch ready event for event-based consumers
            document.dispatchEvent(new CustomEvent('gooeyjs-ready', {
                detail: {
                    instance: this,
                    loadFailures: []
                }
            }));
        }).catch(error => {
            Logger.fatal(error, { code: "GOOEY_INIT_FAILED" }, "GooeyJS initialization failed: %s", error.message);
            // Reject the ready promise with detailed failure information
            if (GooeyJS._readyReject) {
                GooeyJS._readyReject(error);
                GooeyJS._readyResolve = null;
                GooeyJS._readyReject = null;
            }
            // Also dispatch error event for event-based error handling
            document.dispatchEvent(new CustomEvent('gooeyjs-error', {
                detail: {
                    error: error,
                    failures: error.failures || []
                }
            }));
        });

        linkEl = document.createElement('link');
        linkEl.setAttribute("rel", "stylesheet");
        linkEl.setAttribute("href", `${PATH}/styles.css`);

        headEl = document.head;
        if (!headEl) {
            htmlEl = document.documentElement;
            headEl = document.createElement('head');
            htmlEl.appendChild(headEl);
        }

        headEl.appendChild(linkEl);
    }

    static get basePath() {
        return PATH;
    }

    /**
     * Get token metadata for a registered component
     * @param {string} tagName - Custom element tag name (e.g., "gooeyui-button")
     * @returns {Object|null} Token metadata or null if not registered/no tokens
     */
    static getComponentTokens(tagName) {
        return ComponentRegistry.getTokenMeta(tagName);
    }

    /**
     * Register a theme programmatically (THEME-06)
     * @param {string} name - Theme name
     * @param {Object} config - { href: string (CSS path), extends?: string, overrides?: Object (tagName -> CSS path) }
     * @returns {Promise<void>}
     */
    static async registerTheme(name, config) {
        let themeSheet = null;

        // Load theme CSS if provided
        if (config.href) {
            const response = await fetch(config.href);
            if (!response.ok) {
                throw new Error(`Theme CSS not found: ${config.href} (HTTP ${response.status})`);
            }
            const cssText = await response.text();
            themeSheet = new CSSStyleSheet();
            themeSheet.replaceSync(cssText);
        }

        // Load override CSS files if provided
        const overrides = new Map();
        if (config.overrides && typeof config.overrides === 'object') {
            for (const [tagName, cssPath] of Object.entries(config.overrides)) {
                const response = await fetch(cssPath);
                if (!response.ok) {
                    Logger.warn({ code: "THEME_OVERRIDE_LOAD_FAILED", tagName, path: cssPath }, "Failed to load override CSS: %s", cssPath);
                    continue;
                }
                const cssText = await response.text();
                const sheet = new CSSStyleSheet();
                sheet.replaceSync(cssText);
                overrides.set(tagName.toLowerCase(), sheet);
            }
        }

        ThemeManager.registerThemeConfig(name, {
            themeSheet,
            overrides,
            extends: config.extends || null
        });
    }

    /**
     * Set the active theme (THEME-07, THEME-08)
     * @param {string} name - Theme name to activate ('base' to revert)
     * @returns {Promise<void>}
     */
    static async setTheme(name) {
        await ThemeManager.setTheme(name);
    }

    async createElements() {
        const failures = [];

        for (const component of this.components) {
            // Convert dot-separated package name to folder path (e.g., "gooey.ui.button" -> "gooey/ui/button")
            const pkgPath = component.pkg.replace(/\./g, '/');

            for (const element of component.elements) {
                try {
                    // Build component path
                    const componentPath = `${pkgPath}/${element.name}`;
                    const fullComponentPath = `${PATH}/${componentPath}`;

                    // Load and validate META.goo (required - strict mode)
                    const meta = await MetaLoader.loadAndValidate(fullComponentPath);

                    // Register in ComponentRegistry using fullTagName
                    ComponentRegistry.register(meta.fullTagName, meta);

                    // Store token metadata if META.goo has a tokens section
                    if (meta.tokens && typeof meta.tokens === 'object') {
                        ComponentRegistry.setTokenMeta(meta.fullTagName, meta.tokens);
                        Logger.debug({ code: "TOKENS_REGISTERED", tagName: meta.fullTagName }, "Registered token metadata for %s", meta.fullTagName);
                    }

                    // Store component path early (needed for theme loading)
                    ComponentRegistry.setComponentPath(meta.fullTagName, fullComponentPath);

                    // Load and cache default theme CSS BEFORE defining custom element
                    // (constructors need theme CSS available when triggered by define())
                    if (meta.themes && meta.themes.default) {
                        try {
                            const cssResult = await MetaLoader.loadThemeCSS(fullComponentPath, meta.themes.default);
                            ComponentRegistry.setThemeCSS(meta.fullTagName, cssResult);
                            Logger.debug({ code: "THEME_LOADED", tagName: meta.fullTagName, theme: meta.themes.default }, "Loaded theme CSS for %s: %s", meta.fullTagName, meta.themes.default);
                        } catch (themeError) {
                            Logger.warn(themeError, { code: "THEME_LOAD_FAILED", tagName: meta.fullTagName }, "Failed to load theme CSS for %s", meta.fullTagName);
                        }
                    }

                    // Build script path from META.goo
                    const modulePath = `./${componentPath}/scripts/${meta.script}`;

                    // Load templates BEFORE defining custom element
                    // (constructors need templates available when triggered by define())
                    // Templates are required by default - component registration fails if template load fails
                    // Future enhancement: support "optional": true flag in META.goo template definitions for non-critical templates
                    if (meta.templates && meta.templates.length > 0) {
                        for (const template of meta.templates) {
                            const templatePath = `${fullComponentPath}/templates/${template.file}`;
                            try {
                                await Template.load(templatePath, template.id);
                                Logger.debug({ code: "TEMPLATE_LOADED", templateId: template.id, file: template.file }, "Loaded template %s from %s", template.id, template.file);
                            } catch (templateError) {
                                Logger.error(
                                    templateError,
                                    { code: "TEMPLATE_LOAD_FAILED", component: meta.fullTagName, templateId: template.id },
                                    "Template load failed for %s",
                                    meta.fullTagName
                                );
                                failures.push({
                                    component: meta.fullTagName,
                                    error: `Template load failed: ${templateError.message}`,
                                    phase: 'template'
                                });
                                // Skip component registration - continue to next component
                                throw templateError;
                            }
                        }
                    }

                    // Dynamically import the component class
                    const module = await import(modulePath);
                    const ComponentClass = module.default;

                    // Inject observedAttributes from registry
                    this._injectObservedAttributes(ComponentClass, meta.fullTagName);

                    // Wrap attributeChangedCallback to ensure META.goo validation always runs
                    // This prevents validation from breaking when components forget super calls
                    this._wrapAttributeChangedCallback(ComponentClass, meta.fullTagName);

                    // Register the custom element with full tag name from META.goo
                    // (triggers constructor for any existing DOM elements)
                    customElements.define(meta.fullTagName, ComponentClass);

                    Logger.debug({ code: "COMPONENT_REGISTERED", tagName: meta.fullTagName, module: modulePath }, "Registered %s from %s", meta.fullTagName, modulePath);
                } catch (error) {
                    const failureInfo = {
                        pkg: component.pkg,
                        name: element.name,
                        component: `${component.pkg}.${element.name}`,
                        error: error
                    };
                    failures.push(failureInfo);
                    Logger.error(error, { code: "COMPONENT_LOAD_FAILED", pkg: component.pkg, name: element.name }, "Failed to load component %s.%s", component.pkg, element.name);
                }
            }
        }

        // Store failures on instance for inspection
        this.loadFailures = failures;

        // If any components failed to load, reject with detailed error
        if (failures.length > 0) {
            const failedComponents = failures.map(f => f.component).join(', ');
            const error = new Error(`Failed to load ${failures.length} component(s): ${failedComponents}`);
            error.failures = failures;
            throw error;
        }
    }

    /**
     * Inject observedAttributes getter into component class from registry
     * @param {Function} ComponentClass - The component class
     * @param {string} tagName - The custom element tag name
     */
    _injectObservedAttributes(ComponentClass, tagName) {
        Object.defineProperty(ComponentClass, 'observedAttributes', {
            configurable: true,
            get: () => ComponentRegistry.getObservedAttributes(tagName)
        });
    }

    /**
     * Wrap attributeChangedCallback to ensure META.goo validation always runs.
     * This makes validation independent of whether components call super.attributeChangedCallback().
     * Handles validation, error events, type parsing, and value storage for ALL components.
     * @param {Function} ComponentClass - The component class
     * @param {string} tagName - The custom element tag name
     */
    _wrapAttributeChangedCallback(ComponentClass, tagName) {
        const originalCallback = ComponentClass.prototype.attributeChangedCallback;

        ComponentClass.prototype.attributeChangedCallback = function(name, oldValue, newValue) {
            // Skip if value hasn't actually changed
            if (oldValue === newValue) {
                if (originalCallback) {
                    originalCallback.call(this, name, oldValue, newValue);
                }
                return;
            }

            // Check if this attribute has a META.goo definition
            const attrDef = ComponentRegistry.getAttributeDefinition(tagName, name);
            if (attrDef) {
                // Validate the new value
                const validation = ComponentRegistry.validateAttribute(tagName, name, newValue);

                if (!validation.valid) {
                    // Fire error event for programmatic error handling
                    if (this.fireEvent) {
                        this.fireEvent(ComponentEvent.ATTRIBUTE_ERROR, {
                            attribute: name,
                            value: newValue,
                            error: validation.error,
                            component: this
                        });
                    }

                    // Log warning for developer visibility
                    Logger.warn({ code: "ATTRIBUTE_VALIDATION_FAILED", tagName, error: validation.error }, "[%s] Invalid attribute value: %s", tagName, validation.error);
                }

                // Parse and store the typed value (even if validation failed, use best effort)
                const parsedValue = ComponentRegistry.parseValue(tagName, name, newValue);
                if (this._parsedAttributes) {
                    this._parsedAttributes.set(name, parsedValue);
                }
            }

            // Then call the component's original implementation if it exists
            if (originalCallback) {
                originalCallback.call(this, name, oldValue, newValue);
            }
        };
    }

}

// Auto-initialize when DOM is ready
if (document.readyState === 'complete') {
    GooeyJS.init();
} else {
    document.addEventListener('DOMContentLoaded', () => GooeyJS.init());
}
