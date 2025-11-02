import Container from '../Container.js';
import ToolbarButtonSize from './ToolbarButtonSize.js';
import Template from '../../util/Template.js';

export default class Toolbar extends Container {
    static get observedAttributes() {
        return [...super.observedAttributes, 'buttonsize', 'wrap'];
    }

    constructor () {
        super();
        
        Template.activate("ui-Toolbar", this);

        // Check for wrap attribute during initialization
        if (this.hasAttribute("wrap")) {
            this.wrap = true;
        }
    }

    get buttonSize() {
        return this.getAttribute("buttonsize");
    }

    set buttonSize(val) {
        switch (val) {
            case ToolbarButtonSize.TINY:
            case ToolbarButtonSize.SMALL:
            case ToolbarButtonSize.MEDIUM:
            case ToolbarButtonSize.LARGE: 
            case ToolbarButtonSize.XLARGE: this.setAttribute("buttonsize", val);
        }
    }

    get wrap() {
        return this.hasAttribute("wrap");
    }

    set wrap(val) {
        if (val) {
            this.setAttribute("wrap", "");
            this.style.flexWrap = "wrap";
        } else {
            this.removeAttribute("wrap");
            this.style.flexWrap = "nowrap";
        }
    }
}
