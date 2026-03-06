import Container from '../../../Container.js';
import Template from '../../../../util/Template.js';
import StatusBarEvent from '../../../../events/layout/StatusBarEvent.js';
import Sanitizer from '../../../../util/Sanitizer.js';

export default class StatusBar extends Container {
    constructor() {
        super();

        Template.activate("ui-StatusBar", this.shadowRoot);

        this._statusbarEl = this.shadowRoot.querySelector(".statusbar");
        this._managedItems = new Set();
        this._isOverflowing = false;
        this._overflowingSlots = [];
        this._resizeObserver = null;

        this.addValidEvent(StatusBarEvent.ITEM_ADDED);
        this.addValidEvent(StatusBarEvent.ITEM_REMOVED);
        this.addValidEvent(StatusBarEvent.OVERFLOW);

        if (this.hasAttribute("position")) {
            this.position = this.getAttribute("position");
        }

        if (this.hasAttribute("height")) {
            this.height = this.getAttribute("height");
        }
    }

    connectedCallback() {
        super.connectedCallback?.();

        if (!this._statusbarInit) {
            this._statusbarInit = true;

            // Apply default position if not set
            if (!this.hasAttribute("position")) {
                this.setAttribute("position", "bottom");
            }

            // Apply height from attribute
            const h = this.height;
            this.style.height = h + "px";
            this.style.minHeight = h + "px";

            // Set up overflow detection
            if (this._statusbarEl) {
                this._resizeObserver = new ResizeObserver(() => this._checkOverflow());
                this._resizeObserver.observe(this._statusbarEl);
            }
        }
    }

    disconnectedCallback() {
        super.disconnectedCallback?.();

        if (this._resizeObserver) {
            this._resizeObserver.disconnect();
            this._resizeObserver = null;
        }
    }

    get position() {
        return this.getAttribute("position") || "bottom";
    }

    set position(val) {
        const normalized = String(val).toLowerCase();
        if (normalized === "top" || normalized === "bottom") {
            this.setAttribute("position", normalized);
        }
    }

    get height() {
        return parseInt(this.getAttribute("height")) || 24;
    }

    set height(val) {
        this.setAttribute("height", val);
        this.style.height = val + "px";
        this.style.minHeight = val + "px";
    }

    attributeChangedCallback(name, oldValue, newValue) {
        // Guard against infinite recursion: setters call setAttribute which re-triggers this callback
        if (oldValue === newValue) return;

        super.attributeChangedCallback?.(name, oldValue, newValue);

        switch (name) {
            case 'position':
                this.position = newValue;
                break;
            case 'height':
                this.height = newValue;
                break;
        }
    }

    /**
     * Add a status item with plain text content. Content is rendered as text,
     * not HTML — this is safe by default and prevents XSS injection.
     * Use addStatusItemHTML() for rich content that requires HTML markup.
     * @param {string} content - Plain text content for the item
     * @param {string} [position="left"] - Slot position: "left", "center", or "right"
     * @returns {HTMLElement} The created span element reference
     */
    addStatusItem(content, position = "left") {
        const validPositions = ["left", "center", "right"];
        if (!validPositions.includes(position)) {
            position = "left";
        }

        const span = document.createElement("span");
        span.textContent = content;
        span.setAttribute("slot", position);

        this._managedItems.add(span);
        this.appendChild(span);

        this.fireEvent(StatusBarEvent.ITEM_ADDED, { item: span, position: position });

        return span;
    }

    /**
     * Add a status item with HTML content. Content is sanitized to remove
     * script tags, event handlers, and javascript: URLs before injection.
     * Prefer addStatusItem() for plain text content.
     * @param {string} html - HTML content for the item
     * @param {string} [position="left"] - Slot position: "left", "center", or "right"
     * @returns {HTMLElement} The created span element reference
     */
    addStatusItemHTML(html, position = "left") {
        const validPositions = ["left", "center", "right"];
        if (!validPositions.includes(position)) {
            position = "left";
        }

        const span = document.createElement("span");
        span.innerHTML = Sanitizer.sanitize(html);
        span.setAttribute("slot", position);

        this._managedItems.add(span);
        this.appendChild(span);

        this.fireEvent(StatusBarEvent.ITEM_ADDED, { item: span, position: position });

        return span;
    }

    /**
     * Remove a specific status item by element reference.
     * Only removes items created via addStatusItem().
     * @param {HTMLElement} element - The element to remove
     * @returns {boolean} True if removed, false if not a managed item
     */
    removeStatusItem(element) {
        if (!this._managedItems.has(element)) {
            return false;
        }

        element.remove();
        this._managedItems.delete(element);

        this.fireEvent(StatusBarEvent.ITEM_REMOVED, { item: element });

        return true;
    }

    /**
     * Remove all programmatically added items.
     * Does not affect declaratively slotted children.
     */
    clearStatusItems() {
        for (const item of this._managedItems) {
            item.remove();
            this.fireEvent(StatusBarEvent.ITEM_REMOVED, { item: item });
        }
        this._managedItems.clear();
    }

    /**
     * Check for overflow and fire OVERFLOW event if state changes.
     * @private
     */
    _checkOverflow() {
        if (!this._statusbarEl) return;

        const isOverflowing = this._statusbarEl.scrollWidth > this._statusbarEl.clientWidth;

        if (isOverflowing) {
            const slots = [];
            const leftPanel = this.shadowRoot.querySelector(".statusbar-left");
            const centerPanel = this.shadowRoot.querySelector(".statusbar-center");
            const rightPanel = this.shadowRoot.querySelector(".statusbar-right");

            if (leftPanel && leftPanel.scrollWidth > leftPanel.clientWidth) {
                slots.push("left");
            }
            if (centerPanel && centerPanel.scrollWidth > centerPanel.clientWidth) {
                slots.push("center");
            }
            if (rightPanel && rightPanel.scrollWidth > rightPanel.clientWidth) {
                slots.push("right");
            }

            const slotsKey = slots.join(",");
            const prevSlotsKey = this._overflowingSlots.join(",");

            // Only fire if overflow state changed or overflowing slots changed
            if (!this._isOverflowing || slotsKey !== prevSlotsKey) {
                this._isOverflowing = true;
                this._overflowingSlots = slots;
                this.fireEvent(StatusBarEvent.OVERFLOW, { overflowing: true, slots: slots });
            }
        } else if (this._isOverflowing) {
            // Transition from overflow to non-overflow
            this._isOverflowing = false;
            this._overflowingSlots = [];
        }
    }
}
