import Event from "../Event.js";

/**
 * Event constants for TabPanel component
 */
export default class TabPanelEvent extends Event {
    static TAB_CHANGE = "tabchange";
    static TAB_REORDER = "tabreorder";

    constructor() {
        super();
    }
}