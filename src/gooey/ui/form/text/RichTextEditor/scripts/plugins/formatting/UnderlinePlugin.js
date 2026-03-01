import { toggleMark, markActive } from '../../state/Commands.js';
import Plugin from '../Plugin.js';

/**
 * UnderlinePlugin provides underline mark toggling via Mod-U keybinding
 * and a toolbar button. Delegates to the toggleMark command.
 */
export default class UnderlinePlugin extends Plugin {
    static get pluginName() { return 'underline'; }

    keymap() {
        return { 'Mod-u': toggleMark('underline') };
    }

    toolbarItems() {
        return [{
            name: 'underline',
            type: 'button',
            command: toggleMark('underline'),
            isActive: (state) => markActive(state, 'underline'),
            label: 'Underline',
            icon: 'underline'
        }];
    }
}
