import { setMark } from '../../state/Commands.js';
import Plugin from '../Plugin.js';

/**
 * BackgroundColorPlugin provides background color formatting via toolbar
 * color picker. No keybinding. Delegates to the setMark command with
 * color attributes.
 */
export default class BackgroundColorPlugin extends Plugin {
    static get pluginName() { return 'backgroundColor'; }

    toolbarItems() {
        return [{
            name: 'backgroundColor',
            type: 'colorPicker',
            command: (color) => setMark('backgroundColor', { color }),
            label: 'Background Color',
            icon: 'backgroundColor'
        }];
    }
}
