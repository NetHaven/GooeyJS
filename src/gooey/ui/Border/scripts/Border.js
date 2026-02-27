import BorderStyle from './BorderStyle.js';
import GooeyElement from '../../../GooeyElement.js';
import Template from '../../../util/Template.js';

export default class Border extends GooeyElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        Template.activate("ui-Border", this.shadowRoot);
    }

    get color() {
        return this.getAttribute("color");
    }

    get style() {
        return this.getAttribute("style");
    }

    get width() {
        return this.getAttribute("color");
    }

    set color(val) {
        this.setAttribute("color", val);
    }

    set style(val) {
        switch(val) {
            case BorderStyle.DASHED:
            case BorderStyle.DOTTED:
            case BorderStyle.DOUBLE:
            case BorderStyle.GROOVE:
            case BorderStyle.HIDDEN:
            case BorderStyle.INSET:
            case BorderStyle.NONE:
            case BorderStyle.OUTSET:
            case BorderStyle.RIDGE:
            case BorderStyle.SOLID: this.setAttribute("style", val);
        }
    }

    set width(val) {
        this.setAttribute("width", val);
    }
}
