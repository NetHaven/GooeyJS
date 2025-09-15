import Event from "../Event.js";

/**
 * Event constants for SplitPanel component
 */
export default class SplitPanelEvent extends Event {
    static DIVIDER_LOCATION_CHANGED = "dividerLocationChanged";

    constructor() {
        super();
    }
}