import Component from '../Component.js';
import Template from '../../util/Template.js';

export default class MenuItemSeparator extends Component {
    static get observedAttributes() {
        return [...super.observedAttributes];
    }

    constructor() {
        super();
       
        Template.activate("ui-MenuItemSeparator", this);
    }
}
