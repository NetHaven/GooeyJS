import KeyboardEvent from '../../../../events/KeyboardEvent.js';
import MouseEvent from '../../../../events/MouseEvent.js';

// Global context menu manager to handle all context menus
const ContextMenuManager = {
    instances: new Set(),
    globalHandlersAdded: false,
    activeMenu: null,
    
    registerInstance(instance) {
        this.instances.add(instance);
        if (!this.globalHandlersAdded) {
            this._addGlobalHandlers();
            this.globalHandlersAdded = true;
        }
    },
    
    unregisterInstance(instance) {
        this.instances.delete(instance);
        if (this.activeMenu === instance) {
            this.activeMenu = null;
        }
        if (this.instances.size === 0 && this.globalHandlersAdded) {
            this._removeGlobalHandlers();
            this.globalHandlersAdded = false;
        }
    },
    
    _addGlobalHandlers() {
        document.addEventListener('contextmenu', this._handleContextMenu, true);
        document.addEventListener(MouseEvent.CLICK, this._handleClick, true);
        document.addEventListener(KeyboardEvent.KEY_DOWN, this._handleKeyDown);
    },
    
    _removeGlobalHandlers() {
        document.removeEventListener('contextmenu', this._handleContextMenu, true);
        document.removeEventListener(MouseEvent.CLICK, this._handleClick, true);
        document.removeEventListener(KeyboardEvent.KEY_DOWN, this._handleKeyDown);
    },
    
    _handleContextMenu: (event) => {
        // Check each instance to see if the event target is within its target element
        for (const instance of ContextMenuManager.instances) {
            // Resolve target: use 'target' attribute (element ID) if set, otherwise use parentElement
            const targetId = instance.getAttribute('target');
            const targetElement = targetId
                ? document.getElementById(targetId)
                : instance.parentElement;

            if (targetElement && targetElement.contains(event.target)) {
                event.preventDefault();
                event.stopPropagation();

                // Hide any currently active menu
                if (ContextMenuManager.activeMenu && ContextMenuManager.activeMenu !== instance) {
                    ContextMenuManager.activeMenu._hideMenu();
                }

                // Show this menu
                ContextMenuManager.activeMenu = instance;
                instance._showAtPosition(event.pageX, event.pageY);
                return; // Exit early - only one menu should respond
            }
        }

        // If no instance matched, hide any active menu
        if (ContextMenuManager.activeMenu) {
            ContextMenuManager.activeMenu._hideMenu();
            ContextMenuManager.activeMenu = null;
        }
    },
    
    _handleClick: (event) => {
        if (ContextMenuManager.activeMenu && !ContextMenuManager.activeMenu.contains(event.target)) {
            ContextMenuManager.activeMenu._hideMenu();
            ContextMenuManager.activeMenu = null;
        }
    },
    
    _handleKeyDown: (event) => {
        if (event.key === 'Escape' && ContextMenuManager.activeMenu) {
            ContextMenuManager.activeMenu._hideMenu();
            ContextMenuManager.activeMenu = null;
        }
    }
};

export default ContextMenuManager;