import { setMark } from '../../state/Commands.js';
import Plugin from '../Plugin.js';

/**
 * FontSizePlugin provides font size formatting via toolbar dropdown.
 * No keybinding. Delegates to the setMark command with size attributes.
 */
export default class FontSizePlugin extends Plugin {
    static get pluginName() { return 'fontSize'; }

    toolbarItems() {
        return [{
            name: 'fontSize',
            type: 'dropdown',
            command: (size) => setMark('fontSize', { size }),
            label: 'Font Size',
            icon: 'fontSize'
        }];
    }
}
