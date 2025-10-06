import FormElement from './FormElement.js';
import CheckBoxEvent from '../../events/form/CheckBoxEvent.js';
import MouseEvent from '../../events/MouseEvent.js';

export default class Checkbox extends FormElement {
    constructor() {
        super();

        this.checkbox = document.createElement("input");
        this.checkbox.type = "checkbox";
        this.formElement = this.checkbox;
		this.appendChild(this.checkbox);
        
        this.addValidEvent(CheckBoxEvent.CHANGE);
        this.addValidEvent(MouseEvent.CLICK);

        // Add documented event listeners
        this.checkbox.addEventListener(CheckBoxEvent.CHANGE, (e) => {
            this.fireEvent(CheckBoxEvent.CHANGE, { 
                checked: this.checkbox.checked,
                value: this.checkbox.value 
            });
        });
        
        this.checkbox.addEventListener(MouseEvent.CLICK, (e) => {
            this.fireEvent(MouseEvent.CLICK, { 
                checked: this.checkbox.checked,
                value: this.checkbox.value 
            });
        });
    }
}
