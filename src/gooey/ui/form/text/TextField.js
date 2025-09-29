import TextElement from './TextElement.js';
import TextElementEvent from '../../../events/form/text/TextElementEvent.js';
import TextFieldEvent from '../../../events/form/text/TextFieldEvent.js';
import FormElementEvent from '../../../events/form/FormElementEvent.js';

export default class TextField extends TextElement {
    constructor() {
        super();

        this.textElement = document.createElement("input");
        this.textElement.type = "text";
        this.formElement = this.textElement;
        this.appendChild(this.textElement);
        
        // Initialize attributes that might have been set before the textElement was created
        this._initializeAttributes();
        
        // Update required indicator after text element is added
        this._updateRequiredIndicator();
        
        // Add valid events
        this.addValidEvent(TextFieldEvent.ENTER_PRESSED);
        this.addValidEvent(TextElementEvent.INPUT);
        this.addValidEvent(TextElementEvent.CHANGE);
        this.addValidEvent(FormElementEvent.FOCUS);
        this.addValidEvent(FormElementEvent.BLUR);
        this.addValidEvent(TextElementEvent.INVALID);
        
        // Add keypress event listener for Enter key
        this.textElement.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                // Prevent the Enter key from doing its default action (like submitting forms)
                event.preventDefault();
                
                // Dispatch a custom 'enterPressed' event that bubbles up
                this.fireEvent(TextFieldEvent.ENTER_PRESSED, { 
                    textField: this,
                    originalEvent: event 
                });
            }
        });
        
        // Add documented event listeners
        this.textElement.addEventListener('input', (e) => {
            this.fireEvent(TextElementEvent.INPUT, { 
                value: this.textElement.value,
                originalEvent: e
            });
        });
        
        this.textElement.addEventListener('change', (e) => {
            this.fireEvent(TextElementEvent.CHANGE, { 
                value: this.textElement.value,
                originalEvent: e
            });
        });
        
        this.textElement.addEventListener('focus', (e) => {
            this.fireEvent(FormElementEvent.FOCUS, { 
                value: this.textElement.value,
                originalEvent: e
            });
        });
        
        this.textElement.addEventListener('blur', (e) => {
            this.fireEvent(FormElementEvent.BLUR, { 
                value: this.textElement.value,
                originalEvent: e
            });
        });
        
        this.textElement.addEventListener('invalid', (e) => {
            this.fireEvent(TextElementEvent.INVALID, { 
                value: this.textElement.value,
                validationMessage: this.textElement.validationMessage,
                originalEvent: e
            });
        });
    }

    _initializeAttributes() {
        // Initialize attributes that might have been set in HTML
        if (this.hasAttribute('placeholder')) {
            this.textElement.setAttribute('placeholder', this.getAttribute('placeholder'));
        }

        if (this.hasAttribute('maxLength')) {
            this.textElement.setAttribute('maxLength', this.getAttribute('maxLength'));
        }

        if (this.hasAttribute('minLength')) {
            this.textElement.setAttribute('minLength', this.getAttribute('minLength'));
        }

        if (this.hasAttribute('readOnly')) {
            this.textElement.setAttribute('readOnly', this.getAttribute('readOnly'));
        }
        
        if (this.hasAttribute('type')) {
            this.textElement.setAttribute('type', this.getAttribute('type'));
        }
    }
}
