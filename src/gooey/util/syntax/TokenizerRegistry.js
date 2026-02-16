import Tokenizer from './Tokenizer.js';

/**
 * TokenizerRegistry - Maps language names to tokenizer module paths
 * and manages lazy-loading of tokenizer instances.
 *
 * Tokenizer modules are loaded on-demand via dynamic import() the first
 * time a language is requested. Subsequent requests return the cached instance.
 */
export default class TokenizerRegistry {

    /** @type {Map<string, string>} language name (lowercase) -> module path */
    static _modulePaths = new Map();

    /** @type {Map<string, Tokenizer>} language name (lowercase) -> cached instance */
    static _instances = new Map();

    /** @type {Map<string, Promise<Tokenizer>>} language name (lowercase) -> in-flight load promise */
    static _loading = new Map();

    /**
     * Register a tokenizer module path for a language.
     * Does NOT load the module; loading is deferred until getTokenizer() is called.
     *
     * @param {string} language - Language identifier (e.g. "html", "javascript")
     * @param {string} modulePath - Path to the ES6 module (relative to this file or absolute URL)
     */
    static register(language, modulePath) {
        this._modulePaths.set(language.toLowerCase(), modulePath);
    }

    /**
     * Get (or lazy-load) a tokenizer instance for the given language.
     * Returns null if no tokenizer is registered for the language.
     * Deduplicates concurrent requests for the same language.
     *
     * @param {string} language - Language identifier
     * @returns {Promise<Tokenizer|null>} The tokenizer instance, or null
     */
    static async getTokenizer(language) {
        const key = language.toLowerCase();

        // Return cached instance
        if (this._instances.has(key)) {
            return this._instances.get(key);
        }

        // No tokenizer registered for this language
        if (!this._modulePaths.has(key)) {
            return null;
        }

        // Deduplicate in-flight loads
        if (this._loading.has(key)) {
            return this._loading.get(key);
        }

        const loadPromise = this._loadTokenizer(key);
        this._loading.set(key, loadPromise);

        try {
            const instance = await loadPromise;
            return instance;
        } finally {
            this._loading.delete(key);
        }
    }

    /**
     * Internal: load and instantiate a tokenizer module.
     * @param {string} key - Lowercase language name
     * @returns {Promise<Tokenizer>}
     * @private
     */
    static async _loadTokenizer(key) {
        const modulePath = this._modulePaths.get(key);

        const module = await import(modulePath);
        const TokenizerClass = module.default;

        if (!(TokenizerClass.prototype instanceof Tokenizer)) {
            throw new Error(
                `Tokenizer module for "${key}" does not export a Tokenizer subclass.`
            );
        }

        const instance = new TokenizerClass(key);
        this._instances.set(key, instance);
        return instance;
    }

    /**
     * Check if a tokenizer is registered (but not necessarily loaded) for a language.
     * @param {string} language - Language identifier
     * @returns {boolean}
     */
    static hasTokenizer(language) {
        return this._modulePaths.has(language.toLowerCase());
    }

    /**
     * Check if a tokenizer is already loaded and cached.
     * @param {string} language
     * @returns {boolean}
     */
    static isLoaded(language) {
        return this._instances.has(language.toLowerCase());
    }

    /**
     * Get all registered language names.
     * @returns {string[]}
     */
    static getRegisteredLanguages() {
        return Array.from(this._modulePaths.keys());
    }

    /**
     * Clear all registrations and cached instances.
     */
    static clear() {
        this._modulePaths.clear();
        this._instances.clear();
        this._loading.clear();
    }
}

// Register built-in tokenizers (lazy-loaded on first use)
TokenizerRegistry.register("html", "./tokenizers/HTMLTokenizer.js");
TokenizerRegistry.register("htm", "./tokenizers/HTMLTokenizer.js");
TokenizerRegistry.register("xml", "./tokenizers/HTMLTokenizer.js");
TokenizerRegistry.register("svg", "./tokenizers/HTMLTokenizer.js");

TokenizerRegistry.register("javascript", "./tokenizers/JavaScriptTokenizer.js");
TokenizerRegistry.register("js", "./tokenizers/JavaScriptTokenizer.js");
TokenizerRegistry.register("jsx", "./tokenizers/JavaScriptTokenizer.js");
TokenizerRegistry.register("typescript", "./tokenizers/JavaScriptTokenizer.js");
TokenizerRegistry.register("ts", "./tokenizers/JavaScriptTokenizer.js");
TokenizerRegistry.register("tsx", "./tokenizers/JavaScriptTokenizer.js");

TokenizerRegistry.register("css", "./tokenizers/CSSTokenizer.js");
TokenizerRegistry.register("scss", "./tokenizers/CSSTokenizer.js");
TokenizerRegistry.register("less", "./tokenizers/CSSTokenizer.js");
