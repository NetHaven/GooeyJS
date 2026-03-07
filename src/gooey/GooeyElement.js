import Observable from './events/Observable.js';
import ComponentEvent from './events/ComponentEvent.js';
import ComponentRegistry from './util/ComponentRegistry.js';
import Logger from './logging/Logger.js';

export default class GooeyElement extends Observable {
    static _instances = new Map();

    static get observedAttributes() {
        return ['class', 'id'];
    }

    /**
     * Get a registered component instance by id
     * @param {string} id - The component's id attribute value
     * @returns {GooeyElement|null} The component instance, or null if not found
     */
    static getComponent(id) {
        return GooeyElement._instances.get(id) || null;
    }

    constructor () {
        super();

        // Store for type-coerced attribute values from META.goo definitions
        this._parsedAttributes = new Map();

        // Add attribute validation error event (available to all components)
        this.addValidEvent(ComponentEvent.ATTRIBUTE_ERROR);
    }

    connectedCallback() {
        super.connectedCallback?.();
        const id = this.getAttribute('id');
        if (id) {
            this._registerInstance(id);
        }
    }

    disconnectedCallback() {
        super.disconnectedCallback?.();
        const id = this.getAttribute('id');
        if (id && GooeyElement._instances.get(id) === this) {
            GooeyElement._instances.delete(id);
        }
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'id') {
            // Unregister old id if this instance is the current registrant
            if (oldValue && GooeyElement._instances.get(oldValue) === this) {
                GooeyElement._instances.delete(oldValue);
            }
            // Register new id
            if (newValue) {
                this._registerInstance(newValue);
            }
            return;
        }
        super.attributeChangedCallback?.(name, oldValue, newValue);
    }

    /**
     * Register this instance in the global registry by id
     * @param {string} id - The id to register under
     * @private
     */
    _registerInstance(id) {
        const existing = GooeyElement._instances.get(id);
        if (existing && existing !== this) {
            Logger.warn("GooeyElement: Component id '%s' is already in use -- previous registration will be replaced", id);
        }
        GooeyElement._instances.set(id, this);
    }

    /**
     * Get a parsed (type-coerced) attribute value
     * @param {string} name - Attribute name
     * @returns {*} Parsed value based on META.goo type definition, or raw value if not defined
     */
    getParsedAttribute(name) {
        if (this._parsedAttributes.has(name)) {
            return this._parsedAttributes.get(name);
        }
        // Fallback: parse current attribute value
        const tagName = this.tagName.toLowerCase();
        const rawValue = this.getAttribute(name);
        return ComponentRegistry.parseValue(tagName, name, rawValue);
    }
}