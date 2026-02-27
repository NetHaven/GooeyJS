import { setMark } from '../../state/Commands.js';

/**
 * FontFamilyPlugin provides font family formatting via toolbar dropdown.
 * No keybinding. Delegates to the setMark command with family attributes.
 */
export default class FontFamilyPlugin {
    static get pluginName() { return 'fontFamily'; }

    init(editor) { this._editor = editor; }

    keymap() {
        return {};
    }

    toolbarItems() {
        return [{
            name: 'fontFamily',
            type: 'dropdown',
            command: (family) => setMark('fontFamily', { family }),
            label: 'Font Family',
            icon: 'fontFamily'
        }];
    }

    destroy() { this._editor = null; }
}
