import Component from './Component.js';

export default class Application extends Component {
    constructor() {
        super();

        this.classList.add("ui-Application");
        
        // Application is the root container, set default full viewport dimensions
        if (!this.hasAttribute("width")) {
            this.style.width = "100vw";
        }
        
        if (!this.hasAttribute("height")) {
            this.style.height = "100vh";
        }
        
        // Set application-level styling
        this.style.margin = "0";
        this.style.padding = "0";
        this.style.overflow = "hidden";
        this.style.position = "relative";
    }
}