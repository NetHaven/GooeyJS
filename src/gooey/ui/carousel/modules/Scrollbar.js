import CarouselModule from '../Carousel/scripts/CarouselModule.js';
import CarouselEvent from '../../../events/carousel/CarouselEvent.js';

/**
 * Scrollbar module for the Carousel component.
 * Renders a draggable scrollbar track reflecting the carousel scroll position.
 * The thumb width is proportional to visible slides vs total slides.
 */
export default class Scrollbar extends CarouselModule {

    constructor(carousel, options) {
        super(carousel, options);

        /** @type {HTMLElement|null} */
        this._scrollbar = null;

        /** @type {HTMLElement|null} */
        this._thumb = null;

        /** @type {boolean} Whether DOM was created by this module (vs existing nav) */
        this._ownsDom = false;

        /** @type {boolean} */
        this._isDragging = false;

        /** @type {number} */
        this._dragStartX = 0;

        /** @type {number} */
        this._dragStartLeft = 0;

        /** @type {Function|null} Bound handler for slide-changed */
        this._boundOnSlideChanged = null;

        /** @type {Function|null} Bound handler for update */
        this._boundOnUpdate = null;

        /** @type {Function|null} Bound pointer move handler */
        this._boundOnPointerMove = null;

        /** @type {Function|null} Bound pointer up handler */
        this._boundOnPointerUp = null;

        /** @type {Function|null} Bound track click handler */
        this._boundOnTrackClick = null;

        /** @type {Function|null} Bound pointer down handler */
        this._boundOnPointerDown = null;
    }

    init() {
        const carousel = this.carousel;

        // Try to find a CarouselNav with type="scrollbar"
        const nav = carousel.querySelector('gooeyui-carousel-nav[type="scrollbar"]');
        let container;

        if (nav && nav.shadowRoot) {
            // Render inside the nav's shadow root container
            container = nav.shadowRoot.querySelector('.carousel-nav') || nav.shadowRoot;
            this._ownsDom = false;
        } else {
            // Create scrollbar DOM directly in carousel's shadow root after viewport
            container = carousel.shadowRoot;
            this._ownsDom = true;
        }

        // Build scrollbar DOM
        this._scrollbar = document.createElement('div');
        this._scrollbar.className = 'carousel-scrollbar';

        this._thumb = document.createElement('div');
        this._thumb.className = 'carousel-scrollbar-thumb';

        this._scrollbar.appendChild(this._thumb);
        container.appendChild(this._scrollbar);

        // Calculate initial thumb size and position
        this._updateThumbSize();
        this._updateThumbPosition();

        // Bind drag listeners on thumb
        this._boundOnPointerDown = (e) => this._onPointerDown(e);
        this._thumb.addEventListener('pointerdown', this._boundOnPointerDown);

        // Bind click on track
        this._boundOnTrackClick = (e) => this._onTrackClick(e);
        this._scrollbar.addEventListener('click', this._boundOnTrackClick);

        // Listen for carousel events
        this._boundOnSlideChanged = () => this._updateThumbPosition();
        this._boundOnUpdate = () => {
            this._updateThumbSize();
            this._updateThumbPosition();
        };

        carousel.addEventListener(CarouselEvent.SLIDE_CHANGED, this._boundOnSlideChanged);
        carousel.addEventListener(CarouselEvent.UPDATE, this._boundOnUpdate);
    }

    update() {
        this._updateThumbSize();
        this._updateThumbPosition();
    }

    destroy() {
        // Remove carousel event listeners
        if (this._boundOnSlideChanged) {
            this.carousel.removeEventListener(CarouselEvent.SLIDE_CHANGED, this._boundOnSlideChanged);
        }
        if (this._boundOnUpdate) {
            this.carousel.removeEventListener(CarouselEvent.UPDATE, this._boundOnUpdate);
        }

        // Remove pointer listeners
        if (this._thumb && this._boundOnPointerDown) {
            this._thumb.removeEventListener('pointerdown', this._boundOnPointerDown);
        }
        if (this._scrollbar && this._boundOnTrackClick) {
            this._scrollbar.removeEventListener('click', this._boundOnTrackClick);
        }

        // Remove document-level listeners if dragging
        this._removeDragListeners();

        // Remove DOM if we created it
        if (this._scrollbar && this._scrollbar.parentNode) {
            this._scrollbar.parentNode.removeChild(this._scrollbar);
        }

        this._scrollbar = null;
        this._thumb = null;
        this._boundOnSlideChanged = null;
        this._boundOnUpdate = null;
        this._boundOnPointerDown = null;
        this._boundOnTrackClick = null;
    }

    // ---------------------------------------------------------------
    // Thumb Size & Position
    // ---------------------------------------------------------------

    _updateThumbSize() {
        if (!this._thumb || !this._scrollbar) return;

        const carousel = this.carousel;
        const slideCount = carousel.slideCount || 1;
        const perpage = carousel.perpage || 1;
        const isVertical = carousel.direction === 'vertical';

        if (isVertical) {
            const trackHeight = this._scrollbar.offsetHeight || 1;
            const thumbHeight = Math.max(20, (perpage / slideCount) * trackHeight);
            this._thumb.style.height = `${thumbHeight}px`;
            this._thumb.style.width = '100%';
        } else {
            const trackWidth = this._scrollbar.offsetWidth || 1;
            const thumbWidth = Math.max(20, (perpage / slideCount) * trackWidth);
            this._thumb.style.width = `${thumbWidth}px`;
        }
    }

    _updateThumbPosition() {
        if (!this._thumb || !this._scrollbar) return;

        const carousel = this.carousel;
        const activeIndex = carousel.activeIndex || 0;
        const slideCount = carousel.slideCount || 1;
        const perpage = carousel.perpage || 1;
        const maxIndex = Math.max(0, slideCount - perpage);
        const isVertical = carousel.direction === 'vertical';

        if (maxIndex <= 0) {
            // All slides visible, position at start
            if (isVertical) {
                this._thumb.style.top = '0px';
            } else {
                this._thumb.style.left = '0px';
            }
            return;
        }

        if (isVertical) {
            const trackHeight = this._scrollbar.offsetHeight || 1;
            const thumbHeight = this._thumb.offsetHeight || 1;
            const offset = (activeIndex / maxIndex) * (trackHeight - thumbHeight);
            this._thumb.style.top = `${offset}px`;
        } else {
            const trackWidth = this._scrollbar.offsetWidth || 1;
            const thumbWidth = this._thumb.offsetWidth || 1;
            const offset = (activeIndex / maxIndex) * (trackWidth - thumbWidth);
            this._thumb.style.left = `${offset}px`;
        }
    }

    // ---------------------------------------------------------------
    // Drag Handling
    // ---------------------------------------------------------------

    _onPointerDown(e) {
        e.preventDefault();
        e.stopPropagation();

        this._isDragging = true;
        const isVertical = this.carousel.direction === 'vertical';

        this._dragStartX = isVertical ? e.clientY : e.clientX;
        this._dragStartLeft = isVertical
            ? (parseFloat(this._thumb.style.top) || 0)
            : (parseFloat(this._thumb.style.left) || 0);

        this._boundOnPointerMove = (ev) => this._onPointerMove(ev);
        this._boundOnPointerUp = (ev) => this._onPointerUp(ev);

        document.addEventListener('pointermove', this._boundOnPointerMove);
        document.addEventListener('pointerup', this._boundOnPointerUp);
    }

    _onPointerMove(e) {
        if (!this._isDragging) return;

        const isVertical = this.carousel.direction === 'vertical';
        const currentPos = isVertical ? e.clientY : e.clientX;
        const delta = currentPos - this._dragStartX;
        const newPos = this._dragStartLeft + delta;

        const trackSize = isVertical
            ? (this._scrollbar.offsetHeight || 1)
            : (this._scrollbar.offsetWidth || 1);
        const thumbSize = isVertical
            ? (this._thumb.offsetHeight || 1)
            : (this._thumb.offsetWidth || 1);

        const clampedPos = Math.max(0, Math.min(newPos, trackSize - thumbSize));

        if (isVertical) {
            this._thumb.style.top = `${clampedPos}px`;
        } else {
            this._thumb.style.left = `${clampedPos}px`;
        }

        // Convert position to slide index
        const ratio = clampedPos / (trackSize - thumbSize);
        const slideCount = this.carousel.slideCount || 1;
        const perpage = this.carousel.perpage || 1;
        const maxIndex = Math.max(0, slideCount - perpage);
        const targetIndex = Math.round(ratio * maxIndex);

        this.carousel.goTo(targetIndex);
    }

    _onPointerUp() {
        this._isDragging = false;
        this._removeDragListeners();
    }

    _removeDragListeners() {
        if (this._boundOnPointerMove) {
            document.removeEventListener('pointermove', this._boundOnPointerMove);
            this._boundOnPointerMove = null;
        }
        if (this._boundOnPointerUp) {
            document.removeEventListener('pointerup', this._boundOnPointerUp);
            this._boundOnPointerUp = null;
        }
    }

    // ---------------------------------------------------------------
    // Track Click
    // ---------------------------------------------------------------

    _onTrackClick(e) {
        // Ignore clicks on the thumb itself
        if (e.target === this._thumb) return;

        const isVertical = this.carousel.direction === 'vertical';
        const rect = this._scrollbar.getBoundingClientRect();
        const clickPos = isVertical
            ? (e.clientY - rect.top)
            : (e.clientX - rect.left);
        const trackSize = isVertical ? rect.height : rect.width;

        const ratio = clickPos / trackSize;
        const slideCount = this.carousel.slideCount || 1;
        const perpage = this.carousel.perpage || 1;
        const maxIndex = Math.max(0, slideCount - perpage);
        const targetIndex = Math.round(ratio * maxIndex);

        this.carousel.goTo(targetIndex);
    }
}
