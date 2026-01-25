import UIComponent from '../../../UIComponent.js';
import HamburgerMenuEvent from '../../../../events/menu/HamburgerMenuEvent.js';
import MenuItemEvent from '../../../../events/menu/MenuItemEvent.js';
import MouseEvent from '../../../../events/MouseEvent.js';
import KeyboardEvent from '../../../../events/KeyboardEvent.js';
import Key from '../../../../io/Key.js';
import Template from '../../../../util/Template.js';

/**
 * HamburgerMenu Component
 *
 * A collapsible navigation menu triggered by a hamburger icon button.
 * Supports slide-out panels from left, right, top, or bottom positions.
 *
 * @example
 * <gooeyui-hamburgermenu>
 *     <gooeyui-menuitem text="Home" action="navigate-home"></gooeyui-menuitem>
 *     <gooeyui-menuitem text="About" action="navigate-about"></gooeyui-menuitem>
 *     <gooeyui-menuitemseparator></gooeyui-menuitemseparator>
 *     <gooeyui-menuitem text="Settings" action="open-settings"></gooeyui-menuitem>
 * </gooeyui-hamburgermenu>
 */
export default class HamburgerMenu extends UIComponent {
    constructor() {
        super();

        Template.activate("ui-HamburgerMenu", this.shadowRoot);

        // Element references
        this.button = this.shadowRoot.querySelector(".hamburger-button");
        this.panel = this.shadowRoot.querySelector(".hamburger-panel");
        this.backdrop = this.shadowRoot.querySelector(".hamburger-backdrop");
        this.closeButton = this.shadowRoot.querySelector(".close-button");
        this.textElement = this.shadowRoot.querySelector(".hamburger-text");
        this.iconElement = this.shadowRoot.querySelector(".hamburger-icon");

        // Register valid events
        this.addValidEvent(HamburgerMenuEvent.OPEN);
        this.addValidEvent(HamburgerMenuEvent.CLOSE);
        this.addValidEvent(HamburgerMenuEvent.TOGGLE);
        this.addValidEvent(MenuItemEvent.SELECT);

        // Initialize attributes
        if (this.hasAttribute("text")) {
            this.text = this.getAttribute("text");
        }

        if (this.hasAttribute("icon")) {
            this.icon = this.getAttribute("icon");
        }

        if (this.hasAttribute("position")) {
            this.position = this.getAttribute("position");
        }

        if (this.hasAttribute("panelwidth")) {
            this.panelwidth = this.getAttribute("panelwidth");
        }

        if (this.hasAttribute("panelheight")) {
            this.panelheight = this.getAttribute("panelheight");
        }

        // Bind event handlers
        this._boundKeyDownHandler = this._handleKeyDown.bind(this);
        this._boundMenuItemSelectHandler = this._handleMenuItemSelect.bind(this);

        // Track menu items we've attached listeners to
        this._attachedMenuItems = new Set();

        // Setup event handlers
        this._setupEventHandlers();
    }

    connectedCallback() {
        super.connectedCallback && super.connectedCallback();

        // Add document-level keyboard listener
        document.addEventListener(KeyboardEvent.KEY_DOWN, this._boundKeyDownHandler);

        // Attach listeners to existing menu items
        this._attachMenuItemListeners();

        // Watch for dynamically added menu items
        this._menuItemObserver = new MutationObserver(() => {
            this._attachMenuItemListeners();
        });
        this._menuItemObserver.observe(this, { childList: true, subtree: true });
    }

    disconnectedCallback() {
        super.disconnectedCallback && super.disconnectedCallback();

        // Clean up document-level listeners
        document.removeEventListener(KeyboardEvent.KEY_DOWN, this._boundKeyDownHandler);

        // Clean up mutation observer
        if (this._menuItemObserver) {
            this._menuItemObserver.disconnect();
            this._menuItemObserver = null;
        }

        // Remove listeners from all menu items
        this._detachMenuItemListeners();
    }

    _attachMenuItemListeners() {
        const menuItems = this.querySelectorAll('gooeyui-menuitem');
        menuItems.forEach(menuItem => {
            if (!this._attachedMenuItems.has(menuItem)) {
                menuItem.addEventListener(MenuItemEvent.SELECT, this._boundMenuItemSelectHandler);
                this._attachedMenuItems.add(menuItem);
            }
        });
    }

    _detachMenuItemListeners() {
        this._attachedMenuItems.forEach(menuItem => {
            menuItem.removeEventListener(MenuItemEvent.SELECT, this._boundMenuItemSelectHandler);
        });
        this._attachedMenuItems.clear();
    }

    _setupEventHandlers() {
        // Toggle button click
        this.button.addEventListener(MouseEvent.CLICK, (e) => {
            if (!this.disabled) {
                e.stopPropagation();
                this.toggle();
            }
        });

        // Close button click
        this.closeButton.addEventListener(MouseEvent.CLICK, (e) => {
            e.stopPropagation();
            this.close();
            this.button.focus();
        });

        // Backdrop click (close on click outside)
        this.backdrop.addEventListener(MouseEvent.CLICK, (e) => {
            if (this.closeonclickoutside) {
                e.stopPropagation();
                this.close();
            }
        });
    }

    _handleKeyDown(event) {
        if (this.active && event.key === Key.ESCAPE) {
            this.close();
            this.button.focus();
        }
    }

    _handleMenuItemSelect(eventName, data) {
        if (this.closeonselect) {
            this.close();
        }

        // Re-fire the event so parent components can listen
        this.fireEvent(MenuItemEvent.SELECT, data || {});
    }

    // ========== Properties ==========

    get active() {
        return this.hasAttribute("active");
    }

    set active(val) {
        if (val) {
            this.setAttribute("active", "");
            this.panel.setAttribute("aria-hidden", "false");
            this.button.setAttribute("aria-expanded", "true");
            this.fireEvent(HamburgerMenuEvent.OPEN, { menu: this });
        } else {
            this.removeAttribute("active");
            this.panel.setAttribute("aria-hidden", "true");
            this.button.setAttribute("aria-expanded", "false");
            this.fireEvent(HamburgerMenuEvent.CLOSE, { menu: this });
        }
    }

    get position() {
        return this.getAttribute("position") || "left";
    }

    set position(val) {
        this.setAttribute("position", val);
    }

    get mode() {
        return this.getAttribute("mode") || "slide";
    }

    set mode(val) {
        this.setAttribute("mode", val);
    }

    get text() {
        return this.getAttribute("text");
    }

    set text(val) {
        if (val) {
            this.setAttribute("text", val);
            this.textElement.textContent = val;
        } else {
            this.removeAttribute("text");
            this.textElement.textContent = "";
        }
    }

    get icon() {
        return this.getAttribute("icon");
    }

    set icon(val) {
        if (val) {
            this.setAttribute("icon", val);
            this.iconElement.innerHTML = `<img src="${val}" alt="" />`;
        } else {
            this.removeAttribute("icon");
            // Restore default hamburger bars
            this.iconElement.innerHTML = `
                <span class="bar"></span>
                <span class="bar"></span>
                <span class="bar"></span>
            `;
        }
    }

    get panelwidth() {
        return this.getAttribute("panelwidth") || "250px";
    }

    set panelwidth(val) {
        this.setAttribute("panelwidth", val);
        this.style.setProperty("--hamburger-panel-width", val);
    }

    get panelheight() {
        return this.getAttribute("panelheight");
    }

    set panelheight(val) {
        if (val) {
            this.setAttribute("panelheight", val);
            this.style.setProperty("--hamburger-panel-height", val);
        } else {
            this.removeAttribute("panelheight");
            this.style.removeProperty("--hamburger-panel-height");
        }
    }

    get closeonselect() {
        return this.getAttribute("closeonselect") !== "false";
    }

    set closeonselect(val) {
        this.setAttribute("closeonselect", val.toString());
    }

    get closeonclickoutside() {
        return this.getAttribute("closeonclickoutside") !== "false";
    }

    set closeonclickoutside(val) {
        this.setAttribute("closeonclickoutside", val.toString());
    }

    /**
     * Returns all MenuItem children
     * @returns {Array<HTMLElement>}
     */
    get menuItems() {
        return Array.from(this.querySelectorAll("gooeyui-menuitem"));
    }

    // ========== Public Methods ==========

    /**
     * Opens the hamburger menu panel
     */
    open() {
        if (!this.disabled) {
            this.active = true;
        }
    }

    /**
     * Closes the hamburger menu panel
     */
    close() {
        this.active = false;
    }

    /**
     * Toggles the hamburger menu panel open/closed
     */
    toggle() {
        if (!this.disabled) {
            const wasActive = this.active;
            this.active = !wasActive;
            this.fireEvent(HamburgerMenuEvent.TOGGLE, {
                menu: this,
                active: this.active
            });
        }
    }
}
