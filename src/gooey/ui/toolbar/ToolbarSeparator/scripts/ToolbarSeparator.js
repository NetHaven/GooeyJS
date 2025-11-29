import UIComponent from '../../../UIComponent.js';
import Template from '../../../../util/Template.js';

export default class ToolbarSeparator extends UIComponent {
    constructor() {
        super();

        Template.activate("ui-ToolbarSeparator", this.shadowRoot);
    }
}
