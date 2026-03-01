import { toggleMark, markActive } from '../../state/Commands.js';
import Plugin from '../Plugin.js';

/**
 * SuperscriptPlugin provides superscript mark toggling via toolbar button.
 * No keybinding. Delegates to the toggleMark command.
 */
export default class SuperscriptPlugin extends Plugin {
    static get pluginName() { return 'superscript'; }

    toolbarItems() {
        return [{
            name: 'superscript',
            type: 'button',
            command: toggleMark('superscript'),
            isActive: (state) => markActive(state, 'superscript'),
            label: 'Superscript',
            icon: 'superscript'
        }];
    }
}
