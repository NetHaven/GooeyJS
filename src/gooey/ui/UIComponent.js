import Observable from '../events/Observable.js';
import Point from '../graphics/Point.js';
import UIComponentEvent from '../events/UIComponentEvent.js';
import Model from '../mvc/Model.js';
import ModelEvent from '../events/mvc/ModelEvent.js';
import MouseCursor from '../io/MouseCursor.js';

export default class UIComponent extends Observable {
    static get observedAttributes() {
        return ['height', 'width', 'tooltip', 'visible', 'disabled', 'id'];
    }

    constructor () {
        super();

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

    get cursor() {
        let compStyle, cursor;

        compStyle = getComputedStyle(this.element);
        cursor = compStyle.getPropertyValue("cursor")
        return cursor;
    }

    get disabled() {
        return this.hasAttribute("disabled");
    }

    get height() {
        return this.style.height;
    }

    get id() {
        return this.getAttribute("id");
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

    set height(val) {
        this.setAttribute("height", val);
        this.style.height = `${val}px`;
    }

    set id(val) {
        this.setAttribute("id", val);
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
}
