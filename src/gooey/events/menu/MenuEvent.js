import Event from "../Event.js";

/**
 * Event constants for Menu component
 */
export default class MenuEvent extends Event {
    static MENU_SHOW = "menushow";
    static MENU_HIDE = "menuhide";

    constructor() {
        super();
    }
}
