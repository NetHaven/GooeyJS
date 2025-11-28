import UIComponent from "../../UIComponent.js";
import Key from "../../../io/Key.js";
import KeyboardEvent from "../../../events/KeyboardEvent.js";
import MouseEvent from "../../../events/MouseEvent.js";
import TreeEvent from '../../../events/TreeEvent.js';
import TreeItemEvent from '../../../events/TreeItemEvent.js';

export default class Tree extends UIComponent {
    constructor() {
        super();
        
        const template = document.getElementById("ui-Tree");
        const clone = document.importNode(template.content, true);
        this.appendChild(clone);
        
        this._treeElement = this.querySelector('.ui-Tree');
        this._selectedItem = null;
        
        this.addValidEvent(KeyboardEvent.KEY_DOWN);
        this.addValidEvent(MouseEvent.CLICK);
        this.addValidEvent(TreeItemEvent.TREE_ITEM_COLLAPSE);
        this.addValidEvent(TreeItemEvent.TREE_ITEM_EXPAND);
        this.addValidEvent(TreeEvent.SELECTION_CHANGED);
        this.addValidEvent(TreeEvent.ITEM_EXPAND);
        this.addValidEvent(TreeEvent.ITEM_COLLAPSE);
        this._setupEventListeners();
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
        const items = this.querySelectorAll('ui-treeitem');
        items.forEach(item => {
            if (item.hasChildren) {
                item.expanded = true;
            }
        });
    }
    
    collapseAll() {
        const items = this.querySelectorAll('ui-treeitem');
        items.forEach(item => {
            item.expanded = false;
        });
    }
    
    _setupEventListeners() {
        this.addEventListener(MouseEvent.CLICK, (e) => {
            this.selectedItem = e.detail.treeItem;
        });
        
        // Listen for expand/collapse events from tree items
        this.addEventListener(TreeItemEvent.TREE_ITEM_EXPAND, (e) => {
            this.fireEvent(TreeEvent.ITEM_EXPAND, { 
                treeItem: e.detail.treeItem,
                expanded: true
            });
        });
        
        this.addEventListener(TreeItemEvent.TREE_ITEM_COLLAPSE, (e) => {
            this.fireEvent(TreeEvent.ITEM_COLLAPSE, { 
                treeItem: e.detail.treeItem,
                expanded: false
            });
        });
        
        this.addEventListener(KeyboardEvent.KEY_DOWN, (e) => {
            this._handleKeyNavigation(e);
        });
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
        const items = Array.from(this.querySelectorAll('ui-treeitem'));
        const currentIndex = items.indexOf(this._selectedItem);
        if (currentIndex > 0) {
            this.selectedItem = items[currentIndex - 1];
        }
    }
    
    _selectNextItem() {
        const items = Array.from(this.querySelectorAll('ui-treeitem'));
        const currentIndex = items.indexOf(this._selectedItem);
        if (currentIndex < items.length - 1) {
            this.selectedItem = items[currentIndex + 1];
        }
    }
}
