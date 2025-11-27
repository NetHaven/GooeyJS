import LayoutAlign from './LayoutAlign.js';
import LayoutDirection from './LayoutDirection.js';
import LayoutJustify from './LayoutJustify.js';
import LayoutType from './LayoutType.js';
import LayoutWrap from './LayoutWrap.js';

export default class Layout {
    constructor() {
        if (!this.type) {
            this.type = LayoutType.FLOW;
        }
    }

    get align() {
        return this.getAttribute("align");
    }

    get direction() {
        return this.getAttribute("direction");
    }

    get justify() {
        return this.getAttribute("justify");
    }

    get type() {
        return this.getAttribute("type");
    }

    get wrap() {
        return this.getAttribute("wrap");
    }

    set align(val) {
        switch (val)  {
            case LayoutAlign.BASELINE: 
            case LayoutAlign.CENTER:
            case LayoutAlign.END:
            case LayoutAlign.START: 
            case LayoutAlign.STRETCH: this.setAttribute("align", val);
        }
    }

    set direction(val) {
        switch (val)  {
            case LayoutDirection.COLUMN:
            case LayoutDirection.COLUMN_REVERSE:
            case LayoutDirection.ROW:
            case LayoutDirection.ROW_REVERSE: this.setAttribute("direction", val);
        }
    }

    set justify(val) {
        switch (val)  {
            case LayoutJustify.CENTER: 
            case LayoutJustify.END:
            case LayoutJustify.START:
            case LayoutJustify.SPACE_AROUND:
            case LayoutJustify.SPACE_BETWEEN:
            case LayoutJustify.SPACE_EVENLY: this.setAttribute("justify", val);
        }
    }

    set type(val) {
        switch (val)  {
            case LayoutType.BORDER:
            case LayoutType.CARD:
            case LayoutType.FLOW:
            case LayoutType.GRID:
            case LayoutType.BOX: this.setAttribute("type", val);    
        }
    }

    set wrap(val) {
        switch (val)  {
            case LayoutWrap.NO_WRAP: 
            case LayoutWrap.WRAP:
            case LayoutWrap.WRAP_REVERSE: this.setAttribute("wrap", val);
        }
    }
}
