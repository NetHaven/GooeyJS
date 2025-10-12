import Observable from '../events/Observable.js';
import Point from '../graphics/Point.js';
import ComponentEvent from '../events/ComponentEvent.js';
import Model from './mvc/Model.js';
import ModelEvent from '../events/mvc/ModelEvent.js';

export default class Component extends Observable {
    constructor () {
        super();

        // MVC additions (optional - only if used)
        this._model = null;
        this._controller = null;
        this._bindings = [];

        // Add MVC events to valid events
        this.addValidEvent(ComponentEvent.MODEL_CHANGE);
        this.addValidEvent(ComponentEvent.CONTROLLER_ATTACHED);
        
        // Add valid visibility events
        this.addValidEvent(ComponentEvent.SHOW);
        this.addValidEvent(ComponentEvent.HIDE);

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
            if (this.getAttribute("visible").toLowerCase() == "false") {
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
            this._unbindModel();
        }

        this._model = model;

        // Auto-bind model changes to component updates
        if (model instanceof Model) {
            model.on(ModelEvent.CHANGE, this.onModelChange.bind(this));
        }

        this.fireEvent(ComponentEvent.MODEL_CHANGE, { model });
        return this;
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

        compStyle = computeStyle(this.element);
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
            if (this.getAttribute("visible").toLowerCase() == "false") {
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
  
    // Attach controller (optional MVC feature)
    setController(controller) {
        this._controller = controller;
        controller.setView(this);
        this.fireEvent(ComponentEvent.CONTROLLER_ATTACHED, { controller });
        return this;
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
            const eventType = val ? ComponentEvent.SHOW : ComponentEvent.HIDE;
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
}
