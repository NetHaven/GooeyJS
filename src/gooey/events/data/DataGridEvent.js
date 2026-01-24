import Event from "../Event.js";

/**
 * Event constants for DataGrid component
 */
export default class DataGridEvent extends Event {
    // Selection events
    static SELECTION_CHANGED = "selection-changed";
    static CELL_SELECTED = "cell-selected";
    static ROW_ACTIVATED = "row-activated";

    // Sort/Filter events
    static SORT_CHANGED = "sort-changed";
    static FILTER_CHANGED = "filter-changed";

    // Editing events
    static CELL_EDIT_START = "cell-edit-start";
    static CELL_EDIT_END = "cell-edit-end";
    static CELL_EDIT_CANCEL = "cell-edit-cancel";

    // Column events
    static COLUMN_RESIZE = "column-resize";
    static COLUMN_ADDED = "column-added";
    static COLUMN_REMOVED = "column-removed";

    // Data events
    static DATA_CHANGED = "data-changed";

    // Store events
    static STORE_BOUND = "store-bound";
    static STORE_UNBOUND = "store-unbound";

    constructor() {
        super();
    }
}
