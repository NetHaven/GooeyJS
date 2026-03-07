import Container from '../../../Container.js';
import Template from '../../../../util/Template.js';
import CarouselEvent from '../../../../events/carousel/CarouselEvent.js';
import CarouselSlideEvent from '../../../../events/carousel/CarouselSlideEvent.js';

/**
 * Core Carousel component.
 * Manages slide children in a horizontal track, providing navigation,
 * loop/rewind modes, multi-slide display, gap spacing, transitions,
 * dynamic content API, and module infrastructure.
 */
export default class Carousel extends Container {

    constructor() {
        super();

        Template.activate("ui-Carousel", this.shadowRoot);

        // Query shadow DOM elements
        this._viewport = this.shadowRoot.querySelector('.carousel-viewport');
        this._track = this.shadowRoot.querySelector('.carousel-track');
        this._liveRegion = this.shadowRoot.querySelector('.carousel-live-region');

        // Internal state
        this._activeIndex = 0;
        this._isDragging = false;
        this._slides = [];
        this._clones = [];
        this._modules = new Map();
        this._resizeObserver = null;
        this._slideWidth = 0;
        this._slideHeight = 0;
        this._gapPx = 0;
        this._resizeRafId = null;
        this._destroyed = false;
        this._initialized = false;
        this._currentTranslate = 0;

        // Breakpoint state
        this._breakpoints = null;
        this._activeBreakpoint = null;
        this._breakpointQueries = [];
        this._originalOptions = {};

        // Reduced motion detection
        this._reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

        // Register all CarouselEvent constants
        this.addValidEvent(CarouselEvent.SLIDE_CHANGE);
        this.addValidEvent(CarouselEvent.SLIDE_CHANGED);
        this.addValidEvent(CarouselEvent.DRAG_START);
        this.addValidEvent(CarouselEvent.DRAG_MOVE);
        this.addValidEvent(CarouselEvent.DRAG_END);
        this.addValidEvent(CarouselEvent.SCROLL);
        this.addValidEvent(CarouselEvent.SCROLL_PROGRESS);
        this.addValidEvent(CarouselEvent.REACHED_START);
        this.addValidEvent(CarouselEvent.REACHED_END);
        this.addValidEvent(CarouselEvent.INIT);
        this.addValidEvent(CarouselEvent.DESTROY);
        this.addValidEvent(CarouselEvent.UPDATE);
        this.addValidEvent(CarouselEvent.RESIZE);
        this.addValidEvent(CarouselEvent.SLIDE_NEXT);
        this.addValidEvent(CarouselEvent.SLIDE_PREV);
        this.addValidEvent(CarouselEvent.CLICK);
        this.addValidEvent(CarouselEvent.REINIT);
        this.addValidEvent(CarouselEvent.MODULE_LOADED);
        this.addValidEvent(CarouselEvent.MODULE_UNLOADED);
        this.addValidEvent(CarouselEvent.AUTOPLAY_START);
        this.addValidEvent(CarouselEvent.AUTOPLAY_STOP);
        this.addValidEvent(CarouselEvent.AUTOPLAY_PAUSE);
        this.addValidEvent(CarouselEvent.AUTOPLAY_RESUME);
        this.addValidEvent(CarouselEvent.AUTOPLAY_TICK);
        this.addValidEvent(CarouselEvent.STORE_BOUND);
        this.addValidEvent(CarouselEvent.BREAKPOINT);
    }

    // =========== Lifecycle ===========

    connectedCallback() {
        super.connectedCallback?.();

        if (this._initialized) return;
        this._initialized = true;

        // Read initial attribute values
        if (this.hasAttribute('startindex')) {
            this._activeIndex = parseInt(this.getAttribute('startindex'), 10) || 0;
        }

        // Collect slides
        this._collectSlides();

        // Create clones for loop mode
        if (this.loop) {
            this._createClones();
        }

        // Set up layout and position
        this._calculateLayout();
        this._positionTrack(false);

        // Set viewport aria-label or aria-labelledby
        if (this._viewport) {
            if (this.hasAttribute('arialabelledby') && this.getAttribute('arialabelledby')) {
                this._viewport.setAttribute('aria-labelledby', this.getAttribute('arialabelledby'));
            } else {
                this._viewport.setAttribute('aria-label', this.getAttribute('arialabel') || 'Carousel');
            }
        }

        // Set live region aria-live
        if (this._liveRegion) {
            const liveValue = this.hasAttribute('liveregion')
                ? this.getAttribute('liveregion').toLowerCase()
                : 'polite';
            this._liveRegion.setAttribute('aria-live', liveValue);
        }

        // Update active slide
        this._updateActiveSlide(this._activeIndex, null, false);

        // Set up ResizeObserver
        this._resizeObserver = new ResizeObserver(() => this._onResize());
        if (this._viewport) {
            this._resizeObserver.observe(this._viewport);
        }

        // Apply speed/easing CSS custom properties
        this._applyTransitionProperties();

        // Set up breakpoints if configured via JS
        if (this._breakpoints) {
            this._setupBreakpoints();
        }

        // Load modules from attribute
        if (this.hasAttribute('modules')) {
            const moduleNames = this.getAttribute('modules');
            if (moduleNames) {
                const names = moduleNames.split(',').map(n => n.trim()).filter(Boolean);
                for (const name of names) {
                    this._loadModuleByName(name);
                }
            }
        }

        this.fireEvent(CarouselEvent.INIT, { carousel: this });
    }

    disconnectedCallback() {
        this.destroy();

        if (super.disconnectedCallback) {
            super.disconnectedCallback();
        }
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return;
        super.attributeChangedCallback?.(name, oldValue, newValue);

        if (!this._initialized) return;

        switch (name) {
            case 'perpage':
            case 'gap':
            case 'direction':
            case 'padding':
                this.update();
                break;
            case 'loop':
                if (this._isBooleanTrue(newValue)) {
                    this._createClones();
                } else {
                    this._removeClones();
                }
                this.update();
                break;
            case 'speed':
            case 'easing':
                this._applyTransitionProperties();
                break;
            case 'arialabel':
                if (this._viewport && !this.hasAttribute('arialabelledby')) {
                    this._viewport.setAttribute('aria-label', newValue || 'Carousel');
                }
                break;
            case 'arialabelledby':
                if (this._viewport) {
                    if (newValue) {
                        this._viewport.setAttribute('aria-labelledby', newValue);
                        this._viewport.removeAttribute('aria-label');
                    } else {
                        this._viewport.removeAttribute('aria-labelledby');
                        this._viewport.setAttribute('aria-label', this.getAttribute('arialabel') || 'Carousel');
                    }
                }
                break;
            case 'liveregion':
                if (this._liveRegion) {
                    this._liveRegion.setAttribute('aria-live', (newValue || 'polite').toLowerCase());
                }
                break;
            case 'modules':
                if (newValue) {
                    const names = newValue.split(',').map(n => n.trim()).filter(Boolean);
                    for (const name of names) {
                        if (!this._modules.has(name)) {
                            this._loadModuleByName(name);
                        }
                    }
                }
                break;
        }
    }

    // =========== Public Properties (Read/Write) ===========

    get activeIndex() {
        return this._activeIndex;
    }

    set activeIndex(val) {
        const index = parseInt(val, 10);
        if (!isNaN(index)) {
            this.goTo(index);
        }
    }

    get direction() {
        return this.getAttribute('direction') || 'horizontal';
    }

    set direction(val) {
        this.setAttribute('direction', val);
    }

    get mode() {
        return this.getAttribute('mode') || 'snap';
    }

    set mode(val) {
        this.setAttribute('mode', val);
    }

    get perpage() {
        return parseInt(this.getAttribute('perpage'), 10) || 1;
    }

    set perpage(val) {
        this.setAttribute('perpage', String(val));
    }

    get permove() {
        return parseInt(this.getAttribute('permove'), 10) || 1;
    }

    set permove(val) {
        this.setAttribute('permove', String(val));
    }

    get gap() {
        return this.getAttribute('gap') || '0px';
    }

    set gap(val) {
        this.setAttribute('gap', val);
    }

    get speed() {
        if (this._reducedMotion && this._reducedMotion.matches) {
            return 0;
        }
        return parseInt(this.getAttribute('speed'), 10) || 300;
    }

    set speed(val) {
        this.setAttribute('speed', String(val));
    }

    get easing() {
        return this.getAttribute('easing') || 'ease';
    }

    set easing(val) {
        this.setAttribute('easing', val);
    }

    get loop() {
        return this._isBooleanTrue(this.getAttribute('loop'));
    }

    set loop(val) {
        if (val) {
            this.setAttribute('loop', '');
        } else {
            this.removeAttribute('loop');
        }
    }

    get rewind() {
        return this._isBooleanTrue(this.getAttribute('rewind'));
    }

    set rewind(val) {
        if (val) {
            this.setAttribute('rewind', '');
        } else {
            this.removeAttribute('rewind');
        }
    }

    get mousedrag() {
        if (!this.hasAttribute('mousedrag')) return true;
        return this._isBooleanTrue(this.getAttribute('mousedrag'));
    }

    set mousedrag(val) {
        if (val) {
            this.setAttribute('mousedrag', '');
        } else {
            this.setAttribute('mousedrag', 'false');
        }
    }

    get touchdrag() {
        if (!this.hasAttribute('touchdrag')) return true;
        return this._isBooleanTrue(this.getAttribute('touchdrag'));
    }

    set touchdrag(val) {
        if (val) {
            this.setAttribute('touchdrag', '');
        } else {
            this.setAttribute('touchdrag', 'false');
        }
    }

    // =========== Public Properties (Read-Only) ===========

    get slideCount() {
        return this._slides.length;
    }

    get slidesInView() {
        const indices = [];
        const pp = this.perpage;
        for (let i = 0; i < pp; i++) {
            const idx = this._activeIndex + i;
            if (idx < this._slides.length) {
                indices.push(idx);
            }
        }
        return indices;
    }

    get scrollProgress() {
        const maxIndex = this._maxIndex();
        if (maxIndex <= 0) return 0;
        return this._activeIndex / maxIndex;
    }

    get isBeginning() {
        return this._activeIndex === 0;
    }

    get isEnd() {
        return this._activeIndex >= this._maxIndex();
    }

    get isDragging() {
        return this._isDragging;
    }

    get loadedModules() {
        return Array.from(this._modules.keys());
    }

    // =========== Public Properties (Breakpoints & Module Config) ===========

    get breakpoints() {
        return this._breakpoints;
    }

    set breakpoints(val) {
        this._breakpoints = val;
        if (this._initialized) {
            this._setupBreakpoints();
        }
    }

    get mobilefirst() {
        return this._isBooleanTrue(this.getAttribute('mobilefirst'));
    }

    set mobilefirst(val) {
        if (val) {
            this.setAttribute('mobilefirst', '');
        } else {
            this.removeAttribute('mobilefirst');
        }
    }

    // =========== Navigation Methods ===========

    next() {
        if (this.disabled) return;

        const currentIndex = this._activeIndex;
        let targetIndex = currentIndex + this.permove;
        const maxIndex = this._maxIndex();

        this.fireEvent(CarouselEvent.SLIDE_NEXT, {
            currentIndex,
            targetIndex
        });

        if (targetIndex > maxIndex) {
            if (this.loop) {
                targetIndex = targetIndex - this._slides.length;
                if (targetIndex < 0) targetIndex = 0;
            } else if (this.rewind) {
                targetIndex = 0;
            } else {
                targetIndex = maxIndex;
            }
        }

        if (targetIndex !== currentIndex) {
            this.goTo(targetIndex);
        }
    }

    prev() {
        if (this.disabled) return;

        const currentIndex = this._activeIndex;
        let targetIndex = currentIndex - this.permove;

        this.fireEvent(CarouselEvent.SLIDE_PREV, {
            currentIndex,
            targetIndex
        });

        if (targetIndex < 0) {
            if (this.loop) {
                targetIndex = this._slides.length + targetIndex;
                if (targetIndex < 0) targetIndex = 0;
            } else if (this.rewind) {
                targetIndex = this._maxIndex();
            } else {
                targetIndex = 0;
            }
        }

        if (targetIndex !== currentIndex) {
            this.goTo(targetIndex);
        }
    }

    goTo(index) {
        if (this.disabled) return;

        const clampedIndex = Math.max(0, Math.min(index, this._maxIndex()));
        const previousIndex = this._activeIndex;

        if (clampedIndex === previousIndex) return;

        const direction = clampedIndex > previousIndex ? 'next' : 'prev';

        this._activeIndex = clampedIndex;

        // Fire SLIDE_CHANGE immediately
        this.fireEvent(CarouselEvent.SLIDE_CHANGE, {
            index: clampedIndex,
            previousIndex,
            slide: this._slides[clampedIndex] || null,
            direction
        });

        // Position track with animation
        this._positionTrack(true);

        // Update active slide state
        this._updateActiveSlide(clampedIndex, previousIndex, true);

        // Fire SLIDE_CHANGED after transition
        this._fireAfterTransition(() => {
            this.fireEvent(CarouselEvent.SLIDE_CHANGED, {
                index: clampedIndex,
                previousIndex,
                slide: this._slides[clampedIndex] || null,
                direction
            });

            // Handle loop mode repositioning after transition
            if (this.loop) {
                this._handleLoopRepositioning();
            }
        });

        // Fire boundary events
        if (clampedIndex === 0) {
            this.fireEvent(CarouselEvent.REACHED_START, { index: 0 });
        }
        if (clampedIndex >= this._maxIndex()) {
            this.fireEvent(CarouselEvent.REACHED_END, { index: clampedIndex });
        }

        // Update scroll progress
        this.fireEvent(CarouselEvent.SCROLL_PROGRESS, {
            progress: this.scrollProgress
        });

        // Update screen reader announcement
        this._announce();
    }

    // =========== Dynamic Content API ===========

    appendSlide(element) {
        this.appendChild(element);
        this._collectSlides();
        if (this.loop) {
            this._removeClones();
            this._createClones();
        }
        this._calculateLayout();
        this._positionTrack(false);
        this.fireEvent(CarouselEvent.UPDATE, { action: 'append', slide: element });
    }

    prependSlide(element) {
        if (this._slides.length > 0) {
            this.insertBefore(element, this._slides[0]);
        } else {
            this.appendChild(element);
        }
        this._activeIndex++;
        this._collectSlides();
        if (this.loop) {
            this._removeClones();
            this._createClones();
        }
        this._calculateLayout();
        this._positionTrack(false);
        this.fireEvent(CarouselEvent.UPDATE, { action: 'prepend', slide: element });
    }

    insertSlide(index, element) {
        if (index >= this._slides.length) {
            this.appendChild(element);
        } else {
            this.insertBefore(element, this._slides[index]);
        }
        if (index <= this._activeIndex) {
            this._activeIndex++;
        }
        this._collectSlides();
        if (this.loop) {
            this._removeClones();
            this._createClones();
        }
        this._calculateLayout();
        this._positionTrack(false);
        this.fireEvent(CarouselEvent.UPDATE, { action: 'insert', slide: element, index });
    }

    removeSlide(index) {
        if (index < 0 || index >= this._slides.length) return;

        const slide = this._slides[index];
        slide.remove();

        if (index < this._activeIndex) {
            this._activeIndex--;
        } else if (index === this._activeIndex && this._activeIndex >= this._slides.length - 1) {
            this._activeIndex = Math.max(0, this._slides.length - 2);
        }

        this._collectSlides();
        if (this.loop) {
            this._removeClones();
            this._createClones();
        }
        this._calculateLayout();
        this._positionTrack(false);
        this.fireEvent(CarouselEvent.UPDATE, { action: 'remove', index });
    }

    update() {
        this._collectSlides();
        if (this.loop) {
            this._removeClones();
            this._createClones();
        }
        this._calculateLayout();
        this._positionTrack(false);
        this._updateActiveSlide(this._activeIndex, null, false);

        // Notify modules
        for (const [, mod] of this._modules) {
            mod.update();
        }

        this.fireEvent(CarouselEvent.UPDATE, { carousel: this });
    }

    destroy() {
        if (this._destroyed) return;
        this._destroyed = true;

        // Disconnect ResizeObserver
        if (this._resizeObserver) {
            this._resizeObserver.disconnect();
            this._resizeObserver = null;
        }

        // Cancel pending RAF
        if (this._resizeRafId) {
            cancelAnimationFrame(this._resizeRafId);
            this._resizeRafId = null;
        }

        // Remove breakpoint listeners
        this._cleanupBreakpoints();

        // Remove clones
        this._removeClones();

        // Destroy modules
        for (const [name, mod] of this._modules) {
            mod.destroy();
        }
        this._modules.clear();

        this.fireEvent(CarouselEvent.DESTROY, { carousel: this });
    }

    // =========== Module Infrastructure ===========

    loadModule(name, moduleClass, options = {}) {
        if (this._modules.has(name)) {
            this.unloadModule(name);
        }

        const mod = new moduleClass(this, options);
        this._modules.set(name, mod);
        mod.init();

        this.fireEvent(CarouselEvent.MODULE_LOADED, { name, module: mod });
    }

    unloadModule(name) {
        const mod = this._modules.get(name);
        if (mod) {
            mod.destroy();
            this._modules.delete(name);
            this.fireEvent(CarouselEvent.MODULE_UNLOADED, { name });
        }
    }

    // =========== Private Methods ===========

    // ---- Breakpoint Management ----

    _setupBreakpoints() {
        this._cleanupBreakpoints();

        if (!this._breakpoints || Object.keys(this._breakpoints).length === 0) {
            this._restoreOriginalOptions();
            return;
        }

        // Store original options before first override
        if (Object.keys(this._originalOptions).length === 0) {
            this._originalOptions = {
                perpage: this.perpage,
                gap: this.gap
            };
        }

        const keys = Object.keys(this._breakpoints).map(Number).sort((a, b) => a - b);

        for (const key of keys) {
            const mediaQuery = this.mobilefirst
                ? `(min-width: ${key}px)`
                : `(max-width: ${key}px)`;
            const query = window.matchMedia(mediaQuery);
            const handler = () => this._evaluateBreakpoints();
            query.addEventListener('change', handler);
            this._breakpointQueries.push({ query, breakpoint: key, handler });
        }

        this._evaluateBreakpoints();
    }

    _evaluateBreakpoints() {
        if (!this._breakpoints) return;

        const keys = Object.keys(this._breakpoints).map(Number);

        let matchedKey = null;
        let matchedOptions = null;

        if (this.mobilefirst) {
            // For mobile-first (min-width): last matching wins (largest matching breakpoint)
            const sorted = keys.sort((a, b) => a - b);
            for (const key of sorted) {
                const entry = this._breakpointQueries.find(bq => bq.breakpoint === key);
                if (entry && entry.query.matches) {
                    matchedKey = key;
                    matchedOptions = this._breakpoints[key];
                }
            }
        } else {
            // For desktop-first (max-width): first matching wins (largest matching breakpoint)
            const sorted = keys.sort((a, b) => b - a);
            for (const key of sorted) {
                const entry = this._breakpointQueries.find(bq => bq.breakpoint === key);
                if (entry && entry.query.matches) {
                    matchedKey = key;
                    matchedOptions = this._breakpoints[key];
                }
            }
        }

        if (matchedKey !== null && matchedKey !== this._activeBreakpoint) {
            this._activeBreakpoint = matchedKey;
            this._applyBreakpointOptions(matchedOptions);
            this.update();
            this.fireEvent(CarouselEvent.BREAKPOINT, {
                breakpoint: matchedKey,
                options: matchedOptions
            });
        } else if (matchedKey === null && this._activeBreakpoint !== null) {
            this._activeBreakpoint = null;
            this._restoreOriginalOptions();
            this.update();
        }
    }

    _applyBreakpointOptions(options) {
        if (!options) return;
        for (const [key, value] of Object.entries(options)) {
            this.setAttribute(key, String(value));
        }
    }

    _restoreOriginalOptions() {
        if (Object.keys(this._originalOptions).length === 0) return;
        for (const [key, value] of Object.entries(this._originalOptions)) {
            this.setAttribute(key, String(value));
        }
    }

    _cleanupBreakpoints() {
        for (const { query, handler } of this._breakpointQueries) {
            query.removeEventListener('change', handler);
        }
        this._breakpointQueries = [];
    }

    // ---- Dynamic Module Loading ----

    async _loadModuleByName(name) {
        const modulePath = this._resolveModulePath(name);
        try {
            const mod = await import(modulePath);
            this.loadModule(name, mod.default);
        } catch (err) {
            console.warn(`Carousel: Failed to load module "${name}" from ${modulePath}`, err);
        }
    }

    _resolveModulePath(name) {
        // effect-* prefix maps to effects/Effect{PascalCase}.js
        if (name.startsWith('effect-')) {
            const effectName = name.slice(7); // remove "effect-"
            const pascal = effectName.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('');
            return `../modules/effects/Effect${pascal}.js`;
        }
        // Standard module: kebab-case -> PascalCase
        const pascal = name.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('');
        return `../modules/${pascal}.js`;
    }

    // ---- Slide Management ----

    _collectSlides() {
        this._slides = Array.from(this.querySelectorAll('gooeyui-carousel-slide'));
    }

    _calculateLayout() {
        if (!this._viewport || this._slides.length === 0) return;

        const rect = this._viewport.getBoundingClientRect();
        const isVertical = this.direction === 'vertical';
        const viewportSize = isVertical ? rect.height : rect.width;
        if (viewportSize === 0) return;

        const pp = this.perpage;
        this._gapPx = this._parseGap(this.gap);

        const slideSize = (viewportSize - (pp - 1) * this._gapPx) / pp;

        if (isVertical) {
            this._slideHeight = slideSize;
            this._slideWidth = 0;
        } else {
            this._slideWidth = slideSize;
            this._slideHeight = 0;
        }

        // Apply dimensions to all slides
        const dimProp = isVertical ? 'height' : 'width';
        const minProp = isVertical ? 'minHeight' : 'minWidth';

        for (const slide of this._slides) {
            slide.style[dimProp] = `${slideSize}px`;
            slide.style[minProp] = `${slideSize}px`;
            // Clear the other axis
            if (isVertical) {
                slide.style.width = '';
                slide.style.minWidth = '';
            } else {
                slide.style.height = '';
                slide.style.minHeight = '';
            }
        }

        // Apply dimensions to clones
        for (const clone of this._clones) {
            clone.style[dimProp] = `${slideSize}px`;
            clone.style[minProp] = `${slideSize}px`;
            if (isVertical) {
                clone.style.width = '';
                clone.style.minWidth = '';
            } else {
                clone.style.height = '';
                clone.style.minHeight = '';
            }
        }

        // Set gap CSS custom property on track
        if (this._track) {
            this._track.style.setProperty('--gooey-carousel-track-gap', this.gap);
        }
    }

    get _slideSize() {
        return this.direction === 'vertical' ? this._slideHeight : this._slideWidth;
    }

    _positionTrack(animated) {
        if (!this._track) return;

        const size = this._slideSize;
        let offset = -(this._activeIndex * (size + this._gapPx));

        // Account for clone offset in loop mode
        if (this.loop && this._clones.length > 0) {
            const cloneCount = Math.floor(this._clones.length / 2);
            offset -= cloneCount * (size + this._gapPx);
        }

        this._currentTranslate = offset;

        const isVertical = this.direction === 'vertical';
        const transform = isVertical
            ? `translateY(${offset}px)`
            : `translateX(${offset}px)`;

        if (!animated) {
            // Disable transition temporarily
            this._track.style.transition = 'none';
            this._track.style.transform = transform;
            // Force reflow
            this._track.offsetHeight; // eslint-disable-line no-unused-expressions
            // Restore transition
            this._track.style.transition = '';
        } else {
            this._track.style.transform = transform;
        }
    }

    _createClones() {
        if (this._slides.length === 0 || !this._track) return;

        const pp = this.perpage;
        const slideCount = this._slides.length;
        const cloneCount = Math.min(pp, slideCount);

        // Clone slides from end and prepend
        for (let i = slideCount - cloneCount; i < slideCount; i++) {
            const clone = this._slides[i].cloneNode(true);
            clone.setAttribute('aria-hidden', 'true');
            clone.classList.add('carousel-clone');
            clone.removeAttribute('active');
            this._track.insertBefore(clone, this._track.firstChild);
            this._clones.push(clone);
        }

        // Clone slides from start and append
        for (let i = 0; i < cloneCount; i++) {
            const clone = this._slides[i].cloneNode(true);
            clone.setAttribute('aria-hidden', 'true');
            clone.classList.add('carousel-clone');
            clone.removeAttribute('active');
            this._track.appendChild(clone);
            this._clones.push(clone);
        }
    }

    _removeClones() {
        for (const clone of this._clones) {
            clone.remove();
        }
        this._clones = [];
    }

    _snapToCurrentSlide() {
        this._positionTrack(true);
    }

    _handleLoopRepositioning() {
        if (!this.loop || this._clones.length === 0) return;

        // After the animated transition completes, the track is visually at the
        // correct position. Re-apply the position without animation to ensure the
        // track is at the canonical position for the real slide (not a clone).
        this._positionTrack(false);
    }

    _updateActiveSlide(newIndex, previousIndex, fireSlideEvents) {
        const total = this._slides.length;
        const pp = this.perpage;

        for (let i = 0; i < total; i++) {
            const slide = this._slides[i];

            // Set ARIA role and roledescription once
            if (!slide.hasAttribute('role')) {
                slide.setAttribute('role', 'group');
                slide.setAttribute('aria-roledescription', 'slide');
            }

            // Update positional aria-label
            slide.setAttribute('aria-label', `${i + 1} of ${total}`);

            // Determine if slide is in view
            const inView = i >= newIndex && i < newIndex + pp;
            slide.setAttribute('aria-hidden', String(!inView));

            // Update active state
            if (i === newIndex) {
                if (!slide.hasAttribute('active')) {
                    slide.setAttribute('active', '');
                    if (fireSlideEvents && slide.fireEvent) {
                        slide.fireEvent(CarouselSlideEvent.ACTIVE, { index: i });
                    }
                }
            } else {
                if (slide.hasAttribute('active')) {
                    slide.removeAttribute('active');
                    if (fireSlideEvents && i === previousIndex && slide.fireEvent) {
                        slide.fireEvent(CarouselSlideEvent.INACTIVE, { index: i });
                    }
                }
            }
        }
    }

    _announce() {
        if (!this._liveRegion) return;

        const template = this.getAttribute('announcetemplate') || 'Slide ${index} of ${total}';
        const message = template
            .replace('${index}', String(this._activeIndex + 1))
            .replace('${total}', String(this._slides.length));

        this._liveRegion.textContent = message;
    }

    _applyTransitionProperties() {
        if (!this._track) return;

        const speed = this.speed;
        const easing = this.easing;

        this._track.style.setProperty('--_transition-duration', `${speed}ms`);
        this._track.style.setProperty('--_transition-easing', easing);
    }

    _fireAfterTransition(callback) {
        const speed = this.speed;

        if (speed === 0) {
            callback();
            return;
        }

        // Use transitionend event with timeout fallback
        const onEnd = () => {
            clearTimeout(fallbackTimeout);
            this._track.removeEventListener('transitionend', onEnd);
            callback();
        };

        const fallbackTimeout = setTimeout(() => {
            this._track.removeEventListener('transitionend', onEnd);
            callback();
        }, speed + 50);

        this._track.addEventListener('transitionend', onEnd, { once: true });
    }

    _onResize() {
        if (this._resizeRafId) {
            cancelAnimationFrame(this._resizeRafId);
        }

        this._resizeRafId = requestAnimationFrame(() => {
            this._resizeRafId = null;
            this._calculateLayout();
            this._positionTrack(false);
            this.fireEvent(CarouselEvent.RESIZE, { carousel: this });
        });
    }

    _parseGap(gapValue) {
        if (!gapValue || gapValue === '0' || gapValue === '0px') return 0;

        // Handle px values
        if (gapValue.endsWith('px')) {
            return parseFloat(gapValue);
        }

        // Handle rem values (approximate using 16px base)
        if (gapValue.endsWith('rem')) {
            const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
            return parseFloat(gapValue) * rootFontSize;
        }

        // Handle em values
        if (gapValue.endsWith('em')) {
            const fontSize = parseFloat(getComputedStyle(this).fontSize) || 16;
            return parseFloat(gapValue) * fontSize;
        }

        // Fallback: try parsing as number (assume px)
        const num = parseFloat(gapValue);
        return isNaN(num) ? 0 : num;
    }

    _maxIndex() {
        return Math.max(0, this._slides.length - this.perpage);
    }

    _isBooleanTrue(val) {
        if (val === null || val === undefined || val === 'false') return false;
        return val === '' || val === 'true' || val === true;
    }
}
