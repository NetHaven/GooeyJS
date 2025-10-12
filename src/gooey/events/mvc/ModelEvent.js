import Event from "./Event.js";

export default class ModelEvent extends Event {
    static CHANGE = "change";
    static SYNC = "sync";
    static DESTROY = "destroy";
    static ERROR = "error";
    static INVALID = "invalid";
    static PROPERTY_CHANGE_PREFIX = "change:"; // Used with property names

    constructor() {
        super();
    }
}
