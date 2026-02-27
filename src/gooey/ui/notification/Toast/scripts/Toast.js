import UIComponent from '../../../UIComponent.js';
import Template from '../../../../util/Template.js';
import ToastEvent from '../../../../events/notification/ToastEvent.js';
import ToastType from './ToastType.js';
import ToastPosition from './ToastPosition.js';
import ToastContainer from './ToastContainer.js';
import Key from '../../../../io/Key.js';

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

        // Register valid Observable events
        this.addValidEvent(ToastEvent.SHOW);
        this.addValidEvent(ToastEvent.HIDE);
        this.addValidEvent(ToastEvent.ACTION);
        this.addValidEvent(ToastEvent.DISMISS);

        // Close button click (INT-03): fire DISMISS then hide
        this._closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!this.disabled) {
                this.fireEvent(ToastEvent.DISMISS, { source: 'close-button' });
                this.hide();
            }
        });

        // Action button click (INT-06): fire ACTION, let consumer decide dismissal
        this._actionBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!this.disabled) {
                this.fireEvent(ToastEvent.ACTION, { actionText: this.actionText });
            }
        });

        // Escape key (INT-07): dismiss focused, visible toast
        HTMLElement.prototype.addEventListener.call(this, 'keydown', (e) => {
            if (e.key === Key.ESCAPE && !this.disabled && this.classList.contains('toast-showing')) {
                this.fireEvent(ToastEvent.DISMISS, { source: 'keyboard' });
                this.hide();
            }
        });

        // Auto-hide timer state
        this._timerId = null;
        this._timerStartedAt = 0;
        this._timerRemaining = 0;

        // Progress bar animation state
        this._progressAnimation = null;

        // Note: tabindex will be set in connectedCallback to comply with Custom Elements spec
        // (setAttribute not allowed in constructor)

        // Apply initial interactive state (prevents flash-of-incorrect-state)
        this._applyClosable(this.closable);
        this._applyShowIcon(this.showIcon);
        if (this.hasAttribute('actiontext')) {
            this._applyActionText(this.getAttribute('actiontext'));
        }

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
                this._applyClosable(this.closable);
                break;
            case 'position':
                // Only reposition if already in a toast container (i.e., currently shown)
                if (this.parentNode && this.parentNode.classList.contains('gooey-toast-container')) {
                    this._applyPosition(newValue);
                }
                break;
            case 'showicon':
                this._applyShowIcon(this.showIcon);
                break;
            case 'actiontext':
                this._applyActionText(newValue);
                break;
            case 'progressbar':
                if (this._progressEl) {
                    this._progressEl.style.display = this.progressBar ? '' : 'none';
                }
                // Cancel running animation if progressbar toggled off while animating
                if (!this.progressBar && this._progressAnimation) {
                    this._progressAnimation.cancel();
                    this._progressAnimation = null;
                }
                break;
        }
    }

    // ========================================
    // Lifecycle
    // ========================================

    /**
     * Called when element is connected to the DOM.
     * Sets attributes that couldn't be set in constructor (Custom Elements spec requirement).
     */
    connectedCallback() {
        super.connectedCallback?.();

        if (!this._toastInit) {
            this._toastInit = true;
            if (this.hasAttribute("message")) {
                this.message = this.getAttribute("message");
            }
            if (this.hasAttribute("type")) {
                this.type = this.getAttribute("type");
            }
            if (!this.hasAttribute('tabindex')) {
                this.tabIndex = 0;
            }
        }
    }

    /**
     * Clean up timer when element is removed from the DOM.
     * Prevents memory leaks from pending setTimeout callbacks.
     */
    disconnectedCallback() {
        this._clearTimer();
        if (super.disconnectedCallback) {
            super.disconnectedCallback();
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
    // Static Factory Methods
    // ========================================

    /**
     * Internal factory: create, configure, and show a toast.
     *
     * Requires that the Toast custom element has been registered via
     * `<gooey-component href="gooey/ui/notification/Toast">` before calling.
     *
     * @param {string} message - The toast message
     * @param {string} type - ToastType constant (info, success, warning, error)
     * @param {Object} options - Configuration overrides
     * @returns {Toast} The created Toast instance
     * @private
     */
    static _create(message, type, options) {
        const toast = document.createElement('gooeyui-toast');
        toast.message = message;
        toast.type = type;

        // Apply optional config overrides (type and message are NOT overridable)
        if (options.duration !== undefined) toast.duration = options.duration;
        if (options.position !== undefined) toast.position = options.position;
        if (options.closable !== undefined) toast.closable = options.closable;
        if (options.actionText !== undefined) toast.actionText = options.actionText;
        if (options.progressBar !== undefined) toast.progressBar = options.progressBar;
        if (options.showIcon !== undefined) toast.showIcon = options.showIcon;

        toast.show();
        return toast;
    }

    /**
     * Create and show an INFO toast.
     *
     * Requires that the Toast custom element has been registered via
     * `<gooey-component href="gooey/ui/notification/Toast">` before calling.
     *
     * @param {string} message - The toast message
     * @param {Object} [options] - Configuration overrides
     * @param {number} [options.duration] - Auto-dismiss duration in ms (0 = no auto-dismiss)
     * @param {string} [options.position] - Screen position (e.g., 'top-right')
     * @param {boolean} [options.closable] - Whether close button is shown
     * @param {string} [options.actionText] - Action button label
     * @param {boolean} [options.progressBar] - Whether progress bar is shown
     * @param {boolean} [options.showIcon] - Whether type icon is shown
     * @returns {Toast} The created Toast instance
     */
    static info(message, options = {}) {
        return Toast._create(message, ToastType.INFO, options);
    }

    /**
     * Create and show a SUCCESS toast.
     *
     * Requires that the Toast custom element has been registered via
     * `<gooey-component href="gooey/ui/notification/Toast">` before calling.
     *
     * @param {string} message - The toast message
     * @param {Object} [options] - Configuration overrides
     * @param {number} [options.duration] - Auto-dismiss duration in ms (0 = no auto-dismiss)
     * @param {string} [options.position] - Screen position (e.g., 'top-right')
     * @param {boolean} [options.closable] - Whether close button is shown
     * @param {string} [options.actionText] - Action button label
     * @param {boolean} [options.progressBar] - Whether progress bar is shown
     * @param {boolean} [options.showIcon] - Whether type icon is shown
     * @returns {Toast} The created Toast instance
     */
    static success(message, options = {}) {
        return Toast._create(message, ToastType.SUCCESS, options);
    }

    /**
     * Create and show a WARNING toast.
     *
     * Requires that the Toast custom element has been registered via
     * `<gooey-component href="gooey/ui/notification/Toast">` before calling.
     *
     * @param {string} message - The toast message
     * @param {Object} [options] - Configuration overrides
     * @param {number} [options.duration] - Auto-dismiss duration in ms (0 = no auto-dismiss)
     * @param {string} [options.position] - Screen position (e.g., 'top-right')
     * @param {boolean} [options.closable] - Whether close button is shown
     * @param {string} [options.actionText] - Action button label
     * @param {boolean} [options.progressBar] - Whether progress bar is shown
     * @param {boolean} [options.showIcon] - Whether type icon is shown
     * @returns {Toast} The created Toast instance
     */
    static warning(message, options = {}) {
        return Toast._create(message, ToastType.WARNING, options);
    }

    /**
     * Create and show an ERROR toast.
     *
     * Requires that the Toast custom element has been registered via
     * `<gooey-component href="gooey/ui/notification/Toast">` before calling.
     *
     * @param {string} message - The toast message
     * @param {Object} [options] - Configuration overrides
     * @param {number} [options.duration] - Auto-dismiss duration in ms (0 = no auto-dismiss)
     * @param {string} [options.position] - Screen position (e.g., 'top-right')
     * @param {boolean} [options.closable] - Whether close button is shown
     * @param {string} [options.actionText] - Action button label
     * @param {boolean} [options.progressBar] - Whether progress bar is shown
     * @param {boolean} [options.showIcon] - Whether type icon is shown
     * @returns {Toast} The created Toast instance
     */
    static error(message, options = {}) {
        return Toast._create(message, ToastType.ERROR, options);
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
        // Set ARIA role based on type: role="alert" for ERROR (assertive),
        // role="status" for all others (polite). Implicit aria-live values
        // are carried by the roles (no explicit aria-live/aria-atomic needed).
        if (this._containerEl) {
            const role = (type === ToastType.ERROR) ? 'alert' : 'status';
            this._containerEl.setAttribute('role', role);
        }
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
    // Interactive State
    // ========================================

    /**
     * Show or hide the close button based on the closable attribute.
     * When closable is true (default), the close button is visible.
     * When closable is false, the close button is hidden.
     * @param {boolean} closable - Whether the close button should be visible
     * @private
     */
    _applyClosable(closable) {
        if (this._closeBtn) {
            this._closeBtn.style.display = closable ? '' : 'none';
        }
    }

    /**
     * Show or hide the action button and update its label text.
     * When text is truthy, the button is shown with the given label.
     * When text is falsy, the button is hidden and its label cleared.
     * @param {string|null} text - The action button label, or null to hide
     * @private
     */
    _applyActionText(text) {
        if (this._actionBtn) {
            if (text) {
                this._actionBtn.textContent = text;
                this._actionBtn.style.display = '';
            } else {
                this._actionBtn.textContent = '';
                this._actionBtn.style.display = 'none';
            }
        }
    }

    /**
     * Show or hide the type icon based on the showIcon attribute.
     * When show is true (default), the icon is visible.
     * When show is false, the icon is hidden.
     * @param {boolean} show - Whether the icon should be visible
     * @private
     */
    _applyShowIcon(show) {
        if (this._iconEl) {
            this._iconEl.style.display = show ? '' : 'none';
        }
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
        this._startProgressBar();
    }

    /**
     * Start the progress bar animation using the Web Animations API.
     * Animates width from 100% to 0% over the toast duration.
     * No-op if progressBar is false or duration is 0.
     * @private
     */
    _startProgressBar() {
        if (!this.progressBar || this.duration <= 0) return;
        if (!this._progressBar) return;

        // Ensure progress container is visible
        this._progressEl.style.display = '';

        this._progressAnimation = this._progressBar.animate(
            [
                { width: '100%' },
                { width: '0%' }
            ],
            {
                duration: this.duration,
                easing: 'linear',
                fill: 'forwards'
            }
        );
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
        if (this._progressAnimation) {
            this._progressAnimation.play();
        }
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
        if (this._progressAnimation) {
            this._progressAnimation.pause();
        }
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
        if (this._progressAnimation) {
            this._progressAnimation.cancel();
            this._progressAnimation = null;
        }
        this._timerRemaining = 0;
        this._timerStartedAt = 0;
    }

    // ========================================
    // Show / Hide Animations
    // ========================================

    /**
     * Internal: perform the actual show animation and timer start.
     * Separated from show() to allow ToastContainer dequeue to call it directly,
     * bypassing duplicate/queue checks.
     * @returns {Promise<void>}
     * @private
     */
    _performShow() {
        return new Promise((resolve) => {
            // Place toast in the correct position container
            this._applyPosition(this.position);

            // Screen reader announcement via light DOM live region (A11Y-08, INTG-02)
            const priority = this.type === ToastType.ERROR ? 'assertive' : 'polite';
            UIComponent.announce(this.message, priority);

            this.classList.remove('toast-hiding');
            this.classList.add('toast-showing');

            // API-08: Fire SHOW event when toast is positioned and visible
            this.fireEvent(ToastEvent.SHOW, { toast: this });

            const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            if (reducedMotion) {
                this._startTimer();
                resolve();
                return;
            }

            this.addEventListener('animationend', () => {
                this._startTimer();
                resolve();
            }, { once: true });
        });
    }

    /**
     * Show the toast with entrance animation.
     * Applies optional config overrides, checks for duplicate suppression,
     * requests queue permission, then delegates to _performShow().
     *
     * @param {Object} [options] - Configuration overrides applied before displaying
     * @param {number} [options.duration] - Auto-dismiss duration in ms (0 = no auto-dismiss)
     * @param {string} [options.position] - Screen position (e.g., 'top-right')
     * @param {boolean} [options.closable] - Whether close button is shown
     * @param {string} [options.actionText] - Action button label
     * @param {boolean} [options.progressBar] - Whether progress bar is shown
     * @param {boolean} [options.showIcon] - Whether type icon is shown
     * @returns {Promise<void>}
     */
    show(options) {
        // Apply config overrides before showing (API-06)
        if (options) {
            if (options.duration !== undefined) this.duration = options.duration;
            if (options.position !== undefined) this.position = options.position;
            if (options.closable !== undefined) this.closable = options.closable;
            if (options.actionText !== undefined) this.actionText = options.actionText;
            if (options.progressBar !== undefined) this.progressBar = options.progressBar;
            if (options.showIcon !== undefined) this.showIcon = options.showIcon;
        }

        // Duplicate prevention: suppress if same message+type within window
        if (ToastContainer._isDuplicate(this.message, this.type)) {
            return Promise.resolve();
        }

        // Queue management: check if we can show now or must wait
        if (!ToastContainer._requestShow(this)) {
            // Queued -- will be shown later via _notifyHide -> _performShow
            return Promise.resolve();
        }

        return this._performShow();
    }

    /**
     * Hide the toast with exit animation.
     * Adds 'toast-hiding' CSS class to trigger the toast-hide keyframe animation.
     * Resolves immediately if prefers-reduced-motion is enabled.
     * Removes the 'toast-hiding' class when animation completes.
     * Fires ToastEvent.HIDE after the hide animation completes (API-09).
     * Notifies ToastContainer for queue dequeue, then removes from DOM.
     * @returns {Promise<void>}
     */
    hide() {
        return new Promise((resolve) => {
            this._clearTimer();
            this.classList.remove('toast-showing');
            this.classList.add('toast-hiding');

            const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            if (reducedMotion) {
                this.classList.remove('toast-hiding');
                this.fireEvent(ToastEvent.HIDE, { toast: this });
                // Notify container for queue dequeue, then remove from DOM
                ToastContainer._notifyHide(this);
                if (this.parentNode) {
                    this.parentNode.removeChild(this);
                }
                resolve();
                return;
            }

            this.addEventListener('animationend', () => {
                this.classList.remove('toast-hiding');
                this.fireEvent(ToastEvent.HIDE, { toast: this });
                // Notify container for queue dequeue, then remove from DOM
                ToastContainer._notifyHide(this);
                if (this.parentNode) {
                    this.parentNode.removeChild(this);
                }
                resolve();
            }, { once: true });
        });
    }
}
