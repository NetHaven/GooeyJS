import Container from '../Container.js';
import Template from '../../util/Template.js';
import ToggleButtonEvent from '../../events/button/ToggleButtonEvent.js';
import ToggleButtonGroupEvent from '../../events/button/ToggleButtonGroupEvent.js';

export default class ToggleButtonGroup extends Container {
    constructor() {
        super();
        
        this.classList.add("ui-ToggleButtonGroup");
        Template.activate("ui-ToggleButtonGroup", this);

        // Initialize state
        this._selectedButton = null;
        this._updatingSelection = false;
        
        // Set up mutation observer to watch for added/removed toggle buttons
        this._setupMutationObserver();
        
        // Initial setup for existing children
        this._setupToggleButtons();
        
        this.addValidEvent(ToggleButtonEvent.TOGGLE);
        this.addValidEvent(ToggleButtonGroupEvent.SELECTION_CHANGE);

        // Handle selection behavior
        this.addEventListener(ToggleButtonEvent.TOGGLE, this._handleToggleEvent.bind(this));
    }
    
    /**
     * Set up mutation observer to handle dynamically added/removed toggle buttons
     */
    _setupMutationObserver() {
        this._observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    // Handle added nodes
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE && node.tagName.toLowerCase() === 'ui-togglebutton') {
                            this._setupToggleButton(node);
                        }
                    });
                    
                    // Handle removed nodes
                    mutation.removedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE && node.tagName.toLowerCase() === 'ui-togglebutton') {
                            if (this._selectedButton === node) {
                                this._selectedButton = null;
                            }
                        }
                    });
                }
            });
        });
        
        this._observer.observe(this, { childList: true });
    }
    
    /**
     * Set up all existing toggle buttons
     */
    _setupToggleButtons() {
        const toggleButtons = this.getToggleButtons();
        toggleButtons.forEach(button => this._setupToggleButton(button));
        
        // If no button is selected and we have buttons, optionally select the first one
        if (!this._selectedButton && toggleButtons.length > 0 && this.hasAttribute('autoselect')) {
            this._selectButton(toggleButtons[0]);
        }
    }
    
    /**
     * Set up a single toggle button
     */
    _setupToggleButton(button) {
        // Ensure the button is properly initialized
        if (button.pressed && !this._selectedButton) {
            this._selectedButton = button;
        } else if (button.pressed && this._selectedButton !== button) {
            // If another button is already selected, unpress this one
            button.pressed = false;
        }
    }
    
    /**
     * Handle toggle events from child toggle buttons
     */
    _handleToggleEvent(event) {
        // Only handle events from direct child toggle buttons
        if (event.target.parentElement !== this || event.target.tagName.toLowerCase() !== 'ui-togglebutton') {
            return;
        }
        
        const button = event.target;
        
        if (this._updatingSelection) {
            return;
        }
        
        this._updatingSelection = true;
        
        if (button.pressed) {
            // Button was pressed - make it the selected button
            this._selectButton(button);
        } else if (this._selectedButton === button && !this.hasAttribute('allowdeselect')) {
            // Button was unpressed but it was selected - re-press it if deselection is not allowed
            button.pressed = true;
        } else if (this._selectedButton === button) {
            // Button was unpressed and deselection is allowed
            this._selectedButton = null;
        }
        
        this._updatingSelection = false;
        
        // Dispatch selection change event
        this.fireEvent(ToggleButtonGroupEvent.SELECTION_CHANGE, { 
            selectedButton: this._selectedButton,
            selectedValue: this._selectedButton ? this._selectedButton.getAttribute('value') : null,
            selectedIndex: this._selectedButton ? this.getToggleButtons().indexOf(this._selectedButton) : -1
        });
    }
    
    /**
     * Select a specific button and unpress all others
     */
    _selectButton(button) {
        const toggleButtons = this.getToggleButtons();
        
        toggleButtons.forEach(btn => {
            if (btn === button) {
                if (!btn.pressed) {
                    btn.pressed = true;
                }
            } else {
                if (btn.pressed) {
                    btn.pressed = false;
                }
            }
        });
        
        this._selectedButton = button;
    }
    
    /**
     * Get all direct child toggle buttons
     */
    getToggleButtons() {
        return Array.from(this.children).filter(child => 
            child.tagName.toLowerCase() === 'ui-togglebutton'
        );
    }
    
    /**
     * Get the currently selected button
     */
    get selectedButton() {
        return this._selectedButton;
    }
    
    /**
     * Get the value of the currently selected button
     */
    get selectedValue() {
        return this._selectedButton ? this._selectedButton.getAttribute('value') : null;
    }
    
    /**
     * Get the index of the currently selected button
     */
    get selectedIndex() {
        if (!this._selectedButton) {
            return -1;
        }
        return this.getToggleButtons().indexOf(this._selectedButton);
    }
    
    /**
     * Select a button by index
     */
    selectByIndex(index) {
        const toggleButtons = this.getToggleButtons();
        if (index >= 0 && index < toggleButtons.length) {
            this._selectButton(toggleButtons[index]);
        }
    }
    
    /**
     * Select a button by value
     */
    selectByValue(value) {
        const toggleButtons = this.getToggleButtons();
        const button = toggleButtons.find(btn => btn.getAttribute('value') === value);
        if (button) {
            this._selectButton(button);
        }
    }
    
    /**
     * Clear the selection (only works if allowdeselect is true)
     */
    clearSelection() {
        if (this.hasAttribute('allowdeselect') && this._selectedButton) {
            this._updatingSelection = true;
            this._selectedButton.pressed = false;
            this._selectedButton = null;
            this._updatingSelection = false;
            
            // Dispatch selection change event
            this.fireEvent(ToggleButtonGroupEvent.SELECTION_CHANGE, { 
                selectedButton: null,
                selectedValue: null,
                selectedIndex: -1
            });
        }
    }
    
    /**
     * Cleanup when component is disconnected
     */
    disconnectedCallback() {
        if (this._observer) {
            this._observer.disconnect();
        }
    }
    
    static get observedAttributes() {
        return ['allowdeselect', 'autoselect'];
    }
    
    attributeChangedCallback(name, oldValue, newValue) {
        switch (name) {
            case 'autoselect':
                if (newValue !== null && !this._selectedButton) {
                    const toggleButtons = this.getToggleButtons();
                    if (toggleButtons.length > 0) {
                        this._selectButton(toggleButtons[0]);
                    }
                }
                break;
            case 'allowdeselect':
                // No immediate action needed, affects behavior in event handler
                break;
        }
    }
}