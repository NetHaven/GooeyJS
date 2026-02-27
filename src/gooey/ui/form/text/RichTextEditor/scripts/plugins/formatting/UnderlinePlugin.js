import { toggleMark, markActive } from '../../state/Commands.js';

/**
 * UnderlinePlugin provides underline mark toggling via Mod-U keybinding
 * and a toolbar button. Delegates to the toggleMark command.
 */
export default class UnderlinePlugin {
    static get pluginName() { return 'underline'; }

    init(editor) { this._editor = editor; }

    keymap() {
        return { 'Mod-u': toggleMark('underline') };
    }

    toolbarItems() {
        return [{
            name: 'underline',
            type: 'button',
            command: toggleMark('underline'),
            isActive: (state) => markActive(state, 'underline'),
            label: 'Underline',
            icon: 'underline'
        }];
    }

    destroy() { this._editor = null; }
}
