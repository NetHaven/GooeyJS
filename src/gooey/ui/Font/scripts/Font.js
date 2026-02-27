import FontWeight from "./FontWeight.js";
import Template from "../../../util/Template.js";
import GooeyElement from "../../../GooeyElement.js";

export default class Font extends GooeyElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        Template.activate("ui-Font", this.shadowRoot);
    }
    
    get family() {
        return this.getAttribute("family");
    }

    get size() {
        return this.getAttribute("size");
    }

    get weight() {
        return this.getAttribute("weight");
    }

    set family(val) {
        this.setAttribute("family", val);
    }

    set size(val) {
        this.setAttribute("size", val);
    }

    set weight(val) {
        switch (val) {
            case FontWeight.NORMAL:
            case FontWeight.BOLD:   this.setAttribute("weight", val);
        }
    }
}
