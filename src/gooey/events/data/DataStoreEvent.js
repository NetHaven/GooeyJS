import Event from "../Event.js";

/**
 * Event constants for DataStore component
 */
export default class DataStoreEvent extends Event {
    // Data change events
    static DATA_CHANGED = "data-changed";
    static RECORD_ADDED = "record-added";
    static RECORD_REMOVED = "record-removed";
    static RECORD_UPDATED = "record-updated";
    static RESET = "reset";

    constructor() {
        super();
    }
}
