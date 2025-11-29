import UIComponent from '../../../UIComponent.js';
import ContextMenuEvent from '../../../../events/menu/ContextMenuEvent.js';
import MouseEvent from '../../../../events/MouseEvent.js';
import ContextMenuManager from './ContextMenuManager.js';

export default class ContextMenu extends UIComponent {
    constructor() {
        super();
        
        // Store existing children (menu items) before clearing
        const existingChildren = Array.from(this.children);

        // Override the template to use ContextMenu template
        this.innerHTML = '';
        const template = document.getElementById("ui-ContextMenu");
        const clone = document.importNode(template.content, true);
        this.shadowRoot.appendChild(clone);

        this._contextMenuElement = this.shadowRoot.querySelector('.ui-ContextMenu');

        // Restore the existing children to the context menu element
        existingChildren.forEach(child => {
            this._contextMenuElement.appendChild(child);
        });
        
        this.visible = false;
        this.active = false;
        
        // Position the context menu absolutely
        this.style.position = 'absolute';
        this.style.zIndex = '1000';
        
        // Hide by default
        this.style.display = 'none';
        
        // Create unique ID for debugging
        this._instanceId = Math.random().toString(36).substr(2, 9);
        
        // Add valid events
        this.addValidEvent(ContextMenuEvent.CONTEXT_MENU_SHOW);
        this.addValidEvent(ContextMenuEvent.CONTEXT_MENU_HIDE);
        this.addValidEvent(MouseEvent.CLICK);
    }
    
    connectedCallback() {
        ContextMenuManager.registerInstance(this);
    }
    
    disconnectedCallback() {
        // Don't unregister if we're just moving to document.body for positioning
        if (!this._isMovingToBody) {
            ContextMenuManager.unregisterInstance(this);
        }
    }
    
    showAt(x, y) {
        // This method can be called externally
        if (ContextMenuManager.activeMenu && ContextMenuManager.activeMenu !== this) {
            ContextMenuManager.activeMenu._hideMenu();
        }
        ContextMenuManager.activeMenu = this;
        this._showAtPosition(x, y);
    }
    
    hide() {
        this._hideMenu();
        if (ContextMenuManager.activeMenu === this) {
            ContextMenuManager.activeMenu = null;
        }
    }
    
    _showAtPosition(x, y) {
        // Store original parent for restoration later
        if (!this._originalParent) {
            this._originalParent = this.parentElement;
        }
        
        // Dispatch contextmenushow event
        this.fireEvent(ContextMenuEvent.CONTEXT_MENU_SHOW, { 
            contextMenu: this,
            position: { x, y }
        });
        
        // Set flag to prevent disconnection during move
        this._isMovingToBody = true;
        
        // Move context menu to document.body to ensure proper viewport positioning
        if (this.parentElement !== document.body) {
            document.body.appendChild(this);
        }
        
        // Clear the flag after move is complete
        this._isMovingToBody = false;
        
        // Position the menu at the specified coordinates (viewport coordinates)
        this.style.left = x + 'px';
        this.style.top = y + 'px';
        this.style.display = 'block';
        this.active = true;
        this.visible = true;
        
        // Ensure the menu stays within viewport bounds
        this._adjustPosition();
        
        // Listen for menu item selections to close the menu
        if (!this._menuItemHandler) {
            this._menuItemHandler = (event) => {
                const menuItem = event.target.closest('gooeyui-menuitem, gooeyui-checkboxmenuitem');
                if (menuItem && !menuItem.disabled) {
                    this.hide();
                }
            };
            this.addEventListener(MouseEvent.CLICK, this._menuItemHandler);
        }
    }
    
    _hideMenu() {
        this.style.display = 'none';
        this.active = false;
        this.visible = false;
        
        // Dispatch contextmenuhide event
        this.fireEvent(ContextMenuEvent.CONTEXT_MENU_HIDE, { 
            contextMenu: this
        });
        
        // Restore context menu to its original parent
        if (this._originalParent && this._originalParent !== document.body && this.parentElement === document.body) {
            // Set flag to prevent disconnection during move back
            this._isMovingToBody = true;
            this._originalParent.appendChild(this);
            this._isMovingToBody = false;
        }
        
        // Remove menu item listener
        if (this._menuItemHandler) {
            this.removeEventListener(MouseEvent.CLICK, this._menuItemHandler);
            this._menuItemHandler = null;
        }
    }
    
    _adjustPosition() {
        const rect = this.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Adjust horizontal position if menu goes off-screen
        if (rect.right > viewportWidth) {
            this.style.left = (viewportWidth - rect.width - 10) + 'px';
        }
        
        // Adjust vertical position if menu goes off-screen
        if (rect.bottom > viewportHeight) {
            this.style.top = (viewportHeight - rect.height - 10) + 'px';
        }
        
        // Ensure menu doesn't go above or to the left of viewport
        if (rect.left < 0) {
            this.style.left = '10px';
        }
        if (rect.top < 0) {
            this.style.top = '10px';
        }
    }
    
    // Override the active setter to control display
    set active(val) {
        if (val) {
            this.setAttribute("active", "");
            this.visible = true;
            this.style.display = 'block';
        } else {
            this.removeAttribute("active");
            this.visible = false;
            this.style.display = 'none';
        }
    }
    
    get active() {
        return this.hasAttribute("active");
    }
}