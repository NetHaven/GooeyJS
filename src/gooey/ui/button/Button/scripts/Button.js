import UIComponent from '../../../UIComponent.js';
import MouseEvent from '../../../../events/MouseEvent.js';
import Template from '../../../../util/Template.js';

export default class Button extends UIComponent {
	constructor() {
		super();

		// Activate template into shadow root (created by UIComponent)
		Template.activate("ui-button", this.shadowRoot);
		this.button = this.shadowRoot.querySelector("button");

		// Note: icon, text, action initialization deferred to connectedCallback
		// (Custom Elements spec prohibits setAttribute in constructor)
	}

	connectedCallback() {
		if (super.connectedCallback) {
			super.connectedCallback();
		}

		// Initialize attributes (must be here, not in constructor per Custom Elements spec)
		if (this.hasAttribute("icon")) {
			// Apply icon visually without calling setter (which calls setAttribute)
			const val = this.getAttribute("icon");
			const slottedIcon = this.querySelector('[slot="icon"]');
			if (!slottedIcon) {
				if (!this.image) {
					this.image = document.createElement("img");
					this.button.appendChild(this.image);
					this.image.addEventListener(MouseEvent.CLICK, e=> {
						if (this.disabled) {
							e.stopPropagation();
						}
					});
				}
				this.image.style.display = '';
				this.image.src = val;
			}
		}

		if (this.hasAttribute("text")) {
			// Apply text visually without calling setter
			const val = this.getAttribute("text");
			if (!this.textElement) {
				this.textElement = document.createElement("span");
				this.button.appendChild(this.textElement);
			}
			this.textElement.textContent = val;
		}

		// action attribute doesn't need visual initialization
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
	
	set action(val) {
        this.setAttribute("action", val);
    }

    set disabled(val) {
		super.disabled = val;
		if (val) {
			this.button.setAttribute("disabled", "");
		}
		else {
			this.button.removeAttribute("disabled");
		}
	}

    set icon(val) {
        const slottedIcon = this.querySelector('[slot="icon"]');
        if (slottedIcon) {
            // Slotted icon takes precedence - don't create/show img
            if (this.image) {
                this.image.style.display = 'none';
            }
            this.setAttribute("icon", val);
            return;
        }

        if (!this.image) {
			this.image = document.createElement("img");
			this.button.appendChild(this.image);

            this.image.addEventListener(MouseEvent.CLICK, e=> {
				if (this.disabled) {
					e.stopPropagation();
				}
			});
        }
        this.image.style.display = '';
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
}
