import GooeyElement from '../../../../GooeyElement.js';
import Template from '../../../../util/Template.js';
import TransitionTimingFunction from '../../TransitionTimingFunction.js';
import TransitionBehavior from '../../TransitionBehavior.js';

export default class TransitionProperty extends GooeyElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        Template.activate("ui-TransitionProperty", this.shadowRoot);
    }

    // ========== Properties ==========

    get property() {
        return this.getAttribute("property") || "all";
    }

    set property(val) {
        this.setAttribute("property", String(val));
    }

    get duration() {
        return this.getAttribute("duration") || "0s";
    }

    set duration(val) {
        this.setAttribute("duration", String(val));
    }

    get easing() {
        return this.getAttribute("easing") || "ease";
    }

    set easing(val) {
        this.setAttribute("easing", String(val));
    }

    get delay() {
        return this.getAttribute("delay") || "0s";
    }

    set delay(val) {
        this.setAttribute("delay", String(val));
    }

    get behavior() {
        return this.getAttribute("behavior") || TransitionBehavior.NORMAL;
    }

    set behavior(val) {
        switch (val) {
            case TransitionBehavior.NORMAL:
            case TransitionBehavior.ALLOW_DISCRETE:
                this.setAttribute("behavior", val);
                break;
        }
    }

    // ========== Public Methods ==========

    toCSSValue() {
        const parts = [this.property, this.duration, this.easing];

        const delay = this.delay;
        const behavior = this.behavior;
        const hasDelay = delay !== "0s" && delay !== "0ms";
        const hasBehavior = behavior !== TransitionBehavior.NORMAL;

        if (hasDelay || hasBehavior) {
            parts.push(delay);
        }

        if (hasBehavior) {
            parts.push(behavior);
        }

        return parts.join(' ');
    }

    toLonghand() {
        return {
            transitionProperty: this.property,
            transitionDuration: this.duration,
            transitionTimingFunction: this.easing,
            transitionDelay: this.delay,
            transitionBehavior: this.behavior
        };
    }
}
