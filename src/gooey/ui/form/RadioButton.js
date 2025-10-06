import FormElement from './FormElement.js';
import MouseEvent from '../../events/MouseEvent.js';
import RadioButtonEvent from '../../events/form/RadioButtonEvent.js';

export default class RadioButton extends FormElement {
    constructor() {
        super();

        this.radioButton = document.createElement("input");
        this.radioButton.type = "radio";
        this.formElement = this.radioButton;
		this.appendChild(this.radioButton);
        
        this.addValidEvent(MouseEvent.CLICK);
        this.addValidEvent(RadioButtonEvent.CHANGE);

        // Add documented event listeners
        this.radioButton.addEventListener(RadioButtonEvent.CHANGE, (e) => {
            this.fireEvent(RadioButtonEvent.CHANGE, { 
                checked: this.radioButton.checked,
                value: this.radioButton.value 
            });
        });
        
        this.radioButton.addEventListener(MouseEvent.CLICK, (e) => {
            this.fireEvent(MouseEvent.CLICK, { 
                checked: this.radioButton.checked,
                value: this.radioButton.value 
            });
        });
    }
}
