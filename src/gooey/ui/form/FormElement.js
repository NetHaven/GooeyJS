import UIComponent from '../UIComponent.js';

export default class FormElement extends UIComponent {
    constructor() {
        super();
        this._requiredIndicator = null;
        this._updateRequiredIndicator();
    }

    static get observedAttributes() {
        return [...super.observedAttributes, 'required'];
    }

    attributeChangedCallback(name) {
        if (name === 'required') {
            this._updateRequiredIndicator();
        }
    }

    get required() {
        return this.hasAttribute('required');
    }

    set required(val) {
        if (val) {
            this.setAttribute('required', '');
        } else {
            this.removeAttribute('required');
        }
    }

    focus() {
        if (this.formElement) {
            this.formElement.focus();
        }
    }

    _updateRequiredIndicator() {
        // Find the parent FormPanel
        const formPanel = this.closest('ui-FormPanel');
        
        if (this.required) {
            if (!this._requiredIndicator) {
                this._requiredIndicator = document.createElement('span');
                this._requiredIndicator.className = 'required-indicator';
                this._requiredIndicator.textContent = '*';
                this._requiredIndicator.style.color = 'red';
                this._requiredIndicator.style.fontWeight = 'bold';
                
                if (formPanel) {
                    // Insert the indicator right after this form element in the FormPanel
                    const nextSibling = this.nextSibling;
                    if (nextSibling) {
                        formPanel.insertBefore(this._requiredIndicator, nextSibling);
                    } else {
                        formPanel.appendChild(this._requiredIndicator);
                    }
                } else {
                    // Fallback behavior if not in a FormPanel - append after existing content
                    this.appendChild(this._requiredIndicator);
                }
            }
        } else {
            if (this._requiredIndicator) {
                if (formPanel && formPanel.contains(this._requiredIndicator)) {
                    formPanel.removeChild(this._requiredIndicator);
                } else if (this.contains(this._requiredIndicator)) {
                    this.removeChild(this._requiredIndicator);
                }
                this._requiredIndicator = null;
            }
        }
    }
}