import FormElement from '../../FormElement.js';
import MouseEvent from '../../../../events/MouseEvent.js';
import RadioButtonEvent from '../../../../events/form/RadioButtonEvent.js';
import Template from '../../../../util/Template.js';

export default class RadioButton extends FormElement {
    constructor() {
        super();

        Template.activate("ui-RadioButton", this);
        
        this.radioButton = this.querySelector("input");
        this.formElement = this.radioButton;
		this.appendChild(this.radioButton);
        
        this.addValidEvent(MouseEvent.CLICK);
        this.addValidEvent(RadioButtonEvent.CHANGE);

        // Add documented event listeners
        this.radioButton.addEventListener(RadioButtonEvent.CHANGE, () => {
            this.fireEvent(RadioButtonEvent.CHANGE, { 
                checked: this.radioButton.checked,
                value: this.radioButton.value 
            });
        });
        
        this.radioButton.addEventListener(MouseEvent.CLICK, () => {
            this.fireEvent(MouseEvent.CLICK, { 
                checked: this.radioButton.checked,
                value: this.radioButton.value 
            });
        });
    }
}
