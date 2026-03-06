import UIComponent from '../../../UIComponent.js';
import Template from '../../../../util/Template.js';
import CarouselSlideEvent from '../../../../events/carousel/CarouselSlideEvent.js';

/**
 * CarouselSlide - Wraps individual slide content within a Carousel.
 *
 * Manages active state, ARIA attributes, and fires slide lifecycle events.
 * Projected content is rendered via a <slot> inside the shadow DOM template.
 *
 * @element gooeyui-carousel-slide
 * @attr {boolean} active - Whether this slide is the currently active slide
 */
export default class CarouselSlide extends UIComponent {

    constructor() {
        super();

        Template.activate("ui-CarouselSlide", this.shadowRoot);

        /** @type {HTMLElement} */
        this._wrapper = this.shadowRoot.querySelector('.carousel-slide');

        /** @type {number} */
        this._slideIndex = 0;

        // Register valid events
        this.addValidEvent(CarouselSlideEvent.ACTIVE);
        this.addValidEvent(CarouselSlideEvent.INACTIVE);
        this.addValidEvent(CarouselSlideEvent.VISIBLE);
        this.addValidEvent(CarouselSlideEvent.HIDDEN);

        // Initialize active state from attribute
        if (this.hasAttribute('active')) {
            this._wrapper.setAttribute('aria-current', 'true');
        }
    }

    /**
     * Whether this slide is currently active.
     * @returns {boolean}
     */
    get active() {
        return this.hasAttribute('active');
    }

    /**
     * @param {boolean} val
     */
    set active(val) {
        if (val) {
            this.setAttribute('active', '');
        } else {
            this.removeAttribute('active');
        }
    }

    /**
     * The zero-based index of this slide within the carousel.
     * Set by the parent Carousel during slide collection.
     * @returns {number}
     */
    get slideIndex() {
        return this._slideIndex;
    }

    /**
     * Updates the ARIA label with the slide's position information.
     * Called by the parent Carousel when slides are collected or reordered.
     *
     * @param {number} index - 1-based index of this slide
     * @param {number} total - Total number of slides
     */
    _updateAria(index, total) {
        this._slideIndex = index - 1;
        this._wrapper.setAttribute('aria-label', `${index} of ${total}`);
    }

    /**
     * @param {string} name
     * @param {string|null} oldValue
     * @param {string|null} newValue
     */
    attributeChangedCallback(name, oldValue, newValue) {
        // Guard against infinite recursion
        if (oldValue === newValue) return;

        super.attributeChangedCallback?.(name, oldValue, newValue);

        switch (name) {
            case 'active':
                if (newValue !== null) {
                    this._wrapper?.setAttribute('aria-current', 'true');
                    this.fireEvent(CarouselSlideEvent.ACTIVE, { slide: this, index: this._slideIndex });
                } else {
                    this._wrapper?.removeAttribute('aria-current');
                    this.fireEvent(CarouselSlideEvent.INACTIVE, { slide: this, index: this._slideIndex });
                }
                break;
        }
    }
}
