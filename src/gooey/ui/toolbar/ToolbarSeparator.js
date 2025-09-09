import Component from '../Component.js';

export default class ToolbarSeparator extends Component {
    constructor() {
        var clone, template;

        super();

        template = document.getElementById("ui-ToolbarSeparator");
        clone = document.importNode(template.content, true);
        this.appendChild(clone);
    }
}
