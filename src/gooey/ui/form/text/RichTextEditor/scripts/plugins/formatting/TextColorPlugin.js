import { setMark } from '../../state/Commands.js';

/**
 * TextColorPlugin provides text color formatting via toolbar color picker.
 * No keybinding. Delegates to the setMark command with color attributes.
 */
export default class TextColorPlugin {
    static get pluginName() { return 'textColor'; }

    init(editor) { this._editor = editor; }

    keymap() {
        return {};
    }

    toolbarItems() {
        return [{
            name: 'textColor',
            type: 'colorPicker',
            command: (color) => setMark('textColor', { color }),
            label: 'Text Color',
            icon: 'textColor'
        }];
    }

    destroy() { this._editor = null; }
}
