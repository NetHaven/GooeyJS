/**
 * MetaLoader - Loads and validates META.goo component configuration files
 */
export default class MetaLoader {
    /**
     * Load a META.goo file from a component directory
     * @param {string} componentPath - Full path to the component directory
     * @returns {Promise<Object>} Parsed META.goo content
     * @throws {Error} If META.goo is not found or invalid
     */
    static async load(componentPath) {
        const metaPath = `${componentPath}/META.goo`;

        try {
            const response = await fetch(metaPath);

            if (!response.ok) {
                throw new Error(`META.goo required but not found: ${metaPath} (HTTP ${response.status})`);
            }

            const text = await response.text();

            if (!text || text.trim().length === 0) {
                throw new Error(`META.goo is empty: ${metaPath}`);
            }

            try {
                return JSON.parse(text);
            } catch (parseError) {
                throw new Error(`META.goo contains invalid JSON: ${metaPath} - ${parseError.message}`);
            }
        } catch (fetchError) {
            if (fetchError.message.includes('META.goo')) {
                throw fetchError;
            }
            throw new Error(`Failed to load META.goo: ${metaPath} - ${fetchError.message}`);
        }
    }

    /**
     * Validate a META.goo configuration object
     * @param {Object} meta - Parsed META.goo content
     * @returns {Object} The validated meta object
     * @throws {Error} If validation fails
     */
    static validate(meta) {
        const errors = [];

        // Required fields
        if (!meta.name || typeof meta.name !== 'string') {
            errors.push('Missing or invalid "name" field (string required)');
        }

        if (!meta.tagName || typeof meta.tagName !== 'string') {
            errors.push('Missing or invalid "tagName" field (string required)');
        }

        if (!meta.script || typeof meta.script !== 'string') {
            errors.push('Missing or invalid "script" field (string required)');
        }

        if (!meta.attributes || typeof meta.attributes !== 'object') {
            errors.push('Missing or invalid "attributes" field (object required)');
        }

        // Validate templates array if present
        if (meta.templates !== undefined) {
            if (!Array.isArray(meta.templates)) {
                errors.push('"templates" must be an array');
            } else {
                meta.templates.forEach((template, index) => {
                    if (!template.id || typeof template.id !== 'string') {
                        errors.push(`templates[${index}]: missing or invalid "id" field`);
                    }
                    if (!template.file || typeof template.file !== 'string') {
                        errors.push(`templates[${index}]: missing or invalid "file" field`);
                    }
                });
            }
        }

        // Validate themes object if present
        if (meta.themes !== undefined) {
            if (typeof meta.themes !== 'object') {
                errors.push('"themes" must be an object');
            } else {
                if (meta.themes.available !== undefined && !Array.isArray(meta.themes.available)) {
                    errors.push('"themes.available" must be an array');
                }
            }
        }

        // Validate each attribute definition
        if (meta.attributes && typeof meta.attributes === 'object') {
            const validTypes = ['STRING', 'NUMBER', 'BOOLEAN'];

            Object.entries(meta.attributes).forEach(([attrName, attrDef]) => {
                if (!attrDef || typeof attrDef !== 'object') {
                    errors.push(`attributes.${attrName}: must be an object`);
                    return;
                }

                if (!attrDef.type || !validTypes.includes(attrDef.type)) {
                    errors.push(`attributes.${attrName}: invalid type "${attrDef.type}" (must be STRING, NUMBER, or BOOLEAN)`);
                }

                // Validate enum is array if present
                if (attrDef.enum !== undefined && !Array.isArray(attrDef.enum)) {
                    errors.push(`attributes.${attrName}: "enum" must be an array`);
                }

                // Validate min/max are numbers if present
                if (attrDef.min !== undefined && typeof attrDef.min !== 'number') {
                    errors.push(`attributes.${attrName}: "min" must be a number`);
                }

                if (attrDef.max !== undefined && typeof attrDef.max !== 'number') {
                    errors.push(`attributes.${attrName}: "max" must be a number`);
                }

                // Validate pattern is string if present
                if (attrDef.pattern !== undefined && typeof attrDef.pattern !== 'string') {
                    errors.push(`attributes.${attrName}: "pattern" must be a string`);
                }
            });
        }

        if (errors.length > 0) {
            throw new Error(`META.goo validation failed for "${meta.name || 'unknown'}":\n  - ${errors.join('\n  - ')}`);
        }

        return meta;
    }

    /**
     * Load and validate a META.goo file in one step
     * @param {string} componentPath - Full path to the component directory
     * @returns {Promise<Object>} Validated META.goo content
     */
    static async loadAndValidate(componentPath) {
        const meta = await this.load(componentPath);
        return this.validate(meta);
    }
}
