import Panel from './Panel.js';

export default class GroupBox extends Panel {
    constructor() {
        super();
        
        this.classList.add("ui-GroupBox");
        
        this.contentPanel = document.createElement('div');
        this.contentPanel.classList.add('ui-GroupBox-content');
        
        this.textLabel = document.createElement('span');
        this.textLabel.classList.add('ui-GroupBox-text');
        
        this.appendChild(this.contentPanel);
        this.appendChild(this.textLabel);
        
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
        return ['text'];
    }
    
    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'text') {
            this.text = newValue;
        }
    }
}