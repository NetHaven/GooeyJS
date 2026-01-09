import Event from "../Event.js";

/**
 * Event constants for HamburgerMenu component
 */
export default class HamburgerMenuEvent extends Event {
    static OPEN = "hamburgeropen";
    static CLOSE = "hamburgerclose";
    static TOGGLE = "hamburgertoggle";

    constructor() {
        super();
    }
}
