import UIComponent from '../../../UIComponent.js';
import MenuItemEvent from '../../../../events/menu/MenuItemEvent.js';
import MouseEvent from '../../../../events/MouseEvent.js';
import KeyboardEvent from '../../../../events/KeyboardEvent.js';
import Key from '../../../../io/Key.js';
import Template from '../../../../util/Template.js';

export default class MenuItem extends UIComponent {
    constructor () {
        super();

        Template.activate("ui-MenuItem", this.shadowRoot);

        this.textElement = this.shadowRoot.querySelector(".MenuItemText");
        this.shortcutElement = this.shadowRoot.querySelector(".MenuItemShortcut");
        this.iconElement = this.shadowRoot.querySelector(".MenuItemIconImage");

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

        this.addEventListener(MouseEvent.CLICK, (eventName, data) => {
            let subMenu;
            const originalEvent = data?.originalEvent;

            subMenu = this.querySelector("gooeyui-menu");
            if ((!this.disabled) && (!subMenu)) {
                this.active = false;

                // Dispatch custom select event
                this.fireEvent(MenuItemEvent.SELECT, {
                    menuItem: this,
                    text: this.text,
                    action: this.action,
                    originalEvent: originalEvent
                });

                // Close all ancestor menus in the hierarchy
                let currentMenu = this.closest('gooeyui-menu');
                while (currentMenu) {
                    currentMenu.active = false;
                    // Find the next ancestor menu by looking for a parent MenuItem that contains a Menu
                    const parentMenuItem = currentMenu.closest('gooeyui-menuitem');
                    currentMenu = parentMenuItem ? parentMenuItem.closest('gooeyui-menu') : null;
                }

                // Close active menu header
                const menubar = document.querySelector('gooeyui-menubar');
                if (menubar) {
                    const activeMenuHeader = menubar.getActiveMenuHeader();
                    if (activeMenuHeader) {
                        activeMenuHeader.removeAttribute('active');
                    }
                }

                // Close any active context menu
                const contextMenu = this.closest('gooeyui-contextmenu');
                if (contextMenu && typeof contextMenu.hide === 'function') {
                    contextMenu.hide();
                }

                // Keep document dispatch for global menu actions
                if (this.action) {
                    document.dispatchEvent(new Event(this.action));
                }
            }
            else {
                originalEvent?.stopPropagation();
            }
        });

        // ARIA: Keyboard navigation for menu items
        this.addEventListener(KeyboardEvent.KEY_DOWN, (eventName, event) => {
            this._handleKeyDown(event);
        });
    }

    connectedCallback() {
        super.connectedCallback?.();
        if (!this._menuItemInit) {
            this._menuItemInit = true;
            this.setAttribute('role', 'menuitem');
            this.setAttribute('tabindex', '-1');
            if (this.hasAttribute("text")) {
                this.text = this.getAttribute("text");
            }
            if (this.hasAttribute("shortcut")) {
                this.shortcut = this.getAttribute("shortcut");
            }
            if (this.hasAttribute("icon")) {
                this.icon = this.getAttribute("icon");
            }
            this._updateIcon();
        }
    }

    /**
     * Handle keyboard navigation for accessibility
     */
    _handleKeyDown(event) {
        // Get sibling menu items
        const parentMenu = this.parentElement;
        if (!parentMenu) return;

        const items = Array.from(parentMenu.querySelectorAll('gooeyui-menuitem:not([disabled])'));
        const currentIndex = items.indexOf(this);

        switch (event.key) {
            case Key.ARROW_DOWN:
                event.preventDefault();
                event.stopPropagation();
                if (currentIndex < items.length - 1) {
                    items[currentIndex + 1].focus();
                } else {
                    // Wrap to first
                    items[0]?.focus();
                }
                break;

            case Key.ARROW_UP:
                event.preventDefault();
                event.stopPropagation();
                if (currentIndex > 0) {
                    items[currentIndex - 1].focus();
                } else {
                    // Wrap to last
                    items[items.length - 1]?.focus();
                }
                break;

            case Key.ARROW_RIGHT:
                event.preventDefault();
                event.stopPropagation();
                // Open submenu if exists
                const subMenu = this.querySelector('gooeyui-menu');
                if (subMenu) {
                    this.active = true;
                    const firstSubItem = subMenu.querySelector('gooeyui-menuitem:not([disabled])');
                    firstSubItem?.focus();
                }
                break;

            case Key.ARROW_LEFT:
                event.preventDefault();
                event.stopPropagation();
                // Close submenu and return focus to parent
                const parentMenuItem = parentMenu.closest('gooeyui-menuitem');
                if (parentMenuItem) {
                    parentMenu.active = false;
                    parentMenuItem.focus();
                }
                break;

            case Key.ENTER:
            case Key.SPACE:
                event.preventDefault();
                event.stopPropagation();
                this.click();
                break;

            case Key.ESCAPE:
                event.preventDefault();
                event.stopPropagation();
                // Close menu
                const menu = this.closest('gooeyui-menu');
                if (menu) {
                    menu.active = false;
                }
                break;

            case Key.HOME:
                event.preventDefault();
                event.stopPropagation();
                items[0]?.focus();
                break;

            case Key.END:
                event.preventDefault();
                event.stopPropagation();
                items[items.length - 1]?.focus();
                break;
        }
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
        // Re-render text to show/update underline
        if (this.textElement) {
            this._renderText();
        }
    }

    set action(val) {
        this.setAttribute("action", val);
    }

    set active(val) {
        let box, left, menu;

        menu = this.querySelector("gooeyui-menu");
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
        this.shortcutElement.textContent = "Ctrl+" + val.toUpperCase();
    }

    set text(val) {
        this.setAttribute("text", val);
        this._renderText();
    }

    /**
     * Render text with accelerator underline using DOM nodes.
     * Called when text or accelerator changes.
     */
    _renderText() {
        const text = this.getAttribute("text") || "";
        const accelerator = this.accelerator;

        // Clear existing content
        this.textElement.textContent = "";

        if (accelerator && text.indexOf(accelerator) !== -1) {
            const accelIndex = text.indexOf(accelerator);
            const beforeText = text.substring(0, accelIndex);
            const afterText = text.substring(accelIndex + accelerator.length);

            if (beforeText) {
                this.textElement.appendChild(document.createTextNode(beforeText));
            }
            const underline = document.createElement("u");
            underline.textContent = accelerator;
            this.textElement.appendChild(underline);
            if (afterText) {
                this.textElement.appendChild(document.createTextNode(afterText));
            }
        } else {
            this.textElement.textContent = text;
        }
    }

    set icon(val) {
        this.setAttribute("icon", val);
        this._updateIcon();
    }

    _updateIcon() {
        if (!this.iconElement) return;
        const slottedIcon = this.querySelector('[slot="icon"]');
        if (slottedIcon) {
            this.iconElement.style.display = 'none';
        } else {
            const val = this.icon;
            if (val) {
                this.iconElement.src = val;
                this.iconElement.style.display = 'block';
            } else {
                this.iconElement.src = '';
                this.iconElement.style.display = 'none';
            }
        }
    }
}
