import FormElement from './FormElement.js';
import CheckboxEvent from '../../events/form/CheckboxEvent.js';
import MouseEvent from '../../events/MouseEvent.js';
import Template from '../../util/Template.js';

export default class Checkbox extends FormElement {
    constructor() {
        super();

        Template.activate("ui-Checkbox", this);

        this.checkbox = this.querySelector("input");
        this.formElement = this.checkbox;
		this.appendChild(this.checkbox);
        
        this.addValidEvent(CheckboxEvent.CHANGE);
        this.addValidEvent(MouseEvent.CLICK);

        // Add documented event listeners
        this.checkbox.addEventListener(CheckboxEvent.CHANGE, () => {
            this.fireEvent(CheckboxEvent.CHANGE, { 
                checked: this.checkbox.checked,
                value: this.checkbox.value 
            });
        });
        
        this.checkbox.addEventListener(MouseEvent.CLICK, () => {
            this.fireEvent(MouseEvent.CLICK, { 
                checked: this.checkbox.checked,
                value: this.checkbox.value 
            });
        });
    }
}
