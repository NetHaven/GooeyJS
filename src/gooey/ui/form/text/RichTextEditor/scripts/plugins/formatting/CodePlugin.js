import { toggleMark, markActive } from '../../state/Commands.js';

/**
 * CodePlugin provides inline code mark toggling via Mod-E keybinding
 * and a toolbar button. Delegates to the toggleMark command.
 */
export default class CodePlugin {
    static get pluginName() { return 'code'; }

    init(editor) { this._editor = editor; }

    keymap() {
        return { 'Mod-e': toggleMark('code') };
    }

    toolbarItems() {
        return [{
            name: 'code',
            type: 'button',
            command: toggleMark('code'),
            isActive: (state) => markActive(state, 'code'),
            label: 'Code',
            icon: 'code'
        }];
    }

    destroy() { this._editor = null; }
}
