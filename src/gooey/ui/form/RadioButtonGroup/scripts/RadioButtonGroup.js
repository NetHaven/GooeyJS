import UIComponent from '../../../UIComponent.js';
import RadioButtonGroupEvent from '../../../../events/form/RadioButtonGroupEvent.js';
import Template from '../../../../util/Template.js';

export default class RadioButtonGroup extends UIComponent {
    constructor() {
        super();

        Template.activate("ui-RadioButtonGroup", this);

        // Generate unique group name for mutual exclusivity
        this._groupName = `radio-group-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

        // Assign group name to existing radio buttons
        this._assignGroupName();

        // Watch for dynamically added radio buttons
        this._observeRadioButtons();

        // Set up mutation observer to watch for radio button changes
        this._setupSelectionHandling();
    }
    
    _setupSelectionHandling() {
        // Listen for changes to radio buttons within this group
        this.addEventListener('change', (e) => {
            if (e.target.type === 'radio') {
                const selectionChangeEvent = new CustomEvent(RadioButtonGroupEvent.SELECTION_CHANGE, {
                    detail: {
                        selectedValue: e.target.value,
                        selectedElement: e.target
                    },
                    bubbles: true
                });
                this.dispatchEvent(selectionChangeEvent);
            }
        });
    }

    _assignGroupName() {
        // Find all ui-radiobutton elements and assign the group name to their input elements
        const radioButtons = this.querySelectorAll('ui-radiobutton');
        radioButtons.forEach(radioButton => {
            const input = radioButton.querySelector('input[type="radio"]');
            if (input) {
                input.name = this._groupName;
            }
        });
    }

    _observeRadioButtons() {
        // Use MutationObserver to watch for dynamically added radio buttons
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.tagName === 'UI-RADIOBUTTON') {
                        const input = node.querySelector('input[type="radio"]');
                        if (input) {
                            input.name = this._groupName;
                        }
                    }
                });
            });
        });

        observer.observe(this, {
            childList: true,
            subtree: true
        });
    }
}
