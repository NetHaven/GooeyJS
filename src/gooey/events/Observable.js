import ObservableBase from './ObservableBase.js';
import Logger from '../logging/Logger.js';

/**
 * Observable - Base class for custom elements with event support
 * Extends HTMLElement for use with custom element registration.
 * For non-DOM classes (Model, Timer, etc.), use ObservableBase instead.
 */
export default class Observable extends HTMLElement {
    static INVALID_EVENT_EXCEPTION = ObservableBase.INVALID_EVENT_EXCEPTION;

    constructor() {
        super();

        this._watchers = new Map();
        this._computed = new Map();
        this._props = new Map(); // Reactive property storage

        this.eventSuspension = false;
        this.eventListenerList = [];
        this.validEventList = [];
    }

    addEventListener(eventName, listener) {
        var err;

        if (!(this.hasEvent(eventName))) {
            err = new Error(`Invalid event '${eventName}'`);
            err.name = Observable.INVALID_EVENT_EXCEPTION;
            throw err;
        }
        
        if (!this.eventListenerList[eventName]) {
            this.eventListenerList[eventName] = [];
        }
        this.eventListenerList[eventName].push(listener);
    }

    addValidEvent(eventName) {
        this.validEventList.push(eventName);
    }

    /**
     * Define a computed property with optional dependencies
     * @param {string} name - Property name
     * @param {Function} getter - Function that computes the value
     * @param {string[]} [dependencies] - Property names this computed depends on
     */
    computed(name, getter, dependencies = []) {
        this._computed.set(name, {
            getter,
            cache: null,
            dirty: true,
            dependencies
        });

        Object.defineProperty(this, name, {
            get: () => {
                const computed = this._computed.get(name);
                if (computed.dirty) {
                    computed.cache = getter.call(this);
                    computed.dirty = false;
                }
                return computed.cache;
            },
            configurable: true
        });
    }

    /**
     * Set a reactive property value, triggering watchers and invalidating computed properties
     * @param {string} name - Property name
     * @param {*} value - New value
     * @returns {boolean} True if value changed, false if same
     */
    setProp(name, value) {
        const oldValue = this._props.get(name);

        // Skip if value hasn't changed (shallow comparison)
        if (oldValue === value) {
            return false;
        }

        this._props.set(name, value);

        // Invalidate computed properties that depend on this property
        this._invalidateDependentComputed(name);

        // Invoke watchers
        this._invokeWatchers(name, value, oldValue);

        // Fire change event if registered
        const eventName = `change:${name}`;
        if (this.hasEvent(eventName)) {
            this.fireEvent(eventName, {
                property: name,
                value,
                oldValue
            });
        }

        return true;
    }

    /**
     * Get a reactive property value
     * @param {string} name - Property name
     * @returns {*} The property value
     */
    getProp(name) {
        return this._props.get(name);
    }

    /**
     * Check if a reactive property exists
     * @param {string} name - Property name
     * @returns {boolean}
     */
    hasProp(name) {
        return this._props.has(name);
    }

    /**
     * Invalidate computed properties that depend on the given property
     * @param {string} changedProp - The property that changed
     */
    _invalidateDependentComputed(changedProp) {
        for (const [name, computed] of this._computed) {
            if (computed.dependencies.includes(changedProp)) {
                computed.dirty = true;
            }
        }
    }

    /**
     * Invalidate specific computed properties by name
     * @param {...string} names - Names of computed properties to invalidate
     */
    invalidateComputed(...names) {
        for (const name of names) {
            const computed = this._computed.get(name);
            if (computed) {
                computed.dirty = true;
            }
        }
    }

    /**
     * Invoke watchers for a property change
     * @param {string} property - Property name
     * @param {*} newValue - New value
     * @param {*} oldValue - Previous value
     */
    _invokeWatchers(property, newValue, oldValue) {
        if (!this._watchers.has(property)) {
            return;
        }

        const watchers = this._watchers.get(property);
        for (const watcher of watchers) {
            try {
                watcher.callback.call(this, newValue, oldValue, property);
            } catch (error) {
                Logger.error(error, { code: "OBSERVABLE_WATCHER_ERROR", property }, "Watcher error for property '%s'", property);
            }
        }
    }

    /**
     * Fire an event to all registered listeners
     * @param {string} eventName - The event name to fire
     * @param {Object} configObj - Event data/configuration
     * @param {Object} [options] - Event options
     * @param {boolean} [options.cancelable=false] - Whether the event can be cancelled by listeners
     * @returns {boolean} True if event was not cancelled (or not cancelable), false if cancelled
     */
    fireEvent(eventName, configObj, options = {}) {
        var err;

        if (!(this.hasEvent(eventName))) {
            err = new Error(`Invalid event '${eventName}'`);
            err.name = Observable.INVALID_EVENT_EXCEPTION;
            throw err;
        }

        if (this.eventSuspension) {
            return false;
        }

        // Track if event was cancelled (only matters if cancelable)
        let defaultPrevented = false;

        // Create event object for listeners
        const eventObject = {
            type: eventName,
            target: this,
            ...configObj,
            preventDefault: () => {
                if (options.cancelable) {
                    defaultPrevented = true;
                }
            },
            get defaultPrevented() {
                return defaultPrevented;
            }
        };

        // Fire to internal listeners
        if (this.eventListenerList[eventName]) {
            for (const listener of this.eventListenerList[eventName]) {
                listener(eventName, eventObject);
                // Stop processing if cancelled and cancelable
                if (options.cancelable && defaultPrevented) {
                    break;
                }
            }
        }

        // Return true if event was not cancelled, false if it was
        return !defaultPrevented;
    }

    getEventListener(eventName, index) {
        return (this.eventListenerList[eventName][index]);
    }

    getEventListenerCount(eventName) {
        return (this.eventListenerList[eventName].length);
    }

    getValidEvent(index) {
        return (this.validEventList[index]);
    }

    getValidEventCount() {
        return (this.validEventList.length);
    }

    hasEvent(eventName) {
        var found;

        found = false;

        this.validEventList.forEach(function(validEvent) {
            if (validEvent === eventName) {
                found = true;
            }		
        });
        
        return (found);
    }

    removeAllEventListeners(eventName) {
        if (!eventName) {
            /* Wipe them out - all of them */
            this.eventListenerList = [];
        }
        else if (this.eventListenerList[eventName]) {
            delete (this.eventListenerList[eventName]);
        }
    }

    removeEventListener(eventName, listener) {
        var err;

        if (!(this.hasEvent(eventName))) {
            err = new Error("Invalid event '" + eventName + "'");
            err.name = Observable.INVALID_EVENT_EXCEPTION;
            throw err;
        }

        if (!this.eventListenerList[eventName]) {
            return;
        }
            
        this.eventListenerList[eventName].forEach((eventListener, index) => {
            if (eventListener === listener) {
                this.eventListenerList[eventName].splice(index, 1);
            }		
        });		
    }

    resumeEvents() {
        this.eventSuspension = false;
    }

    suspendEvents() {
        this.eventSuspension = true;
    }

    // Add reactive property watching
    watch(property, callback, options = {}) {
        if (!this._watchers.has(property)) {
            this._watchers.set(property, []);
        }

        const watcher = { callback, ...options };
        this._watchers.get(property).push(watcher);

        // Register property change event if not already valid
        const eventName = `change:${property}`;
        if (!this.hasEvent(eventName)) {
            this.addValidEvent(eventName);
        }

        return () => this.unwatch(property, callback);
    }

    // Remove a property watcher
    unwatch(property, callback) {
        if (!this._watchers.has(property)) {
            return;
        }

        const watchers = this._watchers.get(property);
        const index = watchers.findIndex(w => w.callback === callback);
        if (index !== -1) {
            watchers.splice(index, 1);
        }

        // Clean up empty watcher arrays
        if (watchers.length === 0) {
            this._watchers.delete(property);
        }
    }
}
