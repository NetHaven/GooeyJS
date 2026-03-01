import { toggleMark, markActive } from '../../state/Commands.js';
import Plugin from '../Plugin.js';

/**
 * SubscriptPlugin provides subscript mark toggling via toolbar button.
 * No keybinding. Delegates to the toggleMark command.
 */
export default class SubscriptPlugin extends Plugin {
    static get pluginName() { return 'subscript'; }

    toolbarItems() {
        return [{
            name: 'subscript',
            type: 'button',
            command: toggleMark('subscript'),
            isActive: (state) => markActive(state, 'subscript'),
            label: 'Subscript',
            icon: 'subscript'
        }];
    }
}
