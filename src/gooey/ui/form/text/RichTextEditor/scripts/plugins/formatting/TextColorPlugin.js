import { setMark } from '../../state/Commands.js';
import Plugin from '../Plugin.js';

/**
 * TextColorPlugin provides text color formatting via toolbar color picker.
 * No keybinding. Delegates to the setMark command with color attributes.
 */
export default class TextColorPlugin extends Plugin {
    static get pluginName() { return 'textColor'; }

    toolbarItems() {
        return [{
            name: 'textColor',
            type: 'colorPicker',
            command: (color) => setMark('textColor', { color }),
            label: 'Text Color',
            icon: 'textColor'
        }];
    }
}
