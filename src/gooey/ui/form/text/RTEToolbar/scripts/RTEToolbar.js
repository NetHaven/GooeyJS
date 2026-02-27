import UIComponent from '../../../../UIComponent.js';
import RTEToolbarEvent from '../../../../../events/form/text/RTEToolbarEvent.js';
import RichTextEditorEvent from '../../../../../events/form/text/RichTextEditorEvent.js';
import Template from '../../../../../util/Template.js';

/**
 * RTEToolbar component - standalone toolbar for the RichTextEditor.
 *
 * Supports four binding modes (in precedence order):
 *   1. Editor toolbar attribute: editor sets `toolbar="<id>"` pointing to this toolbar
 *   2. Editor attribute: `<gooeyui-rte-toolbar editor="editorId">`
 *   3. Group attribute: `<gooeyui-rte-toolbar group="groupName">`
 *   4. Child auto-binding: toolbar placed as child of `<gooeyui-richtexteditor>`
 *
 * The toolbar receives editor state events (textcursormove, modelChanged)
 * and updates button active/disabled states accordingly.
 */
export default class RTEToolbar extends UIComponent {
    constructor() {
        super();

        Template.activate("ui-RTEToolbar", this.shadowRoot);

        this._toolbarItems = this.shadowRoot.querySelector('.rte-toolbar-items');
        this._toolbarContainer = this.shadowRoot.querySelector('.rte-toolbar-container');

        // Bound editor reference
        this._editor = null;

        // Group binding state
        this._group = null;
        this._groupEditors = [];
        this._groupFocusHandlers = new Map();

        // Bound update handler for editor events
        this._boundUpdateHandler = this._onEditorStateChange.bind(this);
        this._boundModelHandler = this._onEditorModelChange.bind(this);

        // Custom toolbar items registered directly
        this._customItems = new Map();

        // Register valid events
        this.addValidEvent(RTEToolbarEvent.ACTION);
        this.addValidEvent(RTEToolbarEvent.BOUND);
        this.addValidEvent(RTEToolbarEvent.UNBOUND);

        // Initialize attributes from HTML
        if (this.hasAttribute('layout')) {
            this._layout = this.getAttribute('layout');
        }
        if (this.hasAttribute('position')) {
            // position is handled by CSS via :host([position=...])
        }
    }

    connectedCallback() {
        if (super.connectedCallback) {
            super.connectedCallback();
        }

        if (!this._rteToolbarInit) {
            this._rteToolbarInit = true;
            this.classList.add('ui-RTEToolbar');
        }

        // Resolve binding after DOM is connected
        this._resolveBinding();
    }

    disconnectedCallback() {
        // Unbind from editor
        this._unbindFromEditor();

        // Clean up group listeners
        this._tearDownGroupBinding();

        if (super.disconnectedCallback) {
            super.disconnectedCallback();
        }
    }

    attributeChangedCallback(name, oldValue, newValue) {
        // Guard against infinite recursion
        if (oldValue === newValue) return;

        super.attributeChangedCallback?.(name, oldValue, newValue);

        switch (name) {
            case 'editor':
                this._unbindFromEditor();
                if (newValue) {
                    this._bindToEditorById(newValue);
                }
                break;
            case 'group':
                this._tearDownGroupBinding();
                if (newValue) {
                    this._setupGroupBinding(newValue);
                }
                break;
            case 'layout':
                this._layout = newValue;
                break;
            case 'position':
                // CSS handles position via :host([position=...])
                break;
            case 'sticky':
                // CSS handles sticky via :host([sticky])
                break;
            case 'disabled':
                // CSS handles disabled via :host([disabled])
                break;
        }
    }

    // =========================================================================
    // Properties
    // =========================================================================

    /**
     * Get the bound editor.
     * @returns {HTMLElement|null}
     */
    get editor() {
        return this._editor;
    }

    /**
     * Set the editor to bind to.
     * @param {HTMLElement|string} val - Editor element or ID string
     */
    set editor(val) {
        this._unbindFromEditor();

        if (!val) {
            this.removeAttribute('editor');
            return;
        }

        if (typeof val === 'string') {
            this.setAttribute('editor', val);
            this._bindToEditorById(val);
        } else if (val instanceof HTMLElement) {
            this._bindToEditor(val);
        }
    }

    /**
     * Get the group name.
     * @returns {string|null}
     */
    get group() {
        return this.getAttribute('group');
    }

    /**
     * Set the group name for group binding.
     * @param {string|null} val
     */
    set group(val) {
        this._tearDownGroupBinding();
        if (val) {
            this.setAttribute('group', val);
            this._setupGroupBinding(val);
        } else {
            this.removeAttribute('group');
        }
    }

    /**
     * Get the toolbar layout.
     * @returns {string}
     */
    get layout() {
        return this.getAttribute('layout') || 'full';
    }

    /**
     * Set the toolbar layout.
     * @param {string} val
     */
    set layout(val) {
        this.setAttribute('layout', val);
    }

    /**
     * Get the toolbar position.
     * @returns {string}
     */
    get position() {
        return this.getAttribute('position') || 'top';
    }

    /**
     * Set the toolbar position.
     * @param {string} val
     */
    set position(val) {
        this.setAttribute('position', val);
    }

    /**
     * Get the sticky state.
     * @returns {boolean}
     */
    get sticky() {
        return this.hasAttribute('sticky');
    }

    /**
     * Set the sticky state.
     * @param {boolean} val
     */
    set sticky(val) {
        if (val) {
            this.setAttribute('sticky', '');
        } else {
            this.removeAttribute('sticky');
        }
    }

    // =========================================================================
    // Binding System
    // =========================================================================

    /**
     * Resolve which binding mode to use.
     * Checks in precedence order: child, editor attr, group attr.
     * Mode 1 (toolbar ID) is initiated from the editor side.
     * @private
     */
    _resolveBinding() {
        // Mode 4: Child auto-binding — if parent is a RichTextEditor
        const parent = this.parentElement;
        if (parent && parent.tagName &&
            parent.tagName.toLowerCase() === 'gooeyui-richtexteditor') {
            this._bindToEditor(parent);
            return;
        }

        // Mode 2: editor attribute — bind to editor by ID
        const editorAttr = this.getAttribute('editor');
        if (editorAttr) {
            this._bindToEditorById(editorAttr);
            return;
        }

        // Mode 3: group attribute — set up group binding
        const groupAttr = this.getAttribute('group');
        if (groupAttr) {
            this._setupGroupBinding(groupAttr);
            return;
        }

        // Mode 1 is handled externally: editor calls _bindToEditor(editor)
    }

    /**
     * Bind to an editor by element ID.
     * @param {string} id - Element ID of the editor
     * @private
     */
    _bindToEditorById(id) {
        const el = document.getElementById(id);
        if (el && el.tagName &&
            el.tagName.toLowerCase() === 'gooeyui-richtexteditor') {
            this._bindToEditor(el);
        } else {
            // Editor not found yet — try again after a microtask
            // (handles case where toolbar is defined before editor in DOM)
            Promise.resolve().then(() => {
                const deferred = document.getElementById(id);
                if (deferred && deferred.tagName &&
                    deferred.tagName.toLowerCase() === 'gooeyui-richtexteditor') {
                    this._bindToEditor(deferred);
                }
            });
        }
    }

    /**
     * Bind this toolbar to an editor instance.
     * Attaches event listeners for state changes and fires BOUND event.
     * @param {HTMLElement} editor - RichTextEditor element
     */
    _bindToEditor(editor) {
        if (this._editor === editor) return;

        // Unbind previous editor if any
        if (this._editor) {
            this._unbindFromEditor();
        }

        this._editor = editor;

        // Listen for state change events from the editor
        try {
            this._editor.addEventListener(
                RichTextEditorEvent.TEXT_CURSOR_MOVE,
                this._boundUpdateHandler
            );
            this._editor.addEventListener(
                RichTextEditorEvent.MODEL_CHANGED,
                this._boundModelHandler
            );
        } catch (e) {
            // Editor may not support addEventListener yet
        }

        // Fire BOUND event
        this.fireEvent(RTEToolbarEvent.BOUND, { editor: this._editor });

        // Initial state update
        this.update();
    }

    /**
     * Unbind from the current editor.
     * Removes event listeners and fires UNBOUND event.
     * @private
     */
    _unbindFromEditor() {
        if (!this._editor) return;

        try {
            this._editor.removeEventListener(
                RichTextEditorEvent.TEXT_CURSOR_MOVE,
                this._boundUpdateHandler
            );
            this._editor.removeEventListener(
                RichTextEditorEvent.MODEL_CHANGED,
                this._boundModelHandler
            );
        } catch (e) {
            // Ignore cleanup errors
        }

        const prevEditor = this._editor;
        this._editor = null;

        this.fireEvent(RTEToolbarEvent.UNBOUND, { editor: prevEditor });
    }

    /**
     * Set up group binding. Finds all editors with the matching group
     * attribute and listens for focus events to auto-switch.
     * @param {string} groupName - Group name
     * @private
     */
    _setupGroupBinding(groupName) {
        this._group = groupName;

        // Find all editors in this group
        const editors = document.querySelectorAll(
            'gooeyui-richtexteditor[group="' + groupName + '"]'
        );
        this._groupEditors = Array.from(editors);

        // Listen for focus on each editor to switch binding
        for (const editor of this._groupEditors) {
            const handler = () => {
                this._unbindFromEditor();
                this._bindToEditor(editor);
            };
            this._groupFocusHandlers.set(editor, handler);

            // Listen on the editor's focus event
            try {
                editor.addEventListener('focus', handler);
            } catch (e) {
                // Fallback: listen on the element itself
                HTMLElement.prototype.addEventListener.call(editor, 'focus', handler, true);
            }
        }

        // Bind to the first editor by default if any exist
        if (this._groupEditors.length > 0) {
            this._bindToEditor(this._groupEditors[0]);
        }
    }

    /**
     * Tear down group binding, removing all focus listeners.
     * @private
     */
    _tearDownGroupBinding() {
        for (const [editor, handler] of this._groupFocusHandlers) {
            try {
                editor.removeEventListener('focus', handler);
            } catch (e) {
                HTMLElement.prototype.removeEventListener.call(editor, 'focus', handler, true);
            }
        }
        this._groupFocusHandlers.clear();
        this._groupEditors = [];
        this._group = null;
    }

    // =========================================================================
    // State Update
    // =========================================================================

    /**
     * Handle TEXT_CURSOR_MOVE event from the editor.
     * @param {object} event - Event data
     * @private
     */
    _onEditorStateChange(event) {
        this.update();
    }

    /**
     * Handle MODEL_CHANGED event from the editor.
     * @param {object} event - Event data
     * @private
     */
    _onEditorModelChange(event) {
        this.update();
    }

    /**
     * Update toolbar button states based on the current editor state.
     *
     * Queries the editor for active marks, block type, and command
     * availability, then updates the active/disabled classes on
     * rendered buttons.
     *
     * This is a working stub — full rendering is implemented in Plan 02.
     */
    update() {
        if (!this._editor) return;

        // Query editor state for toolbar synchronization.
        // These methods are available on RichTextEditor:
        //   - isMarkActive(markType) -> boolean
        //   - getBlockType() -> string
        //   - getBlockAttrs() -> object
        //   - canUndo() -> boolean
        //   - canRedo() -> boolean
        //   - getActiveMarks() -> Mark[]
        //   - getAlignment() -> string
        //   - getIndent() -> number
        //   - getLineHeight() -> string|null

        // Plan 02 will iterate over rendered buttons and update
        // their active/disabled state based on these queries.
        // For now, this stub ensures the binding and event flow work.
    }

    // =========================================================================
    // Public API
    // =========================================================================

    /**
     * Get the current toolbar item descriptors.
     * Returns plugin items + custom items.
     * @returns {Array} Array of toolbar item descriptors
     */
    getItems() {
        const items = [];

        // Gather items from bound editor's plugins
        if (this._editor && this._editor._pluginManager) {
            const pluginItems = this._editor._pluginManager.collectToolbarItems();
            items.push(...pluginItems);
        }

        // Add custom items
        for (const item of this._customItems.values()) {
            items.push(item);
        }

        return items;
    }

    /**
     * Get the editors in the current group.
     * @returns {Array<HTMLElement>} Array of editor elements
     */
    getGroupEditors() {
        return [...this._groupEditors];
    }
}
