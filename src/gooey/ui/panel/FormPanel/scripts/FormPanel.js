import Panel from '../../Panel/scripts/Panel.js';
import LayoutType from '../../../layout/Layout/scripts/LayoutType.js';
import FormPanelEvent from '../../../../events/panel/FormPanelEvent.js';
import Template from '../../../../util/Template.js';

export default class FormPanel extends Panel {
    constructor () {
        super();

        // Panel already created shadowRoot, so we append to it
        Template.activate("ui-FormPanel", this.shadowRoot);

        this.classList.add("ui-FormPanel");

        // Override the default layout to ensure CSS grid works
        this.layout = LayoutType.GRID;
        
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

    /**
     * Get the internal input element from a checkbox or radio button component
     * @param {HTMLElement} element - The gooeyui-checkbox or gooeyui-radiobutton element
     * @returns {HTMLInputElement|null}
     */
    _getInputFromElement(element) {
        // Input lives in shadow DOM, not light DOM
        return element.shadowRoot?.querySelector('input') || null;
    }

    /**
     * Get all radio button inputs from a radio button group
     * @param {HTMLElement} group - The gooeyui-radiobuttongroup element
     * @returns {HTMLInputElement[]}
     */
    _getRadioInputsFromGroup(group) {
        const radioButtons = group.querySelectorAll('gooeyui-radiobutton');
        const inputs = [];
        radioButtons.forEach(rb => {
            const input = this._getInputFromElement(rb);
            if (input) {
                inputs.push(input);
            }
        });
        return inputs;
    }

    _ensureThirdColumnElements() {
        const formElements = this.querySelectorAll('gooeyui-textfield, gooeyui-textarea, gooeyui-dropdown, gooeyui-dropdownlist, gooeyui-listbox, gooeyui-combobox, gooeyui-checkbox, gooeyui-radiobutton, gooeyui-radiobuttongroup');

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
        const formElements = this.querySelectorAll('gooeyui-textfield, gooeyui-textarea, gooeyui-dropdown, gooeyui-dropdownlist, gooeyui-listbox, gooeyui-combobox, gooeyui-checkbox, gooeyui-radiobutton, gooeyui-radiobuttongroup');
        const invalidElements = [];
        
        for (const element of formElements) {
            // Check if the element has a required attribute
            if (element.hasAttribute('required')) {
                // Get the value based on element type
                let value = '';
                let isValid = true;
                
                if (element.tagName.toLowerCase() === 'gooeyui-checkbox' || element.tagName.toLowerCase() === 'gooeyui-radiobutton') {
                    // For checkboxes and radio buttons, check if they are checked
                    const input = this._getInputFromElement(element);
                    if (!input || !input.checked) {
                        isValid = false;
                    }
                } else if (element.tagName.toLowerCase() === 'gooeyui-radiobuttongroup') {
                    // For radio button groups, check if any radio button is selected
                    const radioInputs = this._getRadioInputsFromGroup(element);
                    let hasSelection = false;
                    for (const radio of radioInputs) {
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
        const formElements = this.querySelectorAll('gooeyui-textfield, gooeyui-textarea, gooeyui-dropdown, gooeyui-dropdownlist, gooeyui-listbox, gooeyui-combobox, gooeyui-checkbox, gooeyui-radiobutton, gooeyui-radiobuttongroup');
        
        formElements.forEach(element => {
            if (element.tagName.toLowerCase() === 'gooeyui-checkbox' || element.tagName.toLowerCase() === 'gooeyui-radiobutton') {
                const input = this._getInputFromElement(element);
                if (input) {
                    input.checked = false;
                }
            } else if (element.tagName.toLowerCase() === 'gooeyui-radiobuttongroup') {
                const radioInputs = this._getRadioInputsFromGroup(element);
                radioInputs.forEach(radio => {
                    radio.checked = false;
                });
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
        const formElements = this.querySelectorAll('gooeyui-textfield, gooeyui-textarea, gooeyui-dropdown, gooeyui-dropdownlist, gooeyui-listbox, gooeyui-combobox, gooeyui-checkbox, gooeyui-radiobutton, gooeyui-radiobuttongroup');
        
        formElements.forEach(element => {
            const name = element.getAttribute('name') || element.getAttribute('id');
            if (name) {
                if (element.tagName.toLowerCase() === 'gooeyui-checkbox') {
                    const input = this._getInputFromElement(element);
                    formData[name] = input ? input.checked : false;
                } else if (element.tagName.toLowerCase() === 'gooeyui-radiobutton') {
                    const input = this._getInputFromElement(element);
                    if (input && input.checked) {
                        formData[name] = element.value || input.value;
                    }
                } else if (element.tagName.toLowerCase() === 'gooeyui-radiobuttongroup') {
                    const radioInputs = this._getRadioInputsFromGroup(element);
                    for (const radio of radioInputs) {
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
        const formElements = this.querySelectorAll('gooeyui-textfield, gooeyui-textarea, gooeyui-dropdown, gooeyui-dropdownlist, gooeyui-listbox, gooeyui-combobox, gooeyui-checkbox, gooeyui-radiobutton, gooeyui-radiobuttongroup');
        
        formElements.forEach(element => {
            const name = element.getAttribute('name') || element.getAttribute('id');
            if (name && data.hasOwnProperty(name)) {
                if (element.tagName.toLowerCase() === 'gooeyui-checkbox') {
                    const input = this._getInputFromElement(element);
                    if (input) {
                        input.checked = Boolean(data[name]);
                    }
                } else if (element.tagName.toLowerCase() === 'gooeyui-radiobutton') {
                    const input = this._getInputFromElement(element);
                    if (input && input.value === data[name]) {
                        input.checked = true;
                    }
                } else if (element.tagName.toLowerCase() === 'gooeyui-radiobuttongroup') {
                    const radioInputs = this._getRadioInputsFromGroup(element);
                    radioInputs.forEach(radio => {
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
