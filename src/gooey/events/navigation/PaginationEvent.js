import Event from "../Event.js";

/**
 * Events fired by the Pagination component.
 */
export default class PaginationEvent extends Event {

    /** Fired when the current page changes. */
    static PAGE_CHANGE = "page-change";

    /** Fired before a page change; cancelable. */
    static BEFORE_PAGE_CHANGE = "before-page-change";

    /** Fired when the page size changes. */
    static PAGE_SIZE_CHANGE = "page-size-change";

    /** Fired after page-change when bound to a Store. */
    static PAGE_DATA_CHANGE = "page-data-change";

    /** Fired when the user clicks the already-active page button. */
    static PAGE_ACTIVE = "page-active";

    /** Fired when navigating to the first page. */
    static FIRST_PAGE = "first-page";

    /** Fired when navigating to the last page. */
    static LAST_PAGE = "last-page";

    /** Fired when a Store is bound. */
    static STORE_BOUND = "store-bound";

    /** Fired when a Store is unbound. */
    static STORE_UNBOUND = "store-unbound";

    /** Fired when a DataGrid is bound. */
    static DATAGRID_BOUND = "datagrid-bound";

    /** Fired when a DataGrid is unbound. */
    static DATAGRID_UNBOUND = "datagrid-unbound";

    constructor() {
        super();
    }
}
