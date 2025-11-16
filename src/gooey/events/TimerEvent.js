import Event from "./Event.js";

export default class TimerEvent extends Event {
    static TIMER = "TIMER";
    static COMPLETE = "TIMER COMPLETE";

    constructor() {
        super();
    }
}