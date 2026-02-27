import { toggleLink, markActive } from '../../state/Commands.js';

/**
 * LinkPlugin provides link mark toggling via Mod-K keybinding
 * and a toolbar button. The toggleLink command handles unlinking;
 * link creation delegates to the editor for a dialog.
 */
export default class LinkPlugin {
    static get pluginName() { return 'link'; }

    init(editor) { this._editor = editor; }

    keymap() {
        return { 'Mod-k': toggleLink };
    }

    toolbarItems() {
        return [{
            name: 'link',
            type: 'button',
            command: () => {
                if (this._editor && typeof this._editor._handleLinkCommand === 'function') {
                    this._editor._handleLinkCommand(this._editor._state, (tr) => this._editor._dispatch(tr));
                }
            },
            isActive: (state) => markActive(state, 'link'),
            label: 'Link',
            icon: 'link'
        }];
    }

    destroy() { this._editor = null; }
}
