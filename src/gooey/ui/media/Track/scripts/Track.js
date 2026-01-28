import GooeyElement from '../../../../GooeyElement.js';

/**
 * Track component represents a single video track within a VideoPlayer.
 * It is a non-visual element that holds track metadata.
 *
 * @element gooeyui-track
 * @attr {string} src - URL to the video file
 * @attr {number} starttime - Start playback at this second (default: 0)
 * @attr {number} stoptime - Stop playback at this second (default: end of video)
 * @attr {number} speed - Playback speed override (0.25 to 4.0)
 * @attr {string} title - Track title for accessibility and display
 */
export default class Track extends GooeyElement {
    constructor() {
        super();
    }

    /**
     * Get the video source URL
     * @returns {string|null}
     */
    get src() {
        return this.getAttribute("src");
    }

    /**
     * Set the video source URL
     * @param {string} val
     */
    set src(val) {
        if (val === null || val === undefined) {
            this.removeAttribute("src");
        } else {
            this.setAttribute("src", val);
        }
    }

    /**
     * Get the start time in seconds
     * @returns {number}
     */
    get starttime() {
        const val = this.getAttribute("starttime");
        return val !== null ? parseFloat(val) : 0;
    }

    /**
     * Set the start time in seconds
     * @param {number} val
     */
    set starttime(val) {
        if (val === null || val === undefined) {
            this.removeAttribute("starttime");
        } else {
            this.setAttribute("starttime", String(val));
        }
    }

    /**
     * Get the stop time in seconds
     * @returns {number|null}
     */
    get stoptime() {
        const val = this.getAttribute("stoptime");
        return val !== null ? parseFloat(val) : null;
    }

    /**
     * Set the stop time in seconds
     * @param {number|null} val
     */
    set stoptime(val) {
        if (val === null || val === undefined) {
            this.removeAttribute("stoptime");
        } else {
            this.setAttribute("stoptime", String(val));
        }
    }

    /**
     * Get the playback speed
     * @returns {number|null}
     */
    get speed() {
        const val = this.getAttribute("speed");
        return val !== null ? parseFloat(val) : null;
    }

    /**
     * Set the playback speed (0.25 to 4.0)
     * @param {number|null} val
     */
    set speed(val) {
        if (val === null || val === undefined) {
            this.removeAttribute("speed");
        } else {
            const clamped = Math.max(0.25, Math.min(4, parseFloat(val)));
            this.setAttribute("speed", String(clamped));
        }
    }

    /**
     * Get the track title
     * @returns {string|null}
     */
    get title() {
        return this.getAttribute("title");
    }

    /**
     * Set the track title
     * @param {string} val
     */
    set title(val) {
        if (val === null || val === undefined) {
            this.removeAttribute("title");
        } else {
            this.setAttribute("title", val);
        }
    }

    /**
     * Get track data as an object
     * @returns {{src: string, starttime: number, stoptime: number|null, speed: number|null, title: string|null}}
     */
    toObject() {
        return {
            src: this.src,
            starttime: this.starttime,
            stoptime: this.stoptime,
            speed: this.speed,
            title: this.title
        };
    }
}
