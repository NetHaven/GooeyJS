import { toggleMark, markActive } from '../../state/Commands.js';

/**
 * SuperscriptPlugin provides superscript mark toggling via toolbar button.
 * No keybinding. Delegates to the toggleMark command.
 */
export default class SuperscriptPlugin {
    static get pluginName() { return 'superscript'; }

    init(editor) { this._editor = editor; }

    keymap() {
        return {};
    }

    toolbarItems() {
        return [{
            name: 'superscript',
            type: 'button',
            command: toggleMark('superscript'),
            isActive: (state) => markActive(state, 'superscript'),
            label: 'Superscript',
            icon: 'superscript'
        }];
    }

    destroy() { this._editor = null; }
}
