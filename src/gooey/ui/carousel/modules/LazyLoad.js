import CarouselModule from '../Carousel/scripts/CarouselModule.js';
import CarouselEvent from '../../../events/carousel/CarouselEvent.js';

/**
 * LazyLoad module for the Carousel component.
 * Defers loading of images in slides that are not near the current viewport.
 * Images use `data-src` attribute instead of `src`; LazyLoad swaps them
 * when slides come into view.
 */
export default class LazyLoad extends CarouselModule {

    constructor(carousel, options) {
        super(carousel, options);

        /** @type {number} How many slides ahead/behind to preload */
        this._loadDistance = (options && options.loadDistance != null) ? options.loadDistance : 1;

        /** @type {Function|null} Bound handler for slide-changed */
        this._boundOnSlideChanged = null;

        /** @type {Function|null} Bound handler for init */
        this._boundOnInit = null;
    }

    init() {
        // Listen for slide changes
        this._boundOnSlideChanged = () => this._onSlideChanged();
        this.carousel.addEventListener(CarouselEvent.SLIDE_CHANGED, this._boundOnSlideChanged);

        // Listen for init (in case carousel re-initializes)
        this._boundOnInit = () => this._loadVisibleSlides();
        this.carousel.addEventListener(CarouselEvent.INIT, this._boundOnInit);

        // Load visible slides immediately
        this._loadVisibleSlides();
    }

    update() {
        this._loadVisibleSlides();
    }

    destroy() {
        if (this._boundOnSlideChanged) {
            this.carousel.removeEventListener(CarouselEvent.SLIDE_CHANGED, this._boundOnSlideChanged);
            this._boundOnSlideChanged = null;
        }
        if (this._boundOnInit) {
            this.carousel.removeEventListener(CarouselEvent.INIT, this._boundOnInit);
            this._boundOnInit = null;
        }
    }

    // ---------------------------------------------------------------
    // Lazy Loading Logic
    // ---------------------------------------------------------------

    /**
     * Load content for slides within the load distance of the active slide.
     */
    _loadVisibleSlides() {
        const carousel = this.carousel;
        const activeIndex = carousel.activeIndex || 0;
        const perpage = carousel.perpage || 1;
        const slideCount = carousel.slideCount || 0;

        const startIndex = Math.max(0, activeIndex - this._loadDistance);
        const endIndex = Math.min(slideCount - 1, activeIndex + perpage - 1 + this._loadDistance);

        const slides = carousel.querySelectorAll('gooeyui-carousel-slide');

        for (let i = startIndex; i <= endIndex; i++) {
            if (slides[i]) {
                this._loadSlideContent(slides[i]);
            }
        }
    }

    /**
     * Swap data-src/data-srcset/data-background attributes to their
     * active counterparts for all elements within a slide.
     * @param {HTMLElement} slide
     */
    _loadSlideContent(slide) {
        // Handle data-src -> src
        const srcElements = slide.querySelectorAll('[data-src]');
        for (const el of srcElements) {
            el.src = el.getAttribute('data-src');
            el.removeAttribute('data-src');

            // Handle data-srcset -> srcset
            if (el.hasAttribute('data-srcset')) {
                el.srcset = el.getAttribute('data-srcset');
                el.removeAttribute('data-srcset');
            }
        }

        // Handle data-background -> background-image
        const bgElements = slide.querySelectorAll('[data-background]');
        for (const el of bgElements) {
            el.style.backgroundImage = `url(${el.getAttribute('data-background')})`;
            el.removeAttribute('data-background');
        }

        // Mark slide as loaded for CSS hooks
        slide.classList.add('loaded');
    }

    /**
     * Called when active slide changes.
     */
    _onSlideChanged() {
        this._loadVisibleSlides();
    }
}
