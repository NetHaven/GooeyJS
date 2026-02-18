import UIComponent from '../../../UIComponent.js';
import Template from '../../../../util/Template.js';
import ToastEvent from '../../../../events/notification/ToastEvent.js';
import ToastType from './ToastType.js';
import ToastPosition from './ToastPosition.js';

/**
 * Toast notification component.
 * Displays brief, non-blocking messages to the user.
 *
 * This is the structural foundation -- behavior (auto-dismiss, animations,
 * positioning, click handlers) is added by subsequent phases.
 *
 * @fires ToastEvent.SHOW - When the toast is shown
 * @fires ToastEvent.HIDE - When the toast is hidden
 * @fires ToastEvent.ACTION - When the action button is clicked
 * @fires ToastEvent.DISMISS - When the toast is dismissed
 */
export default class Toast extends UIComponent {

    constructor() {
        super();

        // Activate template into shadow root (created by UIComponent)
        Template.activate("ui-Toast", this.shadowRoot);

        // Cache DOM element references
        this._containerEl = this.shadowRoot.querySelector(".toast-container");
        this._iconEl = this.shadowRoot.querySelector(".toast-icon");
        this._messageEl = this.shadowRoot.querySelector(".toast-message");
        this._actionBtn = this.shadowRoot.querySelector(".toast-action-btn");
        this._closeBtn = this.shadowRoot.querySelector(".toast-close-btn");
        this._progressEl = this.shadowRoot.querySelector(".toast-progress");
        this._progressBar = this.shadowRoot.querySelector(".toast-progress-bar");

        // Initialize attributes from DOM
        if (this.hasAttribute("message")) {
            this.message = this.getAttribute("message");
        }

        if (this.hasAttribute("type")) {
            this.type = this.getAttribute("type");
        }

        // Register valid Observable events
        this.addValidEvent(ToastEvent.SHOW);
        this.addValidEvent(ToastEvent.HIDE);
        this.addValidEvent(ToastEvent.ACTION);
        this.addValidEvent(ToastEvent.DISMISS);
    }

    // ========================================
    // attributeChangedCallback
    // ========================================

    attributeChangedCallback(name, oldValue, newValue) {
        // Guard against infinite recursion: setters call setAttribute which re-triggers this callback
        if (oldValue === newValue) return;

        super.attributeChangedCallback?.(name, oldValue, newValue);

        switch (name) {
            case 'message':
                if (this._messageEl) {
                    this._messageEl.textContent = newValue || "";
                }
                break;
            case 'type':
                // Type-specific styling handled by later phases
                break;
            case 'duration':
                // Auto-dismiss timer handled by later phases
                break;
            case 'closable':
                // Close button visibility handled by later phases
                break;
            case 'position':
                // Positioning handled by later phases
                break;
            case 'showicon':
                // Icon rendering handled by later phases
                break;
            case 'actiontext':
                // Action button text handled by later phases
                break;
            case 'progressbar':
                // Progress bar visibility handled by later phases
                break;
        }
    }

    // ========================================
    // Getter / Setter pairs
    // ========================================

    /**
     * The toast message text.
     * @type {string}
     */
    get message() {
        return this.getAttribute("message") || "";
    }

    set message(val) {
        this.setAttribute("message", val);
        if (this._messageEl) {
            this._messageEl.textContent = val;
        }
    }

    /**
     * The toast type (info, success, warning, error).
     * Controls visual styling and icon.
     * @type {string}
     */
    get type() {
        return this.getAttribute("type") || ToastType.INFO;
    }

    set type(val) {
        this.setAttribute("type", val);
    }

    /**
     * Auto-dismiss duration in milliseconds. 0 means no auto-dismiss.
     * @type {number}
     */
    get duration() {
        const val = this.getAttribute("duration");
        if (val === null) return 5000;
        const parsed = parseInt(val, 10);
        return Number.isNaN(parsed) ? 5000 : parsed;
    }

    set duration(val) {
        this.setAttribute("duration", String(val));
    }

    /**
     * Whether the toast can be closed by the user.
     * Defaults to true when the attribute is absent.
     * @type {boolean}
     */
    get closable() {
        if (!this.hasAttribute("closable")) return true;
        return this.getAttribute("closable") !== "false";
    }

    set closable(val) {
        this.setAttribute("closable", val ? "true" : "false");
    }

    /**
     * The screen position for the toast.
     * @type {string}
     */
    get position() {
        return this.getAttribute("position") || ToastPosition.TOP_RIGHT;
    }

    set position(val) {
        this.setAttribute("position", val);
    }

    /**
     * Whether to show the type icon.
     * Defaults to true when the attribute is absent.
     * @type {boolean}
     */
    get showIcon() {
        if (!this.hasAttribute("showicon")) return true;
        return this.getAttribute("showicon") !== "false";
    }

    set showIcon(val) {
        this.setAttribute("showicon", val ? "true" : "false");
    }

    /**
     * Text for the optional action button. Null if no action.
     * @type {string|null}
     */
    get actionText() {
        return this.getAttribute("actiontext") || null;
    }

    set actionText(val) {
        if (val !== null && val !== undefined) {
            this.setAttribute("actiontext", val);
        } else {
            this.removeAttribute("actiontext");
        }
    }

    /**
     * Whether to show the progress bar.
     * Defaults to false when the attribute is absent.
     * @type {boolean}
     */
    get progressBar() {
        if (!this.hasAttribute("progressbar")) return false;
        return this.getAttribute("progressbar") !== "false";
    }

    set progressBar(val) {
        this.setAttribute("progressbar", val ? "true" : "false");
    }
}
