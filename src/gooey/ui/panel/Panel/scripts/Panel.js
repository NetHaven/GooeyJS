import Container from '../../../Container.js';
import LayoutType from '../../../layout/Layout/scripts/LayoutType.js';
import Template from '../../../../util/Template.js';

export default class Panel extends Container {
    constructor () {
        super();

        Template.activate("ui-Panel", this);
        this.layout = LayoutType.FLOW;

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
