import ListBox from './ListBox.js';
import ComboBoxEvent from '../../../events/form/list/ComboBoxEvent.js';
import KeyboardEvent from '../../../events/KeyboardEvent.js';
import MouseEvent from '../../../events/MouseEvent.js';
import FormElementEvent from '../../../events/form/FormElementEvent.js';
import Template from '../../../util/Template.js';
import TextElementEvent from '../../../events/form/text/TextElementEvent.js';

export default class ComboBox extends ListBox {
    constructor() {
        super();
        
        Template.activate("ui-ComboBox", this);

        // Create the combo box structure
        this.listBox = this.querySelector("select.combobox-list");
        this._container = this.querySelector('div.combobox-container');
        this._textInput = this.querySelector('input.combobox-input');
        this._dropdownButton = this.querySelector('button.combobox-button');
        this._dropdownContainer = this.querySelector('div.combobox-dropdown');
        this._dropdownContainer.style.display = 'none';
        
        // Update formElement reference for FormElement functionality
        this.formElement = this._textInput;

        // Set up event handlers
        this._setupEventHandlers();
        
        // Initialize dropdown state
        this._isDropdownOpen = false;
        this._filteredOptions = [];
        
        // Track if we're in editable mode
        this._editable = this.hasAttribute('editable');
        
        // Set initial value if specified
        if (this.hasAttribute('value')) {
            this.value = this.getAttribute('value');
        }
        
        // Set initial text if specified
        if (this.hasAttribute('text')) {
            this.text = this.getAttribute('text');
        }
        
        // Add valid events
        this.addValidEvent(FormElementEvent.FOCUS);
        this.addValidEvent(FormElementEvent.BLUR);
        this.addValidEvent(ComboBoxEvent.DROPDOWN_OPEN);
        this.addValidEvent(ComboBoxEvent.DROPDOWN_CLOSE);
    }
    
    /**
     * Set up event handlers for combo box functionality
     */
    _setupEventHandlers() {
        // Dropdown button click
        this._dropdownButton.addEventListener(MouseEvent.CLICK, (e) => {
            e.preventDefault();
            e.stopPropagation();
            this._toggleDropdown();
        });
        
        // Text input events
        this._textInput.addEventListener(TextElementEvent.INPUT, (e) => {
            if (this._editable) {
                this._filterOptions(e.target.value);
                this._openDropdown();
            }
        });
        
        this._textInput.addEventListener(KeyboardEvent.KEY_DOWN, (e) => {
            this._handleKeydown(e);
        });
        
        this._textInput.addEventListener(MouseEvent.CLICK, () => {
            if (!this._editable) {
                this._toggleDropdown();
            }
        });
        
        // ListBox selection change
        this.listBox.addEventListener(TextElementEvent.CHANGE, () => {
            this._handleSelectionChange();
        });
        
        this.listBox.addEventListener(MouseEvent.CLICK, (e) => {
            // Close dropdown when option is clicked
            this._closeDropdown();
        });
        
        // Close dropdown when clicking outside
        document.addEventListener(MouseEvent.CLICK, (e) => {
            if (!this.contains(e.target)) {
                this._closeDropdown();
            }
        });
        
        // Handle focus/blur for proper form behavior
        this._textInput.addEventListener(FormElementEvent.FOCUS, (e) => {
            this.classList.add('focused');
            
            // Dispatch custom focus event
            this.fireEvent(FormElementEvent.FOCUS, { 
                value: this.value,
                text: this.text,
                originalEvent: e
            });
        });
        
        this._textInput.addEventListener(FormElementEveent.BLUR, (e) => {
            this.classList.remove('focused');
            
            // Dispatch custom blur event
            this.fireEvent(FormElementEvent.BLUR, { 
                value: this.value,
                text: this.text,
                originalEvent: e
            });
            
            // Delay closing to allow for click on dropdown
            setTimeout(() => {
                if (!this._dropdownContainer.contains(document.activeElement)) {
                    this._closeDropdown();
                }
            }, 150);
        });
    }
    
    /**
     * Handle keyboard navigation
     */
    _handleKeydown(e) {
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                if (!this._isDropdownOpen) {
                    this._openDropdown();
                } else {
                    this._selectNextOption();
                }
                break;
                
            case 'ArrowUp':
                e.preventDefault();
                if (this._isDropdownOpen) {
                    this._selectPreviousOption();
                }
                break;
                
            case 'Enter':
                e.preventDefault();
                if (this._isDropdownOpen) {
                    this._selectCurrentOption();
                    this._closeDropdown();
                } else {
                    this._openDropdown();
                }
                break;
                
            case 'Escape':
                e.preventDefault();
                this._closeDropdown();
                break;
                
            case 'Tab':
                this._closeDropdown();
                break;
        }
    }
    
    /**
     * Filter options based on input text
     */
    _filterOptions(filterText) {
        if (!this._editable) return;
        
        const filter = filterText.toLowerCase();
        this._filteredOptions = [];
        
        for (let i = 0; i < this.listBox.options.length; i++) {
            const option = this.listBox.options[i];
            const matches = option.textContent.toLowerCase().includes(filter);
            option.style.display = matches ? '' : 'none';
            
            if (matches) {
                this._filteredOptions.push(i);
            }
        }
    }
    
    /**
     * Handle selection change from listBox
     */
    _handleSelectionChange() {
        if (this.listBox.selectedIndex >= 0) {
            const selectedOption = this.listBox.options[this.listBox.selectedIndex];
            this._textInput.value = selectedOption.textContent;
            
            // Dispatch change event
            this.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }
    
    /**
     * Navigation methods
     */
    _selectNextOption() {
        const visibleOptions = this._getVisibleOptions();
        if (visibleOptions.length === 0) return;
        
        let nextIndex = 0;
        if (this.listBox.selectedIndex >= 0) {
            const currentPos = visibleOptions.indexOf(this.listBox.selectedIndex);
            nextIndex = (currentPos + 1) % visibleOptions.length;
        }
        
        this.listBox.selectedIndex = visibleOptions[nextIndex];
        this._scrollToSelected();
    }
    
    _selectPreviousOption() {
        const visibleOptions = this._getVisibleOptions();
        if (visibleOptions.length === 0) return;
        
        let prevIndex = visibleOptions.length - 1;
        if (this.listBox.selectedIndex >= 0) {
            const currentPos = visibleOptions.indexOf(this.listBox.selectedIndex);
            prevIndex = currentPos > 0 ? currentPos - 1 : visibleOptions.length - 1;
        }
        
        this.listBox.selectedIndex = visibleOptions[prevIndex];
        this._scrollToSelected();
    }
    
    _selectCurrentOption() {
        if (this.listBox.selectedIndex >= 0) {
            this._handleSelectionChange();
        }
    }
    
    _getVisibleOptions() {
        const visible = [];
        for (let i = 0; i < this.listBox.options.length; i++) {
            if (this.listBox.options[i].style.display !== 'none') {
                visible.push(i);
            }
        }
        return visible;
    }
    
    _scrollToSelected() {
        if (this.listBox.selectedIndex >= 0) {
            const selectedOption = this.listBox.options[this.listBox.selectedIndex];
            selectedOption.scrollIntoView({ block: 'nearest' });
        }
    }
    
    /**
     * Dropdown control methods
     */
    _openDropdown() {
        if (this._isDropdownOpen) return;
        
        this._isDropdownOpen = true;
        this._dropdownContainer.style.display = 'block';
        this._dropdownButton.innerHTML = '▲';
        this.classList.add('dropdown-open');
        
        // Reset filter if in editable mode
        if (this._editable) {
            this._filterOptions(this._textInput.value);
        }
        
        // Set dropdown width to match input width
        const inputWidth = this._textInput.offsetWidth + this._dropdownButton.offsetWidth;
        this._dropdownContainer.style.width = `${inputWidth}px`;
        
        // Dispatch event
        this.fireEvent(ComboBoxEvent.DROPDOWN_OPEN);
    }
    
    _closeDropdown() {
        if (!this._isDropdownOpen) return;
        
        this._isDropdownOpen = false;
        this._dropdownContainer.style.display = 'none';
        this._dropdownButton.innerHTML = '▼';
        this.classList.remove('dropdown-open');
        
        // Show all options when closed
        for (let i = 0; i < this.listBox.options.length; i++) {
            this.listBox.options[i].style.display = '';
        }
        
        // Dispatch event
        this.fireEvent(ComboBoxEvent.DROPDOWN_CLOSE);
    }
    
    _toggleDropdown() {
        if (this._isDropdownOpen) {
            this._closeDropdown();
        } else {
            this._openDropdown();
        }
    }
    
    /**
     * Properties and getters/setters
     */
    get editable() {
        return this._editable;
    }
    
    set editable(val) {
        this._editable = Boolean(val);
        this._textInput.readOnly = !this._editable;
        
        if (val) {
            this.setAttribute('editable', '');
        } else {
            this.removeAttribute('editable');
        }
    }
    
    get text() {
        return this._textInput.value;
    }
    
    set text(val) {
        this._textInput.value = val || '';
        this.setAttribute('text', val || '');
    }
    
    // Override value to work with the text input
    get value() {
        // If we have a selected option, return its value, otherwise return the text
        if (this.listBox.selectedIndex >= 0) {
            return this.listBox.value;
        }
        return this._textInput.value;
    }
    
    set value(val) {
        // Try to select the option with this value
        this.listBox.value = val;
        
        // If successful, update text input with the option text
        if (this.listBox.selectedIndex >= 0) {
            this._textInput.value = this.listBox.options[this.listBox.selectedIndex].textContent;
        } else {
            // Otherwise, just set the text input value
            this._textInput.value = val || '';
        }
        
        this.setAttribute('value', val || '');
    }
    
    // Override disabled to affect both input and button
    get disabled() {
        return this._textInput.disabled;
    }
    
    set disabled(val) {
        super.disabled = val;
        this._textInput.disabled = val;
        this._dropdownButton.disabled = val;
        
        if (val) {
            this._closeDropdown();
        }
    }
    
    // Override focus to focus the text input
    focus() {
        this._textInput.focus();
    }
    
    // Add method to clear the text input
    clearText() {
        this._textInput.value = '';
        this.listBox.selectedIndex = -1;
    }
    
    // Override addOption to potentially select the new option
    addOption(text, value = null, selected = false) {
        super.addOption(text, value, selected);
        
        if (selected) {
            this._textInput.value = text;
        }
    }
    
    static get observedAttributes() {
        return [...super.observedAttributes, 'editable', 'text', 'value'];
    }
    
    attributeChangedCallback(name, oldValue, newValue) {
        super.attributeChangedCallback(name, oldValue, newValue);
        
        switch (name) {
            case 'editable':
                this.editable = newValue !== null;
                break;
            case 'text':
                this.text = newValue;
                break;
            case 'value':
                this.value = newValue;
                break;
        }
    }
}