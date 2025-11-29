import UIComponent from '../../../UIComponent.js';
import Template from '../../../../util/Template.js';

export default class MenuItemSeparator extends UIComponent {
    constructor() {
        super();
       
        Template.activate("ui-MenuItemSeparator", this.shadowRoot);
    }
}
