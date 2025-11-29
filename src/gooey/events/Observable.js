export default class Observable extends HTMLElement {
    static INVALID_EVENT_EXCEPTION = "InvalidEventError";

    constructor() {
        super();

        this._watchers = new Map();
        this._computed = new Map();

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

    // Computed properties
    computed(name, getter) {
        this._computed.set(name, {
        getter,
        cache: null,
        dirty: true
        });

        Object.defineProperty(this, name, {
        get: () => {
            const computed = this._computed.get(name);
            if (computed.dirty) {
            computed.cache = getter.call(this);
            computed.dirty = false;
            }
            return computed.cache;
        }
        });
    }

    fireEvent(eventName, configObj) {
        var err;

        if (!(this.hasEvent(eventName))) {
            err = new Error(`Invalid event '${eventName}'`);
            err.name = Observable.INVALID_EVENT_EXCEPTION;
            throw err;
        }
        
        if (this.eventSuspension) {
            return false;
        }
       
        // Also fire to internal listeners for backward compatibility
        if (this.eventListenerList[eventName]) {
            this.eventListenerList[eventName].forEach(function(listener) {
                listener(eventName, configObj);
            });
        }
        
        // Return true if event was not cancelled, false if it was
        return true;
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
        if (!this._validEvents.has(eventName)) {
        this.addValidEvent(eventName);
        }

        return () => this.unwatch(property, callback);
    }
}
