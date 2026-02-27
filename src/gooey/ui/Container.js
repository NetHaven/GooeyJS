import UIComponent from "./UIComponent.js";
import LayoutAlign from "./layout/Layout/scripts/LayoutAlign.js";
import LayoutJustify from "./layout/Layout/scripts/LayoutJustify.js";
import LayoutType from "./layout/Layout/scripts/LayoutType.js";
import Logger from '../logging/Logger.js';

export default class Container extends UIComponent {
    constructor () {
        super();
    }

    connectedCallback() {
        super.connectedCallback?.();

        if (!this._containerInit) {
            this._containerInit = true;

            if (!this.classList.contains("ui-Container")) {
                this.classList.add("ui-Container");
            }

            if (this.hasAttribute("font")) {
                this.font = this.getAttribute("font");
            }

            if (this.hasAttribute("border")) {
                this.border = this.getAttribute("border");
            }

            if (this.hasAttribute("background")) {
                this.background = this.getAttribute("background");
            }
        }
    }

    get active() {
		return this.getAttribute("active");
	}

    get background() {
        return this.getAttribute("background");
    }

    get border() {
        return this.getAttribute("border");
    }

    get font() {
        return this.getAttribute("font");
    }

    get layout() {
		return this.getAttribute("layout");
	}

    set active(val) {
        this.setAttribute("active", val);
    }

    set background(val) {
        let backgroundElement;

        backgroundElement = document.querySelector(val);
        if (backgroundElement) {
            if (typeof backgroundElement.applyTo === 'function') {
                backgroundElement.applyTo(this);
            } else {
                // Fallback for simple color/image backgrounds
                if (backgroundElement.color) {
                    this.style.backgroundColor = backgroundElement.color;
                }

                if (backgroundElement.image) {
                    this.style.backgroundImage = `url('${backgroundElement.image}')`;
                }

                if (backgroundElement.size) {
                    this.style.backgroundSize = backgroundElement.size;
                }

                if (backgroundElement.position) {
                    this.style.backgroundPosition = backgroundElement.position;
                }

                if (backgroundElement.repeat) {
                    this.style.backgroundRepeat = backgroundElement.repeat;
                }

                if (backgroundElement.attachment) {
                    this.style.backgroundAttachment = backgroundElement.attachment;
                }
            }
            this.setAttribute("background", val);
        } else {
            Logger.warn({ code: "CONTAINER_BACKGROUND_NOT_FOUND", value: val }, "Background %s not found", val);
        }
    }

	set border(val) {
        let borderElement, side;

        borderElement = document.querySelector(val);
        if (borderElement) {
            side = '';
            if (borderElement.color) {
                this.style[`border${side}Color`] = borderElement.color;
            }

            if (borderElement.style) {
                this.style[`border${side}Style`] = borderElement.style;
            }

            if (borderElement.width) {
                this.style[`border${side}Width`] = borderElement.width + "px";
            }
        }

        this.setAttribute("border", val);
    }

    set font(val) {
        let fontElement;

        fontElement = document.querySelector(val);
        if (fontElement) {
            if (fontElement.family) {
                this.style.fontFamily = fontElement.family;
            }

            if (fontElement.size) {
                this.style.fontSize = fontElement.size;
            }

            if (fontElement.weight) {
                this.style.fontWeight = fontElement.weight;
            }
            this.setAttribute("font", val);
        }
        else {
            Logger.warn({ code: "CONTAINER_FONT_NOT_FOUND", value: val }, "Font %s not found", val);
        }
    }

    set layout(val) {
        // Handle LayoutType constants directly
        switch (val) {
            case LayoutType.BORDER:
            case LayoutType.BOX:
            case LayoutType.CARD:
            case LayoutType.FLOW:
            case LayoutType.GRID:
            case LayoutType.HBOX:
            case LayoutType.VBOX:
                this.setAttribute("layout", val);
                return;
        }

        // Handle layout element selector (for advanced layout configuration)
        const layoutElement = document.querySelector(val);
        if (layoutElement) {
            if (layoutElement.align) {
                if (layoutElement.align === LayoutAlign.END || layoutElement.align === LayoutAlign.START) {
                    if (layoutElement.type === LayoutType.BOX || layoutElement.type === LayoutType.HBOX || layoutElement.type === LayoutType.VBOX) {
                       this.style.alignItems = `flex-${layoutElement.align}`;
                    }
                    else {
                        this.style.alignItems = layoutElement.align;
                    }
                }
                else {
                    this.style.alignItems = layoutElement.align;
                }
            }

            if (layoutElement.direction) {
                this.style.flexDirection = layoutElement.direction;
            }

            if (layoutElement.justify) {
                if (layoutElement.justify === LayoutJustify.END || layoutElement.justify === LayoutJustify.START) {
                    if (layoutElement.type === LayoutType.BOX || layoutElement.type === LayoutType.HBOX || layoutElement.type === LayoutType.VBOX) {
                       this.style.justifyContent = `flex-${layoutElement.justify}`;
                    }
                    else {
                        this.style.justifyContent = layoutElement.justify;
                    }
                }
                else {
                    this.style.justifyContent = layoutElement.justify;
                }
            }

            if (layoutElement.wrap) {
                this.style.flexWrap = layoutElement.wrap;
            }

            this.setAttribute("layout", layoutElement.type || val);
        }
    }
}
