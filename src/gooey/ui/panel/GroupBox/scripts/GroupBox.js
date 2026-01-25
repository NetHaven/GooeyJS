import Panel from '../../Panel/scripts/Panel.js';
import Template from '../../../../util/Template.js';

export default class GroupBox extends Panel {
    constructor() {
        super();

        // Panel already created shadowRoot, so we append to it
        Template.activate("ui-GroupBox", this.shadowRoot);
        this.classList.add("ui-GroupBox");

        this.contentPanel = this.shadowRoot.querySelector('div');
        this.textLabel = this.shadowRoot.querySelector('span');
        
        if (this.hasAttribute("text")) {
            this.text = this.getAttribute("text");
        }
    }
    
    connectedCallback() {
        super.connectedCallback && super.connectedCallback();

        // With shadow DOM and slot, children are automatically projected
        // No need to manually move them
    }
    
    get text() {
        return this.getAttribute("text");
    }
    
    set text(val) {
        if (val) {
            this.textLabel.textContent = val;
            this.textLabel.style.display = 'block';
            this.setAttribute("text", val);
        } else {
            this.textLabel.style.display = 'none';
            this.removeAttribute("text");
        }
    }

    attributeChangedCallback(name, oldValue, newValue) {
        super.attributeChangedCallback?.(name, oldValue, newValue);
        if (name === 'text') {
            this.text = newValue;
        }
    }
}