import FormElement from '../../../FormElement.js';
import DropDownListEvent from '../../../../../events/form/list/DropDownListEvent.js';
import FormElementEvent from '../../../../../events/form/FormElementEvent.js';
import Template from '../../../../../util/Template.js';

export default class DropDownList extends FormElement {
    constructor() {
        super();

        // Store any existing option elements before creating the select
        const existingOptions = Array.from(this.querySelectorAll('option'));

        Template.activate("ui-DropDownList", this.shadowRoot);
        this.dropDownList = this.shadowRoot.querySelector("select");
        this.formElement = this.dropDownList;

        // Move existing options to the internal select element
        existingOptions.forEach(option => {
            this.dropDownList.appendChild(option);
        });
        
        // Add valid events
        this.addValidEvent(DropDownListEvent.CHANGE);
        this.addValidEvent(FormElementEvent.FOCUS);
        this.addValidEvent(FormElementEvent.BLUR);
        
        // Add documented event listeners
        this.dropDownList.addEventListener(DropDownListEvent.CHANGE, (e) => {
            this.fireEvent(DropDownListEvent.CHANGE, { 
                selectedIndex: this.selectedIndex,
                value: this.value,
                selectedOption: this.dropDownList.options[this.selectedIndex],
                originalEvent: e
            });
        });
        
        this.dropDownList.addEventListener(FormElementEvent.FOCUS, (e) => {
            this.fireEvent(FormElementEvent.FOCUS, { 
                selectedIndex: this.selectedIndex,
                value: this.value,
                originalEvent: e
            });
        });
        
        this.dropDownList.addEventListener(FormElementEvent.BLUR, (e) => {
            this.fireEvent(FormElementEvent.BLUR, { 
                selectedIndex: this.selectedIndex,
                value: this.value,
                originalEvent: e
            });
        });

    }

    connectedCallback() {
        super.connectedCallback?.();
        if (!this._dropDownListInit) {
            this._dropDownListInit = true;
            if (this.hasAttribute("disabled")) {
                this.disabled = true;
            }
        }
    }

    get disabled() {
        return this.dropDownList.disabled;
    }

    set disabled(val) {
        this.dropDownList.disabled = !!val;
        if (val) {
            if (!this.hasAttribute("disabled")) {
                this.setAttribute("disabled", "");
            }
        } else {
            this.removeAttribute("disabled");
        }
    }

    get selectedIndex() {
        return this.dropDownList.selectedIndex;
    }

    set selectedIndex(val) {
        this.dropDownList.selectedIndex = val;
    }

    get value() {
        return this.dropDownList.value;
    }

    set value(val) {
        this.dropDownList.value = val;
    }

    addOption(text, value = null) {
        const option = document.createElement("option");
        option.textContent = text;
        option.value = value !== null ? value : text;
        this.dropDownList.appendChild(option);
    }

    removeOption(index) {
        if (index >= 0 && index < this.dropDownList.options.length) {
            this.dropDownList.remove(index);
        }
    }

    clearOptions() {
        this.dropDownList.innerHTML = "";
    }

    attributeChangedCallback(name, oldValue, newValue) {
        super.attributeChangedCallback?.(name, oldValue, newValue);
        if (name === 'disabled') {
            // Boolean attribute: presence means true, absence means false
            this.dropDownList.disabled = newValue !== null;
        }
    }
}