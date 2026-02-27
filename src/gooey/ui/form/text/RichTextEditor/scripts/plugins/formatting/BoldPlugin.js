import { toggleMark, markActive } from '../../state/Commands.js';

/**
 * BoldPlugin provides bold mark toggling via Mod-B keybinding
 * and a toolbar button. Delegates to the toggleMark command.
 */
export default class BoldPlugin {
    static get pluginName() { return 'bold'; }

    init(editor) { this._editor = editor; }

    keymap() {
        return { 'Mod-b': toggleMark('bold') };
    }

    toolbarItems() {
        return [{
            name: 'bold',
            type: 'button',
            command: toggleMark('bold'),
            isActive: (state) => markActive(state, 'bold'),
            label: 'Bold',
            icon: 'bold'
        }];
    }

    destroy() { this._editor = null; }
}
