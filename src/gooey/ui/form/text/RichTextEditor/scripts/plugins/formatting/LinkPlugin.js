import { toggleLink, markActive } from '../../state/Commands.js';
import Plugin from '../Plugin.js';

/**
 * LinkPlugin provides link mark toggling via Mod-K keybinding
 * and a toolbar button. The toggleLink command handles unlinking;
 * link creation delegates to the editor for a dialog.
 */
export default class LinkPlugin extends Plugin {
    static get pluginName() { return 'link'; }

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
}
