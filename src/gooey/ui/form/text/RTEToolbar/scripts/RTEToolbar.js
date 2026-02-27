import UIComponent from '../../../../UIComponent.js';
import RTEToolbarEvent from '../../../../../events/form/text/RTEToolbarEvent.js';
import RichTextEditorEvent from '../../../../../events/form/text/RichTextEditorEvent.js';
import Template from '../../../../../util/Template.js';
import { ICONS } from '../../RichTextEditor/scripts/Icons.js';

/**
 * Preset layout strings for common toolbar configurations.
 * Each maps a preset name to a pipe-delimited layout string.
 * @type {Object<string, string>}
 */
const _PRESETS = Object.freeze({
    full: "undo redo | bold italic underline strikethrough | subscript superscript | heading | bulletList orderedList checklist | blockquote codeBlock horizontalRule | alignLeft alignCenter alignRight alignJustify | indent outdent | link image video table | textColor backgroundColor | fontFamily fontSize lineHeight | clearFormatting | searchReplace | sourceEdit",
    minimal: "bold italic underline | link",
    formatting: "bold italic underline strikethrough | subscript superscript | code | textColor backgroundColor | fontFamily fontSize | clearFormatting",
    structure: "heading | bulletList orderedList checklist | blockquote codeBlock horizontalRule | alignLeft alignCenter alignRight alignJustify | indent outdent"
});

/**
 * Standard font families for the font family dropdown.
 * @type {Array<{value: string, label: string}>}
 */
const FONT_FAMILIES = [
    { value: '', label: 'Default' },
    { value: 'Arial, sans-serif', label: 'Arial' },
    { value: 'Georgia, serif', label: 'Georgia' },
    { value: 'Impact, sans-serif', label: 'Impact' },
    { value: 'Tahoma, sans-serif', label: 'Tahoma' },
    { value: 'Times New Roman, serif', label: 'Times New Roman' },
    { value: 'Verdana, sans-serif', label: 'Verdana' },
    { value: 'Courier New, monospace', label: 'Courier New' },
    { value: 'Lucida Console, monospace', label: 'Lucida Console' },
    { value: 'Trebuchet MS, sans-serif', label: 'Trebuchet MS' },
    { value: 'Palatino Linotype, serif', label: 'Palatino' }
];

/**
 * Standard font sizes for the font size dropdown.
 * @type {Array<{value: string, label: string}>}
 */
const FONT_SIZES = [
    { value: '', label: 'Default' },
    { value: '8px', label: '8' },
    { value: '9px', label: '9' },
    { value: '10px', label: '10' },
    { value: '11px', label: '11' },
    { value: '12px', label: '12' },
    { value: '14px', label: '14' },
    { value: '16px', label: '16' },
    { value: '18px', label: '18' },
    { value: '20px', label: '20' },
    { value: '24px', label: '24' },
    { value: '28px', label: '28' },
    { value: '32px', label: '32' },
    { value: '36px', label: '36' },
    { value: '48px', label: '48' },
    { value: '72px', label: '72' }
];

/**
 * Standard color palette for color picker popovers.
 * 16 colors in 2 rows of 8.
 * @type {string[]}
 */
const COLOR_PALETTE = [
    '#000000', '#434343', '#666666', '#999999', '#b7b7b7', '#cccccc', '#d9d9d9', '#ffffff',
    '#ff0000', '#ff9900', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#9900ff', '#ff00ff'
];

/**
 * Layout item names that map to the "indent" and "outdent" icons.
 * The plugin descriptors use "increaseIndent"/"decreaseIndent" as names,
 * but the layout string uses "indent"/"outdent" for brevity.
 * @type {Object<string, string>}
 */
const LAYOUT_ALIASES = Object.freeze({
    indent: 'increaseIndent',
    outdent: 'decreaseIndent',
    searchReplace: 'findReplace'
});

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

        // Rendered item references keyed by item name
        this._renderedItems = new Map();

        // Active color popover reference (only one open at a time)
        this._activePopover = null;

        // Bound click-outside handler for popovers
        this._boundClosePopover = this._closeActivePopover.bind(this);

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
        // Close any open popover
        this._closeActivePopover();

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
                this._renderLayout();
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

        // Render toolbar items and sync state
        this._renderLayout();
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
    // Layout Parsing
    // =========================================================================

    /**
     * Parse a layout string into groups of item names.
     * If the string matches a preset name, expands to the preset.
     *
     * @param {string} layoutStr - Layout string or preset name
     * @returns {Array<Array<string>>} Array of groups, each an array of item names
     * @private
     */
    _parseLayout(layoutStr) {
        if (!layoutStr) layoutStr = 'full';

        // Check if it's a preset name
        const preset = _PRESETS[layoutStr.trim()];
        if (preset) {
            layoutStr = preset;
        }

        // Split by | for groups, then by whitespace for items
        return layoutStr.split('|').map(group =>
            group.trim().split(/\s+/).filter(name => name.length > 0)
        ).filter(group => group.length > 0);
    }

    /**
     * Get descriptor for a layout item name from the editor's toolbar items.
     * Resolves layout aliases (e.g., "indent" -> "increaseIndent").
     *
     * @param {string} name - Item name from layout string
     * @param {Map<string, object>} descriptorMap - Map of name -> descriptor
     * @returns {object|null} Descriptor or null if not found
     * @private
     */
    _getItemDescriptor(name, descriptorMap) {
        // Check direct match
        if (descriptorMap.has(name)) {
            return descriptorMap.get(name);
        }
        // Check alias
        const alias = LAYOUT_ALIASES[name];
        if (alias && descriptorMap.has(alias)) {
            return descriptorMap.get(alias);
        }
        return null;
    }

    // =========================================================================
    // Rendering Engine
    // =========================================================================

    /**
     * Render the toolbar layout.
     * Clears existing items and rebuilds from the layout string and
     * available descriptor map from the editor's plugins.
     * @private
     */
    _renderLayout() {
        if (!this._toolbarItems) return;

        // Close any open popover
        this._closeActivePopover();

        // Clear existing rendered items
        this._toolbarItems.innerHTML = '';
        this._renderedItems.clear();

        // Parse the layout string
        const layoutStr = this.layout;
        const groups = this._parseLayout(layoutStr);

        // Build descriptor map from editor toolbar items
        const descriptorMap = new Map();
        if (this._editor) {
            const items = this._editor.getToolbarItems
                ? this._editor.getToolbarItems()
                : [];
            for (const item of items) {
                if (item && item.name) {
                    descriptorMap.set(item.name, item);
                }
            }
        }
        // Add custom items
        for (const [name, item] of this._customItems) {
            descriptorMap.set(name, item);
        }

        // Render each group with separators between groups
        for (let gi = 0; gi < groups.length; gi++) {
            const group = groups[gi];
            const groupEl = document.createElement('div');
            groupEl.className = 'rte-toolbar-group';

            let hasItems = false;

            for (const itemName of group) {
                const descriptor = this._getItemDescriptor(itemName, descriptorMap);
                if (!descriptor) continue; // Silently skip unknown items

                let el = null;
                switch (descriptor.type) {
                    case 'button':
                        el = this._createButton(descriptor);
                        break;
                    case 'dropdown':
                        el = this._createDropdown(descriptor);
                        break;
                    case 'colorPicker':
                        el = this._createColorPicker(descriptor);
                        break;
                    default:
                        // Skip unknown types (e.g., "custom")
                        continue;
                }

                if (el) {
                    groupEl.appendChild(el);
                    this._renderedItems.set(descriptor.name, {
                        element: el,
                        descriptor,
                        type: descriptor.type
                    });
                    hasItems = true;
                }
            }

            if (hasItems) {
                // Add separator between groups (not before first group)
                if (gi > 0 && this._toolbarItems.children.length > 0) {
                    const sep = document.createElement('div');
                    sep.className = 'rte-toolbar-separator';
                    this._toolbarItems.appendChild(sep);
                }
                this._toolbarItems.appendChild(groupEl);
            }
        }
    }

    /**
     * Create a toolbar button element from a descriptor.
     *
     * @param {object} descriptor - Button descriptor with name, command, icon, label, isActive, isEnabled, shortcut
     * @returns {HTMLButtonElement} Button element
     * @private
     */
    _createButton(descriptor) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'rte-tb-btn';

        // Set icon SVG
        const iconKey = descriptor.icon || descriptor.name;
        const iconSvg = ICONS[iconKey] || '';
        btn.innerHTML = iconSvg;

        // Build label with optional shortcut
        const labelText = descriptor.label || descriptor.name;
        const fullLabel = descriptor.shortcut
            ? labelText + ' (' + descriptor.shortcut + ')'
            : labelText;
        btn.title = fullLabel;
        btn.setAttribute('aria-label', fullLabel);

        // Click handler
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            if (!this._editor || btn.disabled) return;

            const state = this._editor._state;
            const dispatch = (tr) => this._editor._dispatch(tr);

            if (descriptor.onAction) {
                descriptor.onAction(state, dispatch);
            } else if (typeof descriptor.command === 'function') {
                descriptor.command(state, dispatch);
            }

            // Fire ACTION event
            this.fireEvent(RTEToolbarEvent.ACTION, {
                command: descriptor.command || descriptor.name,
                params: {},
                editor: this._editor
            });

            // Return focus to the editor
            if (this._editor.focus) {
                this._editor.focus();
            }
        });

        return btn;
    }

    /**
     * Create a toolbar dropdown element from a descriptor.
     *
     * Handles two descriptor formats:
     * 1. items array: `{ items: [{ name, command, label, value? }] }` (heading, lineHeight)
     * 2. command factory: `{ command: (value) => commandFn }` (fontFamily, fontSize)
     *
     * @param {object} descriptor - Dropdown descriptor
     * @returns {HTMLElement} Wrapper element containing the select
     * @private
     */
    _createDropdown(descriptor) {
        const wrapper = document.createElement('div');
        wrapper.className = 'rte-tb-dropdown-wrapper';

        const select = document.createElement('select');
        select.className = 'rte-tb-dropdown';

        const labelText = descriptor.label || descriptor.name;
        select.title = labelText;
        select.setAttribute('aria-label', labelText);

        // Populate options based on descriptor format
        if (descriptor.items && descriptor.items.length > 0) {
            // Format 1: items array with individual commands
            // Add a placeholder label option
            const placeholder = document.createElement('option');
            placeholder.value = '';
            placeholder.textContent = labelText;
            placeholder.disabled = true;
            placeholder.selected = true;
            select.appendChild(placeholder);

            for (const item of descriptor.items) {
                const opt = document.createElement('option');
                opt.value = item.value !== undefined ? item.value : item.name;
                opt.textContent = item.label || item.name;
                select.appendChild(opt);
            }
        } else if (descriptor.name === 'fontFamily') {
            // Font family dropdown
            for (const font of FONT_FAMILIES) {
                const opt = document.createElement('option');
                opt.value = font.value;
                opt.textContent = font.label;
                if (font.value) {
                    opt.style.fontFamily = font.value;
                }
                select.appendChild(opt);
            }
        } else if (descriptor.name === 'fontSize') {
            // Font size dropdown
            for (const size of FONT_SIZES) {
                const opt = document.createElement('option');
                opt.value = size.value;
                opt.textContent = size.label;
                select.appendChild(opt);
            }
        } else {
            // Generic fallback: just label
            const opt = document.createElement('option');
            opt.value = '';
            opt.textContent = labelText;
            select.appendChild(opt);
        }

        // Change handler
        select.addEventListener('change', (e) => {
            if (!this._editor) return;

            const value = select.value;
            const state = this._editor._state;
            const dispatch = (tr) => this._editor._dispatch(tr);

            if (descriptor.items && descriptor.items.length > 0) {
                // Find the matching item and execute its command
                const item = descriptor.items.find(
                    it => (it.value !== undefined ? String(it.value) : it.name) === value
                );
                if (item && typeof item.command === 'function') {
                    item.command(state, dispatch);
                }
            } else if (typeof descriptor.command === 'function') {
                // Command factory: command(value) returns (state, dispatch) => bool
                const cmd = descriptor.command(value);
                if (typeof cmd === 'function') {
                    cmd(state, dispatch);
                }
            }

            // Fire ACTION event
            this.fireEvent(RTEToolbarEvent.ACTION, {
                command: descriptor.name,
                params: { value },
                editor: this._editor
            });

            // Return focus to the editor
            if (this._editor.focus) {
                this._editor.focus();
            }
        });

        // Store select reference on wrapper for state sync
        wrapper._select = select;
        wrapper.appendChild(select);

        return wrapper;
    }

    /**
     * Create a toolbar color picker button from a descriptor.
     *
     * Shows an icon with a color indicator bar, and opens a popover
     * grid of predefined colors plus a native color input for custom colors.
     *
     * @param {object} descriptor - Color picker descriptor with command, icon, label
     * @returns {HTMLElement} Button element
     * @private
     */
    _createColorPicker(descriptor) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'rte-tb-btn rte-tb-color-btn';

        // Icon
        const iconKey = descriptor.icon || descriptor.name;
        const iconSvg = ICONS[iconKey] || '';

        // Color indicator bar below icon
        const indicator = document.createElement('span');
        indicator.className = 'rte-color-indicator';
        indicator.style.backgroundColor = descriptor.name === 'textColor'
            ? 'var(--gooey-color-text, #000)'
            : 'var(--gooey-color-primary, #ff0)';

        btn.innerHTML = iconSvg;
        btn.appendChild(indicator);

        const labelText = descriptor.label || descriptor.name;
        btn.title = labelText;
        btn.setAttribute('aria-label', labelText);

        // Store indicator reference for state sync
        btn._indicator = indicator;

        // Click handler — toggle popover
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            if (!this._editor || btn.disabled) return;

            // Close any other open popover
            if (this._activePopover && this._activePopover !== btn._popover) {
                this._closeActivePopover();
            }

            // Toggle this popover
            if (btn._popover && btn._popover.style.display !== 'none') {
                this._closeActivePopover();
                return;
            }

            this._openColorPopover(btn, descriptor);
        });

        return btn;
    }

    /**
     * Open a color picker popover below a button.
     *
     * @param {HTMLButtonElement} btn - The color picker button
     * @param {object} descriptor - Color picker descriptor
     * @private
     */
    _openColorPopover(btn, descriptor) {
        // Create popover if it doesn't exist yet
        if (!btn._popover) {
            const popover = document.createElement('div');
            popover.className = 'rte-color-popover';

            // Add color swatches
            for (const color of COLOR_PALETTE) {
                const swatch = document.createElement('div');
                swatch.className = 'rte-color-swatch';
                swatch.style.backgroundColor = color;
                swatch.title = color;
                swatch.setAttribute('role', 'button');
                swatch.setAttribute('aria-label', color);

                swatch.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this._applyColor(descriptor, color, btn);
                });

                popover.appendChild(swatch);
            }

            // Native color input for custom color
            const customWrapper = document.createElement('div');
            customWrapper.className = 'rte-color-custom';

            const colorInput = document.createElement('input');
            colorInput.type = 'color';
            colorInput.className = 'rte-color-input';
            colorInput.title = 'Custom color';
            colorInput.value = '#000000';

            colorInput.addEventListener('change', (e) => {
                e.stopPropagation();
                this._applyColor(descriptor, colorInput.value, btn);
            });

            // Prevent input click from closing the popover
            colorInput.addEventListener('click', (e) => {
                e.stopPropagation();
            });

            customWrapper.appendChild(colorInput);
            popover.appendChild(customWrapper);

            btn._popover = popover;
            // Position relative to button's parent (.rte-toolbar-group or similar)
            btn.style.position = 'relative';
            btn.appendChild(popover);
        }

        btn._popover.style.display = 'grid';
        this._activePopover = btn._popover;

        // Close on click outside (using capture on the shadow root)
        // Use a timeout to prevent the current click from immediately closing
        setTimeout(() => {
            this.shadowRoot.addEventListener('click', this._boundClosePopover);
        }, 0);
    }

    /**
     * Apply a selected color via the descriptor's command.
     *
     * @param {object} descriptor - Color picker descriptor
     * @param {string} color - Color value (hex)
     * @param {HTMLButtonElement} btn - The color picker button
     * @private
     */
    _applyColor(descriptor, color, btn) {
        if (!this._editor) return;

        const state = this._editor._state;
        const dispatch = (tr) => this._editor._dispatch(tr);

        if (typeof descriptor.command === 'function') {
            const cmd = descriptor.command(color);
            if (typeof cmd === 'function') {
                cmd(state, dispatch);
            }
        }

        // Update indicator color
        if (btn._indicator) {
            btn._indicator.style.backgroundColor = color;
        }

        // Fire ACTION event
        this.fireEvent(RTEToolbarEvent.ACTION, {
            command: descriptor.name,
            params: { color },
            editor: this._editor
        });

        // Close popover and return focus
        this._closeActivePopover();
        if (this._editor.focus) {
            this._editor.focus();
        }
    }

    /**
     * Close the currently active color popover.
     * @private
     */
    _closeActivePopover() {
        if (this._activePopover) {
            this._activePopover.style.display = 'none';
            this._activePopover = null;
        }
        this.shadowRoot.removeEventListener('click', this._boundClosePopover);
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
     * rendered buttons, dropdown values, and color indicators.
     */
    update() {
        if (!this._editor) return;
        if (this._renderedItems.size === 0) return;

        // Check if editor is disabled or readOnly
        const editorDisabled = this._editor.disabled || this._editor.readOnly;
        if (editorDisabled) {
            for (const [, entry] of this._renderedItems) {
                const el = entry.element;
                if (entry.type === 'button' || entry.type === 'colorPicker') {
                    el.disabled = true;
                } else if (entry.type === 'dropdown' && el._select) {
                    el._select.disabled = true;
                }
            }
            return;
        }

        // Get state once for all checks
        const state = this._editor._state;
        if (!state) return;

        for (const [, entry] of this._renderedItems) {
            const { element, descriptor, type } = entry;

            if (type === 'button') {
                // Active state
                if (typeof descriptor.isActive === 'function') {
                    try {
                        if (descriptor.isActive(state)) {
                            element.classList.add('active');
                            element.setAttribute('aria-pressed', 'true');
                        } else {
                            element.classList.remove('active');
                            element.setAttribute('aria-pressed', 'false');
                        }
                    } catch (e) {
                        // Ignore errors from state queries
                    }
                }

                // Enabled state
                if (typeof descriptor.isEnabled === 'function') {
                    try {
                        element.disabled = !descriptor.isEnabled(state);
                    } catch (e) {
                        element.disabled = false;
                    }
                } else {
                    element.disabled = false;
                }
            } else if (type === 'dropdown') {
                const select = element._select;
                if (!select) continue;

                select.disabled = false;

                // Update current value for dropdowns that have currentValue
                if (typeof descriptor.currentValue === 'function') {
                    try {
                        select.value = descriptor.currentValue(state) || '';
                    } catch (e) {
                        // Ignore
                    }
                }
            } else if (type === 'colorPicker') {
                element.disabled = false;

                // Update color indicator based on active marks
                if (element._indicator && descriptor.name) {
                    try {
                        const marks = this._editor.getActiveMarks
                            ? this._editor.getActiveMarks()
                            : [];
                        const markType = descriptor.name;
                        const mark = marks.find(m => m.type === markType);
                        if (mark && mark.attrs && mark.attrs.color) {
                            element._indicator.style.backgroundColor = mark.attrs.color;
                        }
                    } catch (e) {
                        // Ignore
                    }
                }
            }
        }
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

    /**
     * Force re-render the toolbar layout.
     * Useful after programmatic changes to plugins or custom items.
     */
    render() {
        this._renderLayout();
        this.update();
    }
}
