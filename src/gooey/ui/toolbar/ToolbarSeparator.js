import Component from '../Component.js';

export default class ToolbarSeparator extends Component {
    static get observedAttributes() {
        return [...super.observedAttributes];
    }

    constructor() {
        var clone, template;

        super();

        template = document.getElementById("ui-ToolbarSeparator");
        clone = document.importNode(template.content, true);
        this.appendChild(clone);
    }
}
