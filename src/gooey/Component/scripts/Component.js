import Observable from '../../events/Observable.js';
import ComponentEvent from '../../events/ComponentEvent.js';
import Template from '../../util/Template.js';
import MetaLoader from '../../util/MetaLoader.js';

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

        // Load component when added to DOM
        this.loadComponent();
    }

    async loadComponent() {
        // Validate required attributes
        if (!this.hasAttribute('href')) {
            console.error('Component loading error: "href" attribute is required');
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
            console.error(`Failed to load META.goo from ${this._href}:`, metaError);
            this.fireEvent(ComponentEvent.ERROR, {
                error: metaError.message,
                href: this._href,
                component: this
            });
            return;
        }

        const tagName = meta.tagName;

        // Check if component is already registered
        if (customElements.get(tagName)) {
            console.log(`Component ${tagName} is already registered, skipping load`);
            return;
        }

        // Fire LOADING event
        this.fireEvent(ComponentEvent.LOADING, {
            tagName: tagName,
            href: this._href,
            meta: meta,
            component: this
        });

        try {
            // Build paths for module and template using META.goo configuration
            const modulePath = `${this._href}/${meta.script}`;

            // Dynamically import the component class
            const module = await import(modulePath);
            const ComponentClass = module.default;

            // Register the custom element
            customElements.define(tagName, ComponentClass);

            // Load templates if defined in META.goo
            if (meta.templates && meta.templates.length > 0) {
                for (const template of meta.templates) {
                    const templatePath = `${this._href}/${template.file}`;
                    try {
                        await Template.load(templatePath, template.id);
                        console.log(`Loaded template ${template.id} from ${templatePath}`);
                    } catch (templateError) {
                        console.debug(`Failed to load template ${template.id} from ${templatePath}`);
                    }
                }
            }

            console.log(`Successfully registered ${tagName} from ${modulePath}`);

            this._loaded = true;

            // Fire LOADED event
            this.fireEvent(ComponentEvent.LOADED, {
                tagName: tagName,
                componentClass: ComponentClass,
                href: this._href,
                meta: meta,
                component: this
            });

        } catch (error) {
            console.error(`Failed to load component ${meta.name}:`, error);

            // Fire ERROR event
            this.fireEvent(ComponentEvent.ERROR, {
                error: error.message,
                tagName: tagName,
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

    get tagName() {
        return this._meta?.tagName;
    }

    get loaded() {
        return this._loaded;
    }
}
