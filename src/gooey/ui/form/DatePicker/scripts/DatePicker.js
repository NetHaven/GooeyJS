import FormElement from "../../FormElement.js";
import Template from "../../../../util/Template.js";

export default class DatePicker extends FormElement {
    constructor() {
        super();

        Template.activate("ui-DatePicker", this);
        this.dateElement = this.querySelector("input");

        if (this.hasAttribute("max")) {
            this.max = this.getAttribute("max");
        }

        if (this.hasAttribute("min")) {
            this.min = this.getAttribute("min");
        }

        if (this.hasAttribute("step")) {
            this.step = this.getAttribute("step");
        }
    }

    get max() {
        if (this.dateElement) {
            return this.dateElement.getAttribute("max");
        }
        return null;
    }

    get min() {
        if (this.dateElement) {
            return this.dateElement.getAttribute("min");
        }
        return null;
    }

    get step() {
        if (this.dateElement) {
            return this.dateElement.getAttribute("step");
        }
        return null;
    }

    set max(value) {
        if (value) {
            this.setAttribute("max", value);
            if (this.dateElement) {
                this.dateElement.setAttribute("max", value);
            }
        }
    } 

    set min(value) {
        if (value) {
            this.setAttribute("min", value);
            if (this.dateElement) {
                this.dateElement.setAttribute("min", value);
            }
        }
    } 

    set step(value) {
        if (value) {
            this.setAttribute("step", value);
            if (this.dateElement) {
                this.dateElement.setAttribute("step", value);
            }
        }
    } 
}