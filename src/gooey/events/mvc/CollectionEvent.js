import Event from "../Event.js";

export default class CollectionEvent extends Event {
    static ADD = "add";
    static REMOVE = "remove";
    static RESET = "reset";
    static SORT = "sort";
    static UPDATE = "update";
    static SYNC = "sync";
    static ERROR = "error";

    constructor() {
        super();
    }
}
