import { setMark } from '../../state/Commands.js';

/**
 * BackgroundColorPlugin provides background color formatting via toolbar
 * color picker. No keybinding. Delegates to the setMark command with
 * color attributes.
 */
export default class BackgroundColorPlugin {
    static get pluginName() { return 'backgroundColor'; }

    init(editor) { this._editor = editor; }

    keymap() {
        return {};
    }

    toolbarItems() {
        return [{
            name: 'backgroundColor',
            type: 'colorPicker',
            command: (color) => setMark('backgroundColor', { color }),
            label: 'Background Color',
            icon: 'backgroundColor'
        }];
    }

    destroy() { this._editor = null; }
}
