import Event from "../Event.js";

export default class TransitionEvent extends Event {
    static START = "transition-start";
    static END = "transition-end";
    static CANCEL = "transition-cancel";
    static RUN = "transition-run";

    constructor() {
        super();
    }
}
