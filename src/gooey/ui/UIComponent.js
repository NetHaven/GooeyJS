import GooeyElement from '../GooeyElement.js';
import Point from '../graphics/Point.js';
import UIComponentEvent from '../events/UIComponentEvent.js';
import Model from '../mvc/Model.js';
import ModelEvent from '../events/mvc/ModelEvent.js';
import MouseCursor from '../io/MouseCursor.js';
import MouseEvent from '../events/MouseEvent.js';
import DragEvent from '../events/DragEvent.js';
import MetaLoader from '../util/MetaLoader.js';
import ComponentRegistry from '../util/ComponentRegistry.js';

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

        // MVC additions (optional - only if used)
        this._model = null;
        this._controller = null;
        this._bindings = [];

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
        this.nativeElement.addEventListener(MouseEvent.CLICK, ()=> {
            this.fireEvent(MouseEvent.CLICK);
        });

        this.nativeElement.addEventListener(MouseEvent.MOUSE_DOWN, ()=> {
            this.fireEvent(MouseEvent.MOUSE_DOWN);
        });

        this.nativeElement.addEventListener(MouseEvent.MOUSE_UP, ()=> {
            this.fireEvent(MouseEvent.MOUSE_UP);
        });

        this.nativeElement.addEventListener(MouseEvent.MOUSE_OUT, ()=> {
            this.fireEvent(MouseEvent.MOUSE_OUT);
        });

        this.nativeElement.addEventListener(MouseEvent.MOUSE_OVER, ()=> {
            this.fireEvent(MouseEvent.MOUSE_OVER);
        });

        // Add valid drag and drop events
        this.addValidEvent(DragEvent.START);
        this.addValidEvent(DragEvent.OVER);
        this.addValidEvent(DragEvent.END);
        this.addValidEvent(DragEvent.DROP);

        /* Translate Native Drag and Drop Events */
        this.nativeElement.addEventListener(DragEvent.START, (ev)=> {
            ev.dataTransfer.setData("text", ev.target.id);
            this.fireEvent(DragEvent.START);
        });

        this.nativeElement.addEventListener(DragEvent.OVER, (ev)=> {
            let id, srcElement;

            id = ev.dataTransfer.getData("text");
            if (this.droppable === true) {
                if (id) {
                    srcElement = document.getElementById(id);
                    if (srcElement) {
                        if (this.hasClass(srcElement.getAttribute("dropzone"))) {
                            ev.preventDefault();
                            this.fireEvent(DragEvent.OVER);
                        }
                    }
                }
            }
        });

        this.nativeElement.addEventListener(DragEvent.END, ()=> {
            this.fireEvent(DragEvent.END);
        });

        this.nativeElement.addEventListener(DragEvent.DROP, (ev)=> {
            let id, srcElement;

            id = ev.dataTransfer.getData("text");
            if (this.droppable === true) {
                if (id) {
                    srcElement = document.getElementById(id);
                    if (srcElement) {
                        if (this.hasClass(srcElement.getAttribute("dropzone"))) {
                            ev.preventDefault();
                            this.fireEvent(DragEvent.DROP);
                        }
                    }
                }
            }
        });

        this.classList.add("ui-Component");

        if (this.hasAttribute("height"))  {
            this.height = this.getAttribute("height");
        }

        if (this.hasAttribute("width"))   {
            this.width = this.getAttribute("width");
        }

        if (this.hasAttribute("tooltip")) {
            this.tooltip = this.getAttribute("tooltip");
        }

        if (this.hasAttribute("visible")) {
            if (this.getAttribute("visible").toLowerCase() === "false") {
                this.visible = false;
            }
            else {
                this.visible = true;
            }
        }
        else {
            this.visible = true;
        }
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
            model.on(ModelEvent.CHANGE, this.onModelChange.bind(this));
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

        // Apply any pending bindings after DOM is connected
        if (this._model && this._bindings.length > 0) {
            this.applyBindings();
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

        compStyle = getComputedStyle(this.element);
        cursor = compStyle.getPropertyValue("cursor")
        return cursor;
    }

    get disabled() {
        return this.hasAttribute("disabled");
    }

    get draggable() {
        if (this.hasAttribute("draggable")) {
            if (this.getAttribute("draggable") === true) {
                return true;
            }
            else {
                return false;
            }
        }
        else {
            return false;
        }
    }

    get droppable() {
        if (this.hasAttribute("draggable")) {
            if (this.getAttribute("draggable") === true) {
                return true;
            }
            else {
                return false;
            }
        }
        else {
            return false;
        }
    }

    get dropZone() {
        return this.getAttribute("dropzone");
    }

    get height() {
        return this.style.height;
    }

    get position() {
        let compStyle, pos;

        compStyle = getComputedStyle(this.element);
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
            case MouseCursor.ZOOM_OUT: this.element.style.cursor = val;
        }
    }

    set disabled(val) {
        if (val) {
            this.setAttribute("disabled", "");
        }
        else {
            this.removeAttribute("disabled");
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
        this.style.height = `${val}px`;
    }

    set position(val) {
        this.element.style.left = `${val.x}px`;
        this.element.style.top = `${val.y}px`;
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

        // Fire visibility change events
        if (wasVisible !== val) {
            const eventType = val ? UIComponentEvent.SHOW : UIComponentEvent.HIDE;
            this.fireEvent(eventType, {
                component: this,
                visible: val
            });
        }
    }

    set width(val) {
        this.setAttribute("width", val);
        this.style.width = `${val}px`;
    }

    // Unbind from current model
    unbindModel() {
        if (this._model) {
            // Remove model change listener
            if (this._model instanceof Model) {
                this._model.off(ModelEvent.CHANGE, this.onModelChange);
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
}
