import { toggleMark, markActive } from '../../state/Commands.js';

/**
 * ItalicPlugin provides italic mark toggling via Mod-I keybinding
 * and a toolbar button. Delegates to the toggleMark command.
 */
export default class ItalicPlugin {
    static get pluginName() { return 'italic'; }

    init(editor) { this._editor = editor; }

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

    destroy() { this._editor = null; }
}
