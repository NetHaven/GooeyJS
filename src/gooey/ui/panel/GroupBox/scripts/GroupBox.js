import Panel from '../../Panel/scripts/Panel.js';
import Template from '../../../../util/Template.js';

export default class GroupBox extends Panel {
    constructor() {
        super();
        
        Template.activate("ui-GroupBox", this);
        this.classList.add("ui-GroupBox");
        
        this.contentPanel = this.querySelector('div');
        this.textLabel = this.querySelector('span');
        
        if (this.hasAttribute("text")) {
            this.text = this.getAttribute("text");
        }
    }
    
    connectedCallback() {
        super.connectedCallback && super.connectedCallback();
        
        const children = Array.from(this.childNodes);
        children.forEach(child => {
            if (child !== this.contentPanel && child !== this.textLabel) {
                this.contentPanel.appendChild(child);
            }
        });
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
    
    static get observedAttributes() {
        return [...super.observedAttributes, 'text'];
    }
    
    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'text') {
            this.text = newValue;
        }
    }
}