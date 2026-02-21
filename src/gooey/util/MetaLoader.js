import Logger from '../logging/Logger.js';

/**
 * MetaLoader - Loads and validates META.goo component configuration files
 * Also handles theme CSS loading and injection for Shadow DOM components
 */
export default class MetaLoader {
    // Supported META.goo version - update this when parser changes
    static SUPPORTED_META_VERSION = "1.0";

    // CSS cache for performance - shared stylesheets across component instances
    static _cssCache = new Map();

    /**
     * Compare two version strings (e.g., "1.0", "1.1", "2.0")
     * @param {string} v1 - First version
     * @param {string} v2 - Second version
     * @returns {number} -1 if v1 < v2, 0 if equal, 1 if v1 > v2
     */
    static _compareVersions(v1, v2) {
        const parts1 = v1.split('.').map(Number);
        const parts2 = v2.split('.').map(Number);
        const maxLength = Math.max(parts1.length, parts2.length);

        for (let i = 0; i < maxLength; i++) {
            const num1 = parts1[i] || 0;
            const num2 = parts2[i] || 0;
            if (num1 < num2) return -1;
            if (num1 > num2) return 1;
        }
        return 0;
    }

    /**
     * Check META.goo version compatibility and log appropriate warnings
     * @param {Object} meta - Parsed META.goo content
     * @param {string} metaPath - Path to the META.goo file (for logging)
     */
    static _checkVersion(meta, metaPath) {
        const fileVersion = meta.MetaGooVersion;

        if (!fileVersion) {
            Logger.warn({ code: "META_VERSION_MISSING", path: metaPath }, "META.goo version missing: %s -- consider adding MetaGooVersion", metaPath);
            return;
        }

        const comparison = this._compareVersions(fileVersion, this.SUPPORTED_META_VERSION);

        if (comparison > 0) {
            Logger.warn({ code: "META_VERSION_MISMATCH", path: metaPath, fileVersion, supportedVersion: this.SUPPORTED_META_VERSION }, "META.goo version mismatch: %s (file: %s, supported: %s)", metaPath, fileVersion, this.SUPPORTED_META_VERSION);
        }
    }
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
                const meta = JSON.parse(text);
                this._checkVersion(meta, metaPath);
                return meta;
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
     * @returns {Object} The validated meta object with computed fullTagName
     * @throws {Error} If validation fails
     */
    static validate(meta) {
        const errors = [];

        // Required fields
        if (!meta.name || typeof meta.name !== 'string') {
            errors.push('Missing or invalid "name" field (string required)');
        }

        if (!meta.prefix || typeof meta.prefix !== 'string') {
            errors.push('Missing or invalid "prefix" field (string required)');
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

        // Validate tokens object if present (optional - for design token discovery)
        if (meta.tokens !== undefined) {
            if (typeof meta.tokens !== 'object' || Array.isArray(meta.tokens)) {
                errors.push('"tokens" must be an object');
            } else {
                Object.entries(meta.tokens).forEach(([tokenName, tokenDef]) => {
                    if (!tokenDef || typeof tokenDef !== 'object') {
                        errors.push(`tokens.${tokenName}: must be an object`);
                        return;
                    }
                    if (tokenDef.fallback !== undefined && tokenDef.fallback !== null && typeof tokenDef.fallback !== 'string') {
                        errors.push(`tokens.${tokenName}: "fallback" must be a string or null`);
                    }
                    if (tokenDef.category !== undefined && typeof tokenDef.category !== 'string') {
                        errors.push(`tokens.${tokenName}: "category" must be a string`);
                    }
                    if (tokenDef.description !== undefined && typeof tokenDef.description !== 'string') {
                        errors.push(`tokens.${tokenName}: "description" must be a string`);
                    }
                });
            }
        }

        // Validate each attribute definition
        if (meta.attributes && typeof meta.attributes === 'object') {
            const validTypes = ['STRING', 'NUMBER', 'BOOLEAN', 'ENUM'];

            Object.entries(meta.attributes).forEach(([attrName, attrDef]) => {
                if (!attrDef || typeof attrDef !== 'object') {
                    errors.push(`attributes.${attrName}: must be an object`);
                    return;
                }

                if (!attrDef.type || !validTypes.includes(attrDef.type)) {
                    errors.push(`attributes.${attrName}: invalid type "${attrDef.type}" (must be STRING, NUMBER, BOOLEAN, or ENUM)`);
                }

                // ENUM type requires a values array
                if (attrDef.type === 'ENUM' && (!attrDef.values || !Array.isArray(attrDef.values))) {
                    errors.push(`attributes.${attrName}: ENUM type requires a "values" array`);
                }

                // Validate values is array if present
                if (attrDef.values !== undefined && !Array.isArray(attrDef.values)) {
                    errors.push(`attributes.${attrName}: "values" must be an array`);
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

        // Compute fullTagName from prefix and tagName
        meta.fullTagName = `${meta.prefix}-${meta.tagName}`;

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

    /**
     * Load theme CSS and return as constructable stylesheet or text
     * @param {string} componentPath - Full path to component directory
     * @param {string} themeName - Theme name (e.g., "base")
     * @returns {Promise<{type: string, sheet?: CSSStyleSheet, cssText: string}>}
     */
    static async loadThemeCSS(componentPath, themeName) {
        const cacheKey = `${componentPath}/${themeName}`;

        // Return cached if available
        if (this._cssCache.has(cacheKey)) {
            return this._cssCache.get(cacheKey);
        }

        const cssPath = `${componentPath}/themes/${themeName}.css`;

        try {
            const response = await fetch(cssPath, {
                method: 'GET',
                cache: 'default',
                headers: {
                    'Accept': 'text/css,*/*',
                    'Cache-Control': 'max-age=3600'
                }
            });

            if (!response.ok) {
                throw new Error(`Theme CSS not found: ${cssPath} (HTTP ${response.status})`);
            }

            const cssText = await response.text();

            if (!cssText || cssText.trim().length === 0) {
                throw new Error(`Theme CSS is empty: ${cssPath}`);
            }

            let result;

            // Use Constructable Stylesheets if available (modern browsers)
            if ('adoptedStyleSheets' in Document.prototype) {
                const sheet = new CSSStyleSheet();
                sheet.replaceSync(cssText);
                result = { type: 'stylesheet', sheet, cssText };
            } else {
                // Fallback for older browsers
                result = { type: 'text', cssText };
            }

            // Cache the result for sharing across component instances
            this._cssCache.set(cacheKey, result);

            return result;

        } catch (error) {
            Logger.error(error, { code: "THEME_CSS_LOAD_FAILED", path: cssPath }, "Failed to load theme CSS: %s", cssPath);
            throw error;
        }
    }

    /**
     * Inject CSS into a shadow root
     * @param {ShadowRoot} shadowRoot - Target shadow root
     * @param {Object} cssResult - Result from loadThemeCSS
     */
    static injectCSS(shadowRoot, cssResult) {
        if (!shadowRoot || !cssResult) {
            return;
        }

        if (cssResult.type === 'stylesheet' && cssResult.sheet) {
            // Use adoptedStyleSheets for efficient sharing
            shadowRoot.adoptedStyleSheets = [
                ...shadowRoot.adoptedStyleSheets,
                cssResult.sheet
            ];
        } else if (cssResult.cssText) {
            // Fallback: inject <style> element
            const style = document.createElement('style');
            style.setAttribute('data-theme', 'true');
            style.textContent = cssResult.cssText;
            shadowRoot.prepend(style);
        }
    }

    /**
     * Switch theme for a component's shadow root
     * @param {ShadowRoot} shadowRoot - Target shadow root
     * @param {string} componentPath - Component directory path
     * @param {string} newTheme - New theme name
     */
    static async switchTheme(shadowRoot, componentPath, newTheme) {
        const cssResult = await this.loadThemeCSS(componentPath, newTheme);

        if (cssResult.type === 'stylesheet' && cssResult.sheet) {
            const sheets = [...shadowRoot.adoptedStyleSheets];
            if (sheets.length > 1) {
                // Replace theme sheet at index 1, keep base component sheet at index 0
                sheets[1] = cssResult.sheet;
                // Remove any extra theme sheets beyond index 1 (clean slate for new theme)
                shadowRoot.adoptedStyleSheets = sheets.slice(0, 2);
            } else {
                // Only base sheet exists (index 0) -- append new theme sheet
                sheets.push(cssResult.sheet);
                shadowRoot.adoptedStyleSheets = sheets;
            }
        } else {
            // Fallback path: replace only data-theme style elements, preserve base styles
            shadowRoot.querySelectorAll('style[data-theme]').forEach(el => el.remove());
            const style = document.createElement('style');
            style.setAttribute('data-theme', 'true');
            style.textContent = cssResult.cssText;
            shadowRoot.appendChild(style);
        }
    }

    /**
     * Clear CSS cache (useful for development hot reload)
     */
    static clearCache() {
        this._cssCache.clear();
    }
}
