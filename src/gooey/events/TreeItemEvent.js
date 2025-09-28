import Event from "./Event.js";

/**
 * Event constants for TreeItem component
 */
export default class TreeItemEvent extends Event {
    static TREE_ITEM_EXPAND = "treeitem-expand";
    static TREE_ITEM_COLLAPSE = "treeitem-collapse";
    static TREE_ITEM_EDIT = "treeitem-edit";
    static TREE_ITEM_DROP = "treeitem-drop";
    static TREE_ITEM_REORDER = "treeitem-reorder";

    constructor() {
        super();
    }
}