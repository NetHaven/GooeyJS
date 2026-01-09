import UIComponent from '../UIComponent.js';

export default class FormElement extends UIComponent {
    constructor() {
        super();
        this._requiredIndicator = null;
        this._errorElement = null;
        this._updateRequiredIndicator();
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
            if (this.formElement) {
                this.formElement.setAttribute('aria-required', 'true');
            }
        } else {
            this.removeAttribute('required');
            if (this.formElement) {
                this.formElement.removeAttribute('aria-required');
            }
        }
    }

    // =========== Validation State Properties ===========

    /**
     * Get the invalid state of the form element
     * @returns {boolean}
     */
    get invalid() {
        return this.formElement ? this.formElement.hasAttribute('aria-invalid') : false;
    }

    /**
     * Set the invalid state of the form element
     * @param {boolean} val
     */
    set invalid(val) {
        if (this.formElement) {
            if (val) {
                this.formElement.setAttribute('aria-invalid', 'true');
            } else {
                this.formElement.removeAttribute('aria-invalid');
            }
        }
    }

    /**
     * Set an error message and mark the field as invalid
     * Creates an accessible error element linked via aria-describedby
     * @param {string|null} message - The error message, or null to clear
     */
    setErrorMessage(message) {
        if (message && !this._errorElement) {
            this._errorElement = document.createElement('span');
            this._errorElement.id = `${this.id || 'field'}-error-${Date.now()}`;
            this._errorElement.className = 'form-error-message';
            this._errorElement.setAttribute('role', 'alert');
            this._errorElement.style.color = 'red';
            this._errorElement.style.fontSize = '0.875em';
            this.appendChild(this._errorElement);
        }

        if (this._errorElement) {
            this._errorElement.textContent = message || '';
            this._errorElement.style.display = message ? 'block' : 'none';

            if (this.formElement) {
                if (message) {
                    this.formElement.setAttribute('aria-describedby', this._errorElement.id);
                } else {
                    this.formElement.removeAttribute('aria-describedby');
                }
            }
        }

        this.invalid = !!message;
    }

    /**
     * Clear the error message and invalid state
     */
    clearError() {
        this.setErrorMessage(null);
    }

    focus() {
        if (this.formElement) {
            this.formElement.focus();
        }
    }

    _updateRequiredIndicator() {
        // Find the parent FormPanel
        const formPanel = this.closest('gooeyui-formpanel');

        if (this.required) {
            if (!this._requiredIndicator) {
                this._requiredIndicator = document.createElement('span');
                this._requiredIndicator.className = 'required-indicator';
                this._requiredIndicator.textContent = '*';
                this._requiredIndicator.style.color = 'red';
                this._requiredIndicator.style.fontWeight = 'bold';
                // Hide from screen readers - aria-required handles accessibility
                this._requiredIndicator.setAttribute('aria-hidden', 'true');

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

            // Ensure aria-required is set on the form element
            if (this.formElement) {
                this.formElement.setAttribute('aria-required', 'true');
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

            // Remove aria-required from the form element
            if (this.formElement) {
                this.formElement.removeAttribute('aria-required');
            }
        }
    }
}