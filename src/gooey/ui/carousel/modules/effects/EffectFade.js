import CarouselModule from '../../Carousel/scripts/CarouselModule.js';
import CarouselEvent from '../../../../events/carousel/CarouselEvent.js';

/**
 * EffectFade module for the Carousel component.
 * Instead of sliding the track, crossfades between slides by stacking them
 * with absolute positioning and animating opacity via CSS transitions.
 */
export default class EffectFade extends CarouselModule {

    constructor(carousel, options = {}) {
        super(carousel, options);

        this._originalPositionTrack = null;
        this._onSlideChange = this._onSlideChange.bind(this);
    }

    init() {
        const carousel = this.carousel;

        // Store original _positionTrack method
        this._originalPositionTrack = carousel._positionTrack.bind(carousel);

        // Apply fade layout: stack all slides absolutely
        this._applyFadeLayout();

        // Override _positionTrack to use opacity instead of translate
        carousel._positionTrack = (animated) => {
            this._fadeToActive(animated);
        };

        // Listen for slide changes
        carousel.addEventListener(CarouselEvent.SLIDE_CHANGE, this._onSlideChange);
    }

    update() {
        // Re-apply absolute positioning and opacity in case slides changed
        this._applyFadeLayout();
    }

    destroy() {
        const carousel = this.carousel;

        // Restore original _positionTrack
        if (this._originalPositionTrack) {
            carousel._positionTrack = this._originalPositionTrack;
            this._originalPositionTrack = null;
        }

        // Remove event listener
        carousel.removeEventListener(CarouselEvent.SLIDE_CHANGE, this._onSlideChange);

        // Remove absolute positioning and reset opacity on all slides
        const slides = carousel._slides;
        for (const slide of slides) {
            slide.style.position = '';
            slide.style.top = '';
            slide.style.left = '';
            slide.style.opacity = '';
            slide.style.transition = '';
            slide.style.zIndex = '';
            slide.style.pointerEvents = '';
        }

        // Reset track transform
        if (carousel._track) {
            carousel._track.style.transform = '';
            carousel._track.style.position = '';
        }
    }

    // =========== Private Methods ===========

    /**
     * Apply absolute positioning to all slides and set initial opacity.
     */
    _applyFadeLayout() {
        const carousel = this.carousel;
        const slides = carousel._slides;
        const speed = carousel.speed;
        const easing = carousel.easing;

        // Make track a positioning context
        if (carousel._track) {
            carousel._track.style.position = 'relative';
            // Keep track at origin -- no translateX
            carousel._track.style.transform = 'translateX(0)';
        }

        for (let i = 0; i < slides.length; i++) {
            const slide = slides[i];

            // Stack all slides on top of each other
            slide.style.position = 'absolute';
            slide.style.top = '0';
            slide.style.left = '0';

            // Add opacity transition
            slide.style.transition = `opacity ${speed}ms ${easing}`;

            // Active slide visible, others hidden
            if (i === carousel.activeIndex) {
                slide.style.opacity = '1';
                slide.style.zIndex = '1';
                slide.style.pointerEvents = '';
            } else {
                slide.style.opacity = '0';
                slide.style.zIndex = '0';
                slide.style.pointerEvents = 'none';
            }
        }
    }

    /**
     * Handle slide change event: crossfade to the new active slide.
     */
    _onSlideChange(e) {
        const detail = e.detail || e;
        const newIndex = detail.index;
        const previousIndex = detail.previousIndex;
        const slides = this.carousel._slides;

        // Fade out previous slide
        if (previousIndex !== undefined && previousIndex !== null && slides[previousIndex]) {
            slides[previousIndex].style.opacity = '0';
            slides[previousIndex].style.zIndex = '0';
            slides[previousIndex].style.pointerEvents = 'none';
        }

        // Fade in new active slide
        if (slides[newIndex]) {
            slides[newIndex].style.opacity = '1';
            slides[newIndex].style.zIndex = '1';
            slides[newIndex].style.pointerEvents = '';
        }
    }

    /**
     * Override for _positionTrack: set opacity instead of transform.
     * Called internally by the carousel during navigation.
     */
    _fadeToActive(animated) {
        const carousel = this.carousel;
        const slides = carousel._slides;
        const activeIndex = carousel.activeIndex;

        // Keep track at origin
        if (carousel._track) {
            carousel._track.style.transform = 'translateX(0)';
            if (!animated) {
                carousel._track.style.transition = 'none';
            }
        }

        for (let i = 0; i < slides.length; i++) {
            const slide = slides[i];

            if (!animated) {
                // Temporarily disable transition for instant positioning
                slide.style.transition = 'none';
            }

            if (i === activeIndex) {
                slide.style.opacity = '1';
                slide.style.zIndex = '1';
                slide.style.pointerEvents = '';
            } else {
                slide.style.opacity = '0';
                slide.style.zIndex = '0';
                slide.style.pointerEvents = 'none';
            }

            if (!animated) {
                // Force reflow then restore transition
                slide.offsetHeight; // eslint-disable-line no-unused-expressions
                slide.style.transition = `opacity ${carousel.speed}ms ${carousel.easing}`;
            }
        }
    }
}
