import UIComponent from '../UIComponent.js';
import Template from '../../util/Template.js';

export default class MenuItemSeparator extends UIComponent {
    static get observedAttributes() {
        return [...super.observedAttributes];
    }

    constructor() {
        super();
       
        Template.activate("ui-MenuItemSeparator", this);
    }
}
