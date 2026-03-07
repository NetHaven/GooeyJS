import CarouselModule from '../Carousel/scripts/CarouselModule.js';
import CarouselEvent from '../../../events/carousel/CarouselEvent.js';

/**
 * Autoplay module for the Carousel component.
 * Automatically advances slides at a configurable interval with support for
 * pause-on-hover, pause-on-focus, per-slide intervals, reverse direction,
 * stop-on-interaction, stop-on-last-slide, and viewport-aware behavior.
 */
export default class Autoplay extends CarouselModule {

    constructor(carousel, options = {}) {
        super(carousel, options);

        // Timer state
        this._timerId = null;
        this._startTime = 0;
        this._remaining = 0;
        this._paused = false;
        this._stopped = false;
        this._intersecting = true;
        this._pausedByViewport = false;

        // Read options with defaults (attribute values take precedence)
        const attr = (name) => carousel.hasAttribute(name) ? carousel.getAttribute(name) : undefined;
        const boolAttr = (name, fallback) => {
            const val = attr(name);
            if (val === '' || val === 'true' || val === true) return true;
            if (val === 'false' || val === false) return false;
            if (options[name] !== undefined) return !!options[name];
            return fallback;
        };

        // Interval: if autoplay attribute is a number, use it; else use options or default
        const autoplayAttr = attr('autoplay');
        const parsedInterval = autoplayAttr ? parseInt(autoplayAttr, 10) : NaN;
        this._interval = (!isNaN(parsedInterval) && parsedInterval > 0)
            ? parsedInterval
            : (options.interval || 3000);

        this._pauseOnHover = boolAttr('pauseonhover', true);
        this._pauseOnFocus = boolAttr('pauseonfocus', true);
        this._autoplayReverse = boolAttr('autoplayreverse', false);
        this._stopOnInteraction = boolAttr('stoponinteraction', false);
        this._stopOnLast = boolAttr('stoponlast', false);
        this._viewportAware = boolAttr('viewportaware', false);

        // Bind event handlers
        this._onPointerEnter = this._onPointerEnter.bind(this);
        this._onPointerLeave = this._onPointerLeave.bind(this);
        this._onFocusIn = this._onFocusIn.bind(this);
        this._onFocusOut = this._onFocusOut.bind(this);
        this._onDragStart = this._onDragStart.bind(this);
        this._onReachedEnd = this._onReachedEnd.bind(this);

        // IntersectionObserver
        this._observer = null;
    }

    init() {
        const el = this.carousel;

        // Pause-on-hover listeners
        if (this._pauseOnHover) {
            el.addEventListener('pointerenter', this._onPointerEnter);
            el.addEventListener('pointerleave', this._onPointerLeave);
        }

        // Pause-on-focus listeners
        if (this._pauseOnFocus) {
            el.addEventListener('focusin', this._onFocusIn);
            el.addEventListener('focusout', this._onFocusOut);
        }

        // Stop-on-interaction
        if (this._stopOnInteraction) {
            el.addEventListener(CarouselEvent.DRAG_START, this._onDragStart);
        }

        // Stop-on-last
        if (this._stopOnLast) {
            el.addEventListener(CarouselEvent.REACHED_END, this._onReachedEnd);
        }

        // Viewport-aware via IntersectionObserver
        if (this._viewportAware && typeof IntersectionObserver !== 'undefined') {
            this._observer = new IntersectionObserver((entries) => {
                const entry = entries[entries.length - 1];
                this._intersecting = entry.isIntersecting;

                if (!entry.isIntersecting && !this._paused && !this._stopped) {
                    this._pausedByViewport = true;
                    this.pause();
                } else if (entry.isIntersecting && this._pausedByViewport) {
                    this._pausedByViewport = false;
                    this.resume();
                }
            }, { threshold: 0.5 });

            this._observer.observe(el);

            // Only start playing if currently visible
            if (!this._intersecting) {
                this._pausedByViewport = true;
                return;
            }
        }

        // Proxy convenience methods onto carousel
        el.play = () => this.play();
        el.pause = () => this.pause();
        el.resume = () => this.resume();
        el.stop = () => this.stop();

        Object.defineProperty(el, 'autoplayTimeLeft', {
            get: () => this.autoplayTimeLeft,
            configurable: true
        });

        // Start autoplay
        this.play();
    }

    /**
     * Start (or restart) the autoplay timer.
     */
    play() {
        if (this._stopped) return;

        this._paused = false;

        // Per-slide interval: check data-autoplay attribute on current slide
        const slides = this.carousel._slides;
        const current = slides[this.carousel.activeIndex];
        let slideInterval = this._interval;

        if (current && current.hasAttribute('data-autoplay')) {
            const parsed = parseInt(current.getAttribute('data-autoplay'), 10);
            if (!isNaN(parsed) && parsed > 0) {
                slideInterval = parsed;
            }
        }

        this._remaining = slideInterval;
        this._startTime = Date.now();

        // Clear any existing timer
        this._clearTimer();

        this._timerId = setTimeout(() => this._advance(), slideInterval);

        this.carousel.fireEvent(CarouselEvent.AUTOPLAY_START, {
            interval: slideInterval
        });
    }

    /**
     * Pause autoplay, preserving remaining time.
     */
    pause() {
        if (this._paused || this._stopped) return;

        this._paused = true;
        this._remaining -= (Date.now() - this._startTime);
        if (this._remaining < 0) this._remaining = 0;

        this._clearTimer();

        this.carousel.fireEvent(CarouselEvent.AUTOPLAY_PAUSE, {
            timeLeft: this._remaining
        });
    }

    /**
     * Resume autoplay from where it was paused.
     */
    resume() {
        if (!this._paused || this._stopped) return;
        if (this._viewportAware && !this._intersecting) return;

        this._paused = false;
        this._startTime = Date.now();

        this._timerId = setTimeout(
            () => this._advance(),
            Math.max(this._remaining, 0)
        );

        this.carousel.fireEvent(CarouselEvent.AUTOPLAY_RESUME, {
            timeLeft: this._remaining
        });
    }

    /**
     * Stop autoplay completely. Cannot be resumed.
     */
    stop() {
        this._stopped = true;
        this._clearTimer();

        this.carousel.fireEvent(CarouselEvent.AUTOPLAY_STOP, {});
    }

    /**
     * Get remaining time until next slide advance (ms).
     */
    get autoplayTimeLeft() {
        if (this._stopped) return 0;
        if (this._paused) return Math.max(0, this._remaining);
        return Math.max(0, this._remaining - (Date.now() - this._startTime));
    }

    update() {
        // Timer self-manages; nothing to recalculate on layout update
    }

    destroy() {
        this._clearTimer();

        const el = this.carousel;

        // Remove pointer listeners
        el.removeEventListener('pointerenter', this._onPointerEnter);
        el.removeEventListener('pointerleave', this._onPointerLeave);

        // Remove focus listeners
        el.removeEventListener('focusin', this._onFocusIn);
        el.removeEventListener('focusout', this._onFocusOut);

        // Remove carousel event listeners
        el.removeEventListener(CarouselEvent.DRAG_START, this._onDragStart);
        el.removeEventListener(CarouselEvent.REACHED_END, this._onReachedEnd);

        // Disconnect IntersectionObserver
        if (this._observer) {
            this._observer.disconnect();
            this._observer = null;
        }

        // Remove proxy methods from carousel
        delete el.play;
        delete el.pause;
        delete el.resume;
        delete el.stop;

        // Remove autoplayTimeLeft property
        try {
            delete el.autoplayTimeLeft;
        } catch (_) {
            // Property may not be configurable in all environments
        }
    }

    // =========== Private Methods ===========

    _advance() {
        if (this._stopped || this._paused) return;

        this.carousel.fireEvent(CarouselEvent.AUTOPLAY_TICK, {
            timeLeft: 0
        });

        if (this._autoplayReverse) {
            this.carousel.prev();
        } else {
            this.carousel.next();
        }

        // Restart timer for next slide (reads per-slide interval)
        this.play();
    }

    _clearTimer() {
        if (this._timerId !== null) {
            clearTimeout(this._timerId);
            this._timerId = null;
        }
    }

    _onPointerEnter() {
        if (this._pauseOnHover) {
            this.pause();
        }
    }

    _onPointerLeave() {
        if (this._pauseOnHover && this._paused) {
            this.resume();
        }
    }

    _onFocusIn() {
        if (this._pauseOnFocus) {
            this.pause();
        }
    }

    _onFocusOut() {
        if (this._pauseOnFocus && this._paused) {
            this.resume();
        }
    }

    _onDragStart() {
        if (this._stopOnInteraction) {
            this.stop();
        }
    }

    _onReachedEnd() {
        if (this._stopOnLast && !this.carousel.loop) {
            this.stop();
        }
    }
}
