import Event from "../Event.js";

export default class ControllerEvent extends Event {
    static INITIALIZED = "initialized";
    static VIEW_ATTACHED = "viewAttached";
    static MODEL_BOUND = "modelBound";
    static BEFORE_ACTION = "beforeAction";
    static AFTER_ACTION = "afterAction";
    static ERROR = "error";

    constructor() {
        super();
    }
}
