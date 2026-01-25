import UIComponent from '../../../UIComponent.js';
import MouseEvent from '../../../../events/MouseEvent.js';
import Template from '../../../../util/Template.js';

export default class Button extends UIComponent {
	constructor() {
		super();
	
		// Activate template into shadow root (created by UIComponent)
		Template.activate("ui-button", this.shadowRoot);
		this.button = this.shadowRoot.querySelector("button");

		if (this.hasAttribute("icon")) {
			this.icon = this.getAttribute("icon");			
		}
		
		if (this.hasAttribute("text")) {
			this.text = this.getAttribute("text");
		}

        if (this.hasAttribute("action")) {
            this.action = this.getAttribute("action");
        }

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
        if (!this.image) {
			this.image = document.createElement("img");
			this.button.appendChild(this.image);

            this.image.addEventListener(MouseEvent.CLICK, e=> {
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
		this.textElement.innerHTML = val;
	}
}
