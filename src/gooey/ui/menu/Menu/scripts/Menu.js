import UIComponent from '../../../UIComponent.js';
import Key from '../../../../io/Key.js';
import KeyboardEvent from '../../../../events/KeyboardEvent.js';
import MenuEvent from '../../../../events/menu/MenuEvent.js';
import Template from '../../../../util/Template.js';

export default class Menu extends UIComponent {
    constructor () {
        super();

        Template.activate("ui-Menu", this.shadowRoot);
        this.visible = false;

        // Add valid events
        this.addValidEvent(MenuEvent.MENU_SHOW);
        this.addValidEvent(MenuEvent.MENU_HIDE);

        if (this.hasAttribute("text")) {
            this.text = this.getAttribute("text");
        }

        // Trigger text re-render for menu items to apply accelerator underlines.
        // MenuItem._renderText() handles accelerator rendering with DOM nodes.
        const allMenuItems = this.querySelectorAll("gooeyui-menuitem, gooeyui-checkboxmenuitem");
        allMenuItems.forEach((menuItem) => {
            const menuText = menuItem.getAttribute("text");
            if (menuText) {
                menuItem.text = menuText;
            }
        });

        // Bind the handler so it can be removed later
        this._handleKeyDown = this._handleKeyDown.bind(this);
    }

    connectedCallback() {
        super.connectedCallback?.();
        document.addEventListener(KeyboardEvent.KEY_DOWN, this._handleKeyDown);
    }

    disconnectedCallback() {
        super.disconnectedCallback?.();
        document.removeEventListener(KeyboardEvent.KEY_DOWN, this._handleKeyDown);
    }

    _handleKeyDown(event) {
        const menuItemList = Array.from(this.querySelectorAll("gooeyui-menuitem, gooeyui-checkboxmenuitem"));

        if (event.ctrlKey) {
            const shortcutItem = menuItemList.find((element) => {
                if (element.shortcut) {
                    return element.shortcut.toLowerCase() === event.key.toLowerCase();
                }
                else {
                    return false;
                }
            });

            if (shortcutItem) {
                if (!shortcutItem.disabled && shortcutItem.action) {
                    document.dispatchEvent(new Event(shortcutItem.action));
                }
            }
        }

        if (this.active) {
            let activeMenuItemIndex = menuItemList.findIndex((element) => element.active);
            if (event.key === Key.ARROW_DOWN) {
                if (activeMenuItemIndex === -1) {
                    activeMenuItemIndex = 0;
                }
                else {
                    const activeMenuItem = menuItemList[activeMenuItemIndex];
                    activeMenuItem.active = false;
                    activeMenuItemIndex++;
                    if (activeMenuItemIndex > menuItemList.length - 1) {
                        activeMenuItemIndex = 0;
                    }
                }
                menuItemList[activeMenuItemIndex].active = true;
            }
            else if (event.key === Key.ARROW_UP) {
                if (activeMenuItemIndex === -1) {
                    activeMenuItemIndex = menuItemList.length - 1;
                }
                else {
                    const activeMenuItem = menuItemList[activeMenuItemIndex];
                    activeMenuItem.active = false;
                    activeMenuItemIndex--;
                    if (activeMenuItemIndex < 0 ) {
                        activeMenuItemIndex = menuItemList.length - 1;
                    }
                }
                menuItemList[activeMenuItemIndex].active = true;
            }
            else {
                // Check for accelerators
                if (!event.altKey) {
                    const acceleratedItem = menuItemList.find((element) => {
                        if (element.accelerator) {
                            return element.accelerator.toLowerCase() === event.key.toLowerCase();
                        }
                        return false;
                    });

                    if (acceleratedItem && !acceleratedItem.disabled && acceleratedItem.action) {
                        this.active = false;
                        document.dispatchEvent(new Event(acceleratedItem.action));
                    }
                }
            }
        }
    }

    get accelerator() {
        return this.getAttribute("accelerator");
    }

    get active() {
        return this.hasAttribute("active");
    }

    get menuItems() {
        let menuItemList;

        menuItemList = Array.from(this.querySelectorAll("gooeyui-menuitem"));

        return menuItemList;
    }

    get text() {
        return this.getAttribute("text");
    }

    set accelerator(val) {
        this.setAttribute("accelerator", val);
    }

    set active(val) {
        if (val) {
            this.setAttribute("active", "");
            this.visible = true;
            
            // Dispatch menushow event
            this.fireEvent(MenuEvent.MENU_SHOW, { 
                menu: this,
                active: true
            });
        }
        else {
            this.removeAttribute("active");
            this.visible = false;
            
            // Dispatch menuhide event
            this.fireEvent(MenuEvent.MENU_HIDE, { 
                menu: this,
                active: false
            });
        }
    }

    set text(val) {
        this.setAttribute("text", val);
    }
}
