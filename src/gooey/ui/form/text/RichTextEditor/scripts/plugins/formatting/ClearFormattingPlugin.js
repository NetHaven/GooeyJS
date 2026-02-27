import { clearFormatting } from '../../state/Commands.js';

/**
 * ClearFormattingPlugin removes all marks from the selection via Mod-\
 * keybinding and a toolbar button. Delegates to the clearFormatting command.
 */
export default class ClearFormattingPlugin {
    static get pluginName() { return 'clearFormatting'; }

    init(editor) { this._editor = editor; }

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

    destroy() { this._editor = null; }
}
