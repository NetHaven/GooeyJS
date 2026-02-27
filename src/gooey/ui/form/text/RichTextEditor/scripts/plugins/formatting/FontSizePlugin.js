import { setMark } from '../../state/Commands.js';

/**
 * FontSizePlugin provides font size formatting via toolbar dropdown.
 * No keybinding. Delegates to the setMark command with size attributes.
 */
export default class FontSizePlugin {
    static get pluginName() { return 'fontSize'; }

    init(editor) { this._editor = editor; }

    keymap() {
        return {};
    }

    toolbarItems() {
        return [{
            name: 'fontSize',
            type: 'dropdown',
            command: (size) => setMark('fontSize', { size }),
            label: 'Font Size',
            icon: 'fontSize'
        }];
    }

    destroy() { this._editor = null; }
}
