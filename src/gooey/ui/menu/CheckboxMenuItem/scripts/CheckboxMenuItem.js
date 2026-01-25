import MenuItem from "../../MenuItem/scripts/MenuItem.js";
import CheckboxMenuItemEvent from '../../../../events/menu/CheckboxMenuItemEvent.js';
import MouseEvent from '../../../../events/MouseEvent.js';
import Template from '../../../../util/Template.js';

export default class CheckboxMenuItem extends MenuItem {
    constructor () {
        super();

        Template.activate("ui-CheckboxmenuItem", this.shadowRoot);
        if (this.hasAttribute("checked")) {
            this.checked = true;
        }

        this.addValidEvent(CheckboxMenuItemEvent.CHANGE);
        this.addEventListener(MouseEvent.CLICK, this._handleClick.bind(this));
    }

    _handleClick(eventName, data) {
        const oldChecked = this.checked;
        this.checked = !this.checked;

        // Dispatch change event if state actually changed
        if (this.checked !== oldChecked) {
            this.fireEvent(CheckboxMenuItemEvent.CHANGE, {
                checkboxMenuItem: this,
                checked: this.checked,
                oldChecked: oldChecked,
                originalEvent: data?.originalEvent
            });
        }

        // Dispatch action event if action is set
        if (this.action) {
            // Add the action as a valid event if not already added
            if (!this.hasEvent(this.action)) {
                this.addValidEvent(this.action);
            }
            this.fireEvent(this.action, {
                checkboxMenuItem: this,
                checked: this.checked
            });
        }

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
    }

    get checked () {
        return this.hasAttribute("checked");
    }

    set checked (val) {
        if (val) {
            this.setAttribute("checked", "");
        }
        else {
            this.removeAttribute("checked");
        }
    }
}
