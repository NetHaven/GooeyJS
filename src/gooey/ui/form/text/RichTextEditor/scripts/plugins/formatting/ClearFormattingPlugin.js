import { clearFormatting } from '../../state/Commands.js';
import Plugin from '../Plugin.js';

/**
 * ClearFormattingPlugin removes all marks from the selection via Mod-\
 * keybinding and a toolbar button. Delegates to the clearFormatting command.
 */
export default class ClearFormattingPlugin extends Plugin {
    static get pluginName() { return 'clearFormatting'; }

    keymap() {
        return { 'Mod-\\': clearFormatting };
    }

    toolbarItems() {
        return [{
            name: 'clearFormatting',
            type: 'button',
            command: clearFormatting,
            label: 'Clear Formatting',
            icon: 'clearFormatting'
        }];
    }
}
