import CarouselModule from '../Carousel/scripts/CarouselModule.js';
import CarouselEvent from '../../../events/carousel/CarouselEvent.js';

/**
 * Thumbs module for the Carousel component.
 * Synchronizes a main carousel with a secondary thumbnail carousel.
 * When the main carousel navigates, the thumbnail carousel highlights
 * and scrolls to the corresponding thumb. When a thumbnail is clicked,
 * the main carousel navigates to that slide.
 */
export default class Thumbs extends CarouselModule {

    constructor(carousel, options) {
        super(carousel, options);

        /** @type {HTMLElement|null} Reference to the thumbnail carousel element */
        this._thumbsCarousel = null;

        /** @type {Function|null} Bound handler for main carousel slide changes */
        this._boundOnMainChange = null;

        /** @type {Function|null} Bound handler for thumbnail click */
        this._boundOnThumbClick = null;
    }

    init() {
        // Read syncwith attribute from main carousel
        const syncWithId = this.carousel.getAttribute('syncwith');
        if (!syncWithId) {
            console.warn('Thumbs: No syncwith attribute found on carousel.');
            return;
        }

        // Find thumbnail carousel by ID
        this._thumbsCarousel = document.getElementById(syncWithId);
        if (!this._thumbsCarousel) {
            this._thumbsCarousel = document.querySelector(`gooeyui-carousel#${syncWithId}`);
        }

        if (!this._thumbsCarousel) {
            console.warn(`Thumbs: Thumbnail carousel with ID "${syncWithId}" not found.`);
            return;
        }

        // Main -> Thumbs sync: listen for slide changes on main carousel
        this._boundOnMainChange = (e) => this._onMainSlideChanged(e);
        this.carousel.addEventListener(CarouselEvent.SLIDE_CHANGED, this._boundOnMainChange);

        // Thumbs -> Main sync: listen for clicks on thumbnail slides
        this._boundOnThumbClick = (e) => this._onThumbClick(e);
        this._thumbsCarousel.addEventListener('click', this._boundOnThumbClick);

        // Set initial active thumbnail
        this._highlightThumb(this.carousel.activeIndex || 0);
    }

    update() {
        // Re-read syncwith in case it changed
        const syncWithId = this.carousel.getAttribute('syncwith');
        if (syncWithId) {
            const newThumbsCarousel = document.getElementById(syncWithId)
                || document.querySelector(`gooeyui-carousel#${syncWithId}`);

            if (newThumbsCarousel && newThumbsCarousel !== this._thumbsCarousel) {
                // Remove old click listener
                if (this._thumbsCarousel && this._boundOnThumbClick) {
                    this._thumbsCarousel.removeEventListener('click', this._boundOnThumbClick);
                }
                this._thumbsCarousel = newThumbsCarousel;
                this._thumbsCarousel.addEventListener('click', this._boundOnThumbClick);
            }
        }

        // Update highlighting
        this._highlightThumb(this.carousel.activeIndex || 0);
    }

    destroy() {
        // Remove SLIDE_CHANGED listener from main carousel
        if (this._boundOnMainChange) {
            this.carousel.removeEventListener(CarouselEvent.SLIDE_CHANGED, this._boundOnMainChange);
            this._boundOnMainChange = null;
        }

        // Remove click listener from thumbnail carousel
        if (this._thumbsCarousel && this._boundOnThumbClick) {
            this._thumbsCarousel.removeEventListener('click', this._boundOnThumbClick);
            this._boundOnThumbClick = null;
        }

        // Remove data-thumb-active from all thumb slides
        if (this._thumbsCarousel) {
            const thumbSlides = this._thumbsCarousel.querySelectorAll('gooeyui-carousel-slide');
            for (const slide of thumbSlides) {
                slide.removeAttribute('data-thumb-active');
            }
        }

        this._thumbsCarousel = null;
    }

    // ---------------------------------------------------------------
    // Main -> Thumbs Sync
    // ---------------------------------------------------------------

    /**
     * Called when the main carousel changes slide.
     * Scrolls the thumbnail carousel and highlights the active thumb.
     * @param {Object} e - Event with detail containing index
     */
    _onMainSlideChanged(e) {
        const index = (e && e.detail && e.detail.index != null) ? e.detail.index : (this.carousel.activeIndex || 0);

        // Scroll thumbnail carousel to the corresponding thumb
        if (this._thumbsCarousel && typeof this._thumbsCarousel.goTo === 'function') {
            this._thumbsCarousel.goTo(index);
        }

        // Update highlighting
        this._highlightThumb(index);
    }

    /**
     * Highlight the thumbnail slide at the given index.
     * @param {number} index
     */
    _highlightThumb(index) {
        if (!this._thumbsCarousel) return;

        const thumbSlides = this._thumbsCarousel.querySelectorAll('gooeyui-carousel-slide');
        for (let i = 0; i < thumbSlides.length; i++) {
            if (i === index) {
                thumbSlides[i].setAttribute('data-thumb-active', '');
            } else {
                thumbSlides[i].removeAttribute('data-thumb-active');
            }
        }
    }

    // ---------------------------------------------------------------
    // Thumbs -> Main Sync
    // ---------------------------------------------------------------

    /**
     * Handle clicks on the thumbnail carousel to navigate the main carousel.
     * @param {Event} e
     */
    _onThumbClick(e) {
        const slide = e.target.closest('gooeyui-carousel-slide');
        if (!slide || !this._thumbsCarousel) return;

        // Determine the index of the clicked slide
        const thumbSlides = this._thumbsCarousel.querySelectorAll('gooeyui-carousel-slide');
        let clickedIndex = -1;
        for (let i = 0; i < thumbSlides.length; i++) {
            if (thumbSlides[i] === slide) {
                clickedIndex = i;
                break;
            }
        }

        if (clickedIndex >= 0) {
            this.carousel.goTo(clickedIndex);
        }
    }
}
