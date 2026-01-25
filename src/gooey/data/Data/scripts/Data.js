import GooeyElement from '../../../GooeyElement.js';
import Template from '../../../util/Template.js';
import MetaLoader from '../../../util/MetaLoader.js';
import ComponentRegistry from '../../../util/ComponentRegistry.js';

/**
 * Data Component
 *
 * A non-visual component that represents a single data record within a Store.
 * Data is defined using HTML data-* attributes, which are automatically converted
 * to a JavaScript object.
 *
 * @example
 * <gooeydata-store id="myStore">
 *     <gooeydata-data data-id="1" data-name="John" data-active="true" data-score="95.5"></gooeydata-data>
 * </gooeydata-store>
 *
 * The above will create a record: { id: 1, name: "John", active: true, score: 95.5 }
 */
export default class Data extends GooeyElement {
    constructor() {
        super();

        // Create Shadow DOM for CSS encapsulation
        this.attachShadow({ mode: 'open' });

        // Inject theme CSS if available
        const tagName = this.tagName.toLowerCase();
        const cssResult = ComponentRegistry.getThemeCSS(tagName);
        if (cssResult) {
            MetaLoader.injectCSS(this.shadowRoot, cssResult);
        }

        // Activate template
        Template.activate("data-Data", this.shadowRoot);

        // MutationObserver to watch for attribute changes
        this._observer = null;
    }

    // =========== Web Component Lifecycle ===========

    connectedCallback() {
        // Set up observer to watch for data-* attribute changes
        this._setupObserver();
    }

    disconnectedCallback() {
        // Clean up observer
        if (this._observer) {
            this._observer.disconnect();
            this._observer = null;
        }
    }

    // =========== Observer Setup ===========

    /**
     * Set up MutationObserver to watch for attribute changes
     */
    _setupObserver() {
        this._observer = new MutationObserver((mutations) => {
            let hasDataChange = false;

            for (const mutation of mutations) {
                if (mutation.type === 'attributes' &&
                    mutation.attributeName.startsWith('data-')) {
                    hasDataChange = true;
                    break;
                }
            }

            if (hasDataChange) {
                // Notify parent store of the change
                this._notifyParentStore();
            }
        });

        this._observer.observe(this, {
            attributes: true,
            attributeOldValue: true
        });
    }

    /**
     * Notify the parent Store that this data element has changed
     */
    _notifyParentStore() {
        const parentStore = this.store;
        if (parentStore && typeof parentStore._handleDataElementUpdated === 'function') {
            // Notify store to update only this element's record
            parentStore._handleDataElementUpdated(this);
        }
    }

    // =========== Properties ===========

    /**
     * Get reference to the parent Store element
     * @returns {HTMLElement|null} - The parent Store or null
     */
    get store() {
        return this.closest('gooeydata-store');
    }

    // =========== Public API ===========

    /**
     * Convert all data-* attributes to a JavaScript object
     * Values are automatically coerced to appropriate types (number, boolean, null)
     * @returns {Object} - The data record
     */
    toRecord() {
        const record = {};

        for (const key in this.dataset) {
            record[key] = this._coerceValue(this.dataset[key]);
        }

        return record;
    }

    /**
     * Set a field value (creates/updates a data-* attribute)
     * @param {string} name - The field name (without 'data-' prefix)
     * @param {*} value - The value to set
     */
    setField(name, value) {
        if (value === null || value === undefined) {
            this.removeAttribute(`data-${name}`);
        } else {
            this.setAttribute(`data-${name}`, String(value));
        }
    }

    /**
     * Get a field value
     * @param {string} name - The field name (without 'data-' prefix)
     * @returns {*} - The coerced value
     */
    getField(name) {
        const value = this.dataset[name];
        if (value === undefined) {
            return undefined;
        }
        return this._coerceValue(value);
    }

    /**
     * Check if a field exists
     * @param {string} name - The field name (without 'data-' prefix)
     * @returns {boolean} - True if the field exists
     */
    hasField(name) {
        return name in this.dataset;
    }

    /**
     * Remove a field
     * @param {string} name - The field name (without 'data-' prefix)
     */
    removeField(name) {
        delete this.dataset[name];
    }

    /**
     * Get all field names
     * @returns {Array<string>} - Array of field names
     */
    getFieldNames() {
        return Object.keys(this.dataset);
    }

    // =========== Private Methods ===========

    /**
     * Coerce string value to appropriate type
     * @param {string} value - The string value to coerce
     * @returns {*} - Coerced value (number, boolean, null, or string)
     */
    _coerceValue(value) {
        // Check for null/undefined
        if (value === null || value === undefined || value === 'null') {
            return null;
        }

        // Check for boolean
        if (value === 'true') {
            return true;
        }
        if (value === 'false') {
            return false;
        }

        // Check for number
        const numValue = Number(value);
        if (!isNaN(numValue) && value.trim() !== '') {
            return numValue;
        }

        // Return as string
        return value;
    }
}
