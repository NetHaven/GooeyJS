import Component from './Component.js';
import HorizontalAlign from './HorizontalAlign.js';
import MouseEvent from '../events/MouseEvent.js';
import VerticalAlign from './VerticalAlign.js';

export default class Label extends Component {
    static get observedAttributes() {
        return ['text', 'icon', 'action', 'halign', 'valign', 'disabled'];
    }

    constructor () {		
		super();
		
		this.container = document.createElement("div");
		this.appendChild(this.container);
		
		if (this.hasAttribute("icon")) {
			this.icon = this.getAttribute("icon");			
		}
		
		if (this.hasAttribute("text")) {
			this.text = this.getAttribute("text");
		}

        if (this.hasAttribute("action")) {
            this.action = this.getAttribute("action");
        }

        if (this.hasAttribute("halign")) {
            this.halign = this.getAttribute("halign");
        }

        if (this.hasAttribute("valign")) {
            this.valign = this.getAttribute("valign");
        }

		this.addValidEvent(MouseEvent.CLICK);

		this.container.addEventListener(MouseEvent.CLICK, () => {
			if (!this.disabled) {
				this.fireEvent(MouseEvent.CLICK);
			}
		});
	}

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return;

        switch (name) {
            case 'halign':
                this._updateAlignment();
                break;
            case 'valign':
                this._updateAlignment();
                break;
            case 'text':
                if (newValue && this.textElement) {
                    this.textElement.innerHTML = newValue;
                }
                break;
            case 'icon':
                if (newValue && this.image) {
                    this.image.src = newValue;
                }
                break;
            case 'disabled':
                this.disabled = newValue !== null;
                break;
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

	get halign() {
		return this.getAttribute("halign");
	}

	get valign() {
		return this.getAttribute("valign");
	}
	
	set action(val) {
        this.setAttribute("action", val);
    }

    set disabled(val) {
		super.disabled = val;
		if (val) {
			this.container.setAttribute("disabled", "");
		}
		else {
			this.container.removeAttribute("disabled");
		}
	}

    set icon(val) {
        if (!this.image) {
			this.image = document.createElement("img");
			this.container.appendChild(this.image);

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
            this.container.appendChild(this.textElement);
        }
		this.setAttribute("text", val);
		this.textElement.innerHTML = val;
	}

	set halign(val) {
		// Validate the halign value (case-insensitive)
		const validAlignments = [HorizontalAlign.CENTER, HorizontalAlign.LEFT, HorizontalAlign.RIGHT];
		if (!validAlignments.includes(val.toUpperCase())) {
			const logger = window.RetroUILoggers?.ui || console;
			logger.warn('LABEL_INVALID_HALIGN', `Invalid halign value: ${val}. Valid values are: ${validAlignments.join(', ')}`);
			return;
		}

		this.setAttribute("halign", val.toUpperCase());
		this._updateAlignment();
	}

	set valign(val) {
		// Validate the valign value (case-insensitive)
		const validAlignments = [VerticalAlign.CENTER, VerticalAlign.TOP, VerticalAlign.BOTTOM];
		if (!validAlignments.includes(val.toUpperCase())) {
			const logger = window.RetroUILoggers?.ui || console;
			logger.warn('LABEL_INVALID_VALIGN', `Invalid valign value: ${val}. Valid values are: ${validAlignments.join(', ')}`);
			return;
		}

		this.setAttribute("valign", val.toUpperCase());
		this._updateAlignment();
	}

	/**
	 * Updates the container's CSS alignment properties based on halign and valign attributes
	 */
	_updateAlignment() {
		const halign = this.getAttribute("halign");
		const valign = this.getAttribute("valign");
		
		// Handle horizontal alignment
		if (halign) {
			switch (halign) {
				case HorizontalAlign.CENTER:
					this.container.style.textAlign = 'center';
					break;
				case HorizontalAlign.LEFT:
					this.container.style.textAlign = 'left';
					break;
				case HorizontalAlign.RIGHT:
					this.container.style.textAlign = 'right';
					break;
				default:
					this.container.style.textAlign = '';
			}
		} else {
			this.container.style.textAlign = '';
		}

		// Handle vertical alignment
		if (valign) {
			// Enable flexbox for vertical alignment
			this.container.style.display = 'flex';
			this.container.style.flexDirection = 'row';
			
			switch (valign) {
				case VerticalAlign.CENTER:
					this.container.style.alignItems = 'center';
					break;
				case VerticalAlign.TOP:
					this.container.style.alignItems = 'flex-start';
					break;
				case VerticalAlign.BOTTOM:
					this.container.style.alignItems = 'flex-end';
					break;
				default:
					this.container.style.alignItems = '';
			}
			
			// Handle horizontal alignment in flexbox mode
			if (halign) {
				switch (halign) {
					case HorizontalAlign.CENTER:
						this.container.style.justifyContent = 'center';
						this.container.style.textAlign = '';
						break;
					case HorizontalAlign.LEFT:
						this.container.style.justifyContent = 'flex-start';
						this.container.style.textAlign = '';
						break;
					case HorizontalAlign.RIGHT:
						this.container.style.justifyContent = 'flex-end';
						this.container.style.textAlign = '';
						break;
					default:
						this.container.style.justifyContent = '';
				}
			} else {
				this.container.style.justifyContent = '';
			}
		} else {
			// Reset vertical alignment styles if no valign is set
			this.container.style.alignItems = '';
			this.container.style.justifyContent = '';
			// Only reset display if no valign is set
			if (!valign) {
				this.container.style.display = '';
				this.container.style.flexDirection = '';
			}
		}
	}
}
