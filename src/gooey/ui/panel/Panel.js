import Container from '../Container.js';
import Layout from '../Layout.js';

export default class Panel extends Container {
    constructor () {
        super();

        this.layout = Layout.FLOW;
        
        // Add support for title attribute
        if (this.hasAttribute("title")) {
            this.title = this.getAttribute("title");
        }
    }
    
    get title() {
        return this.getAttribute("title");
    }
    
    set title(val) {
        this.setAttribute("title", val);
    }
}
