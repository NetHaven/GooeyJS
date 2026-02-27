import UIComponent from '../../ui/UIComponent.js';
import Template from '../../util/Template.js';

export default class Application extends UIComponent {
    constructor() {
        super();

        Template.activate("ui-Application", this.shadowRoot);

    }

    connectedCallback() {
        super.connectedCallback?.();
        if (!this._applicationInit) {
            this._applicationInit = true;
            this.classList.add("ui-Application");
            if (!this.hasAttribute("width")) {
                this.style.width = "100vw";
            }
            if (!this.hasAttribute("height")) {
                this.style.height = "100vh";
            }
            this.style.margin = "0";
            this.style.padding = "0";
            this.style.overflow = "hidden";
            this.style.position = "relative";
        }
    }
}