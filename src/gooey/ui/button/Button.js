import Component from '../Component.js';
import MouseEvent from '../../events/MouseEvent.js';
import Template from '../../util/Template.js';

export default class Button extends Component {
	constructor() {
		super();
	
		Template.activate("ui-button", this);
		this.button = this.querySelector("button");

		if (this.hasAttribute("icon")) {
			this.icon = this.getAttribute("icon");			
		}
		
		if (this.hasAttribute("text")) {
			this.text = this.getAttribute("text");
		}

        if (this.hasAttribute("action")) {
            this.action = this.getAttribute("action");
        }

		this.addValidEvent(MouseEvent.CLICK);
		this.addValidEvent(MouseEvent.MOUSE_DOWN);

		this.button.addEventListener(MouseEvent.CLICK, () => {
			if (!this.disabled) {
				this.fireEvent(MouseEvent.CLICK);
			}
		});

		this.button.addEventListener(MouseEvent.MOUSE_DOWN, () => {
			if (!this.disabled) {
				this.fireEvent(MouseEvent.MOUSE_DOWN);
			}
		});
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
