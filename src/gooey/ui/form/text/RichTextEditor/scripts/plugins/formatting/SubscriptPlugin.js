import { toggleMark, markActive } from '../../state/Commands.js';

/**
 * SubscriptPlugin provides subscript mark toggling via toolbar button.
 * No keybinding. Delegates to the toggleMark command.
 */
export default class SubscriptPlugin {
    static get pluginName() { return 'subscript'; }

    init(editor) { this._editor = editor; }

    keymap() {
        return {};
    }

    toolbarItems() {
        return [{
            name: 'subscript',
            type: 'button',
            command: toggleMark('subscript'),
            isActive: (state) => markActive(state, 'subscript'),
            label: 'Subscript',
            icon: 'subscript'
        }];
    }

    destroy() { this._editor = null; }
}
