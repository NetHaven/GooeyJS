import FontWeight from "./FontWeight.js";
import Template from "../../util/Template.js";

export default class Font {
    constructor() {
        Template.activate("ui-Font", this);
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
