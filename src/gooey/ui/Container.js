import Component from "./Component.js";
import LayoutAlign from "./layout/LayoutAlign.js";
import LayoutJustify from "./layout/LayoutJustify.js";
import LayoutType from "./layout/LayoutType.js";

export default class Container extends Component {
    constructor () {
        super();

        this.classList.add("ui-Container");

        if (this.hasAttribute("font")) {
            this.font = this.getAttribute("font");
        }

        if (this.hasAttribute("border")) {
            this.border = this.getAttribute("border");
        }
    }

    get active() {
		return this.getAttribute("active");
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
            console.log(`Font ${val} not found.`);
        }
    }

    set layout(val) {
        let layoutElement;

        layoutElement = document.querySelector(val);
        if (layoutElement) {
            if (layoutElement.align) {
                if (layoutElement.align === LayoutAlign.END || layoutElement.align === LayoutAlign.START) {
                    if (layoutElement.type === LayoutType.HBOX || layoutElement.type === LayoutType.VBOX) {
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
                    if (layoutElement.type === LayoutType.HBOX || layoutElement.type === LayoutType.VBOX) {
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
        }

/*        let columns, rows;

        switch (val) {
            case LayoutType.BORDER:
            case LayoutType.CARD:
            case LayoutType.GRID:
            case LayoutType.HBOX:
            case LayoutType.FLOW:
            case LayoutType.VBOX:   this.setAttribute("layout", val);
        }
        
        if (this.layout === LayoutType.GRID) {
            columns = this.getAttribute("columns");
            rows = this.getAttribute("rows");
            if (rows && columns) {
                this.style.gridTemplateColumns = columns;
                this.style.gridTemplateRows = rows;
            }
        } */
    }
}
