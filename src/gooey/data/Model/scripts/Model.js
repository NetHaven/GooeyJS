import GooeyElement from '../../../GooeyElement.js';
import Template from '../../../util/Template.js';
import MetaLoader from '../../../util/MetaLoader.js';
import ComponentRegistry from '../../../util/ComponentRegistry.js';

/**
 * Model Component
 *
 * A non-visual component that defines a data schema for Store components.
 * Models contain Field children that describe the structure of data records,
 * including field names, types, and default values.
 *
 * @example
 * <gooeydata-model id="employeeModel">
 *     <gooeydata-field name="id" type="number"></gooeydata-field>
 *     <gooeydata-field name="name" type="string" defaultvalue="New Employee"></gooeydata-field>
 *     <gooeydata-field name="active" type="boolean" defaultvalue="true"></gooeydata-field>
 *     <gooeydata-field name="hireDate" type="date"></gooeydata-field>
 * </gooeydata-model>
 *
 * <gooeydata-store id="employeeStore" model="employeeModel">
 *     <gooeydata-data data-id="1" data-name="John"></gooeydata-data>
 * </gooeydata-store>
 */
export default class Model extends GooeyElement {
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
        Template.activate("data-Model", this.shadowRoot);
    }

    // =========== Public API ===========

    /**
     * Get all field definitions from child Field elements
     * @returns {Array<Object>} - Array of field definitions { name, type, defaultValue }
     */
    getFields() {
        const fieldElements = this.querySelectorAll('gooeydata-field');
        return Array.from(fieldElements).map(el => {
            if (typeof el.toFieldDefinition === 'function') {
                return el.toFieldDefinition();
            }
            // Fallback if toFieldDefinition not available
            return {
                name: el.getAttribute('name'),
                type: el.getAttribute('type') || 'string',
                defaultValue: this._coerceToType(
                    el.getAttribute('defaultvalue'),
                    el.getAttribute('type') || 'string'
                )
            };
        });
    }

    /**
     * Get a specific field definition by name
     * @param {string} name - The field name
     * @returns {Object|null} - Field definition or null if not found
     */
    getField(name) {
        const fieldElement = this.querySelector(`gooeydata-field[name="${name}"]`);
        if (!fieldElement) {
            return null;
        }
        if (typeof fieldElement.toFieldDefinition === 'function') {
            return fieldElement.toFieldDefinition();
        }
        return {
            name: fieldElement.getAttribute('name'),
            type: fieldElement.getAttribute('type') || 'string',
            defaultValue: this._coerceToType(
                fieldElement.getAttribute('defaultvalue'),
                fieldElement.getAttribute('type') || 'string'
            )
        };
    }

    /**
     * Get an array of all field names
     * @returns {Array<string>} - Array of field names
     */
    getFieldNames() {
        const fieldElements = this.querySelectorAll('gooeydata-field');
        return Array.from(fieldElements)
            .map(el => el.getAttribute('name'))
            .filter(name => name !== null);
    }

    /**
     * Get an object with all default values keyed by field name
     * @returns {Object} - Object with field names as keys and coerced default values
     */
    getDefaultRecord() {
        const record = {};
        const fields = this.getFields();

        for (const field of fields) {
            if (field.name) {
                record[field.name] = field.defaultValue;
            }
        }

        return record;
    }

    /**
     * Coerce a string value to the specified type
     * @param {string} value - The string value to coerce
     * @param {string} type - The target type (boolean, date, string, number)
     * @returns {*} - The coerced value
     */
    _coerceToType(value, type) {
        // Handle null/undefined
        if (value === null || value === undefined) {
            return null;
        }

        // Normalize type to lowercase for case-insensitive matching
        const normalizedType = type ? type.toLowerCase() : 'string';

        switch (normalizedType) {
            case 'boolean':
                if (value === 'true' || value === true) {
                    return true;
                }
                if (value === 'false' || value === false || value === '0' || value === '') {
                    return false;
                }
                return Boolean(value);

            case 'number':
                const numValue = parseFloat(value);
                return isNaN(numValue) ? null : numValue;

            case 'date':
                if (!value) {
                    return null;
                }
                const dateValue = new Date(value);
                return isNaN(dateValue.getTime()) ? null : dateValue;

            case 'string':
            default:
                return String(value);
        }
    }
}
