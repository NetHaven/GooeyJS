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
