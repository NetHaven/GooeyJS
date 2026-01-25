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

        this.addValidEvent(KeyboardEvent.KEY_DOWN);
        this.addValidEvent(KeyboardEvent.KEY_PRESS);
        this.addValidEvent(KeyboardEvent.KEY_UP);
        this.addValidEvent(MouseEvent.CLICK);
    }

    addEventListener(eventName, listener){
        super.addEventListener(eventName, listener);
        // Only bridge keyboard/mouse events; subclasses handle form events with payloads
        if (TextElement.BRIDGED_EVENTS.has(eventName)) {
            this.textElement.addEventListener(eventName, (e) => {
                if (!this.disabled) {
                    this.fireEvent(eventName, { originalEvent: e });
                }
            });
        }
    }

    attributeChangedCallback(name, oldValue, newValue) {
        super.attributeChangedCallback?.(name, oldValue, newValue);
        
        if (this.textElement) {
            switch (name) {
                case 'placeholder':
                    if (newValue !== null) {
                        this.textElement.setAttribute('placeholder', newValue);
                    } else {
                        this.textElement.removeAttribute('placeholder');
                    }
                    break;
                case 'maxLength':
                    if (newValue !== null) {
                        this.textElement.setAttribute('maxLength', newValue);
                    } else {
                        this.textElement.removeAttribute('maxLength');
                    }
                    break;
                case 'minLength':
                    if (newValue !== null) {
                        this.textElement.setAttribute('minLength', newValue);
                    } else {
                        this.textElement.removeAttribute('minLength');
                    }
                    break;
                case 'readOnly':
                    this.textElement.readOnly = newValue !== null;
                    break;
            }
        }
    }

    get maxLength() {
        return parseInt(this.textElement.getAttribute("maxLength"));
    }

    get minLength() {
        return parseInt(this.textElement.getAttribute("minLength"));
    }

    get placeholder() {
        return this.textElement.getAttribute("placeholder") || "";
    }

    get readOnly() {
        return this.hasAttribute("readOnly");
    }

    set maxLength(val) {
        if (val) {
            this.setAttribute("maxLength", val);
            this.textElement.setAttribute("maxLength", val);
        }
    }

    set minLength(val) {
        if (val) {
            this.setAttribute("minLength", val);
            this.textElement.setAttribute("minLength", val);
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
            this.setAttribute("readOnly", "");
        }
        else {
            this.removeAttribute("readOnly");
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
