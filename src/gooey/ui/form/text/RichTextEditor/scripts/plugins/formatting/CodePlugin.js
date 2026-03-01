import { toggleMark, markActive } from '../../state/Commands.js';
import Plugin from '../Plugin.js';

/**
 * CodePlugin provides inline code mark toggling via Mod-E keybinding
 * and a toolbar button. Delegates to the toggleMark command.
 */
export default class CodePlugin extends Plugin {
    static get pluginName() { return 'code'; }

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
}
