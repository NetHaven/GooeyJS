import Event from "./Event.js";
import Point from "../graphics/Point.js";

export default class MouseEvent extends Event {
	static CLICK = "click";
	static DOUBLE_CLICK = "dblclick";
	static MOUSE_DOWN = "mousedown";
	static MOUSE_MOVE = "mousemove";
	static MOUSE_OUT = "mouseout";
	static MOUSE_OVER = "mouseover";
	static MOUSE_UP = "mouseup";

    constructor() {
        super();
        this.location = new Point(0, 0);
    }
}
