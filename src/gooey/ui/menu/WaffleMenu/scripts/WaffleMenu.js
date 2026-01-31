import UIComponent from '../../../UIComponent.js';
import WaffleMenuEvent from '../../../../events/menu/WaffleMenuEvent.js';
import WaffleMenuItemEvent from '../../../../events/menu/WaffleMenuItemEvent.js';
import MouseEvent from '../../../../events/MouseEvent.js';
import KeyboardEvent from '../../../../events/KeyboardEvent.js';
import Key from '../../../../io/Key.js';
import Template from '../../../../util/Template.js';

/**
 * WaffleMenu Component (Bento Box / App Launcher)
 *
 * A grid-based popup menu triggered by a waffle icon button.
 * Displays items in a configurable grid layout for quick access to
 * applications, features, or navigation items.
 *
 * @example
 * <gooeyui-wafflemenu columns="3">
 *     <gooeyui-wafflemenuitem icon="mail.svg" label="Mail" action="open-mail"></gooeyui-wafflemenuitem>
 *     <gooeyui-wafflemenuitem icon="calendar.svg" label="Calendar" action="open-calendar"></gooeyui-wafflemenuitem>
 * </gooeyui-wafflemenu>
 */
export default class WaffleMenu extends UIComponent {

    constructor() {
        super();

        Template.activate("ui-WaffleMenu", this.shadowRoot);

        // Cache DOM references
        this.trigger = this.shadowRoot.querySelector(".waffle-trigger");
        this.panel = this.shadowRoot.querySelector(".waffle-panel");
        this.grid = this.shadowRoot.querySelector(".waffle-grid");
        this.backdrop = this.shadowRoot.querySelector(".waffle-backdrop");
        this.defaultIcon = this.shadowRoot.querySelector(".waffle-icon");
        this.customIcon = this.shadowRoot.querySelector(".waffle-custom-icon");
        this.titleElement = this.shadowRoot.querySelector(".waffle-title");
        this.closeButton = this.shadowRoot.querySelector(".waffle-close");
        this.footer = this.shadowRoot.querySelector(".waffle-footer");
        this.footerSlot = this.shadowRoot.querySelector('slot[name="footer"]');

        // Wire ARIA controls
        const panelId = this.panel.id || `waffle-panel-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        this.panel.id = panelId;
        this.trigger.setAttribute("aria-controls", panelId);

        // Track attached item listeners
        this._attachedItems = new Set();

        // Bind handlers
        this._boundToggle = this._handleToggle.bind(this);
        this._boundBackdropClick = this._handleBackdropClick.bind(this);
        this._boundKeyDown = this._handleKeyDown.bind(this);
        this._boundItemSelect = this._handleItemSelect.bind(this);
        this._boundClose = () => { this.active = false; };
        this._boundFooterSlotChange = this._handleFooterSlotChange.bind(this);

        // Attach event listeners
        this.trigger.addEventListener(MouseEvent.CLICK, this._boundToggle);
        this.backdrop.addEventListener(MouseEvent.CLICK, this._boundBackdropClick);
        this.closeButton.addEventListener(MouseEvent.CLICK, this._boundClose);
        this.footerSlot?.addEventListener("slotchange", this._boundFooterSlotChange);
        this._handleFooterSlotChange();

        // Register valid events
        this.addValidEvent(WaffleMenuEvent.OPEN);
        this.addValidEvent(WaffleMenuEvent.CLOSE);
        this.addValidEvent(WaffleMenuEvent.ITEM_SELECT);

        // Initialize attributes
        if (this.hasAttribute("columns")) {
            this.columns = this.getAttribute("columns");
        }
        if (this.hasAttribute("rows")) {
            this.rows = this.getAttribute("rows");
        }
        if (this.hasAttribute("icon")) {
            this.icon = this.getAttribute("icon");
        }
        if (this.hasAttribute("panelwidth")) {
            this.panelwidth = this.getAttribute("panelwidth");
        }
        if (this.hasAttribute("label")) {
            this.label = this.getAttribute("label");
        }
        if (this.hasAttribute("title")) {
            this.title = this.getAttribute("title");
        }
        if (this.hasAttribute("disabled")) {
            this.disabled = true;
        }
    }

    connectedCallback() {
        super.connectedCallback && super.connectedCallback();

        document.addEventListener(KeyboardEvent.KEY_DOWN, this._boundKeyDown);

        // Attach listeners to existing items
        this._attachItemListeners();

        // Watch for dynamically added items
        this._itemObserver = new MutationObserver(() => {
            this._attachItemListeners();
        });
        this._itemObserver.observe(this, { childList: true, subtree: true });
    }

    disconnectedCallback() {
        super.disconnectedCallback && super.disconnectedCallback();

        if (this._itemObserver) {
            this._itemObserver.disconnect();
        }

        this.footerSlot?.removeEventListener("slotchange", this._boundFooterSlotChange);

        // Remove global key listener when disconnected
        document.removeEventListener(KeyboardEvent.KEY_DOWN, this._boundKeyDown);
    }

    // =========================================================================
    // Attribute Accessors
    // =========================================================================

    get active() {
        return this.hasAttribute("active");
    }

    set active(val) {
        const wasActive = this.active;

        if (val) {
            this.setAttribute("active", "");
            this.trigger.setAttribute("aria-expanded", "true");
            this.panel.setAttribute("aria-hidden", "false");
            this._adjustPosition();
            this._focusFirstItem();

            if (!wasActive) {
                this.fireEvent(WaffleMenuEvent.OPEN, { menu: this });
            }
        } else {
            this.removeAttribute("active");
            this.trigger.setAttribute("aria-expanded", "false");
            this.panel.setAttribute("aria-hidden", "true");

            if (wasActive) {
                this.fireEvent(WaffleMenuEvent.CLOSE, { menu: this });
            }
        }
    }

    get columns() {
        return parseInt(this.getAttribute("columns")) || 3;
    }

    set columns(val) {
        const num = Math.min(Math.max(parseInt(val) || 3, 1), 6);
        this.setAttribute("columns", num);
        this.style.setProperty("--waffle-columns", num);
    }

    get rows() {
        return this.getAttribute("rows") ? parseInt(this.getAttribute("rows")) : null;
    }

    set rows(val) {
        if (val === null || val === undefined) {
            this.removeAttribute("rows");
            this.style.removeProperty("--waffle-panel-max-height");
        } else {
            const num = parseInt(val);
            this.setAttribute("rows", num);
            // Calculate max height based on rows and visible chrome
            const itemSize = parseInt(getComputedStyle(this).getPropertyValue("--waffle-item-size")) || 96;
            const gap = parseInt(getComputedStyle(this).getPropertyValue("--waffle-gap")) || 8;
            const padding = parseInt(getComputedStyle(this).getPropertyValue("--waffle-padding")) || 16;
            const headerHeight = this.title ? (this.shadowRoot.querySelector(".waffle-header")?.offsetHeight || 0) : 0;
            const footerHeight = this.footer?.classList.contains("has-content") ? (this.footer.offsetHeight || 0) : 0;
            const maxHeight = (itemSize * num) + (gap * (num - 1)) + (padding * 2) + headerHeight + footerHeight;
            this.style.setProperty("--waffle-panel-max-height", `${maxHeight}px`);
        }
    }

    get icon() {
        return this.getAttribute("icon");
    }

    set icon(val) {
        const slottedIcon = this.querySelector('[slot="icon"]');
        if (slottedIcon) {
            // Hide both default icons when slot is used
            this.defaultIcon.style.display = "none";
            this.customIcon.style.display = "none";
            if (val) {
                this.setAttribute("icon", val);
            } else {
                this.removeAttribute("icon");
            }
            return;
        }

        if (val) {
            this.setAttribute("icon", val);
            this.customIcon.src = val;
            this.customIcon.style.display = "block";
            this.defaultIcon.style.display = "none";
        } else {
            this.removeAttribute("icon");
            this.customIcon.style.display = "none";
            this.defaultIcon.style.display = "block";
        }
    }

    get position() {
        return this.getAttribute("position") || "bottom-start";
    }

    set position(val) {
        this.setAttribute("position", val);
    }

    get panelwidth() {
        return this.getAttribute("panelwidth") || "auto";
    }

    set panelwidth(val) {
        this.setAttribute("panelwidth", val);
        this.style.setProperty("--waffle-panel-width", val);
    }

    get closeonselect() {
        return this.getAttribute("closeonselect") !== "false";
    }

    set closeonselect(val) {
        this.setAttribute("closeonselect", val ? "true" : "false");
    }

    get closeonclickoutside() {
        return this.getAttribute("closeonclickoutside") !== "false";
    }

    set closeonclickoutside(val) {
        this.setAttribute("closeonclickoutside", val ? "true" : "false");
    }

    get disabled() {
        return super.disabled;
    }

    set disabled(val) {
        super.disabled = val;
        if (val) {
            this.trigger.setAttribute("disabled", "");
        } else {
            this.trigger.removeAttribute("disabled");
        }
    }

    get label() {
        return this.getAttribute("label");
    }

    set label(val) {
        if (val) {
            this.setAttribute("label", val);
            this.trigger.setAttribute("aria-label", val);
        } else {
            this.removeAttribute("label");
            this.trigger.removeAttribute("aria-label");
        }
    }

    get title() {
        return this.getAttribute("title");
    }

    set title(val) {
        if (val) {
            this.setAttribute("title", val);
            this.titleElement.textContent = val;
            if (!this.titleElement.id) {
                this.titleElement.id = `waffle-title-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
            }
            this.panel.setAttribute("aria-labelledby", this.titleElement.id);
            this.panel.removeAttribute("aria-label");
        } else {
            this.removeAttribute("title");
            this.titleElement.textContent = "";
            this.panel.removeAttribute("aria-labelledby");
            this.panel.setAttribute("aria-label", "Applications");
        }
    }

    // =========================================================================
    // Public Methods
    // =========================================================================

    /**
     * Opens the waffle menu panel
     */
    open() {
        if (!this.disabled) {
            this.active = true;
        }
    }

    /**
     * Closes the waffle menu panel
     */
    close() {
        this.active = false;
    }

    /**
     * Toggles the waffle menu panel open/closed
     */
    toggle() {
        if (!this.disabled) {
            this.active = !this.active;
        }
    }

    // =========================================================================
    // Private Methods
    // =========================================================================

    _handleToggle(event) {
        if (this.disabled) {
            event.stopPropagation();
            return;
        }
        this.toggle();
    }

    _handleBackdropClick() {
        if (this.closeonclickoutside) {
            this.active = false;
        }
    }

    _handleKeyDown(event) {
        if (!this.active) return;

        const items = this._getVisibleItems();
        const currentItem = document.activeElement?.closest?.("gooeyui-wafflemenuitem") || document.activeElement;
        const currentIndex = items.indexOf(currentItem);

        switch (event.key) {
            case Key.ESCAPE:
                event.preventDefault();
                this.active = false;
                this.trigger.focus();
                break;

            case Key.ARROW_RIGHT:
                event.preventDefault();
                this._focusItem(items, currentIndex + 1);
                break;

            case Key.ARROW_LEFT:
                event.preventDefault();
                this._focusItem(items, currentIndex - 1);
                break;

            case Key.ARROW_DOWN:
                event.preventDefault();
                this._focusItem(items, currentIndex + this.columns);
                break;

            case Key.ARROW_UP:
                event.preventDefault();
                this._focusItem(items, currentIndex - this.columns);
                break;

            case Key.HOME:
                event.preventDefault();
                this._focusItem(items, 0);
                break;

            case Key.END:
                event.preventDefault();
                this._focusItem(items, items.length - 1);
                break;

            case Key.TAB:
                // Prefer standard Tab behavior (exit menu) unless a focus trap is implemented
                break;
        }
    }

    _handleItemSelect(eventName, eventData) {
        this.fireEvent(WaffleMenuEvent.ITEM_SELECT, {
            menu: this,
            item: eventData.item,
            action: eventData.action
        });

        if (this.closeonselect) {
            this.active = false;
        }
    }

    _handleFooterSlotChange() {
        if (!this.footer || !this.footerSlot) return;
        const assigned = this.footerSlot.assignedNodes({ flatten: true });
        const hasContent = assigned.some((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) return true;
            return node.nodeType === Node.TEXT_NODE && node.textContent.trim() !== "";
        });
        this.footer.classList.toggle("has-content", hasContent);
    }

    _attachItemListeners() {
        const items = this.querySelectorAll("gooeyui-wafflemenuitem");
        items.forEach(item => {
            if (!this._attachedItems.has(item)) {
                item.addEventListener(WaffleMenuItemEvent.SELECT, this._boundItemSelect);
                this._attachedItems.add(item);
            }
        });
    }

    _getVisibleItems() {
        return Array.from(this.querySelectorAll("gooeyui-wafflemenuitem:not([disabled])"));
    }

    _focusFirstItem() {
        const items = this._getVisibleItems();
        if (items.length > 0) {
            items[0].focus();
        }
    }

    _focusItem(items, index) {
        if (items.length === 0) return;

        // Wrap around
        if (index < 0) index = items.length - 1;
        if (index >= items.length) index = 0;

        items[index].focus();
    }

    _adjustPosition() {
        // Reset any previous adjustments
        this.panel.style.removeProperty("left");
        this.panel.style.removeProperty("right");
        this.panel.style.removeProperty("top");
        this.panel.style.removeProperty("bottom");

        // Wait for panel to render
        requestAnimationFrame(() => {
            const panelRect = this.panel.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            // Adjust horizontal position if off-screen
            if (panelRect.right > viewportWidth) {
                const overflow = panelRect.right - viewportWidth + 10;
                if (this.position.includes("start")) {
                    this.panel.style.left = `-${overflow}px`;
                }
            }
            if (panelRect.left < 0) {
                const overflow = Math.abs(panelRect.left) + 10;
                if (this.position.includes("end")) {
                    this.panel.style.right = `-${overflow}px`;
                }
            }

            // Adjust vertical position if off-screen
            if (panelRect.bottom > viewportHeight) {
                // Flip to top if at bottom
                if (this.position.includes("bottom")) {
                    this.panel.style.removeProperty("top");
                    this.panel.style.removeProperty("margin-top");
                    this.panel.style.bottom = "100%";
                    this.panel.style.marginBottom = "4px";
                }
            }
            if (panelRect.top < 0) {
                // Flip to bottom if at top
                if (this.position.includes("top")) {
                    this.panel.style.removeProperty("bottom");
                    this.panel.style.removeProperty("margin-bottom");
                    this.panel.style.top = "100%";
                    this.panel.style.marginTop = "4px";
                }
            }
        });
    }
}
