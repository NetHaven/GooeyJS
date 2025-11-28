import FormElement from "../../FormElement.js";
import Template from "../../../../util/Template.js";

export default class TimePicker extends FormElement {
    constructor() {
        super();

        Template.activate("ui-TimePicker", this);
        this.timeElement = this.querySelector("input");

        if (this.hasAttribute("max")) {
            this.max = this.getAttribute("max");
        }

        if (this.hasAttribute("min")) {
            this.min = this.getAttribute("min");
        }
    }

    get max() {
        if (this.timeElement) {
            return this.timeElement.getAttribute("max");
        }
        return null;
    }

    get min() {
        if (this.timeElement) {
            return this.timeElement.getAttribute("min");
        }
        return null;
    }

    set max(value) {
        if (value) {
            this.setAttribute("max", value);
            if (this.timeElement) {
                this.timeElement.setAttribute("max", value);
            }
        }
    } 

    set min(value) {
        if (value) {
            this.setAttribute("min", value);
            if (this.timeElement) {
                this.timeElement.setAttribute("min", value);
            }
        }
    } 
}