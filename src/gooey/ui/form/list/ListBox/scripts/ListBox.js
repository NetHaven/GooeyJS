import FormElement from '../../../FormElement.js';
import ListBoxEvent from '../../../../../events/form/list/ListBoxEvent.js';
import FormElementEvent from '../../../../../events/form/FormElementEvent.js';
import Template from '../../../../../util/Template.js';

export default class ListBox extends FormElement {
    constructor() {
        super();

        // Store any existing option elements before creating the select
        const existingOptions = Array.from(this.querySelectorAll('option'));

        Template.activate("ui-ListBox", this);
        this.listBox = this.shadowRoot.querySelector("select");
        this.formElement = this.listBox;

        // Move existing options to the internal select element
        existingOptions.forEach(option => {
            this.listBox.appendChild(option);
        });
        
        // Add valid events
        this.addValidEvent(ListBoxEvent.CHANGE);
        this.addValidEvent(ListBoxEvent.SELECTION_CHANGE);
        this.addValidEvent(FormElementEvent.FOCUS);
        this.addValidEvent(FormElementEvent.BLUR);
        
        // Add documented event listeners
        this.listBox.addEventListener(ListBoxEvent.CHANGE, (e) => {
            this.fireEvent(ListBoxEvent.CHANGE, { 
                selectedOptions: this.selectedOptions,
                selectedValues: this.selectedValues,
                originalEvent: e
            });
            
            // Also fire selectionchange event
            this.fireEvent(ListBoxEvent.SELECTION_CHANGE, { 
                selectedOptions: this.selectedOptions,
                selectedValues: this.selectedValues,
                selectedIndices: this.selectedIndices,
                originalEvent: e
            });
        });
        
        this.listBox.addEventListener(FormElementEvent.FOCUS, (e) => {
            this.fireEvent(FormElementEvent.FOCUS, { 
                selectedOptions: this.selectedOptions,
                originalEvent: e
            });
        });
        
        this.listBox.addEventListener(FormElementEvent.BLUR, (e) => {
            this.fireEvent(FormElementEvent.BLUR, { 
                selectedOptions: this.selectedOptions,
                originalEvent: e
            });
        });

        if (this.hasAttribute("disabled")) {
            this.disabled = this.getAttribute("disabled") === "true";
        }

        if (this.hasAttribute("size")) {
            this.size = parseInt(this.getAttribute("size"));
        }
    }

    get disabled() {
        return this.listBox.disabled;
    }

    get options() {
        return this.listBox.options;
    }

    get selectedIndex() {
        return this.listBox.selectedIndex;
    }

    get selectedIndices() {
        const indices = [];
        for (let i = 0; i < this.listBox.options.length; i++) {
            if (this.listBox.options[i].selected) {
                indices.push(i);
            }
        }
        return indices;
    }

    get selectedOptions() {
        return Array.from(this.listBox.selectedOptions);
    }

    get selectedValues() {
        return Array.from(this.listBox.selectedOptions).map(option => option.value);
    }

    get size() {
        return parseInt(this.listBox.getAttribute("size")) || 4;
    }

    get value() {
        return this.listBox.value;
    }

    set disabled(val) {
        this.listBox.disabled = val;
        if (val) {
            this.setAttribute("disabled", "true");
        } else {
            this.removeAttribute("disabled");
        }
    }

    set selectedIndex(val) {
        this.listBox.selectedIndex = val;
    }

    set size(val) {
        this.listBox.size = val;
        this.setAttribute("size", val.toString());
    }

    set value(val) {
        this.listBox.value = val;
    }

    addOption(text, value = null, selected = false) {
        const option = document.createElement("option");
        option.textContent = text;
        option.value = value !== null ? value : text;
        option.selected = selected;
        this.listBox.appendChild(option);
    }

    removeOption(index) {
        if (index >= 0 && index < this.listBox.options.length) {
            this.listBox.remove(index);
        }
    }

    clearOptions() {
        this.listBox.innerHTML = "";
    }

    clearSelection() {
        for (let i = 0; i < this.listBox.options.length; i++) {
            this.listBox.options[i].selected = false;
        }
    }

    selectOption(index) {
        if (index >= 0 && index < this.listBox.options.length) {
            this.listBox.options[index].selected = true;
        }
    }

    deselectOption(index) {
        if (index >= 0 && index < this.listBox.options.length) {
            this.listBox.options[index].selected = false;
        }
    }

    selectAll() {
        for (let i = 0; i < this.listBox.options.length; i++) {
            this.listBox.options[i].selected = true;
        }
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'disabled') {
            this.disabled = newValue === "true";
        } else if (name === 'size') {
            this.size = parseInt(newValue) || 4;
        }
    }
}