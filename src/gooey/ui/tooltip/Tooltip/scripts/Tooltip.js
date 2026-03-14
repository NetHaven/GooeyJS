import UIComponent from '../../../UIComponent.js';
import Template from '../../../../util/Template.js';
import TooltipEvent from '../../../../events/tooltip/TooltipEvent.js';
import TooltipPlacement from '../../TooltipPlacement.js';
import TooltipManager from '../../TooltipManager.js';
import TooltipTrigger from '../../TooltipTrigger.js';
import TooltipAnimation from '../../TooltipAnimation.js';
import Sanitizer from '../../../../util/Sanitizer.js';

/**
 * Tooltip component.
 * Displays contextual information when triggered by a target element.
 *
 * Supports hover, focus, click, and manual trigger modes with configurable
 * show/hide delays. Automatically positions relative to its reference element.
 *
 * @fires TooltipEvent.BEFORE_SHOW - Before the tooltip becomes visible (cancelable)
 * @fires TooltipEvent.SHOW - When the tooltip starts showing
 * @fires TooltipEvent.SHOWN - After the tooltip is fully visible
 * @fires TooltipEvent.BEFORE_HIDE - Before the tooltip starts hiding (cancelable)
 * @fires TooltipEvent.HIDE - When the tooltip starts hiding
 * @fires TooltipEvent.HIDDEN - After the tooltip is fully hidden
 * @fires TooltipEvent.TRIGGER - When the trigger condition is met
 * @fires TooltipEvent.UNTRIGGER - When the trigger condition is released
 */
export default class Tooltip extends UIComponent {

    /**
     * Default options applied to new tooltip instances.
     * Set via Tooltip.setDefaults().
     * @type {Object}
     */
    static _defaults = {};

    /**
     * Hide all currently visible tooltips.
     *
     * @param {Object} [options={}] - Options
     * @param {Element} [options.exclude=null] - Tooltip element to exclude from hiding
     */
    static hideAll(options = {}) {
        TooltipManager.hideAll(options);
    }

    /**
     * Set default options for future tooltip instances.
     * These defaults are applied in the constructor for any attribute not explicitly set.
     * Only affects tooltips created after this call.
     *
     * @param {Object} options - Default attribute values (e.g., { placement: 'bottom', showDelay: 300 })
     */
    static setDefaults(options) {
        Object.assign(Tooltip._defaults, options);
    }

    constructor() {
        super();

        // Activate template into shadow root (created by UIComponent)
        Template.activate("ui-Tooltip", this.shadowRoot);

        // Cache DOM element references
        this._contentEl = this.shadowRoot.querySelector(".tooltip-content");
        this._wrapperEl = this.shadowRoot.querySelector(".tooltip-wrapper");
        this._arrowEl = this.shadowRoot.querySelector(".tooltip-arrow");
        this._closeBtn = this.shadowRoot.querySelector(".tooltip-close");

        // Close button click handler
        if (this._closeBtn) {
            this._closeBtn.addEventListener('click', () => this.hide({ immediate: true }));
        }

        // Initialize animation data attributes on wrapper
        if (this._wrapperEl) {
            this._wrapperEl.dataset.state = 'hidden';
            this._wrapperEl.dataset.animation = this.getAttribute('animation') || 'fade';
            const duration = this.getAttribute('duration');
            if (duration) {
                this._wrapperEl.style.transitionDuration = duration + 'ms';
            }
        }

        // Generate unique ID if none provided
        if (!this.id) {
            this.id = 'tooltip-' + Math.random().toString(36).substring(2, 10);
        }

        // Set initial role based on interactive attribute
        this._updateRole();

        // Internal state for content value
        this._contentValue = null;

        // Reference element this tooltip is bound to
        this._reference = null;

        // Register all valid Observable events
        this.addValidEvent(TooltipEvent.BEFORE_SHOW);
        this.addValidEvent(TooltipEvent.SHOW);
        this.addValidEvent(TooltipEvent.SHOWN);
        this.addValidEvent(TooltipEvent.BEFORE_HIDE);
        this.addValidEvent(TooltipEvent.HIDE);
        this.addValidEvent(TooltipEvent.HIDDEN);
        this.addValidEvent(TooltipEvent.TRIGGER);
        this.addValidEvent(TooltipEvent.UNTRIGGER);

        // Read initial attributes
        if (this.hasAttribute("content")) {
            this.content = this.getAttribute("content");
        }
        if (this.hasAttribute("contentAsHTML")) {
            this._renderContent();
        }
        if (this.hasAttribute("closeButton")) {
            this.closeButton = true;
        }

        // Apply static defaults for attributes not explicitly set
        if (Tooltip._defaults) {
            for (const [key, value] of Object.entries(Tooltip._defaults)) {
                if (!this.hasAttribute(key)) {
                    this.setAttribute(key, value);
                }
            }
        }
    }

    // ========================================
    // Lifecycle Callbacks
    // ========================================

    connectedCallback() {
        super.connectedCallback?.();

        // Register as singleton if singleton attribute is set
        if (this.singleton) {
            TooltipManager.registerSingleton(this);
        }

        // If 'for' attribute exists, resolve reference and bind
        if (this.for) {
            const ref = document.getElementById(this.for);
            if (ref) {
                this._reference = ref;
                TooltipManager.bind(ref, this);
                this._updateReferenceAria();
            }
        }
    }

    disconnectedCallback() {
        // Unregister singleton if applicable
        if (this.singleton) {
            TooltipManager.unregisterSingleton(this);
        }

        if (this._reference) {
            this._removeReferenceAria();
            TooltipManager.unbind(this._reference);
        }
        super.disconnectedCallback?.();
    }

    // ========================================
    // attributeChangedCallback
    // ========================================

    attributeChangedCallback(name, oldValue, newValue) {
        // Guard against infinite recursion: setters call setAttribute which re-triggers this callback
        if (oldValue === newValue) return;

        super.attributeChangedCallback?.(name, oldValue, newValue);

        switch (name) {
            case 'content':
                this.content = newValue;
                break;
            case 'contentashtml':
                this._renderContent();
                break;
            case 'placement':
                // data-placement on wrapper is set by TooltipManager.applyPosition
                break;
            case 'arrow':
                // CSS handles visibility via :host([arrow="false"]) selector
                break;
            case 'zindex':
                this.style.zIndex = newValue || '';
                break;
            case 'trigger':
                this._rebindTriggers();
                break;
            case 'showdelay':
                // Delay is read at schedule time from attribute, no action needed
                break;
            case 'hidedelay':
                // Delay is read at schedule time from attribute, no action needed
                break;
            case 'hoverintent':
                this._rebindTriggers();
                break;
            case 'hoverintentsensitivity':
                // Sensitivity is read at hover intent start time, no action needed
                break;
            case 'hoverintentinterval':
                // Interval is read at hover intent start time, no action needed
                break;
            case 'interactive':
                // CSS handles pointer-events via :host([interactive]) selector
                // Manager reads attribute at show time
                this._updateRole();
                this._updateReferenceAria();
                break;
            case 'role':
                this._updateRole();
                this._updateReferenceAria();
                break;
            case 'closebutton':
                if (this._closeBtn) {
                    this._closeBtn.hidden = !this.hasAttribute('closeButton');
                }
                break;
            case 'autoclose':
                // Auto-close duration is read at show time from attribute, no action needed
                break;
            case 'animation':
                if (this._wrapperEl) {
                    this._wrapperEl.dataset.animation = newValue || 'fade';
                }
                break;
            case 'duration':
                if (this._wrapperEl) {
                    this._wrapperEl.style.transitionDuration = (newValue || 150) + 'ms';
                }
                break;
            case 'followcursor':
                // If tooltip is visible, rebind follow-cursor listeners
                if (this.isVisible && this._reference) {
                    const binding = TooltipManager._bindings.get(this._reference);
                    if (binding) {
                        TooltipManager._stopFollowCursor(binding);
                        if (newValue && newValue.toLowerCase() !== 'false') {
                            TooltipManager._startFollowCursor(this._reference, this, binding);
                        }
                    }
                }
                break;
        }
    }

    // ========================================
    // Trigger Attributes
    // ========================================

    /**
     * The trigger mode(s) for this tooltip (space-separated).
     * Valid values: "hover", "focus", "click", "manual"
     * @type {string}
     */
    get trigger() {
        return this.getAttribute('trigger') || 'hover focus';
    }

    set trigger(val) {
        this.setAttribute('trigger', val);
        this._rebindTriggers();
    }

    /**
     * Delay in milliseconds before showing the tooltip.
     * @type {number}
     */
    get showDelay() {
        return parseInt(this.getAttribute('showDelay')) || 200;
    }

    set showDelay(val) {
        this.setAttribute('showDelay', val);
    }

    /**
     * Delay in milliseconds before hiding the tooltip.
     * @type {number}
     */
    get hideDelay() {
        return parseInt(this.getAttribute('hideDelay')) || 0;
    }

    set hideDelay(val) {
        this.setAttribute('hideDelay', val);
    }

    /**
     * Whether to use hover intent mode for hover triggers.
     * When true, the tooltip waits until cursor movement falls below
     * the sensitivity threshold before showing.
     * @type {boolean}
     */
    get hoverIntent() {
        return this.hasAttribute('hoverIntent');
    }

    set hoverIntent(val) {
        if (val) {
            this.setAttribute('hoverIntent', '');
        } else {
            this.removeAttribute('hoverIntent');
        }
    }

    /**
     * Pixel distance threshold for hover intent.
     * If cursor moves less than this distance between samples, intent is confirmed.
     * @type {number}
     */
    get hoverIntentSensitivity() {
        return parseInt(this.getAttribute('hoverIntentSensitivity')) || 7;
    }

    set hoverIntentSensitivity(val) {
        this.setAttribute('hoverIntentSensitivity', val);
    }

    /**
     * Sampling interval in milliseconds for hover intent cursor tracking.
     * @type {number}
     */
    get hoverIntentInterval() {
        return parseInt(this.getAttribute('hoverIntentInterval')) || 100;
    }

    set hoverIntentInterval(val) {
        this.setAttribute('hoverIntentInterval', val);
    }

    // ========================================
    // Interactive Attributes
    // ========================================

    /**
     * Whether the tooltip is interactive (receives pointer events).
     * Interactive tooltips allow users to hover into and interact with content.
     * @type {boolean}
     */
    get interactive() {
        return this.hasAttribute('interactive');
    }

    set interactive(val) {
        if (val) {
            this.setAttribute('interactive', '');
        } else {
            this.removeAttribute('interactive');
        }
    }

    /**
     * Whether to show a close button in the tooltip.
     * @type {boolean}
     */
    get closeButton() {
        return this.hasAttribute('closeButton');
    }

    set closeButton(val) {
        if (val) {
            this.setAttribute('closeButton', '');
        } else {
            this.removeAttribute('closeButton');
        }
        if (this._closeBtn) {
            this._closeBtn.hidden = !val;
        }
    }

    /**
     * Duration in milliseconds before the tooltip auto-closes.
     * Null or 0 disables auto-close.
     * @type {number|null}
     */
    get autoClose() {
        const val = this.getAttribute('autoClose');
        return val !== null ? parseInt(val) : null;
    }

    set autoClose(val) {
        if (val !== null && val !== undefined) {
            this.setAttribute('autoClose', val);
        } else {
            this.removeAttribute('autoClose');
        }
    }

    // ========================================
    // Advanced Feature Attributes
    // ========================================

    /**
     * Follow-cursor mode for this tooltip.
     * Valid values: "false", "true", "horizontal", "vertical", "initial"
     * @type {string}
     */
    get followCursor() {
        return this.getAttribute('followCursor') || 'false';
    }

    set followCursor(val) {
        this.setAttribute('followCursor', val);
    }

    /**
     * Singleton target selector. When set, reuses a single tooltip for multiple references.
     * @type {string|null}
     */
    get singleton() {
        return this.getAttribute('singleton');
    }

    set singleton(val) {
        if (val !== null && val !== undefined) {
            this.setAttribute('singleton', val);
        } else {
            this.removeAttribute('singleton');
        }
    }

    /**
     * Group name for coordinated tooltip display.
     * Tooltips in the same group share show/hide timing.
     * @type {string|null}
     */
    get group() {
        return this.getAttribute('group');
    }

    set group(val) {
        if (val !== null && val !== undefined) {
            this.setAttribute('group', val);
        } else {
            this.removeAttribute('group');
        }
    }

    /**
     * Delay in milliseconds for group transitions.
     * @type {number}
     */
    get groupDelay() {
        return parseInt(this.getAttribute('groupDelay')) || 50;
    }

    set groupDelay(val) {
        this.setAttribute('groupDelay', val);
    }

    // ========================================
    // Animation Attributes
    // ========================================

    /**
     * The animation type for show/hide transitions.
     * Valid values: "fade", "scale", "shift-away", "shift-toward", "none"
     * @type {string}
     */
    get animation() {
        return this.getAttribute('animation') || TooltipAnimation.FADE;
    }

    set animation(val) {
        this.setAttribute('animation', val);
    }

    /**
     * Transition duration in milliseconds for show/hide animations.
     * @type {number}
     */
    get duration() {
        return parseInt(this.getAttribute('duration')) || 150;
    }

    set duration(val) {
        this.setAttribute('duration', val);
    }

    // ========================================
    // Read-only Properties
    // ========================================

    /**
     * The reference element this tooltip is bound to.
     * @type {Element|null}
     */
    get reference() {
        return this._reference;
    }

    /**
     * Whether the tooltip is currently visible.
     * @type {boolean}
     */
    get isVisible() {
        const binding = TooltipManager._bindings.get(this._reference);
        return binding ? binding.state === 'visible' : false;
    }

    /**
     * The current resolved placement of the tooltip.
     * Returns the wrapper's data-placement, or the placement attribute as fallback.
     * @type {string}
     */
    get currentPlacement() {
        if (this._wrapperEl && this._wrapperEl.dataset.placement) {
            return this._wrapperEl.dataset.placement;
        }
        return this.placement;
    }

    /**
     * Whether the tooltip is enabled (not disabled).
     * @type {boolean}
     */
    get isEnabled() {
        return !this.disabled;
    }

    // ========================================
    // Getter / Setter pairs
    // ========================================

    /**
     * The tooltip content as a string.
     * @type {string|null}
     */
    get content() {
        return this.getAttribute('content');
    }

    set content(val) {
        if (val !== null && val !== undefined) {
            this.setAttribute('content', val);
        } else {
            this.removeAttribute('content');
        }
        this._contentValue = val;
        this._renderContent();
    }

    /**
     * Whether to render content as HTML instead of plain text.
     * @type {boolean}
     */
    get contentAsHTML() {
        return this.hasAttribute('contentAsHTML');
    }

    set contentAsHTML(val) {
        if (val) {
            this.setAttribute('contentAsHTML', '');
        } else {
            this.removeAttribute('contentAsHTML');
        }
        this._renderContent();
    }

    // ========================================
    // Positioning Attributes
    // ========================================

    /**
     * The preferred placement of the tooltip relative to its reference element.
     * @type {string}
     */
    get placement() {
        return this.getAttribute('placement') || TooltipPlacement.TOP;
    }

    set placement(val) {
        this.setAttribute('placement', val);
    }

    /**
     * Offset as "skidding,distance" string.
     * @type {string}
     */
    get offset() {
        return this.getAttribute('offset') || '0,8';
    }

    set offset(val) {
        this.setAttribute('offset', val);
    }

    /**
     * Whether to flip the tooltip to the opposite side when it overflows the viewport.
     * @type {boolean}
     */
    get flipOnOverflow() {
        return this.hasAttribute('flipOnOverflow');
    }

    set flipOnOverflow(val) {
        if (val) {
            this.setAttribute('flipOnOverflow', '');
        } else {
            this.removeAttribute('flipOnOverflow');
        }
    }

    /**
     * Whether to shift the tooltip along the cross-axis when it overflows the viewport.
     * @type {boolean}
     */
    get shiftOnOverflow() {
        return this.hasAttribute('shiftOnOverflow');
    }

    set shiftOnOverflow(val) {
        if (val) {
            this.setAttribute('shiftOnOverflow', '');
        } else {
            this.removeAttribute('shiftOnOverflow');
        }
    }

    /**
     * Whether to show the arrow element.
     * Defaults to true. Set to "false" to hide the arrow.
     * @type {boolean}
     */
    get arrow() {
        return this.getAttribute('arrow') !== 'false';
    }

    set arrow(val) {
        this.setAttribute('arrow', val ? 'true' : 'false');
    }

    /**
     * Whether to enable sticky mode (RAF-based continuous repositioning).
     * @type {boolean}
     */
    get sticky() {
        return this.hasAttribute('sticky');
    }

    set sticky(val) {
        if (val) {
            this.setAttribute('sticky', '');
        } else {
            this.removeAttribute('sticky');
        }
    }

    /**
     * Selector or ID of the viewport element for boundary detection.
     * @type {string|null}
     */
    get viewport() {
        return this.getAttribute('viewport');
    }

    set viewport(val) {
        if (val !== null && val !== undefined) {
            this.setAttribute('viewport', val);
        } else {
            this.removeAttribute('viewport');
        }
    }

    /**
     * The z-index for the tooltip.
     * @type {number}
     */
    get zIndex() {
        return parseInt(this.getAttribute('zIndex')) || 9999;
    }

    set zIndex(val) {
        this.setAttribute('zIndex', val);
    }

    /**
     * Maximum width of the tooltip.
     * @type {string|null}
     */
    get maxWidth() {
        return this.getAttribute('maxWidth');
    }

    set maxWidth(val) {
        if (val !== null && val !== undefined) {
            this.setAttribute('maxWidth', val);
        } else {
            this.removeAttribute('maxWidth');
        }
    }

    /**
     * ID of the reference element this tooltip is associated with.
     * @type {string|null}
     */
    get for() {
        return this.getAttribute('for');
    }

    set for(val) {
        if (val !== null && val !== undefined) {
            this.setAttribute('for', val);
        } else {
            this.removeAttribute('for');
        }
    }

    // ========================================
    // Show / Hide / Toggle API
    // ========================================

    /**
     * Show the tooltip.
     * For manual trigger mode, this is the primary way to display the tooltip.
     *
     * @param {Object} [options] - Show options
     * @param {boolean} [options.immediate=false] - Skip delay and show immediately
     */
    show(options) {
        if (this.disabled) return;

        // Resolve reference if not yet bound
        if (!this._reference && this.for) {
            const ref = document.getElementById(this.for);
            if (ref) {
                this._reference = ref;
                // Ensure binding exists for state tracking
                if (!TooltipManager._bindings.has(ref)) {
                    TooltipManager.bind(ref, this);
                }
            }
        }

        if (!this._reference) return;

        if (options && options.immediate) {
            TooltipManager._doShow(this._reference, this);
        } else {
            TooltipManager._scheduleShow(this._reference, this);
        }
    }

    /**
     * Hide the tooltip.
     *
     * @param {Object} [options] - Hide options
     * @param {boolean} [options.immediate=false] - Skip delay and hide immediately
     */
    hide(options) {
        if (!this._reference) return;

        if (options && options.immediate) {
            TooltipManager._doHide(this._reference, this);
        } else {
            TooltipManager._scheduleHide(this._reference, this);
        }
    }

    /**
     * Toggle the tooltip visibility.
     * Shows if hidden, hides if visible.
     */
    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    // ========================================
    // Positioning Methods
    // ========================================

    /**
     * Reposition the tooltip relative to its reference element.
     * Uses TooltipManager to compute and apply the new position.
     */
    reposition() {
        if (!this._reference) return;

        const options = this._getPositionOptions();
        const result = TooltipManager.computePosition(this._reference, this, options);
        TooltipManager.applyPosition(this, result);
    }

    /**
     * Build positioning options object from current attributes.
     *
     * @returns {Object} Position options for TooltipManager.computePosition
     * @private
     */
    _getPositionOptions() {
        const viewportAttr = this.viewport;
        let viewportEl = null;
        if (viewportAttr) {
            viewportEl = document.getElementById(viewportAttr) ||
                         document.querySelector(viewportAttr);
        }

        return {
            placement: this.placement,
            offset: this.offset,
            flipOnOverflow: this.flipOnOverflow,
            shiftOnOverflow: this.shiftOnOverflow,
            arrow: this.arrow,
            viewport: viewportEl,
            sticky: this.sticky,
            followCursor: this.followCursor
        };
    }

    // ========================================
    // Content API
    // ========================================

    /**
     * Set tooltip content programmatically.
     * Accepts a string (text or HTML based on contentAsHTML),
     * a DOM Node (cloned and appended), or a function (resolved and applied).
     *
     * @param {string|Node|Function} value - The content to display
     */
    setContent(value) {
        if (typeof value === 'function') {
            this.setContent(value(this._reference));
            return;
        }

        if (value instanceof Node) {
            this._contentValue = value;
            if (this._contentEl) {
                this._contentEl.textContent = '';
                this._contentEl.appendChild(value.cloneNode(true));
            }
            return;
        }

        // String content
        this._contentValue = value;
        this._renderContent();
    }

    // ========================================
    // Enable / Disable / Destroy API
    // ========================================

    /**
     * Enable the tooltip, allowing it to be shown via triggers or programmatic API.
     */
    enable() {
        this.disabled = false;
    }

    /**
     * Disable the tooltip, preventing it from being shown.
     * If currently visible, hides immediately.
     */
    disable() {
        this.disabled = true;
        if (this.isVisible) {
            this.hide({ immediate: true });
        }
    }

    /**
     * Destroy the tooltip, removing all bindings and cleaning up resources.
     * The tooltip is hidden (if visible), unbound from its reference, and removed from the DOM.
     */
    destroy() {
        // Hide if visible
        if (this.isVisible) {
            this.hide({ immediate: true });
        }
        // Clean up ARIA attributes before unbinding
        if (this._reference) {
            this._removeReferenceAria();
            TooltipManager.unbind(this._reference);
        }
        // Unregister singleton if applicable
        if (this.singleton) {
            TooltipManager.unregisterSingleton(this);
        }
        // Remove from DOM
        this.remove();
        // Clear internal state
        this._reference = null;
        this._virtualReference = null;
        this._contentValue = null;
    }

    // ========================================
    // Virtual Reference API
    // ========================================

    /**
     * Set a virtual reference for positioning.
     * Allows positioning the tooltip relative to an arbitrary rect
     * instead of a DOM element (e.g., cursor position, canvas coordinates).
     *
     * @param {Object} virtualRef - Object with getBoundingClientRect() method
     * @throws {TypeError} If virtualRef does not have getBoundingClientRect
     */
    setVirtualReference(virtualRef) {
        if (!virtualRef || typeof virtualRef.getBoundingClientRect !== 'function') {
            throw new TypeError('Virtual reference must have a getBoundingClientRect() method');
        }
        this._virtualReference = virtualRef;
        this._reference = virtualRef;

        // If currently visible, reposition with new virtual reference
        if (this.isVisible) {
            this.reposition();
        }
    }

    /**
     * Get the current virtual reference, if any.
     *
     * @returns {Object|null} The virtual reference or null
     * @private
     */
    _getVirtualReference() {
        return this._virtualReference || null;
    }

    // ========================================
    // Private Methods
    // ========================================

    /**
     * Update the wrapper element's role based on interactive/role attributes.
     * Interactive tooltips or those with role="popover" get role="dialog";
     * all others get role="tooltip".
     * @private
     */
    _updateRole() {
        if (!this._wrapperEl) return;

        const isInteractive = this.hasAttribute('interactive');
        const roleAttr = this.getAttribute('role');

        if (isInteractive || roleAttr === 'popover') {
            this._wrapperEl.setAttribute('role', 'dialog');
        } else {
            this._wrapperEl.setAttribute('role', 'tooltip');
        }
    }

    /**
     * Set ARIA attributes on the reference element based on tooltip mode.
     * Non-interactive: adds aria-describedby linking to tooltip id.
     * Interactive/dialog: adds aria-haspopup and aria-expanded.
     * @private
     */
    _updateReferenceAria() {
        if (!this._reference) return;
        // Skip virtual references (plain objects without setAttribute)
        if (typeof this._reference.setAttribute !== 'function') return;

        const isDialog = this._wrapperEl &&
            this._wrapperEl.getAttribute('role') === 'dialog';

        if (isDialog) {
            // Interactive/dialog mode: remove aria-describedby, add haspopup/expanded
            this._removeDescribedBy(this._reference, this.id);
            this._reference.setAttribute('aria-haspopup', 'true');
            this._reference.setAttribute('aria-expanded', 'false');
        } else {
            // Non-interactive/tooltip mode: remove haspopup/expanded, add describedby
            this._reference.removeAttribute('aria-haspopup');
            this._reference.removeAttribute('aria-expanded');
            this._addDescribedBy(this._reference, this.id);
        }
    }

    /**
     * Remove all ARIA attributes this tooltip added to its reference element.
     * Cleans up aria-describedby (removing just this tooltip's id),
     * aria-haspopup, and aria-expanded.
     * @private
     */
    _removeReferenceAria() {
        if (!this._reference) return;
        if (typeof this._reference.removeAttribute !== 'function') return;

        this._removeDescribedBy(this._reference, this.id);
        this._reference.removeAttribute('aria-haspopup');
        this._reference.removeAttribute('aria-expanded');
    }

    /**
     * Add this tooltip's id to a reference element's aria-describedby.
     * Appends to existing space-separated list if present.
     *
     * @param {Element} ref - The reference element
     * @param {string} id - The tooltip id to add
     * @private
     */
    _addDescribedBy(ref, id) {
        const current = ref.getAttribute('aria-describedby');
        if (current) {
            const ids = current.split(/\s+/);
            if (!ids.includes(id)) {
                ref.setAttribute('aria-describedby', current + ' ' + id);
            }
        } else {
            ref.setAttribute('aria-describedby', id);
        }
    }

    /**
     * Remove this tooltip's id from a reference element's aria-describedby.
     * If it was the only value, removes the attribute entirely.
     *
     * @param {Element} ref - The reference element
     * @param {string} id - The tooltip id to remove
     * @private
     */
    _removeDescribedBy(ref, id) {
        const current = ref.getAttribute('aria-describedby');
        if (!current) return;

        const ids = current.split(/\s+/).filter(v => v !== id);
        if (ids.length === 0) {
            ref.removeAttribute('aria-describedby');
        } else {
            ref.setAttribute('aria-describedby', ids.join(' '));
        }
    }

    /**
     * Rebind trigger listeners when the trigger attribute changes.
     * Only acts if a reference element is already bound.
     * @private
     */
    _rebindTriggers() {
        if (this._reference) {
            TooltipManager.unbind(this._reference);
            TooltipManager.bind(this._reference, this);
        }
    }

    /**
     * Render the current content value into the content element.
     * Respects the contentAsHTML flag for string content.
     * No-op if content is a Node (already rendered by setContent).
     * @private
     */
    _renderContent() {
        if (!this._contentEl) return;

        // If content is a Node, it was already rendered by setContent
        if (this._contentValue instanceof Node) return;

        if (this.contentAsHTML) {
            this._contentEl.innerHTML = Sanitizer.sanitize(this._contentValue || '');
        } else {
            this._contentEl.textContent = this._contentValue || '';
        }
    }
}
