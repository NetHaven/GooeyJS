import ModelLocatorEvent from '../events/mvc/ModelLocatorEvent.js';

/**
 * Central registry for model instances and collections.
 * Singleton pattern - use ModelLocator.getInstance() or import default export.
 *
 * Features:
 * - Register/retrieve named model instances
 * - Register/retrieve named collections
 * - Track "current" selection per type (e.g., currentDatabase)
 * - Emit events on registration/selection changes
 */
class ModelLocator {
    static #instance = null;
    static #isInternalConstructing = false;

    /** @type {Map<string, *>} */
    #collections = new Map();

    /** @type {Map<string, *>} */
    #models = new Map();

    /** @type {Map<string, *>} */
    #currentSelections = new Map();

    /** @type {EventTarget} */
    #eventTarget = null;

    constructor() {
        if (!ModelLocator.#isInternalConstructing) {
            throw new Error("Use ModelLocator.getInstance() or import default export");
        }
        ModelLocator.#isInternalConstructing = false;
        this.#eventTarget = new EventTarget();
    }

    /**
     * Get the singleton instance
     * @returns {ModelLocator}
     */
    static getInstance() {
        if (!ModelLocator.#instance) {
            ModelLocator.#isInternalConstructing = true;
            ModelLocator.#instance = new ModelLocator();
        }
        return ModelLocator.#instance;
    }

    /**
     * Destroy the singleton instance (for testing)
     */
    static destroyInstance() {
        if (ModelLocator.#instance) {
            ModelLocator.#instance.#collections.clear();
            ModelLocator.#instance.#models.clear();
            ModelLocator.#instance.#currentSelections.clear();
        }
        ModelLocator.#instance = null;
    }

    // ==================== Collection Management ====================

    /**
     * Register a named collection
     * @param {string} name - Collection identifier
     * @param {*} collection - The collection instance
     * @returns {ModelLocator} this (for chaining)
     */
    registerCollection(name, collection) {
        if (!name || typeof name !== 'string') {
            throw new TypeError('Collection name must be a non-empty string');
        }
        this.#collections.set(name, collection);
        this.#dispatchEvent(ModelLocatorEvent.COLLECTION_REGISTERED, { name, collection });
        return this;
    }

    /**
     * Get a registered collection by name
     * @param {string} name
     * @returns {*|undefined}
     */
    getCollection(name) {
        return this.#collections.get(name);
    }

    /**
     * Check if a collection is registered
     * @param {string} name
     * @returns {boolean}
     */
    hasCollection(name) {
        return this.#collections.has(name);
    }

    /**
     * Unregister a collection
     * @param {string} name
     * @returns {boolean} true if collection existed
     */
    unregisterCollection(name) {
        const collection = this.#collections.get(name);
        if (collection) {
            this.#collections.delete(name);
            this.#dispatchEvent(ModelLocatorEvent.COLLECTION_UNREGISTERED, { name, collection });
            return true;
        }
        return false;
    }

    /**
     * Get all registered collection names
     * @returns {string[]}
     */
    getCollectionNames() {
        return Array.from(this.#collections.keys());
    }

    // ==================== Model Instance Management ====================

    /**
     * Register a named model instance
     * @param {string} name - Model identifier
     * @param {*} model - The model instance
     * @returns {ModelLocator} this (for chaining)
     */
    registerModel(name, model) {
        if (!name || typeof name !== 'string') {
            throw new TypeError('Model name must be a non-empty string');
        }
        const previous = this.#models.get(name);
        this.#models.set(name, model);
        this.#dispatchEvent(ModelLocatorEvent.MODEL_REGISTERED, { name, model, previous });
        return this;
    }

    /**
     * Get a registered model by name
     * @param {string} name
     * @returns {*|undefined}
     */
    getModel(name) {
        return this.#models.get(name);
    }

    /**
     * Check if a model is registered
     * @param {string} name
     * @returns {boolean}
     */
    hasModel(name) {
        return this.#models.has(name);
    }

    /**
     * Unregister a model
     * @param {string} name
     * @returns {boolean} true if model existed
     */
    unregisterModel(name) {
        const model = this.#models.get(name);
        if (model) {
            this.#models.delete(name);
            this.#dispatchEvent(ModelLocatorEvent.MODEL_UNREGISTERED, { name, model });
            return true;
        }
        return false;
    }

    /**
     * Get all registered model names
     * @returns {string[]}
     */
    getModelNames() {
        return Array.from(this.#models.keys());
    }

    // ==================== Current Selection Management ====================

    /**
     * Set the current/active model for a given type
     * @param {string} type - Selection type (e.g., "database", "table")
     * @param {*} model - The model to set as current
     * @returns {ModelLocator} this (for chaining)
     */
    setCurrent(type, model) {
        if (!type || typeof type !== 'string') {
            throw new TypeError('Selection type must be a non-empty string');
        }
        const previous = this.#currentSelections.get(type);
        this.#currentSelections.set(type, model);
        this.#dispatchEvent(ModelLocatorEvent.CURRENT_CHANGED, { type, model, previous });
        return this;
    }

    /**
     * Get the current/active model for a given type
     * @param {string} type
     * @returns {*|undefined}
     */
    getCurrent(type) {
        return this.#currentSelections.get(type);
    }

    /**
     * Clear the current selection for a type
     * @param {string} type
     * @returns {boolean} true if selection existed
     */
    clearCurrent(type) {
        const previous = this.#currentSelections.get(type);
        if (previous !== undefined) {
            this.#currentSelections.delete(type);
            this.#dispatchEvent(ModelLocatorEvent.CURRENT_CHANGED, { type, model: null, previous });
            return true;
        }
        return false;
    }

    // ==================== Event Handling ====================

    /**
     * Add an event listener
     * @param {string} eventType - Event type from ModelLocatorEvent
     * @param {Function} listener - Event handler
     */
    addEventListener(eventType, listener) {
        this.#eventTarget.addEventListener(eventType, listener);
    }

    /**
     * Remove an event listener
     * @param {string} eventType
     * @param {Function} listener
     */
    removeEventListener(eventType, listener) {
        this.#eventTarget.removeEventListener(eventType, listener);
    }

    /**
     * Dispatch an internal event
     * @private
     */
    #dispatchEvent(type, detail) {
        this.#eventTarget.dispatchEvent(new CustomEvent(type, { detail }));
    }

    // ==================== Utility Methods ====================

    /**
     * Clear all registrations (for testing or reset)
     */
    clear() {
        this.#collections.clear();
        this.#models.clear();
        this.#currentSelections.clear();
        this.#dispatchEvent(ModelLocatorEvent.CLEARED, {});
    }

    /**
     * Get a snapshot of all registrations for debugging
     * @returns {Object}
     */
    toJSON() {
        return {
            collections: Array.from(this.#collections.keys()),
            models: Array.from(this.#models.keys()),
            currentSelections: Array.from(this.#currentSelections.entries())
        };
    }
}

// Export singleton instance as default
export default ModelLocator.getInstance();

// Also export the class for testing
export { ModelLocator };
