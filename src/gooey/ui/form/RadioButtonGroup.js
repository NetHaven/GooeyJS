import Component from '../Component.js';
import RadioButtonGroupEvent from '../../events/form/RadioButtonGroupEvent.js';

export default class RadioButtonGroup extends Component {
    constructor() {
        super();
        
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
