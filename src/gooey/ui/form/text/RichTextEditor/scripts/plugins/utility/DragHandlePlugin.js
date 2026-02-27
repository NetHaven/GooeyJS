/**
 * DragHandlePlugin provides a drag handle toolbar item descriptor.
 *
 * This is a thin descriptor plugin. The actual drag handle behavior
 * is currently in ClipboardPlugin. In the final integration (Plan 09),
 * drag handle DOM logic can be moved here from ClipboardPlugin.
 *
 * For now, this plugin registers itself and provides a toolbar item descriptor.
 */


export default class DragHandlePlugin {

    static get pluginName() {
        return "dragHandle";
    }

    /**
     * Called when plugin is registered with the editor.
     * @param {object} editor - RichTextEditor instance
     */
    init(editor) {
        this._editor = editor;
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

    /**
     * Cleanup when plugin is unregistered.
     */
    destroy() {
        this._editor = null;
    }
}
