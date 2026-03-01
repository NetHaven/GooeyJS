/**
 * DropCursorPlugin provides a drop cursor visual indicator descriptor.
 *
 * This is a thin descriptor plugin. The actual drop cursor behavior
 * is currently in ClipboardPlugin. In the final integration (Plan 09),
 * drop cursor DOM logic can be moved here from ClipboardPlugin.
 *
 * For now, this plugin registers itself and provides a toolbar item descriptor.
 */


import Plugin from '../Plugin.js';

export default class DropCursorPlugin extends Plugin {

    static get pluginName() {
        return "dropCursor";
    }

    /**
     * Return toolbar item descriptors for the drop cursor.
     * @returns {Array<object>}
     */
    toolbarItems() {
        return [
            {
                name: "dropCursor",
                type: "custom",
                label: "Drop Cursor",
                icon: "dropCursor"
            }
        ];
    }

}
