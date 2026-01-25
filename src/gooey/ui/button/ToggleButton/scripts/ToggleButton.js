import UIComponent from '../../../UIComponent.js';
import MouseEvent from '../../../../events/MouseEvent.js';
import Template from '../../../../util/Template.js';
import ToggleButtonEvent from '../../../../events/button/ToggleButtonEvent.js';

export default class ToggleButton extends UIComponent {
    constructor() {
        super();
        
        this.classList.add("ui-ToggleButton");

        Template.activate("ui-ToggleButton", this.shadowRoot);
        this.button = this.shadowRoot.querySelector("button");
        
        // Initialize toggle state
        this._pressed = false;
        this._updatingAttribute = false;
        
        if (this.hasAttribute("icon")) {
            this.icon = this.getAttribute("icon");
        }
        
        if (this.hasAttribute("text")) {
            this.text = this.getAttribute("text");
        }

        if (this.hasAttribute("action")) {
            this.action = this.getAttribute("action");
        }
        
        if (this.hasAttribute("pressed")) {
            this.pressed = this.getAttribute("pressed") === 'true';
        }

        this.addValidEvent(MouseEvent.CLICK);
        this.addValidEvent(MouseEvent.MOUSE_DOWN);
        this.addValidEvent(ToggleButtonEvent.TOGGLE);

        this.addEventListener(MouseEvent.CLICK, () => {
            if (!this.disabled) {
                // Toggle the pressed state
                this.pressed = !this.pressed;
                
                // Dispatch the action event if specified
                if (this.action) {
                    // Add the action as a valid event if not already added
                    if (!this.hasEvent(this.action)) {
                        this.addValidEvent(this.action);
                    }
                    this.fireEvent(this.action, { pressed: this.pressed });
                }
                
                // Dispatch a toggle event
                this.fireEvent(ToggleButtonEvent.TOGGLE, { pressed: this.pressed });
            }
        });

        this.button.addEventListener(MouseEvent.MOUSE_DOWN, function() {
            this.fireEvent(MouseEvent.MOUSE_DOWN);
        }.bind(this))
    }
    
    get action() {
        return this.getAttribute("action");
    }

    get disabled() {
        return super.disabled;
    }
    
    get icon() {
        return this.getAttribute("icon");
    }
    
    get text() {
        return this.getAttribute("text");
    }
    
    get pressed() {
        return this._pressed;
    }
    
    set action(val) {
        this.setAttribute("action", val);
        // Add the action as a valid event
        if (val && !this.hasEvent(val)) {
            this.addValidEvent(val);
        }
    }

    set disabled(val) {
        if (this._updatingAttribute) return;
        
        this._updatingAttribute = true;
        super.disabled = val;
        if (val) {
            this.setAttribute("disabled", "");
            this.button.setAttribute("disabled", "");
        } else {
            this.removeAttribute("disabled");
            this.button.removeAttribute("disabled");
        }
        this._updatingAttribute = false;
    }

    set icon(val) {
        if (!this.image) {
            this.image = document.createElement("img");
            this.button.appendChild(this.image);

            this.image.addEventListener(MouseEvent.CLICK, e => {
                if (this.disabled) {
                    e.stopPropagation();
                }
            });
        }
        this.setAttribute("icon", val);
        this.image.src = val;
    }
    
    set text(val) {
        if (!this.textElement) {
            this.textElement = document.createElement("span");
            this.button.appendChild(this.textElement);
        }
        this.setAttribute("text", val);
        this.textElement.textContent = val;
    }
    
    set pressed(val) {
        if (this._updatingAttribute) return;

        this._updatingAttribute = true;
        this._pressed = !!val;

        if (this._pressed) {
            this.setAttribute("pressed", "true");
            this.classList.add("pressed");
        } else {
            this.removeAttribute("pressed");
            this.classList.remove("pressed");
        }
        this._updatingAttribute = false;
    }

    attributeChangedCallback(name, oldValue, newValue) {
        // Call parent for META.goo validation/parsing
        super.attributeChangedCallback(name, oldValue, newValue);

        if (this._updatingAttribute) return;

        switch (name) {
            case 'disabled':
                this.disabled = newValue !== null;
                break;
            case 'pressed':
                this.pressed = newValue === 'true';
                break;
        }
    }
    
    // Method to toggle the button programmatically
    toggle() {
        this.pressed = !this.pressed;
    }
}