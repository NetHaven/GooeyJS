import { toggleMark, markActive } from '../../state/Commands.js';
import Plugin from '../Plugin.js';

/**
 * BoldPlugin provides bold mark toggling via Mod-B keybinding
 * and a toolbar button. Delegates to the toggleMark command.
 */
export default class BoldPlugin extends Plugin {
    static get pluginName() { return 'bold'; }

    keymap() {
        return { 'Mod-b': toggleMark('bold') };
    }

    toolbarItems() {
        return [{
            name: 'bold',
            type: 'button',
            command: toggleMark('bold'),
            isActive: (state) => markActive(state, 'bold'),
            label: 'Bold',
            icon: 'bold'
        }];
    }
}
