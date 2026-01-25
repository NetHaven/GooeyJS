import GooeyElement from '../../../GooeyElement.js';
import Template from '../../../util/Template.js';
import MetaLoader from '../../../util/MetaLoader.js';
import ComponentRegistry from '../../../util/ComponentRegistry.js';

/**
 * Field Component
 *
 * A non-visual component that defines a single field in a Model schema.
 * Specifies the field's name, data type, and optional default value.
 *
 * @example
 * <gooeydata-model id="personModel">
 *     <gooeydata-field name="id" type="number"></gooeydata-field>
 *     <gooeydata-field name="name" type="string" defaultvalue="Unknown"></gooeydata-field>
 *     <gooeydata-field name="active" type="boolean" defaultvalue="true"></gooeydata-field>
 *     <gooeydata-field name="birthDate" type="date"></gooeydata-field>
 * </gooeydata-model>
 *
 * Supported types:
 * - "string" (default): Text values
 * - "number": Numeric values (parsed with parseFloat)
 * - "boolean": Boolean values ("true"/"false" strings converted to true/false)
 * - "date": Date values (parsed with new Date())
 */
export default class Field extends GooeyElement {
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
        Template.activate("data-Field", this.shadowRoot);
    }

    // =========== Properties ===========

    /**
     * Get reference to the parent Model element
     * @returns {HTMLElement|null} - The parent Model or null
     */
    get model() {
        return this.closest('gooeydata-model');
    }

    /**
     * Get the field name
     * @returns {string|null} - The field name
     */
    get name() {
        return this.getAttribute('name');
    }

    /**
     * Set the field name
     * @param {string} val - The field name
     */
    set name(val) {
        if (val) {
            this.setAttribute('name', val);
        } else {
            this.removeAttribute('name');
        }
    }

    /**
     * Get the field type (normalized to lowercase)
     * @returns {string} - The field type (defaults to 'string')
     */
    get type() {
        const type = this.getAttribute('type');
        return type ? type.toLowerCase() : 'string';
    }

    /**
     * Set the field type
     * @param {string} val - The field type (boolean, date, string, number)
     */
    set type(val) {
        if (val) {
            this.setAttribute('type', val);
        } else {
            this.removeAttribute('type');
        }
    }

    /**
     * Get the default value (as string)
     * @returns {string|null} - The default value string
     */
    get defaultvalue() {
        return this.getAttribute('defaultvalue');
    }

    /**
     * Set the default value
     * @param {string} val - The default value
     */
    set defaultvalue(val) {
        if (val !== null && val !== undefined) {
            this.setAttribute('defaultvalue', String(val));
        } else {
            this.removeAttribute('defaultvalue');
        }
    }

    // =========== Public API ===========

    /**
     * Convert the Field to a field definition object
     * @returns {Object} - Field definition { name, type, defaultValue }
     */
    toFieldDefinition() {
        return {
            name: this.name,
            type: this.type,
            defaultValue: this._coerceDefaultValue()
        };
    }

    // =========== Private Methods ===========

    /**
     * Coerce the defaultvalue attribute to the appropriate type
     * @returns {*} - The coerced default value
     */
    _coerceDefaultValue() {
        const value = this.defaultvalue;

        // Handle null/undefined
        if (value === null || value === undefined) {
            return null;
        }

        switch (this.type) {
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
