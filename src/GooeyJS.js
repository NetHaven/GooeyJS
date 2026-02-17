import Template from './gooey/util/Template.js';
import MetaLoader from './gooey/util/MetaLoader.js';
import ComponentRegistry from './gooey/util/ComponentRegistry.js';
import ComponentEvent from './gooey/events/ComponentEvent.js';
import Logger from './gooey/logging/Logger.js';

const SCRIPT_PATH = new URL(import.meta.url, document.baseURI);
const PATH = SCRIPT_PATH.href.substring(0, SCRIPT_PATH.href.lastIndexOf('/'));

export default class GooeyJS {
    static VERSION = "2.1";
    static Logger = Logger;
    static _initialized = false;
    static _instance = null;
    static _readyPromise = null;
    static _readyResolve = null;

    /**
     * Promise that resolves when all components are registered and ready.
     * @type {Promise<GooeyJS>}
     * @example
     * await GooeyJS.ready;
     * // or
     * GooeyJS.ready.then(() => { ... });
     */
    static get ready() {
        if (!GooeyJS._readyPromise) {
            GooeyJS._readyPromise = new Promise(resolve => {
                GooeyJS._readyResolve = resolve;
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
                { name: "Application" },
                { name: "Component" }
            ]
        }]

        // Initialize logging system before component loading
        Logger.configure({
            level: "info",
            handlers: [new Logger.ConsoleHandler({ colors: true })]
        });

        // Ensure the ready promise exists before starting async initialization
        GooeyJS.ready;

        // Start async component registration and track completion
        this.createElements().then(() => {
            // Resolve the ready promise
            if (GooeyJS._readyResolve) {
                GooeyJS._readyResolve(this);
                GooeyJS._readyResolve = null;
            }
            // Dispatch ready event for event-based consumers
            document.dispatchEvent(new CustomEvent('gooeyjs-ready', {
                detail: { instance: this }
            }));
        }).catch(error => {
            console.error('GooeyJS initialization failed:', error);
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

    async createElements() {
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

                    // Store component path early (needed for theme loading)
                    ComponentRegistry.setComponentPath(meta.fullTagName, fullComponentPath);

                    // Load and cache default theme CSS BEFORE defining custom element
                    // (constructors need theme CSS available when triggered by define())
                    if (meta.themes && meta.themes.default) {
                        try {
                            const cssResult = await MetaLoader.loadThemeCSS(fullComponentPath, meta.themes.default);
                            ComponentRegistry.setThemeCSS(meta.fullTagName, cssResult);
                            console.log(`Loaded theme CSS for ${meta.fullTagName}: ${meta.themes.default}`);
                        } catch (themeError) {
                            console.warn(`Failed to load theme CSS for ${meta.fullTagName}:`, themeError);
                        }
                    }

                    // Build script path from META.goo
                    const modulePath = `./${componentPath}/scripts/${meta.script}`;

                    // Load templates BEFORE defining custom element
                    // (constructors need templates available when triggered by define())
                    if (meta.templates && meta.templates.length > 0) {
                        for (const template of meta.templates) {
                            try {
                                await Template.load(
                                    `${fullComponentPath}/templates/${template.file}`,
                                    template.id
                                );
                                console.log(`Loaded template ${template.id} from ${template.file}`);
                            } catch (templateError) {
                                console.warn(`Failed to load template ${template.id}:`, templateError);
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

                    console.log(`Registered ${meta.fullTagName} from ${modulePath}`);
                } catch (error) {
                    console.error(`Failed to load component ${component.pkg}.${element.name}:`, error);
                }
            }
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
                    console.warn(`[${tagName}] Invalid attribute value: ${validation.error}`);
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

window.addEventListener('load', () => GooeyJS.init());
