import MouseEvent from "./MouseEvent.js";

export default class Observable extends HTMLElement {
    static INVALID_EVENT_EXCEPTION = "InvalidEventError";

    constructor() {
        super();
        this.eventSuspension = false;
        this.eventListenerList = [];
        this.validEventList = [];

        this.addValidEvent(MouseEvent.CLICK);
        this.addValidEvent(MouseEvent.MOUSE_DOWN);
        this.addValidEvent(MouseEvent.MOUSE_OUT);
        this.addValidEvent(MouseEvent.MOUSE_OVER);
        this.addValidEvent(MouseEvent.MOUSE_UP);

        /* Translate Native Mouse Events */
        super.addEventListener(MouseEvent.CLICK, ()=> {
            this.fireEvent(MouseEvent.CLICK);
        });

        super.addEventListener(MouseEvent.MOUSE_DOWN, ()=> {
            this.fireEvent(MouseEvent.MOUSE_DOWN);
        });

        super.addEventListener(MouseEvent.MOUSE_UP, ()=> {
            this.fireEvent(MouseEvent.MOUSE_UP);
        });

        super.addEventListener(MouseEvent.MOUSE_OUT, ()=> {
            this.fireEvent(MouseEvent.MOUSE_OUT);
        });

        super.addEventListener(MouseEvent.MOUSE_OVER, ()=> {
            this.fireEvent(MouseEvent.MOUSE_OVER);
        });
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
        
        // Create DOM CustomEvent with enhanced features
        const customEvent = new CustomEvent(eventName, {
            detail: configObj || {},
            bubbles: options.bubbles !== false, // Default to true
            cancelable: options.cancelable !== false // Default to true
        });
        
        // Dispatch the DOM event on this component
  //      const result = this.dispatchEvent(customEvent);
        
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
}
