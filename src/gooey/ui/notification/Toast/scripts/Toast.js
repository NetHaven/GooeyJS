import UIComponent from '../../../UIComponent.js';
import Template from '../../../../util/Template.js';
import ToastEvent from '../../../../events/notification/ToastEvent.js';
import ToastType from './ToastType.js';
import ToastPosition from './ToastPosition.js';
import ToastContainer from './ToastContainer.js';

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

        // Auto-hide timer state
        this._timerId = null;
        this._timerStartedAt = 0;
        this._timerRemaining = 0;

        // Make toast focusable for keyboard-triggered timer pause
        this.setAttribute('tabindex', '0');

        // Hover pause/resume (TIME-04, TIME-05)
        HTMLElement.prototype.addEventListener.call(this, 'mouseenter', () => {
            this._pauseTimer();
        });
        HTMLElement.prototype.addEventListener.call(this, 'mouseleave', () => {
            this._resumeTimer();
        });

        // Focus pause/resume (TIME-06, TIME-07)
        HTMLElement.prototype.addEventListener.call(this, 'focus', () => {
            this._pauseTimer();
        });
        HTMLElement.prototype.addEventListener.call(this, 'blur', () => {
            this._resumeTimer();
        });
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
                this._applyType(newValue);
                break;
            case 'duration':
                // Auto-dismiss timer handled by later phases
                break;
            case 'closable':
                // Close button visibility handled by later phases
                break;
            case 'position':
                // Only reposition if already in a toast container (i.e., currently shown)
                if (this.parentNode && this.parentNode.classList.contains('gooey-toast-container')) {
                    this._applyPosition(newValue);
                }
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

    // ========================================
    // Type Handling
    // ========================================

    /**
     * Apply type-specific side effects.
     * CSS :host([type="..."]) handles colors, borders, and icon content automatically.
     * This method exists for JS-side effects (future phases: ARIA role changes, etc.).
     * @param {string} type - The toast type value
     * @private
     */
    _applyType(type) {
        // CSS attribute selectors handle all visual styling automatically.
        // This method is a hook for future phases (e.g., Phase 18 ARIA role updates).
    }

    // ========================================
    // Positioning
    // ========================================

    /**
     * Place this toast element into the correct viewport-positioned container.
     * If already in a different container (position change), removes from old first.
     * Idempotent: no-op if already in the correct container.
     * @param {string} position - A ToastPosition value (e.g., "top-right")
     * @private
     */
    _applyPosition(position) {
        const container = ToastContainer.getContainer(position);

        // Already in the correct container -- no-op
        if (this.parentNode === container) {
            return;
        }

        // Remove from current parent if present
        if (this.parentNode) {
            this.parentNode.removeChild(this);
        }

        // Append to the new position container
        container.appendChild(this);
    }

    // ========================================
    // Auto-Hide Timer
    // ========================================

    /**
     * Start the auto-hide timer. Called after show() animation completes.
     * Clears any existing timer first to prevent stacking.
     * Skipped entirely if duration is 0 (manual close only).
     * @private
     */
    _startTimer() {
        this._clearTimer();
        const duration = this.duration;
        if (duration <= 0) return;
        this._timerRemaining = duration;
        this._resumeTimer();
    }

    /**
     * Resume the auto-hide timer with the remaining time.
     * No-op if remaining time is 0 or less.
     * @private
     */
    _resumeTimer() {
        if (this._timerRemaining <= 0) return;
        this._timerStartedAt = Date.now();
        this._timerId = setTimeout(() => {
            this._timerId = null;
            this._timerRemaining = 0;
            this.hide();
        }, this._timerRemaining);
    }

    /**
     * Pause the auto-hide timer, tracking remaining time.
     * No-op if no timer is running.
     * @private
     */
    _pauseTimer() {
        if (this._timerId === null) return;
        clearTimeout(this._timerId);
        this._timerId = null;
        const elapsed = Date.now() - this._timerStartedAt;
        this._timerRemaining = Math.max(0, this._timerRemaining - elapsed);
    }

    /**
     * Clear the auto-hide timer completely. Used during hide() and cleanup.
     * @private
     */
    _clearTimer() {
        if (this._timerId !== null) {
            clearTimeout(this._timerId);
            this._timerId = null;
        }
        this._timerRemaining = 0;
        this._timerStartedAt = 0;
    }

    // ========================================
    // Show / Hide Animations
    // ========================================

    /**
     * Show the toast with entrance animation.
     * Adds 'toast-showing' CSS class to trigger the toast-show keyframe animation.
     * Resolves immediately if prefers-reduced-motion is enabled.
     * @returns {Promise<void>}
     */
    show() {
        return new Promise((resolve) => {
            // Place toast in the correct position container
            this._applyPosition(this.position);

            this.classList.remove('toast-hiding');
            this.classList.add('toast-showing');

            const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            if (reducedMotion) {
                resolve();
                return;
            }

            this.addEventListener('animationend', () => {
                resolve();
            }, { once: true });
        });
    }

    /**
     * Hide the toast with exit animation.
     * Adds 'toast-hiding' CSS class to trigger the toast-hide keyframe animation.
     * Resolves immediately if prefers-reduced-motion is enabled.
     * Removes the 'toast-hiding' class when animation completes.
     * @returns {Promise<void>}
     */
    hide() {
        return new Promise((resolve) => {
            this.classList.remove('toast-showing');
            this.classList.add('toast-hiding');

            const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            if (reducedMotion) {
                this.classList.remove('toast-hiding');
                resolve();
                return;
            }

            this.addEventListener('animationend', () => {
                this.classList.remove('toast-hiding');
                resolve();
            }, { once: true });
        });
    }
}
