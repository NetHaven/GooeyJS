import Template from './gooey/util/Template.js';
import MetaLoader from './gooey/util/MetaLoader.js';
import ComponentRegistry from './gooey/util/ComponentRegistry.js';

const SCRIPT_PATH = new URL(import.meta.url, document.baseURI);
const PATH = SCRIPT_PATH.href.substring(0, SCRIPT_PATH.href.lastIndexOf('/'));

export default class GooeyJS {
    static VERSION = "1.9";
    static _initialized = false;
    static _instance = null;

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

        // Component packages to load - META.goo in each component provides the details
        this.components = [{
            pkg: "gooey",
            elements: [
                { name: "Application" },
                { name: "Component" }
            ]
        },
        {
            pkg: "gooey.ui.data",
            elements: [
                { name: "DataGridColumn" },
                { name: "DataGrid" }
            ]
        },
        {
            pkg: "gooey.ui.menu",
            elements: [
                { name: "HamburgerMenu" }
            ]
        },
        {
            pkg: "gooey.graphics.gradient",
            elements: [
                { name: "Gradient" },
                { name: "GradientStop" }
            ]
        }]

        this.createElements();

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

}

window.addEventListener('load', () => GooeyJS.init());
