import Observable from './events/Observable.js';
import ComponentEvent from './events/ComponentEvent.js';
import Template from './util/Template.js';

export default class Component extends Observable {
    static get observedAttributes() {
        return ['src', 'name', 'prefix'];
    }

    constructor() {
        super();

        // Add valid events
        this.addValidEvent(ComponentEvent.LOADING);
        this.addValidEvent(ComponentEvent.LOADED);
        this.addValidEvent(ComponentEvent.ERROR);

        // Hide this element - it's just a loader
        this.style.display = 'none';

        this._src = null;
        this._name = null;
        this._prefix = null;
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
        if (!this.hasAttribute('src')) {
            console.error('Component loading error: "src" attribute is required');
            this.fireEvent(ComponentEvent.ERROR, {
                error: 'Missing required attribute: src',
                component: this
            });
            return;
        }

        if (!this.hasAttribute('name')) {
            console.error('Component loading error: "name" attribute is required');
            this.fireEvent(ComponentEvent.ERROR, {
                error: 'Missing required attribute: name',
                component: this
            });
            return;
        }

        if (!this.hasAttribute('prefix')) {
            console.error('Component loading error: "prefix" attribute is required');
            this.fireEvent(ComponentEvent.ERROR, {
                error: 'Missing required attribute: prefix',
                component: this
            });
            return;
        }

        this._src = this.getAttribute('src');
        this._name = this.getAttribute('name');
        this._prefix = this.getAttribute('prefix');

        // Generate tag name (e.g., "gooeyui-button")
        const tagName = `${this._prefix}-${this._name}`.toLowerCase();

        // Check if component is already registered
        if (customElements.get(tagName)) {
            console.log(`Component ${tagName} is already registered, skipping load`);
            return;
        }

        // Fire LOADING event
        this.fireEvent(ComponentEvent.LOADING, {
            tagName: tagName,
            src: this._src,
            name: this._name,
            prefix: this._prefix,
            component: this
        });

        try {
            // Build paths for module and template
            const modulePath = `${this._src}/${this._name}.js`;
            const templatePath = `${this._src}/${this._name}.html`;
            const templateId = `${this._prefix}-${this._name}`;

            // Dynamically import the component class
            const module = await import(modulePath);
            const ComponentClass = module.default;

            // Register the custom element
            customElements.define(tagName, ComponentClass);

            // Load template if it exists
            try {
                await Template.load(templatePath, templateId);
                console.log(`Loaded template ${templateId} from ${templatePath}`);
            } catch (templateError) {
                // Template might not exist for all components
                console.debug(`No template found for ${this._name} at ${templatePath}`);
            }

            console.log(`Successfully registered ${tagName} from ${modulePath}`);

            this._loaded = true;

            // Fire LOADED event
            this.fireEvent(ComponentEvent.LOADED, {
                tagName: tagName,
                componentClass: ComponentClass,
                src: this._src,
                name: this._name,
                prefix: this._prefix,
                component: this
            });

        } catch (error) {
            console.error(`Failed to load component ${this._name}:`, error);

            // Fire ERROR event
            this.fireEvent(ComponentEvent.ERROR, {
                error: error.message,
                tagName: tagName,
                src: this._src,
                name: this._name,
                prefix: this._prefix,
                component: this
            });
        }
    }

    get src() {
        return this._src;
    }

    get name() {
        return this._name;
    }

    get prefix() {
        return this._prefix;
    }

    get loaded() {
        return this._loaded;
    }
}
