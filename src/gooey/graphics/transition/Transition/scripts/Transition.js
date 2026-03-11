import GooeyElement from '../../../../GooeyElement.js';
import Template from '../../../../util/Template.js';
import TransitionTimingFunction from '../../TransitionTimingFunction.js';
import TransitionBehavior from '../../TransitionBehavior.js';
import TransitionEvent from '../../../../events/graphics/TransitionEvent.js';

/**
 * Transition Component
 *
 * A definition component for CSS transitions that composes child
 * TransitionProperty elements into a single CSS transition value.
 *
 * Supports three usage modes (in priority order):
 * 1. value attribute - Raw CSS string, highest priority
 * 2. Child TransitionProperty elements - Composable definitions
 * 3. Inline attributes - Shorthand for single-property transitions
 *
 * @example
 * <gooeyui-transition property="opacity" duration="300ms" easing="ease-in-out">
 * </gooeyui-transition>
 *
 * @example
 * <gooeyui-transition>
 *     <gooeyui-transitionproperty property="opacity" duration="300ms"></gooeyui-transitionproperty>
 *     <gooeyui-transitionproperty property="transform" duration="500ms"></gooeyui-transitionproperty>
 * </gooeyui-transition>
 */
export default class Transition extends GooeyElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        Template.activate("ui-Transition", this.shadowRoot);

        this._boundTarget = null;
        this._nativeHandlers = new Map();

        this.addValidEvent(TransitionEvent.START);
        this.addValidEvent(TransitionEvent.END);
        this.addValidEvent(TransitionEvent.CANCEL);
        this.addValidEvent(TransitionEvent.RUN);
    }

    // ========== Properties ==========

    /**
     * The CSS property to transition (shorthand mode)
     * @returns {string|null}
     */
    get property() {
        return this.getAttribute("property");
    }

    set property(val) {
        if (val) {
            this.setAttribute("property", val);
        } else {
            this.removeAttribute("property");
        }
    }

    /**
     * The transition duration (shorthand mode)
     * @returns {string|null}
     */
    get duration() {
        return this.getAttribute("duration");
    }

    set duration(val) {
        if (val) {
            this.setAttribute("duration", val);
        } else {
            this.removeAttribute("duration");
        }
    }

    /**
     * The transition timing function (shorthand mode)
     * @returns {string|null}
     */
    get easing() {
        return this.getAttribute("easing");
    }

    set easing(val) {
        if (val) {
            this.setAttribute("easing", val);
        } else {
            this.removeAttribute("easing");
        }
    }

    /**
     * The transition delay (shorthand mode)
     * @returns {string|null}
     */
    get delay() {
        return this.getAttribute("delay");
    }

    set delay(val) {
        if (val) {
            this.setAttribute("delay", val);
        } else {
            this.removeAttribute("delay");
        }
    }

    /**
     * The transition behavior
     * @returns {string}
     */
    get behavior() {
        return this.getAttribute("behavior") || TransitionBehavior.NORMAL;
    }

    set behavior(val) {
        switch (val) {
            case TransitionBehavior.NORMAL:
            case TransitionBehavior.ALLOW_DISCRETE:
                this.setAttribute("behavior", val);
        }
    }

    /**
     * Raw CSS transition value string, bypasses child composition
     * @returns {string|null}
     */
    get value() {
        return this.getAttribute("value");
    }

    set value(val) {
        if (val) {
            this.setAttribute("value", val);
        } else {
            this.removeAttribute("value");
        }
    }

    /**
     * Returns all child TransitionProperty elements
     * @returns {Array<HTMLElement>}
     */
    get transitionProperties() {
        return Array.from(this.querySelectorAll("gooeyui-transitionproperty"));
    }

    // ========== Public Methods ==========

    /**
     * Generates the CSS transition value string
     * @returns {string} Complete CSS transition value
     */
    toCSSValue() {
        // Mode 1: Raw value attribute
        if (this.value) {
            return this.value;
        }

        // Mode 2: Child TransitionProperty elements
        const children = this.transitionProperties;
        if (children.length > 0) {
            return children
                .map(child => child.toCSSValue())
                .join(', ');
        }

        // Mode 3: Inline shorthand attributes
        if (this.property) {
            const parts = [
                this.property,
                this.duration || "0s",
                this.easing || TransitionTimingFunction.EASE
            ];

            const delay = this.delay;
            const behavior = this.behavior;
            const hasDelay = delay && delay !== "0s" && delay !== "0ms";
            const hasBehavior = behavior !== TransitionBehavior.NORMAL;

            if (hasDelay || hasBehavior) {
                parts.push(delay || "0s");
            }

            if (hasBehavior) {
                parts.push(behavior);
            }

            return parts.join(' ');
        }

        return "none";
    }

    /**
     * Returns longhand transition properties as an object
     * @returns {Object} Longhand transition properties
     */
    toLonghand() {
        const children = this.transitionProperties;

        if (children.length > 0) {
            const longhands = children.map(child => child.toLonghand());
            return {
                transitionProperty: longhands.map(l => l.transitionProperty).join(', '),
                transitionDuration: longhands.map(l => l.transitionDuration).join(', '),
                transitionTimingFunction: longhands.map(l => l.transitionTimingFunction).join(', '),
                transitionDelay: longhands.map(l => l.transitionDelay).join(', '),
                transitionBehavior: longhands.map(l => l.transitionBehavior).join(', ')
            };
        }

        return {
            transitionProperty: this.property || "all",
            transitionDuration: this.duration || "0s",
            transitionTimingFunction: this.easing || TransitionTimingFunction.EASE,
            transitionDelay: this.delay || "0s",
            transitionBehavior: this.behavior
        };
    }

    /**
     * Applies this transition to a target element
     * @param {HTMLElement} target - Element to apply transition to
     */
    applyTo(target) {
        target.style.transition = this.toCSSValue();
        this._bindEvents(target);
    }

    /**
     * Applies this transition using longhand properties
     * @param {HTMLElement} target - Element to apply transition to
     */
    applyLonghandTo(target) {
        const longhands = this.toLonghand();
        target.style.transitionProperty = longhands.transitionProperty;
        target.style.transitionDuration = longhands.transitionDuration;
        target.style.transitionTimingFunction = longhands.transitionTimingFunction;
        target.style.transitionDelay = longhands.transitionDelay;
        target.style.transitionBehavior = longhands.transitionBehavior;
        this._bindEvents(target);
    }

    /**
     * Removes this transition from a target element
     * @param {HTMLElement} target - Element to remove transition from
     */
    removeFrom(target) {
        target.style.removeProperty("transition");
        target.style.removeProperty("transition-property");
        target.style.removeProperty("transition-duration");
        target.style.removeProperty("transition-timing-function");
        target.style.removeProperty("transition-delay");
        target.style.removeProperty("transition-behavior");
        this._unbindEvents(target);
    }

    // ========== Event Bridging ==========

    /**
     * Binds native transition events on the target to the Observable system
     * @param {HTMLElement} target - Element to bind events on
     * @private
     */
    _bindEvents(target) {
        if (this._boundTarget && this._boundTarget !== target) {
            this._unbindEvents(this._boundTarget);
        }

        this._boundTarget = target;

        const eventMap = {
            "transitionstart": TransitionEvent.START,
            "transitionend": TransitionEvent.END,
            "transitioncancel": TransitionEvent.CANCEL,
            "transitionrun": TransitionEvent.RUN
        };

        for (const [nativeEvent, gooeyEvent] of Object.entries(eventMap)) {
            if (this._nativeHandlers.has(nativeEvent)) {
                continue;
            }

            const handler = (e) => {
                this.fireEvent(gooeyEvent, {
                    propertyName: e.propertyName,
                    elapsedTime: e.elapsedTime,
                    pseudoElement: e.pseudoElement,
                    originalEvent: e
                });
            };

            this._nativeHandlers.set(nativeEvent, handler);
            target.addEventListener(nativeEvent, handler);
        }
    }

    /**
     * Removes all native transition event listeners from the target
     * @param {HTMLElement} target - Element to unbind events from
     * @private
     */
    _unbindEvents(target) {
        for (const [nativeEvent, handler] of this._nativeHandlers) {
            target.removeEventListener(nativeEvent, handler);
        }
        this._nativeHandlers.clear();
        this._boundTarget = null;
    }

    /**
     * Cleanup when element is removed from DOM
     */
    disconnectedCallback() {
        super.disconnectedCallback?.();
        if (this._boundTarget) {
            this._unbindEvents(this._boundTarget);
        }
    }

    // ========== Static Methods ==========

    /**
     * Creates a CSS transition value string programmatically
     * @param {Object} config - Transition configuration
     * @param {Array<Object>} config.properties - Array of transition property configs
     * @returns {string} CSS transition value
     */
    static create(config) {
        const { properties = [] } = config;

        if (properties.length === 0) {
            return "none";
        }

        return properties.map(p => {
            const parts = [
                p.property || "all",
                p.duration || "0s",
                p.easing || "ease"
            ];

            const delay = p.delay || "0s";
            const behavior = p.behavior || "normal";
            const hasDelay = delay !== "0s" && delay !== "0ms";
            const hasBehavior = behavior !== "normal";

            if (hasDelay || hasBehavior) {
                parts.push(delay);
            }

            if (hasBehavior) {
                parts.push(behavior);
            }

            return parts.join(' ');
        }).join(', ');
    }
}
