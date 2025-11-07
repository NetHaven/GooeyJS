import UIComponent from '../UIComponent.js';
import RadioButtonGroupEvent from '../../events/form/RadioButtonGroupEvent.js';
import Template from '../../util/Template.js';

export default class RadioButtonGroup extends UIComponent {
    static get observedAttributes() {
        return [...super.observedAttributes];
    }

    constructor() {
        super();
        
        Template.activate("ui-RadioButtonGroup", this);

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
}
