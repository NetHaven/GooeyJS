import Event from "../Event.js";

/**
 * Event constants for AccordionPanel component
 */
export default class AccordionPanelEvent extends Event {
    static ACCORDION_OPENED = "accordionOpened";
    static ACCORDION_CLOSED = "accordionClosed";

    constructor() {
        super();
    }
}