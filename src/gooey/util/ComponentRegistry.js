/**
 * ComponentRegistry - Global registry for component metadata and attribute definitions
 * Provides attribute validation, default value access, and theme CSS storage
 */
export default class ComponentRegistry {
    static _registry = new Map();
    static _themeCSS = new Map();
    static _componentPaths = new Map();
    // Maps tagName -> { lowercaseName -> canonicalName }
    static _attributeAliases = new Map();

    /**
     * Register a component's metadata
     * @param {string} tagName - Custom element tag name (e.g., "gooeyui-button")
     * @param {Object} meta - Validated META.goo content
     */
    static register(tagName, meta) {
        const normalizedTag = tagName.toLowerCase();
        this._registry.set(normalizedTag, meta);

        // Build attribute alias map (lowercase -> canonical)
        if (meta.attributes) {
            const aliasMap = {};
            for (const attrName of Object.keys(meta.attributes)) {
                aliasMap[attrName.toLowerCase()] = attrName;
            }
            this._attributeAliases.set(normalizedTag, aliasMap);
        }
    }

    /**
     * Get a component's full metadata
     * @param {string} tagName - Custom element tag name
     * @returns {Object|null} META.goo content or null if not found
     */
    static getMeta(tagName) {
        return this._registry.get(tagName.toLowerCase()) || null;
    }

    /**
     * Get all attribute definitions for a component
     * @param {string} tagName - Custom element tag name
     * @returns {Object} Attribute definitions object
     */
    static getAttributes(tagName) {
        const meta = this._registry.get(tagName.toLowerCase());
        return meta?.attributes || {};
    }

    /**
     * Get the list of observed attribute names for a component
     * Returns lowercase names since HTML lowercases all attributes
     * @param {string} tagName - Custom element tag name
     * @returns {string[]} Array of lowercase attribute names
     */
    static getObservedAttributes(tagName) {
        return Object.keys(this.getAttributes(tagName)).map(name => name.toLowerCase());
    }

    /**
     * Get the canonical (META.goo) attribute name from a possibly lowercase name
     * @param {string} tagName - Custom element tag name
     * @param {string} name - Attribute name (may be lowercase)
     * @returns {string} Canonical attribute name
     */
    static getCanonicalAttributeName(tagName, name) {
        const aliasMap = this._attributeAliases.get(tagName.toLowerCase());
        if (aliasMap) {
            return aliasMap[name.toLowerCase()] || name;
        }
        return name;
    }

    /**
     * Get the definition for a specific attribute
     * Accepts both lowercase and canonical attribute names
     * @param {string} tagName - Custom element tag name
     * @param {string} name - Attribute name (case-insensitive)
     * @returns {Object|null} Attribute definition or null if not found
     */
    static getAttributeDefinition(tagName, name) {
        const attrs = this.getAttributes(tagName);
        // Try exact match first, then canonical name
        if (attrs[name]) {
            return attrs[name];
        }
        const canonical = this.getCanonicalAttributeName(tagName, name);
        return attrs[canonical] || null;
    }

    /**
     * Get the default value for an attribute
     * @param {string} tagName - Custom element tag name
     * @param {string} name - Attribute name
     * @returns {*} Default value or undefined if not defined
     */
    static getDefaultValue(tagName, name) {
        const attrDef = this.getAttributeDefinition(tagName, name);
        return attrDef?.default;
    }

    /**
     * Get the type of an attribute
     * @param {string} tagName - Custom element tag name
     * @param {string} name - Attribute name
     * @returns {string|null} Type (STRING, NUMBER, BOOLEAN) or null
     */
    static getAttributeType(tagName, name) {
        const attrDef = this.getAttributeDefinition(tagName, name);
        return attrDef?.type || null;
    }

    /**
     * Validate an attribute value against its definition
     * @param {string} tagName - Custom element tag name
     * @param {string} name - Attribute name
     * @param {*} value - Value to validate
     * @returns {Object} { valid: boolean, error?: string }
     */
    static validateAttribute(tagName, name, value) {
        const attrDef = this.getAttributeDefinition(tagName, name);

        if (!attrDef) {
            return { valid: false, error: `Unknown attribute: ${name}` };
        }

        // Null/undefined values are valid (attribute removal)
        if (value === null || value === undefined) {
            return { valid: true };
        }

        // Type checking
        switch (attrDef.type) {
            case 'BOOLEAN':
                // Accept boolean values or string "true"/"false"
                if (typeof value === 'boolean') {
                    return { valid: true };
                }
                if (typeof value === 'string') {
                    const lower = value.toLowerCase();
                    if (lower === 'true' || lower === 'false' || lower === '') {
                        return { valid: true };
                    }
                }
                return { valid: false, error: `${name} must be a boolean (true, false, or empty string)` };

            case 'NUMBER':
                const num = Number(value);
                if (isNaN(num)) {
                    return { valid: false, error: `${name} must be a number` };
                }
                if (attrDef.min !== undefined && num < attrDef.min) {
                    return { valid: false, error: `${name} must be >= ${attrDef.min}` };
                }
                if (attrDef.max !== undefined && num > attrDef.max) {
                    return { valid: false, error: `${name} must be <= ${attrDef.max}` };
                }
                return { valid: true };

            case 'STRING':
                if (typeof value !== 'string') {
                    value = String(value);
                }
                // Enum validation using 'values' array from META.goo
                // Case-insensitive comparison since components may normalize values
                if (attrDef.values && attrDef.values.length > 0) {
                    const upperValue = value.toUpperCase();
                    const validValues = attrDef.values.map(v => v.toUpperCase());
                    if (!validValues.includes(upperValue)) {
                        return { valid: false, error: `${name} must be one of: ${attrDef.values.join(', ')}` };
                    }
                }
                // Pattern validation
                if (attrDef.pattern) {
                    try {
                        const regex = new RegExp(attrDef.pattern);
                        if (!regex.test(value)) {
                            return { valid: false, error: `${name} does not match required pattern` };
                        }
                    } catch (e) {
                        // Invalid regex in definition - log but don't fail
                        console.warn(`Invalid pattern for attribute ${name}:`, attrDef.pattern);
                    }
                }
                return { valid: true };

            case 'ENUM':
                if (typeof value !== 'string') {
                    value = String(value);
                }
                // ENUM type requires values array in META.goo
                // Case-insensitive comparison since components normalize values
                if (attrDef.values && attrDef.values.length > 0) {
                    const upperValue = value.toUpperCase();
                    const validValues = attrDef.values.map(v => v.toUpperCase());
                    if (!validValues.includes(upperValue)) {
                        return { valid: false, error: `${name} must be one of: ${attrDef.values.join(', ')}` };
                    }
                }
                return { valid: true };

            default:
                return { valid: false, error: `Unknown attribute type: ${attrDef.type}` };
        }
    }

    /**
     * Parse an attribute value to its proper type based on definition
     * @param {string} tagName - Custom element tag name
     * @param {string} name - Attribute name
     * @param {string} value - Raw attribute value (always string from HTML)
     * @returns {*} Parsed value in correct type
     */
    static parseValue(tagName, name, value) {
        const attrDef = this.getAttributeDefinition(tagName, name);

        if (!attrDef || value === null || value === undefined) {
            return value;
        }

        switch (attrDef.type) {
            case 'BOOLEAN':
                // Empty string (attribute present) = true
                if (value === '') return true;
                return value.toLowerCase() === 'true';

            case 'NUMBER':
                const num = Number(value);
                return isNaN(num) ? attrDef.default : num;

            case 'ENUM':
            case 'STRING':
            default:
                return value;
        }
    }

    /**
     * Check if a component is registered
     * @param {string} tagName - Custom element tag name
     * @returns {boolean}
     */
    static isRegistered(tagName) {
        return this._registry.has(tagName.toLowerCase());
    }

    /**
     * Get all registered tag names
     * @returns {string[]}
     */
    static getRegisteredTagNames() {
        return Array.from(this._registry.keys());
    }

    /**
     * Clear the registry (useful for testing)
     */
    static clear() {
        this._registry.clear();
        this._themeCSS.clear();
        this._componentPaths.clear();
        this._attributeAliases.clear();
    }

    /**
     * Store theme CSS result for a component
     * @param {string} tagName - Custom element tag name
     * @param {Object} cssResult - Result from MetaLoader.loadThemeCSS
     */
    static setThemeCSS(tagName, cssResult) {
        this._themeCSS.set(tagName.toLowerCase(), cssResult);
    }

    /**
     * Get stored theme CSS result for a component
     * @param {string} tagName - Custom element tag name
     * @returns {Object|null} CSS result or null if not found
     */
    static getThemeCSS(tagName) {
        return this._themeCSS.get(tagName.toLowerCase()) || null;
    }

    /**
     * Store component path for later use (e.g., theme switching)
     * @param {string} tagName - Custom element tag name
     * @param {string} path - Full path to component directory
     */
    static setComponentPath(tagName, path) {
        this._componentPaths.set(tagName.toLowerCase(), path);
    }

    /**
     * Get component path
     * @param {string} tagName - Custom element tag name
     * @returns {string|null} Component path or null if not found
     */
    static getComponentPath(tagName) {
        return this._componentPaths.get(tagName.toLowerCase()) || null;
    }
}
