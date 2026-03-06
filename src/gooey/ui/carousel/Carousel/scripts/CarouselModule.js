/**
 * Base class for Carousel modules.
 * Modules extend carousel functionality with a clean lifecycle contract.
 * The Carousel core calls init() during setup, update() on recalculation,
 * and destroy() on teardown or module unload.
 */
export default class CarouselModule {
    constructor(carousel, options) {
        this.carousel = carousel;
        this.options = options;
    }
    init() {}
    update() {}
    destroy() {}
}
