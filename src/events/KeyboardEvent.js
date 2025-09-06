import Event from "./Event.js";

export default class KeyboardEvent extends Event {
    static KEY_DOWN = "keydown";
    static KEY_PRESS = "keypress";
    static KEY_UP = "keyup";

    constructor() {
        super();
        this.altKeyPressed = false;
        this.key = 0;
        this.character = '';
        this.controlKeyPressed = false;
        this.shiftKeyPressed = false;
    }
}
