import KeyboardEvent from '../../../events/KeyboardEvent.js';
import TextElement from './TextElement.js';
import PasswordFieldEvent from '../../../events/form/text/PasswordFieldEvent.js';
import FormElementEvent from '../../../events/form/FormElementEvent.js';
import Template from '../../../util/Template.js';

export default class PasswordField extends TextElement {
    static get observedAttributes() {
        return [...super.observedAttributes, 'size'];
    }

    constructor() {
        super();

        Template.activate("ui-PasswordField", this);
        this.textElement = this.querySelector("input");
        this.formElement = this.textElement;
        this.appendChild(this.textElement);
        
        // Add valid events
        this.addValidEvent(PasswordFieldEvent.ENTER_PRESSED);
        this.addValidEvent(PasswordFieldEvent.INPUT);
        this.addValidEvent(PasswordFieldEvent.CHANGE);
        this.addValidEvent(FormElementEvent.FOCUS);
        this.addValidEvent(FormElementEvent.BLUR);
        this.addValidEvent(PasswordFieldEvent.INVALID);
        
        // Add keypress event listener for Enter key
        this.textElement.addEventListener(KeyboardEvent.KEY_PRESS, (event) => {
            if (event.key === 'Enter') {
                // Prevent the Enter key from doing its default action (like submitting forms)
                event.preventDefault();
                
                // Use fireEvent like TextField does for consistency
                this.fireEvent(PasswordFieldEvent.ENTER_PRESSED, { 
                    passwordField: this,
                    originalEvent: event 
                });
            }
        });
        
        // Add documented event listeners for common text element events
        this.textElement.addEventListener(PasswordFieldEvent.INPUT, (e) => {
            this.fireEvent(PasswordFieldEvent.INPUT, { 
                value: this.textElement.value,
                originalEvent: e
            });
        });
        
        this.textElement.addEventListener(PasswordFieldEvent.CHANGE, (e) => {
            this.fireEvent(PasswordFieldEvent.CHANGE, { 
                value: this.textElement.value,
                originalEvent: e
            });
        });
        
        this.textElement.addEventListener(PasswordFieldEvent.FOCUS, (e) => {
            this.fireEvent(FormElementEvent.FOCUS, { 
                value: this.textElement.value,
                originalEvent: e
            });
        });
        
        this.textElement.addEventListener(PasswordFieldEvent.BLUR, (e) => {
            this.fireEvent(FormElementEvent.BLUR, { 
                value: this.textElement.value,
                originalEvent: e
            });
        });
        
        this.textElement.addEventListener(PasswordFieldEvent.INVALID, (e) => {
            this.fireEvent(PasswordFieldEvent.INVALID, { 
                value: this.textElement.value,
                validationMessage: this.textElement.validationMessage,
                originalEvent: e
            });
        });

        if (this.hasAttribute("size")) {
            this.size = this.getAttribute("size");
        }
    }

    get size() {
        return this.getAttribute("size");
    }

    set size(val) {
        this.setAttribute("size", val);
        this.textElement.setAttribute("size", val);
    }
}