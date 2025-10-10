import BorderStyle from './BorderStyle.js';

export default class Border {
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
