import Component from '../Component.js';
import MenuItemEvent from '../../events/menu/MenuItemEvent.js';
import MouseEvent from '../../events/MouseEvent.js';
import Template from '../../util/Template.js';

export default class MenuItem extends Component {
    static get observedAttributes() {
        return [...super.observedAttributes, 'accelerator', 'action', 'active', 'shortcut', 'text', 'icon'];
    }

    constructor () {
        super();

        Template.activate("ui-MenuItem", this);

        this.textElement = this.querySelector(".MenuItemText");
        this.shortcutElement = this.querySelector(".MenuItemShortcut");
        this.iconElement = this.querySelector(".MenuItemIconImage");

        if (this.hasAttribute("text")) {
            this.text = this.getAttribute("text");
        }

        if (this.hasAttribute("shortcut")) {
            this.shortcut = this.getAttribute("shortcut");
        }

        if (this.hasAttribute("icon")) {
            this.icon = this.getAttribute("icon");
        }
        
        this.addValidEvent(MenuItemEvent.SELECT);
        
        this.addEventListener(MouseEvent.MOUSE_OVER, () => {
            if (!this.disabled) {
                this.active = true;
            }
        });

        this.addEventListener(MouseEvent.MOUSE_OUT, () => {
            if (!this.disabled) {
                this.active = false;
            }
        });

        this.addEventListener(MouseEvent.CLICK, (evt) => {
            let subMenu;

            subMenu = this.querySelector("ui-Menu");
            if ((!this.disabled) && (!subMenu)) {
                this.active = false;
                
                // Dispatch custom select event
                this.fireEvent(MenuItemEvent.SELECT, {
                    menuItem: this,
                    text: this.text,
                    action: this.action,
                    originalEvent: evt
                });
                
                // Close all ancestor menus in the hierarchy
                let currentMenu = this.closest('ui-Menu');
                while (currentMenu) {
                    currentMenu.active = false;
                    // Find the next ancestor menu by looking for a parent MenuItem that contains a Menu
                    const parentMenuItem = currentMenu.closest('ui-MenuItem');
                    currentMenu = parentMenuItem ? parentMenuItem.closest('ui-Menu') : null;
                }
                
                // Close active menu header
                const menubar = document.querySelector('ui-Menubar');
                if (menubar) {
                    const activeMenuHeader = menubar.getActiveMenuHeader();
                    if (activeMenuHeader) {
                        activeMenuHeader.removeAttribute('active');
                    }
                }
                
                // Close any active context menu
                const contextMenu = this.closest('ui-ContextMenu');
                if (contextMenu && typeof contextMenu.hide === 'function') {
                    contextMenu.hide();
                }
                
                // Keep document dispatch for global menu actions
                document.dispatchEvent(new Event(this.action));
            }
            else {
                if (evt && typeof evt.stopPropagation === 'function') {
                    evt.stopPropagation();
                }
            }
        });
    }

    get accelerator() {
        return this.getAttribute("accelerator");
    }

    get action() {
        return this.getAttribute("action");
    }

    get active() {
        return this.hasAttribute("active");
    }

    get shortcut() {
        return this.getAttribute("shortcut");
    }

    get text() {
        return this.getAttribute("text");
    }

    get icon() {
        return this.getAttribute("icon");
    }
    
    set accelerator(val) {
        this.setAttribute("accelerator", val);
    }

    set action(val) {
        this.setAttribute("action", val);
    }

    set active(val) {
        let box, left, menu;

        menu = this.querySelector("ui-menu");
        if (val) {
            this.setAttribute("active", "");
            if (menu) {
                box = this.getBoundingClientRect();
                
                left = box.width + 1;
                menu.style.position = 'absolute';
                menu.style.top = 0 + "px";
                menu.style.left = left + "px"; 
                menu.active = true;
            }
        }
        else {
            this.removeAttribute("active");
            if (menu) {
                menu.active = false;
            }
        }
    }

    set shortcut(val) {
        this.setAttribute("shortcut", val);
        this.shortcutElement.innerHTML = "Ctrl+" + val.toUpperCase();
    }

    set text(val) {
        this.setAttribute("text", val);
        this.textElement.innerHTML = val;
    }

    set icon(val) {
        this.setAttribute("icon", val);
        if (val) {
            this.iconElement.src = val;
            this.iconElement.style.display = 'block';
        } else {
            this.iconElement.src = '';
            this.iconElement.style.display = 'none';
        }
    }
}
