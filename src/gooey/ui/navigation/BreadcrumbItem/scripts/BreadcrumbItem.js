import UIComponent from '../../../UIComponent.js';
import Template from '../../../../util/Template.js';

/**
 * Individual breadcrumb navigation item.
 * Used as a child of gooeyui-breadcrumb.
 */
export default class BreadcrumbItem extends UIComponent {

    /** @type {HTMLElement} */
    _separator = null;

    /** @type {HTMLImageElement|null} */
    _separatorImage = null;

    /** @type {HTMLImageElement} */
    _icon = null;

    /** @type {HTMLAnchorElement} */
    _link = null;

    /** @type {HTMLSpanElement} */
    _textElement = null;

    constructor() {
        super();

        Template.activate("ui-BreadcrumbItem", this.shadowRoot);

        this._separator = this.shadowRoot.querySelector(".breadcrumb-separator");
        this._icon = this.shadowRoot.querySelector(".breadcrumb-icon");
        this._link = this.shadowRoot.querySelector(".breadcrumb-link");
        this._textElement = this.shadowRoot.querySelector(".breadcrumb-text");

        // Set ARIA role
        this.setAttribute("role", "listitem");

        // Bind methods
        this._handleClick = this._handleClick.bind(this);
        this._link.addEventListener("click", this._handleClick);

        // Initialize attributes
        this._applyText(this.text);
        this._applyHref(this.href);
        this._applyIcon(this.icon);
        this._applyActive(this.active);
        this._syncInteractiveState();
    }

    attributeChangedCallback(name, oldValue, newValue) {
        super.attributeChangedCallback?.(name, oldValue, newValue);
        if (oldValue === newValue) return;

        switch (name) {
            case "text":
                this._applyText(newValue || "");
                break;
            case "href":
                this._applyHref(newValue || "");
                break;
            case "icon":
                this._applyIcon(newValue || "");
                break;
            case "active":
                this._applyActive(newValue !== null);
                break;
            case "disabled":
                this._syncInteractiveState();
                break;
            default:
                break;
        }
    }

    // ========================
    // Attribute Accessors
    // ========================

    /**
     * The display text for this breadcrumb item.
     * @type {string}
     */
    get text() {
        return this.getAttribute("text") || "";
    }

    set text(val) {
        this.setAttribute("text", val);
        this._applyText(val);
    }

    /**
     * The navigation URL for this item.
     * @type {string}
     */
    get href() {
        return this.getAttribute("href") || "";
    }

    set href(val) {
        if (val) {
            this.setAttribute("href", val);
        } else {
            this.removeAttribute("href");
        }
        this._applyHref(val || "");
    }

    /**
     * URL to an icon image displayed before the text.
     * @type {string}
     */
    get icon() {
        return this.getAttribute("icon") || "";
    }

    set icon(val) {
        if (val) {
            this.setAttribute("icon", val);
        } else {
            this.removeAttribute("icon");
        }
        this._applyIcon(val || "");
    }

    /**
     * An associated value for this item (useful for data binding).
     * @type {string}
     */
    get value() {
        return this.getAttribute("value") || "";
    }

    set value(val) {
        this.setAttribute("value", val);
    }

    /**
     * Whether this is the currently active/selected item.
     * Active items are not clickable.
     * @type {boolean}
     */
    get active() {
        return this.hasAttribute("active");
    }

    set active(val) {
        if (val) {
            this.setAttribute("active", "");
        } else {
            this.removeAttribute("active");
        }
        this._applyActive(Boolean(val));
    }

    // ========================
    // Public Methods
    // ========================

    /**
     * Sets focus on this item's link element.
     */
    focus() {
        this._link.focus();
    }

    // ========================
    // Internal Methods (called by parent Breadcrumb)
    // ========================

    /**
     * Sets the separator content.
     * @param {string} text - Separator text
     * @param {string} iconUrl - Separator icon URL
     * @internal
     */
    _setSeparator(text, iconUrl) {
        if (iconUrl) {
            if (!this._separatorImage) {
                this._separatorImage = document.createElement("img");
                this._separatorImage.alt = "";
                this._separator.textContent = "";
                this._separator.appendChild(this._separatorImage);
            }
            this._separatorImage.src = iconUrl;
        } else {
            if (this._separatorImage) {
                this._separatorImage.remove();
                this._separatorImage = null;
            }
            this._separator.textContent = text;
        }
    }

    // ========================
    // Private Methods
    // ========================

    _applyText(val) {
        this._textElement.textContent = val || "";
    }

    _applyHref(val) {
        if (val) {
            this._link.setAttribute("href", val);
            this._link.removeAttribute("role");
        } else {
            this._link.removeAttribute("href");
            this._link.setAttribute("role", "link");
        }
        this._syncInteractiveState();
    }

    _applyIcon(val) {
        if (val) {
            this._icon.src = val;
            this._icon.style.display = "inline-block";
        } else {
            this._icon.src = "";
            this._icon.style.display = "none";
        }
    }

    _applyActive(isActive) {
        if (isActive) {
            this.setAttribute("aria-current", "page");
        } else {
            this.removeAttribute("aria-current");
        }
        this._syncInteractiveState();
    }

    _syncInteractiveState() {
        const isDisabled = this.disabled;
        const isActive = this.active;

        if (isDisabled) {
            this._link.setAttribute("aria-disabled", "true");
        } else {
            this._link.removeAttribute("aria-disabled");
        }

        if (isDisabled || isActive) {
            this._link.setAttribute("tabindex", "-1");
        } else {
            this._link.setAttribute("tabindex", "0");
        }
    }

    /**
     * Handles click on the link element.
     * @private
     */
    _handleClick(e) {
        // Prevent default navigation if no href, if active, or if disabled
        if (!this.href || this.active || this.disabled) {
            e.preventDefault();
        }

        // Let event bubble to parent Breadcrumb for handling
    }
}
