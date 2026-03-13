import Event from "../Event.js";

/**
 * Event constants for Tooltip component lifecycle
 */
export default class TooltipEvent extends Event {
    static BEFORE_SHOW = "before-show";
    static SHOW = "show";
    static SHOWN = "shown";
    static BEFORE_HIDE = "before-hide";
    static HIDE = "hide";
    static HIDDEN = "hidden";
    static TRIGGER = "trigger";
    static UNTRIGGER = "untrigger";

    constructor() {
        super();
    }
}
