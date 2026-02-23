import UIComponent from '../../../UIComponent.js';
import RadioButtonGroupEvent from '../../../../events/form/RadioButtonGroupEvent.js';
import Template from '../../../../util/Template.js';

export default class RadioButtonGroup extends UIComponent {
    constructor() {
        super();

        Template.activate("ui-RadioButtonGroup", this.shadowRoot);

        // Generate unique group name for mutual exclusivity
        this._groupName = `radio-group-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

        // MutationObserver for dynamically added radio buttons
        this._observer = null;

        // ARIA: Set up label if provided
        this._setupAriaLabel();

        // Set up mutation observer to watch for radio button changes
        this._setupSelectionHandling();
    }

    connectedCallback() {
        // ARIA: Set radiogroup role (must be done here, not in constructor per Custom Elements spec)
        if (!this.hasAttribute('role')) {
            this.setAttribute('role', 'radiogroup');
        }

        super.connectedCallback?.();

        // Wait for RadioButton custom element to be defined before assigning group names.
        // Child gooeyui-radiobutton elements may not be upgraded yet during dynamic loading,
        // so their shadowRoot would be null and we can't reach the internal <input>.
        customElements.whenDefined('gooeyui-radiobutton').then(() => {
            this._assignGroupName();
        });

        // Watch for dynamically added radio buttons
        this._observeRadioButtons();
    }

    disconnectedCallback() {
        // Clean up observer to prevent memory leaks
        if (this._observer) {
            this._observer.disconnect();
            this._observer = null;
        }
    }

    /**
     * Set up ARIA label for the radiogroup
     */
    _setupAriaLabel() {
        if (this.hasAttribute('label')) {
            const label = this.getAttribute('label');
            const legendId = `radiogroup-legend-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

            // Create a visually hidden legend element in the shadow root
            const legend = document.createElement('span');
            legend.id = legendId;
            legend.className = 'sr-only';
            legend.textContent = label;
            // Screen-reader-only styles
            legend.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;';
            this.shadowRoot.prepend(legend);

            this.setAttribute('aria-labelledby', legendId);
        }
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'label') {
            // Update aria-label if label attribute changes
            if (newValue) {
                this.setAttribute('aria-label', newValue);
            } else {
                this.removeAttribute('aria-label');
            }
        }
    }
    
    _setupSelectionHandling() {
        // Register the selection change event for Observable
        this.addValidEvent(RadioButtonGroupEvent.SELECTION_CHANGE);

        // Listen for native DOM 'change' events bubbling up from child radio inputs
        // Use HTMLElement.prototype.addEventListener to bypass Observable
        HTMLElement.prototype.addEventListener.call(this, 'change', (e) => {
            if (e.target && e.target.type === 'radio') {
                // Fire via Observable's event system
                this.fireEvent(RadioButtonGroupEvent.SELECTION_CHANGE, {
                    selectedValue: e.target.value,
                    selectedElement: e.target,
                    originalEvent: e
                });
            }
        });
    }

    _assignGroupName() {
        // Find all gooeyui-radiobutton elements and assign the group name to their input elements
        const radioButtons = this.querySelectorAll('gooeyui-radiobutton');
        radioButtons.forEach(radioButton => {
            // Input lives in shadow DOM, not light DOM
            const input = radioButton.shadowRoot?.querySelector('input[type="radio"]');
            if (input) {
                input.name = this._groupName;
            }
        });
    }

    _observeRadioButtons() {
        // Use MutationObserver to watch for dynamically added radio buttons
        this._observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.matches && node.matches('gooeyui-radiobutton')) {
                        this._assignNameToRadioButton(node);
                    }
                });
            });
        });

        this._observer.observe(this, {
            childList: true,
            subtree: true
        });
    }

    _assignNameToRadioButton(radioButton) {
        const input = radioButton.shadowRoot?.querySelector('input[type="radio"]');
        if (input) {
            input.name = this._groupName;
        } else {
            // Element may not be upgraded yet — wait for it
            customElements.whenDefined('gooeyui-radiobutton').then(() => {
                const input = radioButton.shadowRoot?.querySelector('input[type="radio"]');
                if (input) {
                    input.name = this._groupName;
                }
            });
        }
    }
}
