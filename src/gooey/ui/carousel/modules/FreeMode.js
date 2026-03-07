import CarouselModule from '../Carousel/scripts/CarouselModule.js';
import CarouselEvent from '../../../events/carousel/CarouselEvent.js';

/**
 * FreeMode module for the Carousel component.
 * When mode="free", drag/touch does not snap to slide boundaries and applies
 * momentum deceleration after release.
 * When mode="free-snap", drag settles on the nearest snap point after momentum.
 */
export default class FreeMode extends CarouselModule {

    constructor(carousel, options = {}) {
        super(carousel, options);

        this._originalSnapToCurrentSlide = null;
        this._rafId = null;
        this._onDragEnd = this._onDragEnd.bind(this);

        // Friction factor: how quickly momentum decays (0-1, higher = slower decay)
        this._friction = options.friction || 0.95;
        // Minimum velocity threshold to stop momentum (px/frame)
        this._minVelocity = options.minVelocity || 0.5;
    }

    init() {
        // Store original snap method
        this._originalSnapToCurrentSlide = this.carousel._snapToCurrentSlide.bind(this.carousel);

        // Override snap behavior based on mode
        this.carousel._snapToCurrentSlide = () => {
            const mode = this.carousel.mode;
            if (mode === 'free') {
                // No snapping -- track stays where released, momentum applied via drag-end
                return;
            } else if (mode === 'free-snap') {
                // Snap will happen after momentum settles (handled in drag-end)
                return;
            } else {
                // Default snap behavior for non-free modes
                this._originalSnapToCurrentSlide();
            }
        };

        // Listen for drag end to apply momentum
        this.carousel.addEventListener(CarouselEvent.DRAG_END, this._onDragEnd);
    }

    update() {
        // Re-read mode from carousel (no-op, mode is checked dynamically)
    }

    destroy() {
        // Restore original snap method
        if (this._originalSnapToCurrentSlide) {
            this.carousel._snapToCurrentSlide = this._originalSnapToCurrentSlide;
            this._originalSnapToCurrentSlide = null;
        }

        // Cancel pending animation frame
        if (this._rafId !== null) {
            cancelAnimationFrame(this._rafId);
            this._rafId = null;
        }

        // Remove event listeners
        this.carousel.removeEventListener(CarouselEvent.DRAG_END, this._onDragEnd);
    }

    // =========== Private Methods ===========

    _onDragEnd(e) {
        const mode = this.carousel.mode;
        if (mode !== 'free' && mode !== 'free-snap') return;

        const detail = e.detail || e;
        const velocity = detail.velocity || 0;

        if (Math.abs(velocity) > this._minVelocity) {
            this._applyMomentum(velocity);
        } else if (mode === 'free-snap') {
            this._snapToNearest();
        }
    }

    /**
     * Apply momentum deceleration after drag release.
     * Uses requestAnimationFrame for smooth animation.
     */
    _applyMomentum(velocity) {
        const track = this.carousel._track;
        if (!track) return;

        const isVertical = this.carousel.direction === 'vertical';
        let currentVelocity = velocity;

        const animate = () => {
            currentVelocity *= this._friction;

            if (Math.abs(currentVelocity) < this._minVelocity) {
                this._rafId = null;

                // After momentum stops, snap if in free-snap mode
                if (this.carousel.mode === 'free-snap') {
                    this._snapToNearest();
                }
                return;
            }

            // Update current translate
            this.carousel._currentTranslate += currentVelocity;

            // Clamp to bounds (prevent scrolling past start/end)
            const slideSize = this.carousel._slideSize;
            const gapPx = this.carousel._gapPx;
            const maxOffset = 0;
            const slideCount = this.carousel._slides.length;
            const minOffset = -((slideCount - 1) * (slideSize + gapPx));

            if (!this.carousel.loop) {
                this.carousel._currentTranslate = Math.min(maxOffset,
                    Math.max(minOffset, this.carousel._currentTranslate));
            }

            const transform = isVertical
                ? `translateY(${this.carousel._currentTranslate}px)`
                : `translateX(${this.carousel._currentTranslate}px)`;

            track.style.transition = 'none';
            track.style.transform = transform;

            this._rafId = requestAnimationFrame(animate);
        };

        this._rafId = requestAnimationFrame(animate);
    }

    /**
     * Find the nearest slide index based on current track offset and navigate to it.
     */
    _snapToNearest() {
        const currentOffset = this.carousel._currentTranslate;
        const nearestIndex = this._findNearestSlide(currentOffset);
        this.carousel.goTo(nearestIndex);
    }

    /**
     * Calculate which slide index is closest to the current track offset.
     */
    _findNearestSlide(currentOffset) {
        const slideSize = this.carousel._slideSize;
        const gapPx = this.carousel._gapPx;
        const slideCount = this.carousel._slides.length;

        if (slideCount === 0 || slideSize === 0) return 0;

        // Calculate clone offset for loop mode
        let cloneOffset = 0;
        if (this.carousel.loop && this.carousel._clones.length > 0) {
            const cloneCount = Math.floor(this.carousel._clones.length / 2);
            cloneOffset = cloneCount * (slideSize + gapPx);
        }

        // The offset for slide i is: -(i * (slideSize + gapPx)) - cloneOffset
        // So index = -(currentOffset + cloneOffset) / (slideSize + gapPx)
        const rawIndex = -(currentOffset + cloneOffset) / (slideSize + gapPx);
        const nearestIndex = Math.round(rawIndex);

        return Math.max(0, Math.min(nearestIndex, this.carousel._maxIndex()));
    }
}
