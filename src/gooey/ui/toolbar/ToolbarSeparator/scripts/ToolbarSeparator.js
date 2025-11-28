import UIComponent from '../../../UIComponent.js';

export default class ToolbarSeparator extends UIComponent {
    constructor() {
        var clone, template;

        super();

        template = document.getElementById("ui-ToolbarSeparator");
        clone = document.importNode(template.content, true);
        this.appendChild(clone);
    }
}
