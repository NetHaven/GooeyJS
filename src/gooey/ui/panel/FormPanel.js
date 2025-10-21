import Panel from './Panel.js';
import Layout from '../Layout.js';
import FormPanelEvent from '../../events/panel/FormPanelEvent.js';
import Template from '../../util/Template.js';

export default class FormPanel extends Panel {
    constructor () {
        super();

        Template.activate("ui-FormPanel", this);

        this.classList.add("ui-FormPanel");

        // Override the default layout to ensure CSS grid works
        this.layout = Layout.GRID;
        this.setAttribute("layout", Layout.GRID);
        
        // Set the grid columns explicitly to match the CSS
        this.style.display = 'grid';
        this.style.gridTemplateColumns = '30% 65% 5%';
        
        // Add valid events
        this.addValidEvent(FormPanelEvent.INVALID);
        this.addValidEvent(FormPanelEvent.SUBMIT);
    }

    connectedCallback() {
        // Ensure all form elements have a corresponding empty span in the third column
        // for non-required fields to maintain proper grid layout
        this._ensureThirdColumnElements();
    }

    _ensureThirdColumnElements() {
        const formElements = this.querySelectorAll('ui-textfield, ui-textarea, ui-dropdown, ui-dropdownlist, ui-listbox, ui-combobox, ui-checkbox, ui-radiobutton, ui-radiobuttongroup');
        
        formElements.forEach(element => {
            // Check if this element already has a corresponding indicator or empty span
            const nextSibling = element.nextElementSibling;
            const isNextSiblingIndicator = nextSibling && (
                nextSibling.classList.contains('required-indicator') || 
                nextSibling.classList.contains('form-spacer')
            );
            
            if (!isNextSiblingIndicator) {
                // Create an empty span for non-required fields or fields without indicators
                const spacer = document.createElement('span');
                spacer.className = 'form-spacer';
                spacer.innerHTML = '&nbsp;'; // Non-breaking space to maintain layout
                
                // Insert after the form element
                if (element.nextSibling) {
                    this.insertBefore(spacer, element.nextSibling);
                } else {
                    this.appendChild(spacer);
                }
            }
        });
    }

    validate() {
        // Get all form element components within this panel
        const formElements = this.querySelectorAll('ui-textfield, ui-textarea, ui-dropdown, ui-dropdownlist, ui-listbox, ui-combobox, ui-checkbox, ui-radiobutton, ui-radiobuttongroup');
        const invalidElements = [];
        
        for (const element of formElements) {
            // Check if the element has a required attribute
            if (element.hasAttribute('required')) {
                // Get the value based on element type
                let value = '';
                let isValid = true;
                
                if (element.tagName.toLowerCase() === 'ui-checkbox' || element.tagName.toLowerCase() === 'ui-radiobutton') {
                    // For checkboxes and radio buttons, check if they are checked
                    const input = element.querySelector('input');
                    if (!input || !input.checked) {
                        isValid = false;
                    }
                } else if (element.tagName.toLowerCase() === 'ui-radiobuttongroup') {
                    // For radio button groups, check if any radio button is selected
                    const radioButtons = element.querySelectorAll('ui-radiobutton input');
                    let hasSelection = false;
                    for (const radio of radioButtons) {
                        if (radio.checked) {
                            hasSelection = true;
                            break;
                        }
                    }
                    if (!hasSelection) {
                        isValid = false;
                    }
                } else {
                    // For text fields, text areas, dropdowns, and list boxes, check the value property
                    value = element.value || '';
                    if (value.trim() === '') {
                        isValid = false;
                    }
                }
                
                if (!isValid) {
                    invalidElements.push(element);
                }
            }
        }
        
        const formIsValid = invalidElements.length === 0;
        
        if (!formIsValid) {
            // Dispatch invalid event
            this.fireEvent(FormPanelEvent.INVALID, { 
                form: this,
                invalidElements: invalidElements,
                formData: this.getFormData()
            });
        }
        
        return formIsValid;
    }
    
    submit() {
        // Validate the form first
        if (this.validate()) {
            // Get form data
            const formData = this.getFormData();
            
            // Dispatch submit event
            const shouldSubmit = this.fireEvent(FormPanelEvent.SUBMIT, { 
                form: this,
                formData: formData
            }, { cancelable: true });
            return shouldSubmit;
        }
        
        return false;
    }
    
    reset() {
        // Get all form elements and reset their values
        const formElements = this.querySelectorAll('ui-textfield, ui-textarea, ui-dropdown, ui-dropdownlist, ui-listbox, ui-combobox, ui-checkbox, ui-radiobutton, ui-radiobuttongroup');
        
        formElements.forEach(element => {
            if (element.tagName.toLowerCase() === 'ui-checkbox' || element.tagName.toLowerCase() === 'ui-radiobutton') {
                const input = element.querySelector('input');
                if (input) {
                    input.checked = false;
                }
            } else if (element.tagName.toLowerCase() === 'ui-radiobuttongroup') {
                const radioButtons = element.querySelectorAll('ui-radiobutton input');
                radioButtons.forEach(radio => radio.checked = false);
            } else {
                // Reset value for text fields, text areas, dropdowns, and list boxes
                if (element.value !== undefined) {
                    element.value = '';
                }
            }
        });
    }
    
    getFormData() {
        // Collect all form data into an object
        const formData = {};
        const formElements = this.querySelectorAll('ui-textfield, ui-textarea, ui-dropdown, ui-dropdownlist, ui-listbox, ui-combobox, ui-checkbox, ui-radiobutton, ui-radiobuttongroup');
        
        formElements.forEach(element => {
            const name = element.getAttribute('name') || element.getAttribute('id');
            if (name) {
                if (element.tagName.toLowerCase() === 'ui-checkbox') {
                    const input = element.querySelector('input');
                    formData[name] = input ? input.checked : false;
                } else if (element.tagName.toLowerCase() === 'ui-radiobutton') {
                    const input = element.querySelector('input');
                    if (input && input.checked) {
                        formData[name] = element.value || input.value;
                    }
                } else if (element.tagName.toLowerCase() === 'ui-radiobuttongroup') {
                    const radioButtons = element.querySelectorAll('ui-radiobutton input');
                    for (const radio of radioButtons) {
                        if (radio.checked) {
                            formData[name] = radio.value;
                            break;
                        }
                    }
                } else {
                    formData[name] = element.value || '';
                }
            }
        });
        
        return formData;
    }
    
    setFormData(data) {
        // Set form data from an object
        const formElements = this.querySelectorAll('ui-textfield, ui-textarea, ui-dropdown, ui-dropdownlist, ui-listbox, ui-combobox, ui-checkbox, ui-radiobutton, ui-radiobuttongroup');
        
        formElements.forEach(element => {
            const name = element.getAttribute('name') || element.getAttribute('id');
            if (name && data.hasOwnProperty(name)) {
                if (element.tagName.toLowerCase() === 'ui-checkbox') {
                    const input = element.querySelector('input');
                    if (input) {
                        input.checked = Boolean(data[name]);
                    }
                } else if (element.tagName.toLowerCase() === 'ui-radiobutton') {
                    const input = element.querySelector('input');
                    if (input && input.value === data[name]) {
                        input.checked = true;
                    }
                } else if (element.tagName.toLowerCase() === 'ui-radiobuttongroup') {
                    const radioButtons = element.querySelectorAll('ui-radiobutton input');
                    radioButtons.forEach(radio => {
                        radio.checked = (radio.value === data[name]);
                    });
                } else {
                    if (element.value !== undefined) {
                        element.value = data[name];
                    }
                }
            }
        });
    }
}
