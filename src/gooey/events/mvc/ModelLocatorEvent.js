/**
 * Event constants for ModelLocator operations.
 * Use with ModelLocator.addEventListener().
 */
export default class ModelLocatorEvent {
    /** Fired when a model is registered */
    static MODEL_REGISTERED = "model:registered";

    /** Fired when a model is unregistered */
    static MODEL_UNREGISTERED = "model:unregistered";

    /** Fired when a collection is registered */
    static COLLECTION_REGISTERED = "collection:registered";

    /** Fired when a collection is unregistered */
    static COLLECTION_UNREGISTERED = "collection:unregistered";

    /** Fired when current selection changes */
    static CURRENT_CHANGED = "current:changed";

    /** Fired when registry is cleared */
    static CLEARED = "registry:cleared";

    /**
     * Get all valid event names
     * @returns {string[]}
     */
    static getValidEvents() {
        return [
            this.MODEL_REGISTERED,
            this.MODEL_UNREGISTERED,
            this.COLLECTION_REGISTERED,
            this.COLLECTION_UNREGISTERED,
            this.CURRENT_CHANGED,
            this.CLEARED
        ];
    }
}
