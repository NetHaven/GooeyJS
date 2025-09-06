import Component from '../Component.js';

export default class MenuItemSeparator extends Component {
    constructor() {
        var clone, template;

        super();
       
        template = document.getElementById("ui-MenuItemSeparator");
        clone = document.importNode(template.content, true);
        this.appendChild(clone);
    }
}
