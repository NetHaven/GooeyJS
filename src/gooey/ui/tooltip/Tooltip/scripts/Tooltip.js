import UIComponent from '../../../UIComponent.js';
import Template from '../../../../util/Template.js';
import TooltipEvent from '../../../../events/tooltip/TooltipEvent.js';
import TooltipPlacement from '../../TooltipPlacement.js';
import TooltipManager from '../../TooltipManager.js';
import TooltipTrigger from '../../TooltipTrigger.js';

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

    constructor() {
        super();

        // Activate template into shadow root (created by UIComponent)
        Template.activate("ui-Tooltip", this.shadowRoot);

        // Cache DOM element references
        this._contentEl = this.shadowRoot.querySelector(".tooltip-content");
        this._wrapperEl = this.shadowRoot.querySelector(".tooltip-wrapper");
        this._arrowEl = this.shadowRoot.querySelector(".tooltip-arrow");

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
    }

    // ========================================
    // Lifecycle Callbacks
    // ========================================

    connectedCallback() {
        super.connectedCallback?.();

        // If 'for' attribute exists, resolve reference and bind
        if (this.for) {
            const ref = document.getElementById(this.for);
            if (ref) {
                this._reference = ref;
                TooltipManager.bind(ref, this);
            }
        }
    }

    disconnectedCallback() {
        if (this._reference) {
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
            sticky: this.sticky
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
            this.setContent(value());
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
    // Private Methods
    // ========================================

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
            this._contentEl.innerHTML = this._contentValue || '';
        } else {
            this._contentEl.textContent = this._contentValue || '';
        }
    }
}
