import Component from '../Component.js';
import Template from '../../util/Template.js';

export default class MenuItemSeparator extends Component {
    constructor() {
        super();
       
        Template.activate("ui-MenuItemSeparator", this);
    }
}
