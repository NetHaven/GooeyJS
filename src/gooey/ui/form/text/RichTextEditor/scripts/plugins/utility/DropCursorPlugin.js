/**
 * DropCursorPlugin provides a drop cursor visual indicator descriptor.
 *
 * This is a thin descriptor plugin. The actual drop cursor behavior
 * is currently in ClipboardPlugin. In the final integration (Plan 09),
 * drop cursor DOM logic can be moved here from ClipboardPlugin.
 *
 * For now, this plugin registers itself and provides a toolbar item descriptor.
 */


export default class DropCursorPlugin {

    static get pluginName() {
        return "dropCursor";
    }

    /**
     * Called when plugin is registered with the editor.
     * @param {object} editor - RichTextEditor instance
     */
    init(editor) {
        this._editor = editor;
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

    /**
     * Cleanup when plugin is unregistered.
     */
    destroy() {
        this._editor = null;
    }
}
