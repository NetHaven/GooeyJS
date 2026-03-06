import Event from "../Event.js";

/**
 * Events fired by the CarouselSlide component.
 */
export default class CarouselSlideEvent extends Event {

    /** Fired when the slide becomes active. */
    static ACTIVE = "active";

    /** Fired when the slide leaves active state. */
    static INACTIVE = "inactive";

    /** Fired when the slide enters the viewport. */
    static VISIBLE = "visible";

    /** Fired when the slide leaves the viewport. */
    static HIDDEN = "hidden";

    constructor() {
        super();
    }
}
