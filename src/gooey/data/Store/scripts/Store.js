import GooeyElement from '../../../GooeyElement.js';
import Template from '../../../util/Template.js';
import MetaLoader from '../../../util/MetaLoader.js';
import ComponentRegistry from '../../../util/ComponentRegistry.js';
import DataStoreEvent from '../../../events/data/DataStoreEvent.js';

/**
 * Store Component
 *
 * A non-visual component that holds data records and provides a reactive data API.
 * Data can be defined declaratively using child gooeydata-data elements or
 * programmatically via the JavaScript API.
 *
 * @example
 * <gooeydata-store id="employeeStore">
 *     <gooeydata-data data-id="1" data-name="John Doe" data-age="30"></gooeydata-data>
 *     <gooeydata-data data-id="2" data-name="Jane Smith" data-age="28"></gooeydata-data>
 * </gooeydata-store>
 *
 * <script>
 *     const store = document.getElementById('employeeStore');
 *     store.addRecord({ id: 3, name: 'Bob Wilson', age: 35 });
 *     store.addEventListener('data-changed', (e) => console.log(e));
 * </script>
 */
export default class Store extends GooeyElement {
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
        Template.activate("data-Store", this.shadowRoot);

        // Internal data storage
        this._data = [];

        // Track registered consumers (e.g., DataGrids)
        this._consumers = new Set();

        // MutationObserver to watch for child changes
        this._observer = null;

        // Register valid events
        this._registerEvents();
    }

    /**
     * Register valid events for the Observable system
     */
    _registerEvents() {
        this.addValidEvent(DataStoreEvent.DATA_CHANGED);
        this.addValidEvent(DataStoreEvent.RECORD_ADDED);
        this.addValidEvent(DataStoreEvent.RECORD_REMOVED);
        this.addValidEvent(DataStoreEvent.RECORD_UPDATED);
        this.addValidEvent(DataStoreEvent.RESET);
    }

    // =========== Model Integration ===========

    /**
     * Get the model attribute
     * @returns {string|null} - The model id
     */
    get model() {
        return this.getAttribute('model');
    }

    /**
     * Set the model attribute
     * @param {string} val - The model id
     */
    set model(val) {
        if (val) {
            this.setAttribute('model', val);
        } else {
            this.removeAttribute('model');
        }
    }

    /**
     * Get the bound Model element
     * @returns {HTMLElement|null} - The Model element or null
     */
    getModelElement() {
        const modelId = this.model;
        if (!modelId) return null;
        return document.getElementById(modelId);
    }

    /**
     * Create a new record with Model defaults
     * @param {Object} [overrides={}] - Optional field overrides
     * @returns {Object} - New record with defaults applied
     */
    createRecord(overrides = {}) {
        const model = this.getModelElement();
        if (model && typeof model.getDefaultRecord === 'function') {
            return { ...model.getDefaultRecord(), ...overrides };
        }
        return { ...overrides };
    }

    // =========== Web Component Lifecycle ===========

    connectedCallback() {
        // Collect initial data from child gooeydata-data elements
        this._collectDataFromChildren();

        // Set up MutationObserver to watch for child changes
        this._setupObserver();
    }

    disconnectedCallback() {
        // Clean up observer
        if (this._observer) {
            this._observer.disconnect();
            this._observer = null;
        }

        // Notify consumers that the store is being removed
        this.fireEvent(DataStoreEvent.RESET, {
            data: [],
            reason: 'disconnected'
        });

        // Clear consumers
        this._consumers.clear();
    }

    // =========== Observer Setup ===========

    /**
     * Set up MutationObserver to watch for child element changes
     */
    _setupObserver() {
        this._observer = new MutationObserver((mutations) => {
            let needsUpdate = false;

            for (const mutation of mutations) {
                if (mutation.type === 'childList') {
                    // Children added or removed
                    needsUpdate = true;
                } else if (mutation.type === 'attributes' &&
                           mutation.target.tagName &&
                           mutation.target.tagName.toLowerCase() === 'gooeydata-data') {
                    // Attribute changed on a data element
                    needsUpdate = true;
                }
            }

            if (needsUpdate) {
                this._collectDataFromChildren();
                this._notifyDataChanged();
            }
        });

        // Observe child list changes and attribute changes on data elements
        this._observer.observe(this, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['data-*']
        });
    }

    /**
     * Collect data from child gooeydata-data elements
     */
    _collectDataFromChildren() {
        const dataElements = this.querySelectorAll('gooeydata-data');
        this._data = Array.from(dataElements).map(el => {
            // Use the element's toRecord method if available
            if (typeof el.toRecord === 'function') {
                return el.toRecord();
            }
            // Fallback: manually extract dataset
            return this._datasetToRecord(el.dataset);
        });
    }

    /**
     * Convert dataset to a record object with type coercion
     * @param {DOMStringMap} dataset - The element's dataset
     * @returns {Object} - Converted record object
     */
    _datasetToRecord(dataset) {
        const record = {};
        for (const key in dataset) {
            record[key] = this._coerceValue(dataset[key]);
        }
        return record;
    }

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

    /**
     * Notify that data has changed
     */
    _notifyDataChanged() {
        this.fireEvent(DataStoreEvent.DATA_CHANGED, {
            data: this.getData(),
            count: this._data.length
        });
    }

    /**
     * Create a deep clone of a record to prevent external mutation
     * @param {Object} record - The record to clone
     * @returns {Object} - A deep copy of the record
     */
    _cloneRecord(record) {
        if (record === null || record === undefined) {
            return record;
        }
        return JSON.parse(JSON.stringify(record));
    }

    // =========== Public API ===========

    /**
     * Get a deep copy of all data records
     * @returns {Array} - Array of cloned data records
     */
    getData() {
        return this._data.map(record => this._cloneRecord(record));
    }

    /**
     * Replace all data with new records
     * @param {Array} data - Array of data records
     */
    setData(data) {
        // Clone all records to prevent external mutation
        this._data = Array.isArray(data)
            ? data.map(record => this._cloneRecord(record))
            : [];
        this._notifyDataChanged();
    }

    /**
     * Add a record to the store
     * @param {Object} record - The record to add
     * @param {number} [index] - Optional index to insert at
     * @returns {number} - The index where the record was added
     */
    addRecord(record, index) {
        // Clone the record to prevent external mutation
        const clonedRecord = this._cloneRecord(record);
        let insertIndex;

        if (typeof index === 'number' && index >= 0 && index <= this._data.length) {
            this._data.splice(index, 0, clonedRecord);
            insertIndex = index;
        } else {
            this._data.push(clonedRecord);
            insertIndex = this._data.length - 1;
        }

        this.fireEvent(DataStoreEvent.RECORD_ADDED, {
            record: this._cloneRecord(clonedRecord),
            index: insertIndex,
            data: this.getData(),
            count: this._data.length
        });

        this._notifyDataChanged();

        return insertIndex;
    }

    /**
     * Remove a record from the store
     * @param {number|Function} indexOrPredicate - Index or predicate function
     * @returns {Object|null} - A clone of the removed record or null if not found
     */
    removeRecord(indexOrPredicate) {
        let index;
        let removedRecord = null;

        if (typeof indexOrPredicate === 'function') {
            // Find by predicate
            index = this._data.findIndex(indexOrPredicate);
        } else {
            // Remove by index
            index = indexOrPredicate;
        }

        if (index >= 0 && index < this._data.length) {
            removedRecord = this._data.splice(index, 1)[0];

            this.fireEvent(DataStoreEvent.RECORD_REMOVED, {
                record: this._cloneRecord(removedRecord),
                index: index,
                data: this.getData(),
                count: this._data.length
            });

            this._notifyDataChanged();
        }

        return this._cloneRecord(removedRecord);
    }

    /**
     * Update a record in the store
     * @param {number} index - The index of the record to update
     * @param {Object} updates - Object with properties to update
     * @returns {Object|null} - A clone of the updated record or null if not found
     */
    updateRecord(index, updates) {
        if (index < 0 || index >= this._data.length) {
            return null;
        }

        const oldRecord = this._cloneRecord(this._data[index]);
        this._data[index] = { ...this._data[index], ...this._cloneRecord(updates) };

        this.fireEvent(DataStoreEvent.RECORD_UPDATED, {
            record: this._cloneRecord(this._data[index]),
            oldRecord: oldRecord,
            updates: this._cloneRecord(updates),
            index: index,
            data: this.getData(),
            count: this._data.length
        });

        this._notifyDataChanged();

        return this._cloneRecord(this._data[index]);
    }

    /**
     * Get the number of records in the store
     * @returns {number} - Record count
     */
    getRecordCount() {
        return this._data.length;
    }

    /**
     * Find a record by predicate
     * @param {Function} predicate - Function to test each record
     * @returns {Object|undefined} - A clone of the found record or undefined
     */
    findRecord(predicate) {
        const record = this._data.find(predicate);
        return record ? this._cloneRecord(record) : undefined;
    }

    /**
     * Find the index of a record by predicate
     * @param {Function} predicate - Function to test each record
     * @returns {number} - Index of found record or -1
     */
    findRecordIndex(predicate) {
        return this._data.findIndex(predicate);
    }

    /**
     * Filter records by predicate
     * @param {Function} predicate - Function to test each record
     * @returns {Array} - Array of cloned matching records
     */
    filterRecords(predicate) {
        return this._data.filter(predicate).map(record => this._cloneRecord(record));
    }

    /**
     * Clear all data from the store
     */
    reset() {
        this._data = [];

        this.fireEvent(DataStoreEvent.RESET, {
            data: [],
            count: 0,
            reason: 'reset'
        });

        this._notifyDataChanged();
    }

    // =========== Consumer Management ===========

    /**
     * Register a consumer (e.g., DataGrid) to receive updates
     * @param {Object} consumer - The consumer object
     */
    registerConsumer(consumer) {
        this._consumers.add(consumer);
    }

    /**
     * Unregister a consumer
     * @param {Object} consumer - The consumer object
     */
    unregisterConsumer(consumer) {
        this._consumers.delete(consumer);
    }

    /**
     * Get the set of registered consumers
     * @returns {Set} - Set of consumers
     */
    getConsumers() {
        return new Set(this._consumers);
    }
}
