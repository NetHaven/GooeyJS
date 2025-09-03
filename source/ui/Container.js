import Component from "./Component.js";
import Layout from "./Layout.js";

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
            if (borderElement.side) {
                side = borderElement.side.charAt(0) + borderElement.side.slice(1).toLowerCase();
            }
            else {
                side = '';
            }
            if (borderElement.color) {
                this.style[`border${side}Color`] = borderElement.color;
            }

            if (borderElement.style) {
                this.style[`border${side}Style`] = borderElement.style;
            }

            if (borderElement.width) {
                this.style[`border${side}Width`] = borderElement.width;
            }
        }

        this.setAttribute("border", val);
    }

    set font(val) {
        let fontElement;

        fontElement = document.querySelector(val);
        if (fontElement) {
            this.style.fontFamily = fontElement.family;
            this.style.fontSize = fontElement.size;
            this.style.fontWeight = fontElement.weight;
        }

        this.setAttribute("font", val);
    }

    set layout(val) {
        let columns, rows;

        switch (val) {
            case Layout.BORDER:
            case Layout.CARD:
            case Layout.GRID:
            case Layout.HBOX:
            case Layout.FLOW:
            case Layout.VBOX:   this.setAttribute("layout", val);
        }
        
        if (this.layout == Layout.GRID) {
            columns = this.getAttribute("columns");
            rows = this.getAttribute("rows");
            if (rows && columns) {
                this.style.gridTemplateColumns = columns;
                this.style.gridTemplateRows = rows;
            }
        }
    }
}
