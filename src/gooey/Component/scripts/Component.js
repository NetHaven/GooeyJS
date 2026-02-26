import Observable from '../../events/Observable.js';
import ComponentEvent from '../../events/ComponentEvent.js';
import Template from '../../util/Template.js';
import MetaLoader from '../../util/MetaLoader.js';
import ComponentRegistry from '../../util/ComponentRegistry.js';
import Logger from '../../logging/Logger.js';

// Store ComponentEvent reference for use in wrapped callbacks
const _ComponentEvent = ComponentEvent;

export default class Component extends Observable {
    constructor() {
        super();

        // Add valid events
        this.addValidEvent(ComponentEvent.LOADING);
        this.addValidEvent(ComponentEvent.LOADED);
        this.addValidEvent(ComponentEvent.ERROR);

        // Hide this element - it's just a loader
        this.style.display = 'none';

        this._href = null;
        this._meta = null;
        this._loaded = false;
    }

    connectedCallback() {
        if (super.connectedCallback) {
            super.connectedCallback();
        }

        // Guard: Don't reload if already loaded (prevents repeated fetch/import on re-attach)
        if (this._loaded) {
            return;
        }

        // Load component when added to DOM
        this.loadComponent();
    }

    async loadComponent() {
        // Validate required attributes
        if (!this.hasAttribute('href')) {
            Logger.error({ code: "COMPONENT_HREF_MISSING" }, 'Component loading error: "href" attribute is required');
            this.fireEvent(ComponentEvent.ERROR, {
                error: 'Missing required attribute: href',
                component: this
            });
            return;
        }

        // Normalize href by removing trailing slash to avoid double slashes in paths
        this._href = this.getAttribute('href').replace(/\/+$/, '');

        // Load and validate META.goo to get component configuration
        let meta;
        try {
            meta = await MetaLoader.loadAndValidate(this._href);
            this._meta = meta;
        } catch (metaError) {
            Logger.error(metaError, { code: "META_LOAD_FAILED", href: this._href }, "Failed to load META.goo from %s", this._href);
            this.fireEvent(ComponentEvent.ERROR, {
                error: metaError.message,
                href: this._href,
                component: this
            });
            return;
        }

        const fullTagName = meta.fullTagName;

        // Check if component is already registered
        if (customElements.get(fullTagName)) {
            Logger.debug({ code: "COMPONENT_ALREADY_REGISTERED", tagName: fullTagName }, "Component %s is already registered", fullTagName);
            this._loaded = true;
            this.fireEvent(ComponentEvent.LOADED, {
                tagName: fullTagName,
                componentClass: customElements.get(fullTagName),
                href: this._href,
                meta: meta,
                component: this
            });
            return;
        }

        // Fire LOADING event
        this.fireEvent(ComponentEvent.LOADING, {
            tagName: fullTagName,
            href: this._href,
            meta: meta,
            component: this
        });

        try {
            // Register in ComponentRegistry
            ComponentRegistry.register(fullTagName, meta);

            // Store component path early (needed for theme loading)
            ComponentRegistry.setComponentPath(fullTagName, this._href);

            // Load and cache default theme CSS BEFORE defining custom element
            // (constructors need theme CSS available when triggered by define())
            if (meta.themes && meta.themes.default) {
                try {
                    const cssResult = await MetaLoader.loadThemeCSS(this._href, meta.themes.default);
                    ComponentRegistry.setThemeCSS(fullTagName, cssResult);
                    Logger.debug({ code: "THEME_LOADED", tagName: fullTagName, theme: meta.themes.default }, "Loaded theme CSS for %s: %s", fullTagName, meta.themes.default);
                } catch (themeError) {
                    Logger.warn(themeError, { code: "THEME_LOAD_FAILED", tagName: fullTagName }, "Failed to load theme CSS for %s", fullTagName);
                }
            }

            // Build paths for module and template using META.goo configuration
            // Resolve against document base URL to get absolute URL for dynamic import
            const basePath = `${this._href}/scripts/${meta.script}`;
            const modulePath = new URL(basePath, document.baseURI).href;

            // Load templates BEFORE defining custom element
            // (constructors need templates available when triggered by define())
            // Templates are required by default - component registration fails if template load fails
            // Future enhancement: support "optional": true flag in META.goo template definitions for non-critical templates
            if (meta.templates && meta.templates.length > 0) {
                for (const template of meta.templates) {
                    const templatePath = `${this._href}/templates/${template.file}`;
                    try {
                        await Template.load(templatePath, template.id);
                        Logger.debug({ code: "TEMPLATE_LOADED", templateId: template.id, file: templatePath }, "Loaded template %s from %s", template.id, templatePath);
                    } catch (templateError) {
                        // Templates are required - fail component registration
                        Logger.error(
                            templateError,
                            { code: "TEMPLATE_LOAD_FAILED", href: this._href, templateId: template.id },
                            "Failed to load required template: %s",
                            templatePath
                        );
                        this.fireEvent(ComponentEvent.ERROR, {
                            error: `Template load failed: ${templateError.message}`,
                            templateId: template.id,
                            href: this._href,
                            component: this
                        });
                        throw templateError; // Propagate to prevent partial registration
                    }
                }
            }

            // Dynamically import the component class
            const module = await import(modulePath);
            const ComponentClass = module.default;

            // Inject observedAttributes from registry
            Object.defineProperty(ComponentClass, 'observedAttributes', {
                configurable: true,
                get: () => ComponentRegistry.getObservedAttributes(fullTagName)
            });

            // Wrap attributeChangedCallback to ensure META.goo validation always runs
            // This makes validation independent of whether components call super.attributeChangedCallback()
            this._wrapAttributeChangedCallback(ComponentClass, fullTagName);

            // Register the custom element (triggers constructor for existing DOM elements)
            customElements.define(fullTagName, ComponentClass);

            Logger.debug({ code: "COMPONENT_REGISTERED", tagName: fullTagName, module: modulePath }, "Successfully registered %s from %s", fullTagName, modulePath);

            this._loaded = true;

            // Fire LOADED event
            this.fireEvent(ComponentEvent.LOADED, {
                tagName: fullTagName,
                componentClass: ComponentClass,
                href: this._href,
                meta: meta,
                component: this
            });

        } catch (error) {
            Logger.error(error, { code: "COMPONENT_LOAD_FAILED", name: meta.name }, "Failed to load component %s", meta.name);

            // Fire ERROR event
            this.fireEvent(ComponentEvent.ERROR, {
                error: error.message,
                tagName: fullTagName,
                href: this._href,
                meta: meta,
                component: this
            });
        }
    }

    get href() {
        return this._href;
    }

    get meta() {
        return this._meta;
    }

    get name() {
        return this._meta?.name;
    }

    /**
     * Get the component's registered tag name from its META.goo
     * (Native tagName returns uppercase element name for DOM compatibility)
     * @returns {string|null} The component tag name or null if not loaded
     */
    get componentTagName() {
        if (!this._meta) return null;
        return this._meta.fullTagName || this._meta.tagName;
    }

    get loaded() {
        return this._loaded;
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
                        this.fireEvent(_ComponentEvent.ATTRIBUTE_ERROR, {
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
