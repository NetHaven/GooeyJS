import Observable from './events/Observable.js';
import ComponentEvent from './events/ComponentEvent.js';
import ComponentRegistry from './util/ComponentRegistry.js';

export default class GooeyElement extends Observable {
    static get observedAttributes() {
        return ['class', 'id'];
    }

    constructor () {
        super();

        // Store for type-coerced attribute values from META.goo definitions
        this._parsedAttributes = new Map();

        // Add attribute validation error event (available to all components)
        this.addValidEvent(ComponentEvent.ATTRIBUTE_ERROR);
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