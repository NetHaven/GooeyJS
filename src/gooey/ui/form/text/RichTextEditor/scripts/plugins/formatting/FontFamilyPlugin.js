import { setMark } from '../../state/Commands.js';
import Plugin from '../Plugin.js';

/**
 * FontFamilyPlugin provides font family formatting via toolbar dropdown.
 * No keybinding. Delegates to the setMark command with family attributes.
 */
export default class FontFamilyPlugin extends Plugin {
    static get pluginName() { return 'fontFamily'; }

    toolbarItems() {
        return [{
            name: 'fontFamily',
            type: 'dropdown',
            command: (family) => setMark('fontFamily', { family }),
            label: 'Font Family',
            icon: 'fontFamily'
        }];
    }
}
