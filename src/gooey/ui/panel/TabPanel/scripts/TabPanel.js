import Container from '../../../Container.js';
import LayoutType from '../../../layout/Layout/scripts/LayoutType.js';
import TabEvent from '../../../../events/panel/TabEvent.js';
import TabPanelEvent from '../../../../events/panel/TabPanelEvent.js';
import DragEvent from '../../../../events/DragEvent.js';
import Template from '../../../../util/Template.js';

export default class TabPanel extends Container {
    constructor() {
        super();

        Template.activate("ui-TabPanel", this.shadowRoot);

        this.layout = LayoutType.FLOW;
        this._tabs = [];
        this._tabStrip = null;
        this._contentPanel = null;
        this._activeTab = null;

        // Add valid events
        this.addValidEvent(TabPanelEvent.TAB_CHANGE);
        this.addValidEvent(DragEvent.START);
        this.addValidEvent(DragEvent.END);
        this.addValidEvent(TabPanelEvent.TAB_REORDER);
    }

    connectedCallback() {
        
        // Set up initial structure
        this._setupStructure();
        
        // Process any existing tab children
        const existingTabs = Array.from(this.querySelectorAll('gooeyui-tab'));
        existingTabs.forEach(tab => this._addTab(tab));
        
        // If no tab is active and we have tabs, activate the first one
        if (this._tabs.length > 0 && !this._tabs.some(tab => tab.active)) {
            this._setActiveTab(this._tabs[0]);
        }
        
        // Set up ARIA attributes
        this.setAttribute('role', 'tabpanel');
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'orientation') {
            this._updateOrientation();
        } else if (name === 'draggable') {
            this._updateDraggable();
        }
    }

    get orientation() {
        return this.getAttribute('orientation') || 'horizontal';
    }

    set orientation(val) {
        this.setAttribute('orientation', val);
    }

    get activeTab() {
        return this._activeTab;
    }

    get tabs() {
        return [...this._tabs];
    }

    get draggable() {
        return this.hasAttribute('draggable');
    }

    set draggable(val) {
        if (val) {
            this.setAttribute('draggable', '');
        } else {
            this.removeAttribute('draggable');
        }
    }

    _setupStructure() {
        // Get references to shadow DOM elements created by template
        this._tabStrip = this.shadowRoot.querySelector('.tab-strip');
        this._contentPanel = this.shadowRoot.querySelector('.tab-content');

        // Set ARIA attributes
        this._tabStrip.setAttribute('role', 'tablist');
        this._tabStrip.setAttribute('aria-orientation', this.orientation);
        this._contentPanel.setAttribute('role', 'tabpanel');

        // Update orientation classes
        this._updateOrientation();

        // Set up drag and drop if enabled
        this._updateDraggable();
    }

    _updateOrientation() {
        if (this._tabStrip) {
            this._tabStrip.setAttribute('aria-orientation', this.orientation);
            this.classList.toggle('vertical', this.orientation === 'vertical');
            this.classList.toggle('horizontal', this.orientation === 'horizontal');
        }
    }

    _addTab(tab) {
        if (this._tabs.includes(tab)) {
            return;
        }
        
        this._tabs.push(tab);
        
        // Create and add tab header
        const tabHeader = tab._createTabHeader();
        tab._tabHeader = tabHeader;
        this._tabStrip.appendChild(tabHeader);
        
        // Set up drag and drop for this tab if enabled
        if (this.draggable) {
            this._setupTabDragAndDrop(tab, tabHeader);
        }
        
        // Tab content will be projected through the slot automatically
        // No need to manually move it with shadow DOM
        
        // Update tab state
        tab._updateActiveState();
        
        // If this is the first tab and no tab is active, make it active
        if (this._tabs.length === 1 && !this._activeTab) {
            this._setActiveTab(tab);
        }
    }

    _removeTab(tab) {
        const index = this._tabs.indexOf(tab);
        if (index === -1) {
            return;
        }
        
        this._tabs.splice(index, 1);
        
        // Remove tab header
        if (tab._tabHeader) {
            tab._tabHeader.remove();
            tab._tabHeader = null;
        }
        
        // If this was the active tab, activate another tab
        if (this._activeTab === tab) {
            const previousTab = this._activeTab;
            this._activeTab = null;
            
            // Try to activate the next tab, or the previous one, or the first one
            let newActiveTab = null;
            if (index < this._tabs.length) {
                newActiveTab = this._tabs[index];
            } else if (index > 0) {
                newActiveTab = this._tabs[index - 1];
            } else if (this._tabs.length > 0) {
                newActiveTab = this._tabs[0];
            }
            
            if (newActiveTab) {
                this._setActiveTab(newActiveTab);
            } else {
                // No tabs left, dispatch tabchange event to indicate no active tab
                this.fireEvent(TabPanelEvent.TAB_CHANGE, { 
                    activeTab: null,
                    previousTab: previousTab,
                    tabPanel: this
                });
            }
        }
    }

    _setActiveTab(tab) {
        if (!this._tabs.includes(tab) || this._activeTab === tab) {
            return;
        }
        
        const previousTab = this._activeTab;
        
        // Deactivate all tabs
        this._tabs.forEach(t => {
            t.active = false;
        });
        
        // Activate the selected tab
        tab.active = true;
        this._activeTab = tab;
        
        // Update content panel ARIA labelledby
        if (tab._tabHeader) {
            // Ensure the tab header has an ID
            if (!tab._tabHeader.id) {
                tab._tabHeader.id = `tab-header-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            }
            this._contentPanel.setAttribute('aria-labelledby', tab._tabHeader.id);
        }
        
        // Dispatch tabchange event
        this.fireEvent(TabPanelEvent.TAB_CHANGE, { 
            activeTab: tab,
            previousTab: previousTab,
            tabPanel: this
        });
    }

    _getAllTabs() {
        return [...this._tabs];
    }

    // Public API methods
    addTab(name, content, options = {}) {
        const tab = document.createElement('gooeyui-tab');
        tab.name = name;
        
        if (options.closeable) {
            tab.closeable = true;
        }
        
        if (options.active) {
            tab.active = true;
        }
        
        // Add content if provided
        if (content) {
            if (typeof content === 'string') {
                tab.textContent = content;
            } else if (content instanceof HTMLElement) {
                tab.appendChild(content);
            }
        }
        
        this.appendChild(tab);
        return tab;
    }

    removeTab(tab) {
        if (typeof tab === 'string') {
            // Find tab by name
            tab = this._tabs.find(t => t.name === tab);
        }
        
        if (tab && tab.parentNode === this._contentPanel) {
            tab.remove();
        }
    }

    activateTab(tab) {
        if (typeof tab === 'string') {
            // Find tab by name
            tab = this._tabs.find(t => t.name === tab);
        } else if (typeof tab === 'number') {
            // Find tab by index
            tab = this._tabs[tab];
        }
        
        if (tab) {
            this._setActiveTab(tab);
        }
    }

    getTabByName(name) {
        return this._tabs.find(t => t.name === name);
    }

    getTabIndex(tab) {
        if (typeof tab === 'string') {
            tab = this.getTabByName(tab);
        }
        return this._tabs.indexOf(tab);
    }

    _updateDraggable() {
        if (this.draggable) {
            // Enable drag and drop for all existing tabs
            this._tabs.forEach(tab => {
                if (tab._tabHeader) {
                    this._setupTabDragAndDrop(tab, tab._tabHeader);
                }
            });
        } else {
            // Disable drag and drop for all tabs
            this._tabs.forEach(tab => {
                if (tab._tabHeader) {
                    this._removeTabDragAndDrop(tab._tabHeader);
                }
            });
        }
    }

    _setupTabDragAndDrop(tab, tabHeader) {
        // Make the tab header draggable
        tabHeader.setAttribute('draggable', 'true');
        tabHeader.style.cursor = 'grab';
        
        // Store references for cleanup
        tabHeader._dragStartHandler = this._onTabDragStart.bind(this, tab);
        tabHeader._dragEndHandler = this._onTabDragEnd.bind(this, tab);
        tabHeader._dragOverHandler = this._onTabDragOver.bind(this);
        tabHeader._dropHandler = this._onTabDrop.bind(this, tab);
        
        // Add drag event listeners
        tabHeader.addEventListener(DragEvent.START, tabHeader._dragStartHandler);
        tabHeader.addEventListener(DragEvent.END, tabHeader._dragEndHandler);
        tabHeader.addEventListener(DragEvent.OVER, tabHeader._dragOverHandler);
        tabHeader.addEventListener(DragEvent.DROP, tabHeader._dropHandler);
    }

    _removeTabDragAndDrop(tabHeader) {
        tabHeader.removeAttribute('draggable');
        tabHeader.style.cursor = '';
        
        // Remove event listeners if they exist
        if (tabHeader._dragStartHandler) {
            tabHeader.removeEventListener(DragEvent.START, tabHeader._dragStartHandler);
            tabHeader.removeEventListener(DragEvent.END, tabHeader._dragEndHandler);
            tabHeader.removeEventListener(DragEvent.OVER, tabHeader._dragOverHandler);
            tabHeader.removeEventListener(DragEvent.DROP, tabHeader._dropHandler);
            
            delete tabHeader._dragStartHandler;
            delete tabHeader._dragEndHandler;
            delete tabHeader._dragOverHandler;
            delete tabHeader._dropHandler;
        }
    }

    _onTabDragStart(tab, event) {
        this._draggedTab = tab;
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', '');
        
        // Add visual feedback
        tab._tabHeader.style.opacity = '0.5';
        tab._tabHeader.style.cursor = 'grabbing';
        
        // Dispatch custom event
        this.fireEvent(DragEvent.START, { tab: tab });
    }

    _onTabDragEnd(tab) {
        // Reset visual feedback
        tab._tabHeader.style.opacity = '';
        tab._tabHeader.style.cursor = 'grab';
        
        // Clear drag state
        this._draggedTab = null;
        
        // Remove drop indicators from all tab headers
        this._tabs.forEach(t => {
            if (t._tabHeader) {
                t._tabHeader.classList.remove('drag-over-left', 'drag-over-right');
            }
        });
        
        // Dispatch custom event
        this.fireEvent(DragEvent.END, { tab: tab });
    }

    _onTabDragOver(event) {
        if (!this._draggedTab) return;
        
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        
        const tabHeader = event.currentTarget;
        const rect = tabHeader.getBoundingClientRect();
        const midpoint = this.orientation === 'vertical' ? 
            rect.top + rect.height / 2 : 
            rect.left + rect.width / 2;
        
        const mousePos = this.orientation === 'vertical' ? event.clientY : event.clientX;
        
        // Remove existing drop indicators
        this._tabs.forEach(t => {
            if (t._tabHeader) {
                t._tabHeader.classList.remove('drag-over-left', 'drag-over-right');
            }
        });
        
        // Add appropriate drop indicator
        if (mousePos < midpoint) {
            tabHeader.classList.add(this.orientation === 'vertical' ? 'drag-over-top' : 'drag-over-left');
        } else {
            tabHeader.classList.add(this.orientation === 'vertical' ? 'drag-over-bottom' : 'drag-over-right');
        }
    }

    _onTabDrop(targetTab, event) {
        if (!this._draggedTab || this._draggedTab === targetTab) return;
        
        event.preventDefault();
        
        const tabHeader = event.currentTarget;
        const rect = tabHeader.getBoundingClientRect();
        const midpoint = this.orientation === 'vertical' ? 
            rect.top + rect.height / 2 : 
            rect.left + rect.width / 2;
        
        const mousePos = this.orientation === 'vertical' ? event.clientY : event.clientX;
        
        // Determine insert position
        const targetIndex = this._tabs.indexOf(targetTab);
        const draggedIndex = this._tabs.indexOf(this._draggedTab);
        
        let newIndex;
        if (mousePos < midpoint) {
            // Insert before target
            newIndex = targetIndex;
        } else {
            // Insert after target
            newIndex = targetIndex + 1;
        }
        
        // Adjust index if dragged tab is being moved to a later position
        if (draggedIndex < newIndex) {
            newIndex--;
        }
        
        // Reorder tabs
        this._reorderTab(this._draggedTab, newIndex);
        
        // Dispatch custom event
        this.fireEvent(TabPanelEvent.TAB_REORDER, { 
            tab: this._draggedTab,
            oldIndex: draggedIndex,
            newIndex: newIndex
        });
    }

    _reorderTab(tab, newIndex) {
        if (newIndex < 0 || newIndex >= this._tabs.length) return;
        
        const currentIndex = this._tabs.indexOf(tab);
        if (currentIndex === -1 || currentIndex === newIndex) return;
        
        // Remove tab from current position
        this._tabs.splice(currentIndex, 1);
        
        // Insert tab at new position
        this._tabs.splice(newIndex, 0, tab);
        
        // Reorder DOM elements
        const tabHeaders = Array.from(this._tabStrip.children);
        const currentHeaderIndex = tabHeaders.indexOf(tab._tabHeader);
        
        if (currentHeaderIndex !== -1) {
            // Remove tab header from current position
            const tabHeader = tabHeaders[currentHeaderIndex];
            this._tabStrip.removeChild(tabHeader);
            
            // Insert at new position
            if (newIndex >= tabHeaders.length - 1) {
                this._tabStrip.appendChild(tabHeader);
            } else {
                const referenceHeader = this._tabStrip.children[newIndex];
                this._tabStrip.insertBefore(tabHeader, referenceHeader);
            }
        }
    }

    // Public API method to reorder tabs programmatically
    reorderTab(tab, newIndex) {
        if (typeof tab === 'string') {
            tab = this.getTabByName(tab);
        } else if (typeof tab === 'number') {
            const oldIndex = tab;
            tab = this._tabs[oldIndex];
        }
        
        if (tab) {
            this._reorderTab(tab, newIndex);
        }
    }

    // Event handling
    addEventListener(type, listener, options) {
        // For tab-specific events, add them to the TabPanel itself
        if (type === TabPanelEvent.TAB_CHANGE || type === TabEvent.TAB_CLOSE || type === TabPanelEvent.TAB_REORDER) {
            super.addEventListener(type, listener, options);
        } else {
            super.addEventListener(type, listener, options);
        }
    }
}