import UIComponent from '../../../UIComponent.js';
import WaffleMenuItemEvent from '../../../../events/menu/WaffleMenuItemEvent.js';
import MouseEvent from '../../../../events/MouseEvent.js';
import KeyboardEvent from '../../../../events/KeyboardEvent.js';
import Key from '../../../../io/Key.js';
import Template from '../../../../util/Template.js';

/**
 * WaffleMenuItem Component
 *
 * Individual item within a WaffleMenu grid. Displays an icon with a label
 * and optionally a badge for notifications.
 *
 * @example
 * <gooeyui-wafflemenuitem
 *     icon="icons/mail.svg"
 *     label="Mail"
 *     action="open-mail"
 *     badge="5">
 * </gooeyui-wafflemenuitem>
 */
export default class WaffleMenuItem extends UIComponent {

    constructor() {
        super();

        Template.activate("ui-WaffleMenuItem", this.shadowRoot);

        // Cache DOM references
        this.button = this.shadowRoot.querySelector(".waffle-item");
        this.iconWrapper = this.shadowRoot.querySelector(".waffle-item-icon");
        this.image = this.shadowRoot.querySelector(".waffle-item-image");
        this.badgeElement = this.shadowRoot.querySelector(".waffle-item-badge");
        this.labelElement = this.shadowRoot.querySelector(".waffle-item-label");

        // Bind handlers
        this._boundClick = this._handleClick.bind(this);
        this._boundKeyDown = this._handleKeyDown.bind(this);

        // Attach event listeners
        this.button.addEventListener(MouseEvent.CLICK, this._boundClick);
        this.button.addEventListener(KeyboardEvent.KEY_DOWN, this._boundKeyDown);

        // Register valid events
        this.addValidEvent(WaffleMenuItemEvent.SELECT);

    }

    connectedCallback() {
        super.connectedCallback?.();
        if (!this._waffleMenuItemInit) {
            this._waffleMenuItemInit = true;
            if (this.hasAttribute("icon")) {
                this.icon = this.getAttribute("icon");
            }
            this._updateIcon();
            if (this.hasAttribute("label")) {
                this.label = this.getAttribute("label");
            }
            if (this.hasAttribute("action")) {
                this.action = this.getAttribute("action");
            }
            if (this.hasAttribute("badge")) {
                this.badge = this.getAttribute("badge");
            }
            if (this.hasAttribute("href")) {
                this.href = this.getAttribute("href");
            }
            if (this.hasAttribute("target")) {
                this.target = this.getAttribute("target");
            }
            if (this.hasAttribute("disabled")) {
                this.disabled = true;
            }
        }
    }

    // =========================================================================
    // Attribute Accessors
    // =========================================================================

    get icon() {
        return this.getAttribute("icon");
    }

    set icon(val) {
        if (val) {
            this.setAttribute("icon", val);
        } else {
            this.removeAttribute("icon");
        }
        this._updateIcon();
    }

    _updateIcon() {
        const slottedIcon = this.querySelector('[slot="icon"]');
        if (slottedIcon) {
            this.image.style.display = 'none';
        } else {
            const val = this.icon;
            if (val) {
                this.image.src = val;
                this.image.style.display = '';
            } else {
                this.image.src = "";
                this.image.style.display = '';
            }
        }
    }

    get label() {
        return this.getAttribute("label");
    }

    set label(val) {
        if (val) {
            this.setAttribute("label", val);
            this.labelElement.textContent = val;
            const badgeText = this.badge ? `, ${this.badge}` : "";
            this.button.setAttribute("aria-label", `${val}${badgeText}`);
        } else {
            this.removeAttribute("label");
            this.labelElement.textContent = "";
            this.button.removeAttribute("aria-label");
        }
    }

    get action() {
        return this.getAttribute("action");
    }

    set action(val) {
        if (val) {
            this.setAttribute("action", val);
        } else {
            this.removeAttribute("action");
        }
    }

    get href() {
        return this.getAttribute("href");
    }

    set href(val) {
        if (val) {
            this.setAttribute("href", val);
        } else {
            this.removeAttribute("href");
        }
    }

    get target() {
        return this.getAttribute("target") || "_self";
    }

    set target(val) {
        this.setAttribute("target", val);
    }

    get badge() {
        return this.getAttribute("badge");
    }

    set badge(val) {
        if (val) {
            this.setAttribute("badge", val);
            this.badgeElement.textContent = val;
            if (this.label) {
                this.button.setAttribute("aria-label", `${this.label}, ${val}`);
            }
        } else {
            this.removeAttribute("badge");
            this.badgeElement.textContent = "";
            if (this.label) {
                this.button.setAttribute("aria-label", this.label);
            }
        }
    }

    get disabled() {
        return super.disabled;
    }

    set disabled(val) {
        super.disabled = val;
        if (val) {
            this.button.setAttribute("disabled", "");
        } else {
            this.button.removeAttribute("disabled");
        }
    }

    // =========================================================================
    // Public Methods
    // =========================================================================

    /**
     * Focuses the menu item button
     */
    focus() {
        this.button.focus();
    }

    /**
     * Programmatically clicks the menu item
     */
    click() {
        if (!this.disabled) {
            this._handleClick();
        }
    }

    // =========================================================================
    // Private Methods
    // =========================================================================

    _handleClick(event) {
        if (this.disabled) {
            event?.stopPropagation();
            return;
        }

        // Fire select event
        this.fireEvent(WaffleMenuItemEvent.SELECT, {
            item: this,
            action: this.action,
            label: this.label,
            href: this.href
        });

        // Handle navigation if href is set
        if (this.href) {
            if (this.target && this.target !== "_self") {
                const features = this.target === "_blank" ? "noopener" : undefined;
                window.open(this.href, this.target, features);
            } else {
                window.location.href = this.href;
            }
        }
    }

    _handleKeyDown(event) {
        if (event.key === Key.ENTER || event.key === Key.SPACE) {
            event.preventDefault();
            this._handleClick();
        }
    }
}
