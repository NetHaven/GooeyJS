import { toggleMark, markActive } from '../../state/Commands.js';

/**
 * StrikethroughPlugin provides strikethrough mark toggling via Mod-Shift-S
 * keybinding and a toolbar button. Delegates to the toggleMark command.
 */
export default class StrikethroughPlugin {
    static get pluginName() { return 'strikethrough'; }

    init(editor) { this._editor = editor; }

    keymap() {
        return { 'Mod-Shift-s': toggleMark('strikethrough') };
    }

    toolbarItems() {
        return [{
            name: 'strikethrough',
            type: 'button',
            command: toggleMark('strikethrough'),
            isActive: (state) => markActive(state, 'strikethrough'),
            label: 'Strikethrough',
            icon: 'strikethrough'
        }];
    }

    destroy() { this._editor = null; }
}
