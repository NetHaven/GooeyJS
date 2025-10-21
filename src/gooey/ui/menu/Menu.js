import Component from '../Component.js';
import KeyboardEvent from '../../events/KeyboardEvent.js';
import MenuEvent from '../../events/menu/MenuEvent.js';
import Template from '../../util/Template.js';

export default class Menu extends Component {
    constructor () {
        var acceleratedItem, accelerator, activeMenuItem, activeMenuItemIndex, menuItemList, 
            menuText, shortcutItem;
        
        super();

        Template.activate("ui-Menu", this);
        this.visible = false;
        
        // Add valid events
        this.addValidEvent(MenuEvent.MENU_SHOW);
        this.addValidEvent(MenuEvent.MENU_HIDE);

        if (this.hasAttribute("text")) {
            this.text = this.getAttribute("text");
        }

        this.menuItems.forEach(function(menuItem) {
            menuText = menuItem.getAttribute("text");
            accelerator = menuItem.getAttribute("accelerator");
            if (accelerator) {
                if (menuText.indexOf(accelerator) != -1) {
                    menuText = menuText.replace(accelerator, "<u>" + accelerator + "</u>");
                }
            }
            menuItem.setAttribute("text", menuText);    
        });

        document.addEventListener(KeyboardEvent.KEY_DOWN, (event) => {
            menuItemList = Array.from(this.querySelectorAll("ui-MenuItem, ui-CheckboxMenuItem"));

            if (event.ctrlKey) {
                shortcutItem = menuItemList.find((element) => {
                    if (element.shortcut) {
                        return element.shortcut.toLowerCase() == event.key.toLowerCase();
                    }
                    else {
                        return false;
                    }
                });

                if (shortcutItem) {
                    if (!shortcutItem.disabled) {
                        document.dispatchEvent(new Event(shortcutItem.action));
                    }
                }
            }

            if (this.active) {
                activeMenuItemIndex = menuItemList.findIndex((element) => element.active);
                if (event.key == 'ArrowDown') {
                    if (activeMenuItemIndex == -1) {
                        activeMenuItemIndex = 0;
                    }
                    else {
                        activeMenuItem = menuItemList[activeMenuItemIndex];
                        activeMenuItem.active = false;
                        activeMenuItemIndex++;
                        if (activeMenuItemIndex > menuItemList.length - 1) {
                            activeMenuItemIndex = 0;
                        }
                    }
                    menuItemList[activeMenuItemIndex].active = true;
                }
                else if (event.key == 'ArrowUp') {
                    if (activeMenuItemIndex == -1) {
                        activeMenuItemIndex = menuItemList.length - 1;
                    }
                    else {
                        activeMenuItem = menuItemList[activeMenuItemIndex];
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
                        acceleratedItem = menuItemList.find((element) => {
                            if (element.accelerator) {
                                return element.accelerator.toLowerCase() == event.key.toLowerCase();
                            }
                            return false;
                        });

                        if (acceleratedItem && !acceleratedItem.disabled) {
                            this.active = false;
                            document.dispatchEvent(new Event(acceleratedItem.action));
                        }    
                    } 
                }
            }
        });
    }

    get accelerator() {
        return this.getAttribute("accelerator");
    }

    get active() {
        return this.hasAttribute("active");
    }

    get menuItems() {
        let menuItemList;

        menuItemList = Array.from(this.querySelectorAll("ui-MenuItem"));

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
