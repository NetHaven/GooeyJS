import UIComponent from '../../../UIComponent.js';
import Template from '../../../../util/Template.js';
import CarouselEvent from '../../../../events/carousel/CarouselEvent.js';
import Key from '../../../../io/Key.js';

/**
 * CarouselNav - Provides navigation controls for a parent Carousel.
 *
 * Supports three display types via the `type` attribute:
 * - "arrows" (default): Previous/Next buttons
 * - "dots": Per-slide dot indicators
 * - "scrollbar": Container for the Scrollbar module's DOM
 *
 * Also manages touch/mouse drag interaction and keyboard navigation
 * on the parent carousel element.
 *
 * @element gooeyui-carousel-nav
 * @attr {string} type - Navigation type: "arrows", "dots", or "scrollbar"
 */
export default class CarouselNav extends UIComponent {

    constructor() {
        super();

        Template.activate("ui-CarouselNav", this.shadowRoot);

        /** @type {HTMLElement} */
        this._container = this.shadowRoot.querySelector('.carousel-nav');

        /** @type {HTMLElement|null} Reference to parent carousel element */
        this._carousel = null;

        /** @type {Map<string, Function>} Tracked event handlers for cleanup */
        this._handlers = new Map();

        /** @type {boolean} Whether a drag is in progress */
        this._isDragging = false;

        /** @type {number} Starting position of a drag (X for horizontal, Y for vertical) */
        this._dragStartPos = 0;

        /** @type {number} Current drag delta */
        this._dragDelta = 0;

        /** @type {HTMLElement[]} Reference to dot buttons for updates */
        this._dots = [];

        /** @type {HTMLButtonElement|null} Previous arrow button */
        this._prevButton = null;

        /** @type {HTMLButtonElement|null} Next arrow button */
        this._nextButton = null;
    }

    connectedCallback() {
        super.connectedCallback?.();

        // Discover parent carousel
        this._carousel = this.closest('gooeyui-carousel');
        if (!this._carousel) {
            console.warn('CarouselNav: No parent <gooeyui-carousel> found.');
            return;
        }

        // Render navigation UI
        this._render();

        // Listen for slide changes to update nav state
        const slideChangedHandler = () => this._onSlideChanged();
        this._carousel.addEventListener(CarouselEvent.SLIDE_CHANGED, slideChangedHandler);
        this._handlers.set('slide-changed', slideChangedHandler);

        // Listen for updates (slide count may change)
        const updateHandler = () => this._onUpdate();
        this._carousel.addEventListener(CarouselEvent.UPDATE, updateHandler);
        this._handlers.set('update', updateHandler);

        // Attach drag listeners to the carousel viewport
        this._attachDragListeners();

        // Attach keyboard listener on the carousel
        this._attachKeyboardListener();
    }

    disconnectedCallback() {
        super.disconnectedCallback?.();

        // Remove carousel event listeners
        if (this._carousel) {
            const slideChangedHandler = this._handlers.get('slide-changed');
            if (slideChangedHandler) {
                this._carousel.removeEventListener(CarouselEvent.SLIDE_CHANGED, slideChangedHandler);
            }
            const updateHandler = this._handlers.get('update');
            if (updateHandler) {
                this._carousel.removeEventListener(CarouselEvent.UPDATE, updateHandler);
            }
        }

        // Remove drag listeners
        this._removeDragListeners();

        // Remove keyboard listener
        const keydownHandler = this._handlers.get('keydown');
        if (keydownHandler && this._carousel) {
            this._carousel.removeEventListener('keydown', keydownHandler);
        }

        // Clear handlers
        this._handlers.clear();

        // Clear rendered content
        if (this._container) {
            this._container.innerHTML = '';
        }

        this._dots = [];
        this._prevButton = null;
        this._nextButton = null;
        this._carousel = null;
    }

    /**
     * The navigation type: "arrows" or "dots".
     * @returns {string}
     */
    get type() {
        return (this.getAttribute('type') || 'arrows').toLowerCase();
    }

    /**
     * @param {string} val
     */
    set type(val) {
        this.setAttribute('type', val);
    }

    /**
     * Whether the parent carousel uses vertical direction.
     * @returns {boolean}
     */
    get _isVertical() {
        return this._carousel?.direction === 'vertical';
    }

    /**
     * @param {string} name
     * @param {string|null} oldValue
     * @param {string|null} newValue
     */
    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return;

        super.attributeChangedCallback?.(name, oldValue, newValue);

        switch (name) {
            case 'type':
                if (this._carousel) {
                    this._container.innerHTML = '';
                    this._dots = [];
                    this._prevButton = null;
                    this._nextButton = null;
                    this._render();
                }
                break;
        }
    }

    // ---------------------------------------------------------------
    // Rendering
    // ---------------------------------------------------------------

    /**
     * Build navigation UI based on the current type attribute.
     */
    _render() {
        if (!this._carousel) return;

        const navType = this.type;

        if (navType === 'arrows') {
            this._renderArrows();
        } else if (navType === 'dots') {
            this._renderDots();
        } else if (navType === 'scrollbar') {
            // Scrollbar type: the Scrollbar module handles all DOM rendering.
            // This nav element acts as a container. Mark it for module discovery.
            this._container.setAttribute('data-scrollbar', '');
        }
    }

    /**
     * Render prev/next arrow buttons.
     */
    _renderArrows() {
        // Previous button
        this._prevButton = document.createElement('button');
        this._prevButton.className = 'carousel-arrow carousel-arrow--prev';
        this._prevButton.setAttribute('aria-label', 'Previous slide');
        this._prevButton.innerHTML = '\u2039'; // single left-pointing angle quotation mark
        this._prevButton.addEventListener('click', () => {
            if (this._carousel && !this.disabled) {
                this._carousel.prev();
            }
        });

        // Next button
        this._nextButton = document.createElement('button');
        this._nextButton.className = 'carousel-arrow carousel-arrow--next';
        this._nextButton.setAttribute('aria-label', 'Next slide');
        this._nextButton.innerHTML = '\u203A'; // single right-pointing angle quotation mark
        this._nextButton.addEventListener('click', () => {
            if (this._carousel && !this.disabled) {
                this._carousel.next();
            }
        });

        this._container.appendChild(this._prevButton);
        this._container.appendChild(this._nextButton);

        this._updateArrows();
    }

    /**
     * Render dot indicators, one per slide.
     */
    _renderDots() {
        const slideCount = this._carousel.slideCount || 0;
        const activeIndex = this._carousel.activeIndex || 0;

        const dotsContainer = document.createElement('div');
        dotsContainer.className = 'carousel-dots';
        dotsContainer.setAttribute('role', 'tablist');

        this._dots = [];

        for (let i = 0; i < slideCount; i++) {
            const dot = document.createElement('button');
            dot.className = 'carousel-dot';
            dot.setAttribute('role', 'tab');
            dot.setAttribute('aria-label', `Go to slide ${i + 1}`);

            if (i === activeIndex) {
                dot.setAttribute('aria-current', 'true');
            }

            dot.addEventListener('click', () => {
                if (this._carousel && !this.disabled) {
                    this._carousel.goTo(i);
                }
            });

            this._dots.push(dot);
            dotsContainer.appendChild(dot);
        }

        this._container.appendChild(dotsContainer);
    }

    // ---------------------------------------------------------------
    // State Updates
    // ---------------------------------------------------------------

    /**
     * Called when the active slide changes.
     */
    _onSlideChanged() {
        if (this.type === 'dots') {
            this._updateDots();
        }
        if (this.type === 'arrows') {
            this._updateArrows();
        }
    }

    /**
     * Called when the carousel updates (slide count may have changed).
     */
    _onUpdate() {
        if (this.type === 'dots') {
            // Rebuild dots since count may have changed
            this._container.innerHTML = '';
            this._dots = [];
            this._renderDots();
        }
        if (this.type === 'arrows') {
            this._updateArrows();
        }
    }

    /**
     * Update dot active states to reflect current carousel index.
     */
    _updateDots() {
        if (!this._carousel || this._dots.length === 0) return;

        const activeIndex = this._carousel.activeIndex || 0;

        for (let i = 0; i < this._dots.length; i++) {
            if (i === activeIndex) {
                this._dots[i].setAttribute('aria-current', 'true');
            } else {
                this._dots[i].removeAttribute('aria-current');
            }
        }
    }

    /**
     * Update arrow disabled states based on carousel position.
     */
    _updateArrows() {
        if (!this._carousel) return;

        const canLoop = this._carousel.hasAttribute('loop');
        const canRewind = this._carousel.hasAttribute('rewind');
        const canWrap = canLoop || canRewind;

        if (this._prevButton) {
            const isBeginning = this._carousel.isBeginning;
            this._prevButton.disabled = isBeginning && !canWrap;
        }

        if (this._nextButton) {
            const isEnd = this._carousel.isEnd;
            this._nextButton.disabled = isEnd && !canWrap;
        }
    }

    // ---------------------------------------------------------------
    // Drag Handling (Touch + Mouse)
    // ---------------------------------------------------------------

    /**
     * Attach drag listeners to the carousel viewport.
     */
    _attachDragListeners() {
        if (!this._carousel) return;

        const viewport = this._carousel.shadowRoot?.querySelector('.carousel-viewport');
        if (!viewport) return;

        const touchEnabled = this._carousel.hasAttribute('touchdrag') ?
            this._carousel.getAttribute('touchdrag') !== 'false' : true;
        const mouseEnabled = this._carousel.hasAttribute('mousedrag') ?
            this._carousel.getAttribute('mousedrag') !== 'false' : true;

        // Mouse drag
        if (mouseEnabled) {
            const mousedownHandler = (e) => this._onDragStart(e, 'mouse');
            viewport.addEventListener('mousedown', mousedownHandler);
            this._handlers.set('mousedown', mousedownHandler);
            this._handlers.set('mousedown-target', viewport);
        }

        // Touch drag
        if (touchEnabled) {
            const touchstartHandler = (e) => this._onDragStart(e, 'touch');
            viewport.addEventListener('touchstart', touchstartHandler, { passive: true });
            this._handlers.set('touchstart', touchstartHandler);
            this._handlers.set('touchstart-target', viewport);
        }
    }

    /**
     * Remove drag listeners from the carousel viewport and document.
     */
    _removeDragListeners() {
        // Remove viewport listeners
        const mousedownTarget = this._handlers.get('mousedown-target');
        const mousedownHandler = this._handlers.get('mousedown');
        if (mousedownTarget && mousedownHandler) {
            mousedownTarget.removeEventListener('mousedown', mousedownHandler);
        }

        const touchstartTarget = this._handlers.get('touchstart-target');
        const touchstartHandler = this._handlers.get('touchstart');
        if (touchstartTarget && touchstartHandler) {
            touchstartTarget.removeEventListener('touchstart', touchstartHandler);
        }

        // Remove document-level listeners if still active
        const mousemoveHandler = this._handlers.get('mousemove');
        if (mousemoveHandler) {
            document.removeEventListener('mousemove', mousemoveHandler);
        }
        const mouseupHandler = this._handlers.get('mouseup');
        if (mouseupHandler) {
            document.removeEventListener('mouseup', mouseupHandler);
        }
        const touchmoveHandler = this._handlers.get('touchmove');
        if (touchmoveHandler) {
            document.removeEventListener('touchmove', touchmoveHandler);
        }
        const touchendHandler = this._handlers.get('touchend');
        if (touchendHandler) {
            document.removeEventListener('touchend', touchendHandler);
        }
    }

    /**
     * Handle drag start (mousedown or touchstart).
     * @param {MouseEvent|TouchEvent} e
     * @param {string} source - 'mouse' or 'touch'
     */
    _onDragStart(e, source) {
        if (this.disabled) return;

        this._isDragging = false;
        const isVertical = this._isVertical;
        this._dragStartPos = source === 'mouse'
            ? (isVertical ? e.clientY : e.clientX)
            : (isVertical ? e.touches[0].clientY : e.touches[0].clientX);
        this._dragDelta = 0;

        // Prevent text selection during mouse drag
        if (source === 'mouse') {
            e.preventDefault();
        }

        // Fire drag-start event
        if (this._carousel) {
            this._carousel.fireEvent?.(CarouselEvent.DRAG_START, { source });
        }

        // Add cursor class to track
        const track = this._carousel?.shadowRoot?.querySelector('.carousel-track');
        if (track) {
            track.classList.add('is-dragging');
        }

        // Attach document-level move/end listeners
        if (source === 'mouse') {
            const moveHandler = (ev) => this._onDragMove(ev, 'mouse');
            const endHandler = (ev) => this._onDragEnd(ev, 'mouse');
            document.addEventListener('mousemove', moveHandler);
            document.addEventListener('mouseup', endHandler);
            this._handlers.set('mousemove', moveHandler);
            this._handlers.set('mouseup', endHandler);
        } else {
            const moveHandler = (ev) => this._onDragMove(ev, 'touch');
            const endHandler = (ev) => this._onDragEnd(ev, 'touch');
            document.addEventListener('touchmove', moveHandler, { passive: false });
            document.addEventListener('touchend', endHandler);
            this._handlers.set('touchmove', moveHandler);
            this._handlers.set('touchend', endHandler);
        }
    }

    /**
     * Handle drag move (mousemove or touchmove).
     * @param {MouseEvent|TouchEvent} e
     * @param {string} source
     */
    _onDragMove(e, source) {
        const isVertical = this._isVertical;
        const currentPos = source === 'mouse'
            ? (isVertical ? e.clientY : e.clientX)
            : (isVertical ? e.touches[0].clientY : e.touches[0].clientX);
        let delta = currentPos - this._dragStartPos;

        const threshold = parseInt(this._carousel?.getAttribute('dragthreshold') || '10', 10);

        if (Math.abs(delta) > threshold) {
            this._isDragging = true;
        }

        // Prevent page scroll during touch drag
        if (source === 'touch' && this._isDragging) {
            e.preventDefault();
        }

        // Apply rubberband resistance at boundaries
        if (this._isDragging && this._carousel) {
            const canLoop = this._carousel.hasAttribute('loop');
            const hasRubberband = this._carousel.hasAttribute('rubberband') ?
                this._carousel.getAttribute('rubberband') !== 'false' : true;

            if (!canLoop && hasRubberband) {
                const isAtStart = this._carousel.isBeginning && delta > 0;
                const isAtEnd = this._carousel.isEnd && delta < 0;
                if (isAtStart || isAtEnd) {
                    delta = delta * 0.3;
                }
            }

            this._dragDelta = delta;

            // Apply temporary translate offset to track
            const track = this._carousel.shadowRoot?.querySelector('.carousel-track');
            if (track) {
                const currentTransform = this._carousel._currentTranslate || 0;
                track.style.transition = 'none';
                const axis = isVertical ? 'translateY' : 'translateX';
                track.style.transform = `${axis}(${currentTransform + delta}px)`;
            }

            // Fire drag-move event
            this._carousel.fireEvent?.(CarouselEvent.DRAG_MOVE, { delta });
        }
    }

    /**
     * Handle drag end (mouseup or touchend).
     * @param {MouseEvent|TouchEvent} e
     * @param {string} source
     */
    _onDragEnd(e, source) {
        // Remove document-level listeners
        if (source === 'mouse') {
            const moveHandler = this._handlers.get('mousemove');
            const endHandler = this._handlers.get('mouseup');
            if (moveHandler) document.removeEventListener('mousemove', moveHandler);
            if (endHandler) document.removeEventListener('mouseup', endHandler);
            this._handlers.delete('mousemove');
            this._handlers.delete('mouseup');
        } else {
            const moveHandler = this._handlers.get('touchmove');
            const endHandler = this._handlers.get('touchend');
            if (moveHandler) document.removeEventListener('touchmove', moveHandler);
            if (endHandler) document.removeEventListener('touchend', endHandler);
            this._handlers.delete('touchmove');
            this._handlers.delete('touchend');
        }

        // Remove cursor class from track
        const track = this._carousel?.shadowRoot?.querySelector('.carousel-track');
        if (track) {
            track.classList.remove('is-dragging');
            track.style.transition = '';
        }

        // Navigate based on drag delta
        if (this._isDragging && this._carousel) {
            const threshold = parseInt(this._carousel.getAttribute('dragthreshold') || '10', 10);

            if (Math.abs(this._dragDelta) > threshold) {
                if (this._dragDelta > 0) {
                    this._carousel.prev();
                } else {
                    this._carousel.next();
                }
            } else {
                // Snap back to current position
                this._carousel._snapToCurrentSlide?.();
            }

            // Fire drag-end event
            this._carousel.fireEvent?.(CarouselEvent.DRAG_END, { delta: this._dragDelta });
        }

        this._isDragging = false;
        this._dragDelta = 0;
    }

    // ---------------------------------------------------------------
    // Keyboard Navigation
    // ---------------------------------------------------------------

    /**
     * Attach keyboard listener to the carousel element.
     */
    _attachKeyboardListener() {
        if (!this._carousel) return;

        const keydownHandler = (e) => this._onKeydown(e);
        this._carousel.addEventListener('keydown', keydownHandler);
        this._handlers.set('keydown', keydownHandler);
    }

    /**
     * Handle keyboard navigation.
     * @param {KeyboardEvent} e
     */
    _onKeydown(e) {
        if (this.disabled || !this._carousel) return;

        const isVertical = this._isVertical;
        const nextKey = isVertical ? Key.ARROW_DOWN : Key.ARROW_RIGHT;
        const prevKey = isVertical ? Key.ARROW_UP : Key.ARROW_LEFT;

        switch (e.key) {
            case nextKey:
                e.preventDefault();
                this._carousel.next();
                break;

            case prevKey:
                e.preventDefault();
                this._carousel.prev();
                break;

            case Key.HOME:
                e.preventDefault();
                this._carousel.goTo(0);
                break;

            case Key.END:
                e.preventDefault();
                {
                    const slideCount = this._carousel.slideCount || 0;
                    this._carousel.goTo(slideCount - 1);
                }
                break;
        }
    }
}
