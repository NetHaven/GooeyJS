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

        // Watch for dynamically added tree items
        this._treeItemObserver = new MutationObserver(() => {
            this._attachTreeItemListeners();
        });
        this._treeItemObserver.observe(this, { childList: true, subtree: true });
    }

    disconnectedCallback() {
        super.disconnectedCallback && super.disconnectedCallback();

        // Clean up mutation observer
        if (this._treeItemObserver) {
            this._treeItemObserver.disconnect();
            this._treeItemObserver = null;
        }

        // Remove listeners from all tree items
        this._detachTreeItemListeners();
    }

    _attachTreeItemListeners() {
        const treeItems = this.querySelectorAll('gooeyui-treeitem');
        treeItems.forEach(treeItem => {
            if (!this._attachedTreeItems.has(treeItem)) {
                treeItem.addEventListener(MouseEvent.CLICK, this._boundClickHandler);
                treeItem.addEventListener(TreeItemEvent.TREE_ITEM_EXPAND, this._boundExpandHandler);
                treeItem.addEventListener(TreeItemEvent.TREE_ITEM_COLLAPSE, this._boundCollapseHandler);
                this._attachedTreeItems.add(treeItem);
            }
        });
    }

    _detachTreeItemListeners() {
        this._attachedTreeItems.forEach(treeItem => {
            treeItem.removeEventListener(MouseEvent.CLICK, this._boundClickHandler);
            treeItem.removeEventListener(TreeItemEvent.TREE_ITEM_EXPAND, this._boundExpandHandler);
            treeItem.removeEventListener(TreeItemEvent.TREE_ITEM_COLLAPSE, this._boundCollapseHandler);
        });
        this._attachedTreeItems.clear();
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
        this._treeElement.removeChild(treeItem);
        if (this._selectedItem === treeItem) {
            this.selectedItem = null;
        }
    }
    
    clear() {
        this._treeElement.innerHTML = '';
        this.selectedItem = null;
    }
    
    expandAll() {
        const items = this.querySelectorAll('gooeyui-treeitem');
        items.forEach(item => {
            if (item.hasChildren) {
                item.expanded = true;
            }
        });
    }
    
    collapseAll() {
        const items = this.querySelectorAll('gooeyui-treeitem');
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
        const items = Array.from(this.querySelectorAll('gooeyui-treeitem'));
        const currentIndex = items.indexOf(this._selectedItem);
        if (currentIndex > 0) {
            this.selectedItem = items[currentIndex - 1];
        }
    }
    
    _selectNextItem() {
        const items = Array.from(this.querySelectorAll('gooeyui-treeitem'));
        const currentIndex = items.indexOf(this._selectedItem);
        if (currentIndex < items.length - 1) {
            this.selectedItem = items[currentIndex + 1];
        }
    }
}
