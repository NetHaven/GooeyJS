import GooeyElement from '../GooeyElement.js';
import Point from '../graphics/Point.js';
import UIComponentEvent from '../events/UIComponentEvent.js';
import Model from '../mvc/Model.js';
import ModelEvent from '../events/mvc/ModelEvent.js';
import MouseCursor from '../io/MouseCursor.js';
import MouseEvent from '../events/MouseEvent.js';
import KeyboardEvent from '../events/KeyboardEvent.js';
import DragEvent from '../events/DragEvent.js';
import MetaLoader from '../util/MetaLoader.js';
import ComponentRegistry from '../util/ComponentRegistry.js';
import ThemeManager from '../util/ThemeManager.js';

export default class UIComponent extends GooeyElement {
    constructor () {
        super();

        // Create Shadow DOM for CSS encapsulation
        this.attachShadow({ mode: 'open' });

        // Inject theme CSS if available
        const tagName = this.tagName.toLowerCase();
        const cssResult = ComponentRegistry.getThemeCSS(tagName);
        if (cssResult) {
            MetaLoader.injectCSS(this.shadowRoot, cssResult);
        }

        // Register with ThemeManager for future theme switches (TOKEN-05)
        ThemeManager.registerInstance(this);

        // Apply active theme overrides for late-constructed components (THEME-10)
        if (ThemeManager.activeTheme !== 'base') {
            ThemeManager.applyThemeToInstance(this);
        }

        // MVC additions (optional - only if used)
        this._model = null;
        this._controller = null;
        this._bindings = [];
        this._boundModelChangeHandler = null;

        // Add MVC events to valid events
        this.addValidEvent(UIComponentEvent.MODEL_CHANGE);
        this.addValidEvent(UIComponentEvent.CONTROLLER_ATTACHED);

        // Add valid visibility events
        this.addValidEvent(UIComponentEvent.SHOW);
        this.addValidEvent(UIComponentEvent.HIDE);

        // Add valid mouse events
        this.addValidEvent(MouseEvent.CLICK);
        this.addValidEvent(MouseEvent.MOUSE_DOWN);
        this.addValidEvent(MouseEvent.MOUSE_OUT);
        this.addValidEvent(MouseEvent.MOUSE_OVER);
        this.addValidEvent(MouseEvent.MOUSE_UP);

        /* Translate Native Mouse Events */
        HTMLElement.prototype.addEventListener.call(this, MouseEvent.CLICK, ()=> {
            if (!this.disabled) {
                this.fireEvent(MouseEvent.CLICK);
            }
        });

        HTMLElement.prototype.addEventListener.call(this, MouseEvent.MOUSE_DOWN, ()=> {
            if (!this.disabled) {
                this.fireEvent(MouseEvent.MOUSE_DOWN);
            }
        });

        HTMLElement.prototype.addEventListener.call(this, MouseEvent.MOUSE_UP, ()=> {
            if (!this.disabled) {
                this.fireEvent(MouseEvent.MOUSE_UP);
            }
        });

        HTMLElement.prototype.addEventListener.call(this, MouseEvent.MOUSE_OUT, ()=> {
            if (!this.disabled) {
                this.fireEvent(MouseEvent.MOUSE_OUT);
            }
        });

        HTMLElement.prototype.addEventListener.call(this, MouseEvent.MOUSE_OVER, ()=> {
            if (!this.disabled) {
                this.fireEvent(MouseEvent.MOUSE_OVER);
            }
        });

        // Add valid keyboard events
        this.addValidEvent(KeyboardEvent.KEY_DOWN);
        this.addValidEvent(KeyboardEvent.KEY_UP);
        this.addValidEvent(KeyboardEvent.KEY_PRESS);

        /* Translate Native Keyboard Events */
        HTMLElement.prototype.addEventListener.call(this, KeyboardEvent.KEY_DOWN, (ev) => {
            if (!this.disabled) {
                this.fireEvent(KeyboardEvent.KEY_DOWN, {
                    key: ev.key,
                    code: ev.code,
                    altKey: ev.altKey,
                    ctrlKey: ev.ctrlKey,
                    shiftKey: ev.shiftKey,
                    metaKey: ev.metaKey,
                    repeat: ev.repeat,
                    preventDefault: () => ev.preventDefault(),
                    stopPropagation: () => ev.stopPropagation(),
                    nativeEvent: ev
                });
            }
        });

        HTMLElement.prototype.addEventListener.call(this, KeyboardEvent.KEY_UP, (ev) => {
            if (!this.disabled) {
                this.fireEvent(KeyboardEvent.KEY_UP, {
                    key: ev.key,
                    code: ev.code,
                    altKey: ev.altKey,
                    ctrlKey: ev.ctrlKey,
                    shiftKey: ev.shiftKey,
                    metaKey: ev.metaKey,
                    preventDefault: () => ev.preventDefault(),
                    stopPropagation: () => ev.stopPropagation(),
                    nativeEvent: ev
                });
            }
        });

        HTMLElement.prototype.addEventListener.call(this, KeyboardEvent.KEY_PRESS, (ev) => {
            if (!this.disabled) {
                this.fireEvent(KeyboardEvent.KEY_PRESS, {
                    key: ev.key,
                    code: ev.code,
                    altKey: ev.altKey,
                    ctrlKey: ev.ctrlKey,
                    shiftKey: ev.shiftKey,
                    metaKey: ev.metaKey,
                    preventDefault: () => ev.preventDefault(),
                    stopPropagation: () => ev.stopPropagation(),
                    nativeEvent: ev
                });
            }
        });

        // Add valid drag and drop events
        this.addValidEvent(DragEvent.START);
        this.addValidEvent(DragEvent.OVER);
        this.addValidEvent(DragEvent.END);
        this.addValidEvent(DragEvent.DROP);

        /* Translate Native Drag and Drop Events */
        HTMLElement.prototype.addEventListener.call(this, DragEvent.START, (ev)=> {
            ev.dataTransfer.setData("text", ev.target.id);
            this.fireEvent(DragEvent.START);
        });

        HTMLElement.prototype.addEventListener.call(this, DragEvent.OVER, (ev)=> {
            let id, srcElement;

            id = ev.dataTransfer.getData("text");
            if (this.droppable === true) {
                if (id) {
                    srcElement = document.getElementById(id);
                    if (srcElement) {
                        if (this.classList.contains(srcElement.getAttribute("dropzone"))) {
                            ev.preventDefault();
                            this.fireEvent(DragEvent.OVER);
                        }
                    }
                }
            }
        });

        HTMLElement.prototype.addEventListener.call(this, DragEvent.END, ()=> {
            this.fireEvent(DragEvent.END);
        });

        HTMLElement.prototype.addEventListener.call(this, DragEvent.DROP, (ev)=> {
            let id, srcElement;

            id = ev.dataTransfer.getData("text");
            if (this.droppable === true) {
                if (id) {
                    srcElement = document.getElementById(id);
                    if (srcElement) {
                        if (this.classList.contains(srcElement.getAttribute("dropzone"))) {
                            ev.preventDefault();
                            this.fireEvent(DragEvent.DROP);
                        }
                    }
                }
            }
        });

        this.classList.add("ui-Component");

        // Note: All attribute initialization deferred to connectedCallback
        // to fully comply with Custom Elements spec and avoid "Operation is not supported" errors
    }

    // Data binding application
    applyBindings() {
        this._bindings.forEach(binding => {
            binding.apply(this._model, this);
        });
    }

    // Bind to a model (optional MVC feature)
    bindModel(model) {
        if (this._model) {
            this.unbindModel();
        }

        this._model = model;

        // Auto-bind model changes to component updates
        if (model instanceof Model) {
            this._boundModelChangeHandler = this.onModelChange.bind(this);
            model.addEventListener(ModelEvent.CHANGE, this._boundModelChangeHandler);
        }

        // Apply bindings immediately to sync component with model
        if (this._bindings.length > 0) {
            this.applyBindings();
        }

        this.fireEvent(UIComponentEvent.MODEL_CHANGE, { model });
        return this;
    }

    // Web Component lifecycle - called when added to DOM
    connectedCallback() {
        // GooeyJS components can initialize MVC bindings here
        // This is where templates might be activated and bindings applied
        // if the component uses declarative bindings

        if (super.connectedCallback) {
            super.connectedCallback();
        }

        // Apply initial attribute values (moved from constructor per Custom Elements spec)
        if (this.hasAttribute("height"))  {
            const val = this.getAttribute("height");
            this.style.height = typeof val === 'number' ? `${val}px` : val;
        }

        if (this.hasAttribute("width"))   {
            const val = this.getAttribute("width");
            this.style.width = typeof val === 'number' ? `${val}px` : val;
        }

        if (this.hasAttribute("tooltip")) {
            this.setAttribute("title", this.getAttribute("tooltip"));
        }

        if (this.hasAttribute("visible")) {
            const isVisible = this.getAttribute("visible").toLowerCase() !== "false";
            this.style.display = isVisible ? '' : 'none';
        }

        // Apply any pending bindings after DOM is connected
        if (this._model && this._bindings.length > 0) {
            this.applyBindings();
        }
    }

    // Web Component lifecycle - called when removed from DOM
    disconnectedCallback() {
        // Clean up model binding to prevent memory leaks
        this.unbindModel();

        if (super.disconnectedCallback) {
            super.disconnectedCallback();
        }
    }

    /**
     * Get the component's root element for DOM queries
     * Returns shadowRoot for encapsulated styling
     * @returns {ShadowRoot}
     */
    get componentRoot() {
        return this.shadowRoot;
    }

    get cursor() {
        let compStyle, cursor;

        compStyle = getComputedStyle(this);
        cursor = compStyle.getPropertyValue("cursor")
        return cursor;
    }

    get disabled() {
        return this.hasAttribute("disabled");
    }

    // =========== ARIA Accessibility Properties ===========

    get ariaLabel() {
        return this.getAttribute("aria-label");
    }

    get ariaDescribedBy() {
        return this.getAttribute("aria-describedby");
    }

    get ariaLabelledBy() {
        return this.getAttribute("aria-labelledby");
    }

    get draggable() {
        if (this.hasAttribute("draggable")) {
            const val = this.getAttribute("draggable");
            // Treat "true" string or empty attribute as true
            return val === "true" || val === "";
        }
        return false;
    }

    get droppable() {
        if (this.hasAttribute("droppable")) {
            const val = this.getAttribute("droppable");
            // Treat "true" string or empty attribute as true
            return val === "true" || val === "";
        }
        return false;
    }

    get dropZone() {
        return this.getAttribute("dropzone");
    }

    get height() {
        return this.style.height;
    }

    get position() {
        let compStyle, pos;

        compStyle = getComputedStyle(this);
        pos = new Point();
        pos.x = parseInt(compStyle.getPropertyValue("left"));
        pos.y = parseInt(compStyle.getPropertyValue("top"));
        return pos;
    }

    get tooltip() {
        return this.getAttribute("tooltip");
    }

    get visible() {
        if (this.hasAttribute("visible")) {
            if (this.getAttribute("visible").toLowerCase() === "false") {
                return false;
            }
            else {
                return true;
            }
        }
        else {
            return true;
        }
    }

    get width() {
        return this.style.width;
    }

    // Handle model changes by updating DOM directly
    onModelChange() {
        // Apply data bindings when model changes
        if (this._bindings.length > 0) {
            this.applyBindings();
        }

        // Components can override this to handle specific model changes
        // Example of GooeyJS pattern for updating DOM:
        // if (event.key === 'title' && this.titleElement) {
        //   this.titleElement.textContent = event.value;
        // }
        // if (event.key === 'visible') {
        //   this.visible = event.value; // Uses GooeyJS property setter
        // }
    }

    // Attach controller (optional MVC feature)
    setController(controller) {
        this._controller = controller;
        controller.setView(this);
        this.fireEvent(UIComponentEvent.CONTROLLER_ATTACHED, { controller });
        return this;
    }

    set cursor(val) {
        switch (val) {
            case MouseCursor.ALIAS:
            case MouseCursor.ALL_SCROLL:
            case MouseCursor.CELL:
            case MouseCursor.COL_RESIZE:
            case MouseCursor.COPY:
            case MouseCursor.DEFAULT:
            case MouseCursor.CONTEXT_MENU:
            case MouseCursor.CROSSHAIR:
            case MouseCursor.GRAB:
            case MouseCursor.GRABBING:
            case MouseCursor.HELP:
            case MouseCursor.MOVE:
            case MouseCursor.NOT_ALLOWED:
            case MouseCursor.POINTER:
            case MouseCursor.PROGRESS:
            case MouseCursor.RESIZE_E:
            case MouseCursor.RESIZE_EW:
            case MouseCursor.RESIZE_N:
            case MouseCursor.RESIZE_NE:
            case MouseCursor.RESIZE_NESW:
            case MouseCursor.RESIZE_NS:
            case MouseCursor.RESIZE_NW:
            case MouseCursor.RESIZE_NWSE:
            case MouseCursor.RESIZE_S:
            case MouseCursor.RESIZE_SE:
            case MouseCursor.RESIZE_SW:
            case MouseCursor.RESIZE_W:
            case MouseCursor.ROW_RESIZE:
            case MouseCursor.TEXT:
            case MouseCursor.WAIT:
            case MouseCursor.VERTICAL_TEXT:
            case MouseCursor.ZOOM_IN:
            case MouseCursor.ZOOM_OUT: this.style.cursor = val;
        }
    }

    set disabled(val) {
        if (val) {
            this.setAttribute("disabled", "");
            this.setAttribute("aria-disabled", "true");
        }
        else {
            this.removeAttribute("disabled");
            this.removeAttribute("aria-disabled");
        }
    }

    // =========== ARIA Accessibility Setters ===========

    set ariaLabel(val) {
        if (val) {
            this.setAttribute("aria-label", val);
        } else {
            this.removeAttribute("aria-label");
        }
    }

    set ariaDescribedBy(val) {
        if (val) {
            this.setAttribute("aria-describedby", val);
        } else {
            this.removeAttribute("aria-describedby");
        }
    }

    set ariaLabelledBy(val) {
        if (val) {
            this.setAttribute("aria-labelledby", val);
        } else {
            this.removeAttribute("aria-labelledby");
        }
    }

    set draggable(val) {
        this.setAttribute("draggable", val);
    }

    set droppable(val) {
        this.setAttribute("droppable", val);
    }

    set dropZone(val) {
        this.setAttribute("dropzone", val);
    }

    set height(val) {
        this.setAttribute("height", val);
        // Only add px suffix for numbers; strings may already include units
        if (typeof val === 'number') {
            this.style.height = `${val}px`;
        } else {
            this.style.height = val;
        }
    }

    set position(val) {
        this.style.left = `${val.x}px`;
        this.style.top = `${val.y}px`;
    }

    set tooltip(val) {
        this.setAttribute("tooltip", val);
        this.setAttribute("title", val);
    }

    set visible(val) {
        const wasVisible = this.visible;

        if (val) {
            this.setAttribute("visible", "true");
        }
        else {
            this.setAttribute("visible", "false");
        }

        // Fire visibility change events only if element is connected to DOM
        if (wasVisible !== val && this.isConnected) {
            const eventType = val ? UIComponentEvent.SHOW : UIComponentEvent.HIDE;
            this.fireEvent(eventType, {
                component: this,
                visible: val
            });
        }
    }

    set width(val) {
        this.setAttribute("width", val);
        // Only add px suffix for numbers; strings may already include units
        if (typeof val === 'number') {
            this.style.width = `${val}px`;
        } else {
            this.style.width = val;
        }
    }

    // Unbind from current model
    unbindModel() {
        if (this._model) {
            // Remove model change listener
            if (this._model instanceof Model && this._boundModelChangeHandler) {
                this._model.removeEventListener(ModelEvent.CHANGE, this._boundModelChangeHandler);
                this._boundModelChangeHandler = null;
            }
            this._model = null;
        }
    }

    /**
     * Switch the component's theme at runtime
     * @param {string} themeName - Name of the theme to switch to (e.g., "base", "dark")
     * @returns {Promise<void>}
     */
    async switchTheme(themeName) {
        const tagName = this.tagName.toLowerCase();
        const componentPath = ComponentRegistry.getComponentPath(tagName);

        if (componentPath && this.shadowRoot) {
            await MetaLoader.switchTheme(this.shadowRoot, componentPath, themeName);
        }
    }

    // =========== Static Accessibility Utilities ===========

    /**
     * Announce a message to screen readers via a live region
     * @param {string} message - The message to announce
     * @param {string} priority - 'polite' (default) or 'assertive'
     */
    static announce(message, priority = 'polite') {
        let region = document.getElementById('gooey-live-region');
        if (!region) {
            region = document.createElement('div');
            region.id = 'gooey-live-region';
            region.className = 'sr-only';
            region.setAttribute('aria-live', priority);
            region.setAttribute('aria-atomic', 'true');
            // Screen-reader-only styles
            region.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;';
            document.body.appendChild(region);
        } else {
            region.setAttribute('aria-live', priority);
        }
        // Clear and set message to trigger announcement
        region.textContent = '';
        setTimeout(() => {
            region.textContent = message;
        }, 100);
    }
}
