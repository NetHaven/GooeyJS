import FormElement from '../FormElement.js';
import KeyboardEvent from '../../../events/KeyboardEvent.js';
import MouseEvent from '../../../events/MouseEvent.js';

export default class TextElement extends FormElement {
    // Events that should be bridged from DOM to Observable.
    // Subclasses handle input/change/focus/blur/invalid with proper payloads.
    static BRIDGED_EVENTS = new Set([
        KeyboardEvent.KEY_DOWN,
        KeyboardEvent.KEY_PRESS,
        KeyboardEvent.KEY_UP,
        MouseEvent.CLICK
    ]);

    constructor() {
        super();
        this.formElement = null;
        this.textElement = null;

        // Track bridged native listeners: eventName -> bound handler function
        this._bridgedHandlers = new Map();

        this.addValidEvent(KeyboardEvent.KEY_DOWN);
        this.addValidEvent(KeyboardEvent.KEY_PRESS);
        this.addValidEvent(KeyboardEvent.KEY_UP);
        this.addValidEvent(MouseEvent.CLICK);
    }

    addEventListener(eventName, listener) {
        super.addEventListener(eventName, listener);

        // Only bridge keyboard/mouse events; subclasses handle form events with payloads
        // Attach native listener only once per event type
        if (TextElement.BRIDGED_EVENTS.has(eventName) && !this._bridgedHandlers.has(eventName)) {
            const handler = (e) => {
                if (!this.disabled) {
                    this.fireEvent(eventName, { originalEvent: e });
                }
            };
            this._bridgedHandlers.set(eventName, handler);
            this.textElement.addEventListener(eventName, handler);
        }
    }

    removeEventListener(eventName, listener) {
        super.removeEventListener(eventName, listener);

        // Clean up native listener if no Observable listeners remain for this event
        if (TextElement.BRIDGED_EVENTS.has(eventName)) {
            const listeners = this.eventListenerList[eventName];
            if (!listeners || listeners.length === 0) {
                this._removeBridgedHandler(eventName);
            }
        }
    }

    removeAllEventListeners(eventName) {
        super.removeAllEventListeners(eventName);

        if (!eventName) {
            // All events removed - clean up all bridged handlers
            for (const bridgedEvent of this._bridgedHandlers.keys()) {
                this._removeBridgedHandler(bridgedEvent);
            }
        } else if (TextElement.BRIDGED_EVENTS.has(eventName)) {
            this._removeBridgedHandler(eventName);
        }
    }

    /**
     * Remove a bridged native listener and clean up tracking
     * @param {string} eventName - Event name to unbind
     */
    _removeBridgedHandler(eventName) {
        const handler = this._bridgedHandlers.get(eventName);
        if (handler && this.textElement) {
            this.textElement.removeEventListener(eventName, handler);
            this._bridgedHandlers.delete(eventName);
        }
    }

    attributeChangedCallback(name, oldValue, newValue) {
        super.attributeChangedCallback?.(name, oldValue, newValue);

        if (this.textElement) {
            // HTML lowercases attribute names, so use lowercase in switch
            switch (name) {
                case 'placeholder':
                    if (newValue !== null) {
                        this.textElement.setAttribute('placeholder', newValue);
                    } else {
                        this.textElement.removeAttribute('placeholder');
                    }
                    break;
                case 'maxlength':
                    if (newValue !== null) {
                        this.textElement.maxLength = parseInt(newValue, 10);
                    } else {
                        this.textElement.removeAttribute('maxlength');
                    }
                    break;
                case 'minlength':
                    if (newValue !== null) {
                        this.textElement.minLength = parseInt(newValue, 10);
                    } else {
                        this.textElement.removeAttribute('minlength');
                    }
                    break;
                case 'readonly':
                    this.textElement.readOnly = newValue !== null;
                    break;
            }
        }
    }

    get maxLength() {
        return this.textElement.maxLength;
    }

    get minLength() {
        return this.textElement.minLength;
    }

    get placeholder() {
        return this.textElement.getAttribute("placeholder") || "";
    }

    get readOnly() {
        return this.hasAttribute("readonly");
    }

    set maxLength(val) {
        if (val) {
            this.setAttribute("maxlength", val);
            this.textElement.maxLength = parseInt(val, 10);
        }
    }

    set minLength(val) {
        if (val) {
            this.setAttribute("minlength", val);
            this.textElement.minLength = parseInt(val, 10);
        }
    }

    set placeholder(val) {
        if (val) {
            this.setAttribute("placeholder", val);
            this.textElement.setAttribute("placeholder", val);
        }
        else {
            this.removeAttribute("placeholder");
            this.textElement.removeAttribute("placeholder");
        }
    }

    set readOnly(val) {
        this.textElement.readOnly = !!val;
        if (val) {
            this.setAttribute("readonly", "");
        }
        else {
            this.removeAttribute("readonly");
        }
    }

    get value() {
        return this.textElement.value;
    }

    set value(val) {
        this.textElement.value = val;
    }

    focus() {
        if (this.textElement) {
            this.textElement.focus();
        } else {
            super.focus();
        }
    }

    select() {
        if (this.textElement && typeof this.textElement.select === 'function') {
            this.textElement.select();
        }
    }
}
