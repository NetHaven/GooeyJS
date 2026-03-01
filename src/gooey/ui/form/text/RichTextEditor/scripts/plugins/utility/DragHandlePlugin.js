/**
 * DragHandlePlugin provides a drag handle toolbar item descriptor.
 *
 * This is a thin descriptor plugin. The actual drag handle behavior
 * is currently in ClipboardPlugin. In the final integration (Plan 09),
 * drag handle DOM logic can be moved here from ClipboardPlugin.
 *
 * For now, this plugin registers itself and provides a toolbar item descriptor.
 */


import Plugin from '../Plugin.js';

export default class DragHandlePlugin extends Plugin {

    static get pluginName() {
        return "dragHandle";
    }

    /**
     * Return toolbar item descriptors for the drag handle.
     * @returns {Array<object>}
     */
    toolbarItems() {
        return [
            {
                name: "dragHandle",
                type: "custom",
                label: "Drag Handle",
                icon: "dragHandle"
            }
        ];
    }

}
