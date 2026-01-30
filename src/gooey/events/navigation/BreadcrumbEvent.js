import Event from "../Event.js";

/**
 * Events fired by Breadcrumb and BreadcrumbItem components.
 */
export default class BreadcrumbEvent extends Event {

    /**
     * Fired when a breadcrumb item is clicked/activated.
     * Event payload: { breadcrumb, item, index, value, href }
     */
    static NAVIGATE = "navigate";

    /**
     * Fired when the breadcrumb path changes (items added/removed).
     * Event payload: { breadcrumb, items, count }
     */
    static PATH_CHANGE = "pathchange";

    /**
     * Fired when collapsed items are expanded via ellipsis click.
     * Event payload: { breadcrumb, collapsedItems }
     */
    static EXPAND = "expand";

    /**
     * Fired when items are collapsed due to maxVisible limit.
     * Event payload: { breadcrumb, collapsedItems, visibleItems }
     */
    static COLLAPSE = "collapse";

    constructor() {
        super();
    }
}
