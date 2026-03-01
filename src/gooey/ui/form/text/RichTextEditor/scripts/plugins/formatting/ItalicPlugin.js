import { toggleMark, markActive } from '../../state/Commands.js';
import Plugin from '../Plugin.js';

/**
 * ItalicPlugin provides italic mark toggling via Mod-I keybinding
 * and a toolbar button. Delegates to the toggleMark command.
 */
export default class ItalicPlugin extends Plugin {
    static get pluginName() { return 'italic'; }

    keymap() {
        return { 'Mod-i': toggleMark('italic') };
    }

    toolbarItems() {
        return [{
            name: 'italic',
            type: 'button',
            command: toggleMark('italic'),
            isActive: (state) => markActive(state, 'italic'),
            label: 'Italic',
            icon: 'italic'
        }];
    }
}
