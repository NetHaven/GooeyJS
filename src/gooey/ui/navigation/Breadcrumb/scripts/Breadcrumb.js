import UIComponent from '../../../UIComponent.js';
import BreadcrumbEvent from '../../../../events/navigation/BreadcrumbEvent.js';
import Template from '../../../../util/Template.js';
import Key from '../../../../io/Key.js';
import KeyboardEvent from '../../../../events/KeyboardEvent.js';
import MouseEvent from '../../../../events/MouseEvent.js';

/**
 * Breadcrumb navigation component that displays hierarchical path.
 *
 * @example
 * <gooeyui-breadcrumb separator="/" label="Breadcrumb">
 *     <gooeyui-breadcrumbitem text="Home" href="/"></gooeyui-breadcrumbitem>
 *     <gooeyui-breadcrumbitem text="Products" href="/products"></gooeyui-breadcrumbitem>
 *     <gooeyui-breadcrumbitem text="Electronics" active></gooeyui-breadcrumbitem>
 * </gooeyui-breadcrumb>
 */
export default class Breadcrumb extends UIComponent {

    /** @type {Array<BreadcrumbItem>} */
    _items = [];

    /** @type {HTMLElement} */
    _list = null;

    /** @type {HTMLElement} */
    _nav = null;

    /** @type {HTMLElement|null} */
    _ellipsisButton = null;

    /** @type {HTMLElement|null} */
    _collapsedMenu = null;

    /** @type {Array<HTMLElement>} */
    _menuItems = [];

    /** @type {boolean} */
    _isExpanded = false;

    /** @type {MutationObserver} */
    _observer = null;

    /** @type {boolean} */
    _suppressObserver = false;

    /** @type {string} */
    _menuId = "";

    constructor() {
        super();

        Template.activate("ui-Breadcrumb", this.shadowRoot);

        this._list = this.shadowRoot.querySelector(".breadcrumb-list");
        this._nav = this.shadowRoot.querySelector(".breadcrumb-nav");
        this._menuId = `breadcrumb-collapsed-${Math.random().toString(36).slice(2)}`;

        // Register valid events
        this.addValidEvent(BreadcrumbEvent.NAVIGATE);
        this.addValidEvent(BreadcrumbEvent.PATH_CHANGE);
        this.addValidEvent(BreadcrumbEvent.EXPAND);
        this.addValidEvent(BreadcrumbEvent.COLLAPSE);

        // Bind event handlers
        this._handleItemClick = this._handleItemClick.bind(this);
        this._handleKeyDown = this._handleKeyDown.bind(this);
        this._handleEllipsisClick = this._handleEllipsisClick.bind(this);
        this._handleOutsideClick = this._handleOutsideClick.bind(this);
        this._handleMenuKeyDown = this._handleMenuKeyDown.bind(this);
        this._handleDocumentKeyDown = this._handleDocumentKeyDown.bind(this);
        this._handleWindowResize = this._handleWindowResize.bind(this);

        this._syncAriaLabel();
    }

    attributeChangedCallback(name, oldValue, newValue) {
        super.attributeChangedCallback?.(name, oldValue, newValue);
        if (oldValue === newValue) return;

        switch (name) {
            case "separator":
            case "separatoricon":
                this._updateSeparators();
                break;
            case "collapsible":
            case "maxvisible":
                this._updateCollapsedState();
                break;
            case "label":
                this._syncAriaLabel();
                break;
            case "disabled":
            case "visible":
                this._closeCollapsedMenu();
                break;
            default:
                break;
        }
    }

    connectedCallback() {
        super.connectedCallback?.();

        // Set up mutation observer to track child changes
        this._observer = new MutationObserver((mutations) => {
            this._onChildrenChanged(mutations);
        });

        this._observer.observe(this, {
            childList: true,
            subtree: false
        });

        // Initialize items from existing children
        this._initializeItems();

        // Add native event listeners (bypass Observable)
        HTMLElement.prototype.addEventListener.call(this, MouseEvent.CLICK, this._handleItemClick);
        HTMLElement.prototype.addEventListener.call(this, KeyboardEvent.KEY_DOWN, this._handleKeyDown);
    }

    disconnectedCallback() {
        super.disconnectedCallback?.();

        if (this._observer) {
            this._observer.disconnect();
            this._observer = null;
        }

        HTMLElement.prototype.removeEventListener.call(this, MouseEvent.CLICK, this._handleItemClick);
        HTMLElement.prototype.removeEventListener.call(this, KeyboardEvent.KEY_DOWN, this._handleKeyDown);
        this._removeGlobalListeners();
    }

    // ========================
    // Attribute Accessors
    // ========================

    /**
     * The separator string displayed between breadcrumb items.
     * @type {string}
     */
    get separator() {
        return this.getAttribute("separator") || "/";
    }

    set separator(val) {
        if (val === null || val === undefined) {
            this.removeAttribute("separator");
        } else {
            this.setAttribute("separator", val);
        }
        this._updateSeparators();
    }

    /**
     * URL to an icon image used as separator instead of text.
     * @type {string}
     */
    get separatorIcon() {
        return this.getAttribute("separatoricon") || "";
    }

    set separatorIcon(val) {
        if (val) {
            this.setAttribute("separatoricon", val);
        } else {
            this.removeAttribute("separatoricon");
        }
        this._updateSeparators();
    }

    /**
     * Whether to collapse middle items when maxVisible is exceeded.
     * @type {boolean}
     */
    get collapsible() {
        return this.hasAttribute("collapsible");
    }

    set collapsible(val) {
        if (val) {
            this.setAttribute("collapsible", "");
        } else {
            this.removeAttribute("collapsible");
        }
        this._updateCollapsedState();
    }

    /**
     * Maximum number of visible items before collapsing. 0 means no limit.
     * Values below 3 disable collapsing to avoid hiding the current item.
     * @type {number}
     */
    get maxVisible() {
        return parseInt(this.getAttribute("maxvisible"), 10) || 0;
    }

    set maxVisible(val) {
        this.setAttribute("maxvisible", String(val));
        this._updateCollapsedState();
    }

    /**
     * Accessible label for the breadcrumb navigation.
     * @type {string|null}
     */
    get label() {
        return this.getAttribute("label");
    }

    set label(val) {
        if (val) {
            this.setAttribute("label", val);
        } else {
            this.removeAttribute("label");
        }
        this._syncAriaLabel();
    }

    // ========================
    // Public API
    // ========================

    /**
     * Returns all breadcrumb items.
     * @returns {Array<BreadcrumbItem>}
     */
    getItems() {
        return [...this._items];
    }

    /**
     * Returns the number of breadcrumb items.
     * @returns {number}
     */
    getItemCount() {
        return this._items.length;
    }

    /**
     * Returns the item at the specified index.
     * @param {number} index
     * @returns {BreadcrumbItem|null}
     */
    getItemAt(index) {
        return this._items[index] || null;
    }

    /**
     * Returns the currently active item.
     * @returns {BreadcrumbItem|null}
     */
    getActiveItem() {
        return this._items.find(item => item.active) || null;
    }

    /**
     * Sets the active item by index and clears any previous active state.
     * @param {number} index
     */
    setActiveIndex(index) {
        this._items.forEach((item, idx) => {
            item.active = idx === index;
        });
    }

    /**
     * Adds a new breadcrumb item to the end of the path.
     * @param {Object} config - Item configuration
     * @param {string} config.text - Display text
     * @param {string} [config.href] - Navigation URL
     * @param {string} [config.icon] - Icon URL
     * @param {string} [config.value] - Associated value
     * @param {boolean} [config.active] - Whether this is the current item
     * @returns {BreadcrumbItem}
     */
    addItem(config) {
        const item = document.createElement("gooeyui-breadcrumbitem");

        if (config.text) item.text = config.text;
        if (config.href) item.href = config.href;
        if (config.icon) item.icon = config.icon;
        if (config.value) item.value = config.value;
        if (config.active) item.active = true;

        this.appendChild(item);
        return item;
    }

    /**
     * Removes the item at the specified index.
     * @param {number} index
     * @returns {BreadcrumbItem|null}
     */
    removeItemAt(index) {
        const item = this._items[index];
        if (item) {
            item.remove();
            return item;
        }
        return null;
    }

    /**
     * Removes all items after the specified index (exclusive).
     * Useful for "navigate back" functionality.
     * @param {number} index - Items after this index will be removed
     */
    truncateAfter(index) {
        const itemsToRemove = this._items.slice(index + 1);
        itemsToRemove.forEach(item => item.remove());
    }

    /**
     * Clears all breadcrumb items.
     */
    clear() {
        this._items.forEach(item => item.remove());
    }

    /**
     * Sets the path from an array of item configurations.
     * @param {Array<Object>} items - Array of item configs
     */
    setPath(items) {
        this.clear();
        items.forEach((config, index) => {
            // Mark last item as active if not specified
            if (index === items.length - 1 && config.active === undefined) {
                config.active = true;
            }
            this.addItem(config);
        });
    }

    // ========================
    // Private Methods
    // ========================

    /**
     * Initializes items from existing child elements.
     * @private
     */
    _initializeItems() {
        this._items = Array.from(this.children).filter((child) => {
            return child.tagName?.toLowerCase() === "gooeyui-breadcrumbitem";
        });

        this._ensureSingleActive();

        this._items.forEach((item, index) => {
            this._configureItem(item, index);
        });

        this._updateSeparators();
        this._updateCollapsedState();
    }

    _ensureSingleActive() {
        const activeItems = this._items.filter(item => item.active);

        if (activeItems.length === 0 && this._items.length > 0) {
            this._items[this._items.length - 1].active = true;
            return;
        }

        if (activeItems.length > 1) {
            activeItems.slice(0, -1).forEach(item => {
                item.active = false;
            });
        }
    }

    /**
     * Configures a breadcrumb item.
     * @private
     */
    _configureItem(item, index) {
        item.setAttribute("role", "listitem");

        // Mark first item
        if (index === 0) {
            item.setAttribute("data-first", "");
        } else {
            item.removeAttribute("data-first");
        }

        // Set ARIA attributes
        if (item.active) {
            item.setAttribute("aria-current", "page");
        } else {
            item.removeAttribute("aria-current");
        }
    }

    _syncAriaLabel() {
        if (!this._nav) return;

        const label = this.getAttribute("label");
        this._nav.setAttribute("aria-label", label || "Breadcrumb");
    }

    /**
     * Handles child element mutations.
     * @private
     */
    _onChildrenChanged(mutations) {
        if (this._suppressObserver) return;

        const relevant = mutations.some((mutation) => {
            const nodes = [...mutation.addedNodes, ...mutation.removedNodes];
            return nodes.some((node) => {
                return node.nodeType === 1 && node.tagName?.toLowerCase() === "gooeyui-breadcrumbitem";
            });
        });

        if (!relevant) return;

        this._initializeItems();

        this.fireEvent(BreadcrumbEvent.PATH_CHANGE, {
            breadcrumb: this,
            items: this._items,
            count: this._items.length
        });
    }

    /**
     * Updates separator content on all items.
     * @private
     */
    _updateSeparators() {
        const separator = this.separator;
        const separatorIcon = this.separatorIcon;

        this._items.forEach(item => {
            if (typeof item._setSeparator === "function") {
                item._setSeparator(separator, separatorIcon);
            }
        });
    }

    /**
     * Updates collapsed state based on maxVisible setting.
     * @private
     */
    _updateCollapsedState() {
        const maxVisible = this.maxVisible;

        if (!this.collapsible || maxVisible === 0 || maxVisible < 3 ||
            this._items.length <= maxVisible) {
            this._showAllItems();
            return;
        }

        // Collapse middle items, keep first and last visible
        const keepFirst = 1;
        const keepLast = maxVisible - keepFirst - 1; // -1 for ellipsis

        const collapsedItems = [];

        this._items.forEach((item, index) => {
            if (index < keepFirst) {
                // Keep first items visible
                item.removeAttribute("hidden");
            } else if (index >= this._items.length - keepLast) {
                // Keep last items visible
                item.removeAttribute("hidden");
            } else {
                // Collapse middle items
                item.setAttribute("hidden", "");
                collapsedItems.push(item);
            }
        });

        if (collapsedItems.length > 0) {
            this._showEllipsis(collapsedItems);

            this.fireEvent(BreadcrumbEvent.COLLAPSE, {
                breadcrumb: this,
                collapsedItems: collapsedItems,
                visibleItems: this._items.filter(i => !i.hasAttribute("hidden"))
            });
        }
    }

    /**
     * Shows all items and removes ellipsis.
     * @private
     */
    _showAllItems() {
        this._items.forEach(item => item.removeAttribute("hidden"));
        this._removeEllipsis();
        this._isExpanded = true;
    }

    /**
     * Creates and shows the ellipsis button.
     * @private
     */
    _showEllipsis(collapsedItems) {
        this._suppressObserver = true;
        this._removeEllipsis();

        // Create ellipsis button
        this._ellipsisButton = document.createElement("button");
        this._ellipsisButton.className = "breadcrumb-ellipsis";
        this._ellipsisButton.type = "button";
        this._ellipsisButton.textContent = "...";
        this._ellipsisButton.setAttribute("aria-label",
            `Show ${collapsedItems.length} hidden items`);
        this._ellipsisButton.setAttribute("aria-haspopup", "menu");
        this._ellipsisButton.setAttribute("aria-controls", this._menuId);
        this._ellipsisButton.setAttribute("aria-expanded", "false");
        this._ellipsisButton.addEventListener(MouseEvent.CLICK, this._handleEllipsisClick);

        // Create collapsed menu
        this._collapsedMenu = document.createElement("div");
        this._collapsedMenu.className = "breadcrumb-collapsed-menu";
        this._collapsedMenu.id = this._menuId;
        this._collapsedMenu.setAttribute("hidden", "");
        this._collapsedMenu.setAttribute("role", "menu");
        this._collapsedMenu.addEventListener(KeyboardEvent.KEY_DOWN, this._handleMenuKeyDown);

        this._menuItems = [];
        collapsedItems.forEach((item) => {
            const hasHref = Boolean(item.href);
            const menuItem = document.createElement(hasHref ? "a" : "button");
            menuItem.className = "breadcrumb-collapsed-item";
            menuItem.textContent = item.text;
            menuItem.setAttribute("role", "menuitem");
            menuItem.setAttribute("tabindex", "-1");
            menuItem.dataset.index = String(this._items.indexOf(item));

            if (hasHref) {
                menuItem.setAttribute("href", item.href);
            } else {
                menuItem.type = "button";
            }

            menuItem.addEventListener(MouseEvent.CLICK, (event) => {
                if (!hasHref) {
                    event.preventDefault();
                }
                this._navigateToItem(item);
                this._closeCollapsedMenu();
            });

            this._menuItems.push(menuItem);
            this._collapsedMenu.appendChild(menuItem);
        });

        // Insert after first visible item
        const firstItem = this._items[0];
        if (firstItem && firstItem.nextSibling) {
            this.insertBefore(this._ellipsisButton, firstItem.nextSibling);
        } else {
            this.appendChild(this._ellipsisButton);
        }

        this.shadowRoot.appendChild(this._collapsedMenu);
        this._isExpanded = false;
        this._suppressObserver = false;
    }

    /**
     * Removes the ellipsis button and menu.
     * @private
     */
    _removeEllipsis() {
        if (this._ellipsisButton) {
            this._ellipsisButton.removeEventListener(MouseEvent.CLICK, this._handleEllipsisClick);
            this._ellipsisButton.remove();
            this._ellipsisButton = null;
        }

        if (this._collapsedMenu) {
            this._collapsedMenu.removeEventListener(KeyboardEvent.KEY_DOWN, this._handleMenuKeyDown);
            this._collapsedMenu.remove();
            this._collapsedMenu = null;
        }

        this._menuItems = [];
    }

    _removeGlobalListeners() {
        document.removeEventListener(MouseEvent.CLICK, this._handleOutsideClick);
        document.removeEventListener(KeyboardEvent.KEY_DOWN, this._handleDocumentKeyDown);
        window.removeEventListener("resize", this._handleWindowResize);
        window.removeEventListener("scroll", this._handleWindowResize, true);
    }

    /**
     * Handles ellipsis button click.
     * @private
     */
    _handleEllipsisClick(event) {
        if (this.disabled) return;

        event.stopPropagation();

        if (this._collapsedMenu.hasAttribute("hidden")) {
            this._openCollapsedMenu();
        } else {
            this._closeCollapsedMenu();
        }
    }

    _handleMenuKeyDown(event) {
        if (!this._menuItems.length) return;

        const currentIndex = this._menuItems.indexOf(document.activeElement);
        let nextIndex = currentIndex;

        switch (event.key) {
            case Key.ARROW_DOWN:
                nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % this._menuItems.length;
                break;
            case Key.ARROW_UP:
                nextIndex = currentIndex === -1 ? this._menuItems.length - 1 :
                    (currentIndex - 1 + this._menuItems.length) % this._menuItems.length;
                break;
            case Key.HOME:
                nextIndex = 0;
                break;
            case Key.END:
                nextIndex = this._menuItems.length - 1;
                break;
            case Key.ESCAPE:
                this._closeCollapsedMenu();
                this._ellipsisButton?.focus();
                return;
            case Key.ENTER:
            case Key.SPACE:
                document.activeElement?.click();
                return;
            default:
                return;
        }

        event.preventDefault();
        this._menuItems.forEach((item, index) => {
            item.tabIndex = index === nextIndex ? 0 : -1;
        });
        this._menuItems[nextIndex]?.focus();
    }

    _handleDocumentKeyDown(event) {
        if (event.key !== Key.ESCAPE) return;
        this._closeCollapsedMenu();
        this._ellipsisButton?.focus();
    }

    _handleWindowResize() {
        if (this._collapsedMenu && !this._collapsedMenu.hasAttribute("hidden")) {
            this._updateMenuPosition();
        }
    }

    /**
     * Opens the collapsed items menu.
     * @private
     */
    _openCollapsedMenu() {
        if (this.disabled || !this._collapsedMenu) return;

        this._collapsedMenu.removeAttribute("hidden");
        this._ellipsisButton?.setAttribute("aria-expanded", "true");

        // Position menu relative to the host
        this._updateMenuPosition();

        document.addEventListener(MouseEvent.CLICK, this._handleOutsideClick);
        document.addEventListener(KeyboardEvent.KEY_DOWN, this._handleDocumentKeyDown);
        window.addEventListener("resize", this._handleWindowResize);
        window.addEventListener("scroll", this._handleWindowResize, true);

        if (this._menuItems.length > 0) {
            this._menuItems.forEach((item, index) => {
                item.tabIndex = index === 0 ? 0 : -1;
            });
            this._menuItems[0].focus();
        }

        const collapsedItems = this._items.filter(i => i.hasAttribute("hidden"));
        this.fireEvent(BreadcrumbEvent.EXPAND, {
            breadcrumb: this,
            collapsedItems: collapsedItems
        });
    }

    _updateMenuPosition() {
        if (!this._ellipsisButton || !this._collapsedMenu) return;

        const hostRect = this.getBoundingClientRect();
        const buttonRect = this._ellipsisButton.getBoundingClientRect();
        this._collapsedMenu.style.left = `${buttonRect.left - hostRect.left}px`;
    }

    /**
     * Closes the collapsed items menu.
     * @private
     */
    _closeCollapsedMenu() {
        if (this._collapsedMenu) {
            this._collapsedMenu.setAttribute("hidden", "");
        }
        if (this._ellipsisButton) {
            this._ellipsisButton.setAttribute("aria-expanded", "false");
        }
        this._removeGlobalListeners();
    }

    /**
     * Handles clicks outside the collapsed menu.
     * @private
     */
    _handleOutsideClick(event) {
        const path = event.composedPath ? event.composedPath() : [];
        if (!path.includes(this._collapsedMenu) && !path.includes(this._ellipsisButton)) {
            this._closeCollapsedMenu();
        }
    }

    /**
     * Handles click events on breadcrumb items.
     * @private
     */
    _handleItemClick(event) {
        if (this.disabled) return;

        const path = event.composedPath ? event.composedPath() : [];
        const item = path.find((node) => {
            return node?.tagName?.toLowerCase() === "gooeyui-breadcrumbitem";
        });

        if (!item || item.active || item.disabled) {
            return;
        }

        this._navigateToItem(item);
    }

    /**
     * Navigates to the specified item.
     * @private
     */
    _navigateToItem(item) {
        const index = this._items.indexOf(item);

        this.fireEvent(BreadcrumbEvent.NAVIGATE, {
            breadcrumb: this,
            item: item,
            index: index,
            value: item.value,
            href: item.href
        });
    }

    /**
     * Handles keyboard navigation.
     * @private
     */
    _handleKeyDown(event) {
        if (this.disabled) return;

        if (this._collapsedMenu && !this._collapsedMenu.hasAttribute("hidden")) {
            const path = event.composedPath ? event.composedPath() : [];
            if (path.includes(this._collapsedMenu)) {
                return;
            }
        }

        const path = event.composedPath ? event.composedPath() : [];
        const item = path.find((node) => {
            return node?.tagName?.toLowerCase() === "gooeyui-breadcrumbitem";
        });

        if (!item) return;

        const visibleItems = this._items.filter(i => !i.hasAttribute("hidden"));
        const currentIndex = visibleItems.indexOf(item);
        if (currentIndex === -1) return;

        let newIndex = currentIndex;

        switch (event.key) {
            case Key.ARROW_LEFT:
            case Key.ARROW_UP:
                newIndex = Math.max(0, currentIndex - 1);
                break;

            case Key.ARROW_RIGHT:
            case Key.ARROW_DOWN:
                newIndex = Math.min(visibleItems.length - 1, currentIndex + 1);
                break;

            case Key.HOME:
                newIndex = 0;
                break;

            case Key.END:
                newIndex = visibleItems.length - 1;
                break;

            case Key.ENTER:
            case Key.SPACE:
                if (!item.active && !item.disabled) {
                    event.preventDefault();
                    this._navigateToItem(item);
                }
                return;

            default:
                return;
        }

        if (newIndex !== currentIndex) {
            event.preventDefault();
            const targetItem = visibleItems[newIndex];
            if (targetItem) {
                targetItem.focus();
            }
        }
    }
}
