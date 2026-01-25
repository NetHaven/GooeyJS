import UIComponent from "../../UIComponent.js";
import Key from "../../../io/Key.js";
import KeyboardEvent from "../../../events/KeyboardEvent.js";
import MouseEvent from "../../../events/MouseEvent.js";
import TreeEvent from '../../../events/TreeEvent.js';
import TreeItemEvent from '../../../events/TreeItemEvent.js';
import Template from '../../../util/Template.js';

export default class Tree extends UIComponent {
    constructor() {
        super();

        Template.activate("ui-Tree", this.shadowRoot);

        this._treeElement = this.shadowRoot.querySelector('.ui-Tree');
        this._selectedItem = null;

        // Track tree items we've attached listeners to
        this._attachedTreeItems = new Set();

        // Bind event handlers
        this._boundClickHandler = this._handleTreeItemClick.bind(this);
        this._boundExpandHandler = this._handleTreeItemExpand.bind(this);
        this._boundCollapseHandler = this._handleTreeItemCollapse.bind(this);
        this._boundKeyDownHandler = this._handleKeyDown.bind(this);

        this.addValidEvent(KeyboardEvent.KEY_DOWN);
        this.addValidEvent(MouseEvent.CLICK);
        this.addValidEvent(TreeItemEvent.TREE_ITEM_COLLAPSE);
        this.addValidEvent(TreeItemEvent.TREE_ITEM_EXPAND);
        this.addValidEvent(TreeEvent.SELECTION_CHANGED);
        this.addValidEvent(TreeEvent.ITEM_EXPAND);
        this.addValidEvent(TreeEvent.ITEM_COLLAPSE);
        this._setupEventListeners();
    }

    connectedCallback() {
        super.connectedCallback && super.connectedCallback();

        // Attach listeners to existing tree items
        this._attachTreeItemListeners();

        // Watch for dynamically added tree items in light DOM
        this._treeItemObserver = new MutationObserver(() => {
            this._attachTreeItemListeners();
        });
        this._treeItemObserver.observe(this, { childList: true, subtree: true });

        // Listen for children added to TreeItems (which go into shadow DOM)
        this._boundChildAddedHandler = () => {
            this._attachTreeItemListeners();
        };
        this.addEventListener('treeitem-child-added', this._boundChildAddedHandler);
    }

    disconnectedCallback() {
        super.disconnectedCallback && super.disconnectedCallback();

        // Clean up mutation observer
        if (this._treeItemObserver) {
            this._treeItemObserver.disconnect();
            this._treeItemObserver = null;
        }

        // Remove child-added listener
        if (this._boundChildAddedHandler) {
            this.removeEventListener('treeitem-child-added', this._boundChildAddedHandler);
        }

        // Remove listeners from all tree items
        this._detachTreeItemListeners();
    }

    _attachTreeItemListeners() {
        const treeItems = this._getAllTreeItems();
        treeItems.forEach(treeItem => {
            if (!this._attachedTreeItems.has(treeItem)) {
                treeItem.addEventListener(MouseEvent.CLICK, this._boundClickHandler);
                treeItem.addEventListener(TreeItemEvent.TREE_ITEM_EXPAND, this._boundExpandHandler);
                treeItem.addEventListener(TreeItemEvent.TREE_ITEM_COLLAPSE, this._boundCollapseHandler);
                this._attachedTreeItems.add(treeItem);
            }
        });
    }

    /**
     * Recursively find all tree items including those nested in shadow DOM
     * @returns {Array} Array of all gooeyui-treeitem elements
     */
    _getAllTreeItems() {
        const items = [];
        this._collectTreeItems(this, items);
        return items;
    }

    /**
     * Recursively collect tree items from an element and its shadow DOM
     * @param {Element} root - The root element to search from
     * @param {Array} items - Array to collect items into
     */
    _collectTreeItems(root, items) {
        // Query direct tree items in light DOM
        const lightItems = root.querySelectorAll(':scope > gooeyui-treeitem');
        lightItems.forEach(item => {
            items.push(item);
            // Check the item's shadow DOM for nested children
            if (item.shadowRoot) {
                const childrenContainer = item.shadowRoot.querySelector('.ui-TreeItem-children');
                if (childrenContainer) {
                    this._collectTreeItems(childrenContainer, items);
                }
            }
        });
    }

    _detachTreeItemListeners() {
        this._attachedTreeItems.forEach(treeItem => {
            this._detachSingleTreeItemListener(treeItem);
        });
        this._attachedTreeItems.clear();
    }

    /**
     * Detach listeners from a single tree item and remove from tracking set
     * @param {Element} treeItem - The tree item to detach
     */
    _detachSingleTreeItemListener(treeItem) {
        treeItem.removeEventListener(MouseEvent.CLICK, this._boundClickHandler);
        treeItem.removeEventListener(TreeItemEvent.TREE_ITEM_EXPAND, this._boundExpandHandler);
        treeItem.removeEventListener(TreeItemEvent.TREE_ITEM_COLLAPSE, this._boundCollapseHandler);
        this._attachedTreeItems.delete(treeItem);
    }

    /**
     * Detach listeners from a tree item and all its descendants
     * @param {Element} treeItem - The root tree item
     */
    _detachTreeItemAndDescendants(treeItem) {
        // Collect all descendants including the item itself
        const items = [treeItem];
        this._collectTreeItems(treeItem, items);

        items.forEach(item => {
            if (this._attachedTreeItems.has(item)) {
                this._detachSingleTreeItemListener(item);
            }
        });
    }

    _handleTreeItemClick(eventName, data) {
        if (data?.treeItem) {
            this.selectedItem = data.treeItem;
        }
    }

    _handleTreeItemExpand(eventName, data) {
        this.fireEvent(TreeEvent.ITEM_EXPAND, {
            treeItem: data?.treeItem,
            expanded: true
        });
    }

    _handleTreeItemCollapse(eventName, data) {
        this.fireEvent(TreeEvent.ITEM_COLLAPSE, {
            treeItem: data?.treeItem,
            expanded: false
        });
    }

    _handleKeyDown(eventName, data) {
        const event = data?.originalEvent || data;
        if (event) {
            this._handleKeyNavigation(event);
        }
    }
    
    get selectedItem() {
        return this._selectedItem;
    }
    
    set selectedItem(treeItem) {
        if (this._selectedItem) {
            this._selectedItem.classList.remove('selected');
        }
        
        this._selectedItem = treeItem;
        
        if (this._selectedItem) {
            this._selectedItem.classList.add('selected');
        }
        
        this.fireEvent(TreeEvent.SELECTION_CHANGED, { selectedItem: this._selectedItem });
    }
    
    addItem(treeItem) {
        this._treeElement.appendChild(treeItem);
    }
    
    removeItem(treeItem) {
        // Detach listeners from the item and its descendants before removing
        this._detachTreeItemAndDescendants(treeItem);

        this._treeElement.removeChild(treeItem);
        if (this._selectedItem === treeItem) {
            this.selectedItem = null;
        }
    }

    clear() {
        // Detach listeners from all tracked items before clearing
        this._detachTreeItemListeners();

        this._treeElement.innerHTML = '';
        this.selectedItem = null;
    }
    
    expandAll() {
        const items = this._getAllTreeItems();
        items.forEach(item => {
            if (item.hasChildren) {
                item.expanded = true;
            }
        });
    }

    collapseAll() {
        const items = this._getAllTreeItems();
        items.forEach(item => {
            item.expanded = false;
        });
    }
    
    _setupEventListeners() {
        // Keyboard navigation is handled on the Tree itself
        this.addEventListener(KeyboardEvent.KEY_DOWN, this._boundKeyDownHandler);
    }
    
    _handleKeyNavigation(e) {
        if (!this._selectedItem) return;
        
        switch (e.key) {
            case Key.ARROW_UP:
                e.preventDefault();
                this._selectPreviousItem();
                break;
            case Key.ARROW_DOWN:
                e.preventDefault();
                this._selectNextItem();
                break;
            case Key.ARROW_RIGHT:
                e.preventDefault();
                if (this._selectedItem.hasChildren && !this._selectedItem.expanded) {
                    this._selectedItem.expanded = true;
                }
                break;
            case Key.ARROW_LEFT:
                e.preventDefault();
                if (this._selectedItem.hasChildren && this._selectedItem.expanded) {
                    this._selectedItem.expanded = false;
                }
                break;
            case Key.ENTER:
            case Key.SPACE:
                e.preventDefault();
                if (this._selectedItem.hasChildren) {
                    this._selectedItem.toggle();
                }
                break;
        }
    }
    
    _selectPreviousItem() {
        const items = this._getAllTreeItems();
        const currentIndex = items.indexOf(this._selectedItem);
        if (currentIndex > 0) {
            this.selectedItem = items[currentIndex - 1];
        }
    }

    _selectNextItem() {
        const items = this._getAllTreeItems();
        const currentIndex = items.indexOf(this._selectedItem);
        if (currentIndex < items.length - 1) {
            this.selectedItem = items[currentIndex + 1];
        }
    }
}
