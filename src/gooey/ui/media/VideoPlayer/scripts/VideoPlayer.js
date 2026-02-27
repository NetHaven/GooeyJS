import UIComponent from '../../../UIComponent.js';
import Template from '../../../../util/Template.js';
import PlaylistParser from '../../../../util/PlaylistParser.js';
import VideoPlayerEvent from '../../../../events/media/VideoPlayerEvent.js';
import Logger from '../../../../logging/Logger.js';

/**
 * VideoPlayer component provides a full-featured video player with custom controls,
 * playlist support, keyboard navigation, and WCAG accessibility compliance.
 *
 * @element gooeyui-videoplayer
 */
export default class VideoPlayer extends UIComponent {
    // Private fields
    #video;
    #controlsContainer;
    #videoContainer;
    #btnPlay;
    #btnPause;
    #btnStop;
    #btnRewind;
    #btnFastForward;
    #btnPrevious;
    #btnNext;
    #btnMute;
    #btnFullscreen;
    #progressBar;
    #volumeSlider;
    #timeCurrent;
    #timeTotal;
    #srAnnouncer;

    #tracks = [];
    #currentTrackIndex = 0;
    #isPlaying = false;
    #previousVolume = 1;
    #controlsFadeTimer = null;
    #stopTimeCheckInterval = null;

    // Construction guard: prevents parent constructor from calling private methods
    // before this class's private fields are initialized (ES6 private field timing issue)
    #constructed = false;

    // References for cleanup
    #trackObserver = null;
    #boundFullscreenChangeHandler = null;
    #boundWebkitFullscreenChangeHandler = null;

    static #CONTROLS_FADE_TIMEOUT = 5000;
    static #SKIP_SECONDS = 10;

    constructor() {
        super();

        // Activate template into shadow root
        Template.activate("ui-VideoPlayer", this.shadowRoot);

        // Query DOM elements
        this.#videoContainer = this.shadowRoot.querySelector(".video-container");
        this.#video = this.shadowRoot.querySelector(".video-element");
        this.#controlsContainer = this.shadowRoot.querySelector(".controls-container");

        // Control buttons
        this.#btnPlay = this.shadowRoot.querySelector(".btn-play");
        this.#btnPause = this.shadowRoot.querySelector(".btn-pause");
        this.#btnStop = this.shadowRoot.querySelector(".btn-stop");
        this.#btnRewind = this.shadowRoot.querySelector(".btn-rewind");
        this.#btnFastForward = this.shadowRoot.querySelector(".btn-fastforward");
        this.#btnPrevious = this.shadowRoot.querySelector(".btn-previous");
        this.#btnNext = this.shadowRoot.querySelector(".btn-next");
        this.#btnMute = this.shadowRoot.querySelector(".btn-mute");
        this.#btnFullscreen = this.shadowRoot.querySelector(".btn-fullscreen");

        // Sliders and displays
        this.#progressBar = this.shadowRoot.querySelector(".progress-bar");
        this.#volumeSlider = this.shadowRoot.querySelector(".volume-slider");
        this.#timeCurrent = this.shadowRoot.querySelector(".time-current");
        this.#timeTotal = this.shadowRoot.querySelector(".time-total");
        this.#srAnnouncer = this.shadowRoot.querySelector(".sr-announcer");

        // Register all valid events
        this.#registerEvents();

        // Set up event listeners
        this.#setupVideoEvents();
        this.#setupControlEvents();
        this.#setupKeyboardEvents();
        this.#setupFullscreenEvents();

        // Mark construction complete so setters can safely call private methods.
        this.#constructed = true;

        // Note: #initializeFromAttributes() deferred to connectedCallback per Custom Elements spec
    }

    connectedCallback() {
        super.connectedCallback?.();
        if (!this._videoPlayerInit) {
            this._videoPlayerInit = true;
            this.setAttribute('tabindex', '0');
            this.#initializeFromAttributes();
            this.#setupTrackObserver();
        }
    }

    // ========== Event Registration ==========

    #registerEvents() {
        // Playback State Events
        this.addValidEvent(VideoPlayerEvent.PLAY);
        this.addValidEvent(VideoPlayerEvent.PAUSE);
        this.addValidEvent(VideoPlayerEvent.STOP);
        this.addValidEvent(VideoPlayerEvent.ENDED);
        this.addValidEvent(VideoPlayerEvent.SEEKING);
        this.addValidEvent(VideoPlayerEvent.SEEKED);
        this.addValidEvent(VideoPlayerEvent.WAITING);
        this.addValidEvent(VideoPlayerEvent.PLAYING);
        this.addValidEvent(VideoPlayerEvent.STALLED);

        // Time Events
        this.addValidEvent(VideoPlayerEvent.TIMEUPDATE);
        this.addValidEvent(VideoPlayerEvent.DURATIONCHANGE);
        this.addValidEvent(VideoPlayerEvent.RATECHANGE);

        // Loading Events
        this.addValidEvent(VideoPlayerEvent.LOADSTART);
        this.addValidEvent(VideoPlayerEvent.LOADEDDATA);
        this.addValidEvent(VideoPlayerEvent.LOADEDMETADATA);
        this.addValidEvent(VideoPlayerEvent.CANPLAY);
        this.addValidEvent(VideoPlayerEvent.CANPLAYTHROUGH);
        this.addValidEvent(VideoPlayerEvent.PROGRESS);
        this.addValidEvent(VideoPlayerEvent.SUSPEND);
        this.addValidEvent(VideoPlayerEvent.ABORT);
        this.addValidEvent(VideoPlayerEvent.ERROR);
        this.addValidEvent(VideoPlayerEvent.EMPTIED);

        // Volume Events
        this.addValidEvent(VideoPlayerEvent.VOLUMECHANGE);
        this.addValidEvent(VideoPlayerEvent.MUTE);
        this.addValidEvent(VideoPlayerEvent.UNMUTE);

        // Track Events
        this.addValidEvent(VideoPlayerEvent.TRACKCHANGE);
        this.addValidEvent(VideoPlayerEvent.TRACKENDED);
        this.addValidEvent(VideoPlayerEvent.PLAYLISTLOADED);
        this.addValidEvent(VideoPlayerEvent.PLAYLISTENDED);

        // Fullscreen Events
        this.addValidEvent(VideoPlayerEvent.ENTERFULLSCREEN);
        this.addValidEvent(VideoPlayerEvent.EXITFULLSCREEN);
    }

    // ========== Video Events ==========

    #setupVideoEvents() {
        const videoEvents = [
            'play', 'pause', 'ended', 'seeking', 'seeked', 'waiting',
            'playing', 'stalled', 'loadstart', 'loadeddata', 'loadedmetadata',
            'canplay', 'canplaythrough', 'progress', 'suspend', 'abort',
            'error', 'emptied', 'durationchange', 'ratechange', 'volumechange'
        ];

        videoEvents.forEach(eventName => {
            this.#video.addEventListener(eventName, (e) => {
                this.#handleVideoEvent(eventName, e);
            });
        });

        // Time update for progress bar
        this.#video.addEventListener('timeupdate', () => {
            this.#updateProgressBar();
            this.#updateTimeDisplay();
            this.#checkStopTime();
            this.fireEvent(VideoPlayerEvent.TIMEUPDATE, {
                currentTime: this.currentTime,
                duration: this.duration
            });
        });

        // Handle video end
        this.#video.addEventListener('ended', () => {
            this.#handleTrackEnded();
        });
    }

    #handleVideoEvent(eventName, nativeEvent) {
        const eventMap = {
            'play': VideoPlayerEvent.PLAY,
            'pause': VideoPlayerEvent.PAUSE,
            'ended': VideoPlayerEvent.ENDED,
            'seeking': VideoPlayerEvent.SEEKING,
            'seeked': VideoPlayerEvent.SEEKED,
            'waiting': VideoPlayerEvent.WAITING,
            'playing': VideoPlayerEvent.PLAYING,
            'stalled': VideoPlayerEvent.STALLED,
            'loadstart': VideoPlayerEvent.LOADSTART,
            'loadeddata': VideoPlayerEvent.LOADEDDATA,
            'loadedmetadata': VideoPlayerEvent.LOADEDMETADATA,
            'canplay': VideoPlayerEvent.CANPLAY,
            'canplaythrough': VideoPlayerEvent.CANPLAYTHROUGH,
            'progress': VideoPlayerEvent.PROGRESS,
            'suspend': VideoPlayerEvent.SUSPEND,
            'abort': VideoPlayerEvent.ABORT,
            'error': VideoPlayerEvent.ERROR,
            'emptied': VideoPlayerEvent.EMPTIED,
            'durationchange': VideoPlayerEvent.DURATIONCHANGE,
            'ratechange': VideoPlayerEvent.RATECHANGE,
            'volumechange': VideoPlayerEvent.VOLUMECHANGE
        };

        const gooeyEvent = eventMap[eventName];
        if (gooeyEvent) {
            this.fireEvent(gooeyEvent, {
                currentTime: this.currentTime,
                duration: this.duration,
                nativeEvent
            });
        }

        // Update UI state
        if (eventName === 'play') {
            this.#isPlaying = true;
            this.#updatePlayPauseButtons();
            this.#announce('Playing');
        } else if (eventName === 'pause') {
            this.#isPlaying = false;
            this.#updatePlayPauseButtons();
            this.#announce('Paused');
        } else if (eventName === 'loadedmetadata') {
            this.#updateTimeDisplay();
            this.#applyTrackSettings();
        } else if (eventName === 'volumechange') {
            this.#updateVolumeUI();
        }
    }

    #handleTrackEnded() {
        this.fireEvent(VideoPlayerEvent.TRACKENDED, {
            trackIndex: this.#currentTrackIndex
        });

        // Check if there's a next track
        if (this.#currentTrackIndex < this.#tracks.length - 1) {
            this.nextTrack();
        } else if (this.loop) {
            // Loop back to first track
            this.goToTrack(0);
            this.play();
        } else {
            this.fireEvent(VideoPlayerEvent.PLAYLISTENDED, {});
        }
    }

    // ========== Control Events ==========

    #setupControlEvents() {
        // Play button
        this.#btnPlay.addEventListener('click', () => this.play());

        // Pause button
        this.#btnPause.addEventListener('click', () => this.pause());

        // Stop button
        this.#btnStop.addEventListener('click', () => this.stop());

        // Rewind button
        this.#btnRewind.addEventListener('click', () => this.rewind());

        // Fast forward button
        this.#btnFastForward.addEventListener('click', () => this.fastForward());

        // Previous track button
        this.#btnPrevious.addEventListener('click', () => this.previousTrack());

        // Next track button
        this.#btnNext.addEventListener('click', () => this.nextTrack());

        // Mute button
        this.#btnMute.addEventListener('click', () => this.toggleMute());

        // Fullscreen button
        this.#btnFullscreen.addEventListener('click', () => this.toggleFullscreen());

        // Progress bar
        this.#progressBar.addEventListener('input', (e) => {
            const percent = parseFloat(e.target.value);
            const time = (percent / 100) * this.duration;
            this.seek(time);
        });

        // Volume slider
        this.#volumeSlider.addEventListener('input', (e) => {
            this.volume = parseFloat(e.target.value) / 100;
        });
    }

    // ========== Keyboard Events ==========

    #setupKeyboardEvents() {
        // Use native listener to get the actual DOM event object
        HTMLElement.prototype.addEventListener.call(this, 'keydown', (e) => this.#handleKeyboard(e));
        // Note: tabindex set in connectedCallback per Custom Elements spec
    }

    #handleKeyboard(event) {
        if (this.disablekb) return;

        switch (event.key) {
            case ' ':
                event.preventDefault();
                this.togglePlayPause();
                break;
            case 'ArrowLeft':
                event.preventDefault();
                this.seek(this.currentTime - 5);
                break;
            case 'ArrowRight':
                event.preventDefault();
                this.seek(this.currentTime + 5);
                break;
            case 'ArrowUp':
                event.preventDefault();
                this.volume = Math.min(1, this.volume + 0.1);
                this.#announce(`Volume ${Math.round(this.volume * 100)} percent`);
                break;
            case 'ArrowDown':
                event.preventDefault();
                this.volume = Math.max(0, this.volume - 0.1);
                this.#announce(`Volume ${Math.round(this.volume * 100)} percent`);
                break;
            case 'm':
            case 'M':
                this.toggleMute();
                break;
            case 'f':
            case 'F':
                this.toggleFullscreen();
                break;
            default:
                if (/^[0-9]$/.test(event.key)) {
                    const percent = parseInt(event.key) / 10;
                    this.seek(this.duration * percent);
                }
        }
    }

    // ========== Fullscreen Events ==========

    #setupFullscreenEvents() {
        // Mouse movement shows controls in fullscreen
        this.#videoContainer.addEventListener('mousemove', () => {
            if (this.isFullscreen) {
                this.#showControls();
                this.#resetControlsFadeTimer();
            }
        });

        this.#videoContainer.addEventListener('mouseleave', () => {
            if (this.isFullscreen && this.#isPlaying) {
                this.#startControlsFadeTimer();
            }
        });

        // Handle fullscreen change - store bound handlers for cleanup
        this.#boundFullscreenChangeHandler = () => this.#handleFullscreenChange();
        this.#boundWebkitFullscreenChangeHandler = () => this.#handleFullscreenChange();
        document.addEventListener('fullscreenchange', this.#boundFullscreenChangeHandler);
        document.addEventListener('webkitfullscreenchange', this.#boundWebkitFullscreenChangeHandler);
    }

    #handleFullscreenChange() {
        const isFs = this.isFullscreen;
        if (isFs) {
            this.setAttribute('fullscreen', '');
            this.fireEvent(VideoPlayerEvent.ENTERFULLSCREEN, {});
            this.#btnFullscreen.setAttribute('aria-label', 'Exit fullscreen');
            this.#btnFullscreen.setAttribute('title', 'Exit fullscreen');
        } else {
            this.removeAttribute('fullscreen');
            this.fireEvent(VideoPlayerEvent.EXITFULLSCREEN, {});
            this.#btnFullscreen.setAttribute('aria-label', 'Enter fullscreen');
            this.#btnFullscreen.setAttribute('title', 'Fullscreen');
            this.#showControls();
            clearTimeout(this.#controlsFadeTimer);
        }
    }

    #showControls() {
        this.#controlsContainer.classList.remove('hidden');
        this.#controlsContainer.classList.add('visible');
    }

    #hideControls() {
        this.#controlsContainer.classList.remove('visible');
        this.#controlsContainer.classList.add('hidden');
    }

    #resetControlsFadeTimer() {
        clearTimeout(this.#controlsFadeTimer);
        this.#startControlsFadeTimer();
    }

    #startControlsFadeTimer() {
        this.#controlsFadeTimer = setTimeout(() => {
            if (this.isFullscreen && this.#isPlaying) {
                this.#hideControls();
            }
        }, VideoPlayer.#CONTROLS_FADE_TIMEOUT);
    }

    // ========== Track Observer ==========

    #setupTrackObserver() {
        this.#trackObserver = new MutationObserver((mutations) => {
            let tracksChanged = false;
            for (const mutation of mutations) {
                if (mutation.type === 'childList') {
                    for (const node of [...mutation.addedNodes, ...mutation.removedNodes]) {
                        if (node.tagName?.toLowerCase() === 'gooeyui-mediatrack') {
                            tracksChanged = true;
                            break;
                        }
                    }
                }
                if (tracksChanged) break;
            }
            if (tracksChanged && !this.playlist) {
                this.#loadTracksFromChildren();
            }
        });

        this.#trackObserver.observe(this, { childList: true });

        // Initial load
        if (!this.playlist) {
            this.#loadTracksFromChildren();
        }
    }

    #loadTracksFromChildren() {
        const trackElements = this.querySelectorAll('gooeyui-mediatrack');
        this.#tracks = Array.from(trackElements).map(track => ({
            src: track.getAttribute('src'),
            starttime: parseFloat(track.getAttribute('starttime')) || 0,
            stoptime: track.getAttribute('stoptime') ? parseFloat(track.getAttribute('stoptime')) : null,
            speed: track.getAttribute('speed') ? parseFloat(track.getAttribute('speed')) : null,
            title: track.getAttribute('title') || ''
        })).filter(t => t.src);

        this.#updateTrackNavigationButtons();

        // Load first track if available
        if (this.#tracks.length > 0 && !this.#video.src) {
            this.#loadTrack(0);
        }
    }

    // ========== Attribute Initialization ==========

    #initializeFromAttributes() {
        // Size
        if (this.hasAttribute('width')) {
            this.width = this.getAttribute('width');
        }
        if (this.hasAttribute('height')) {
            this.height = this.getAttribute('height');
        }

        // Poster
        if (this.hasAttribute('poster')) {
            this.#video.poster = this.getAttribute('poster');
        }

        // Volume
        if (this.hasAttribute('volume')) {
            this.volume = parseFloat(this.getAttribute('volume'));
        } else {
            this.volume = 1;
        }

        // Muted
        if (this.hasAttribute('muted')) {
            this.muted = true;
        }

        // Speed
        if (this.hasAttribute('speed')) {
            this.playbackRate = parseFloat(this.getAttribute('speed'));
        }

        // Playlist
        if (this.hasAttribute('playlist')) {
            this.loadPlaylist(this.getAttribute('playlist'));
        } else if (this.hasAttribute('src')) {
            // Single source
            this.#tracks = [{
                src: this.getAttribute('src'),
                starttime: 0,
                stoptime: null,
                speed: null,
                title: ''
            }];
            this.#loadTrack(0);
        }

        // Autoplay
        if (this.hasAttribute('autoplay')) {
            this.#video.addEventListener('canplay', () => {
                if (this.hasAttribute('autoplay')) {
                    this.play();
                }
            }, { once: true });
        }
    }

    // ========== Attribute Changed Callback ==========

    attributeChangedCallback(name, oldValue, newValue) {
        super.attributeChangedCallback?.(name, oldValue, newValue);

        switch (name) {
            case 'width':
                this.#applyDimension('width', newValue);
                break;
            case 'height':
                this.#applyDimension('height', newValue);
                break;
            case 'poster':
                this.#video.poster = newValue || '';
                break;
            case 'muted':
                this.#video.muted = newValue !== null;
                this.#updateMuteButton();
                break;
            case 'volume':
                if (newValue !== null) {
                    this.#video.volume = Math.max(0, Math.min(1, parseFloat(newValue)));
                }
                break;
            case 'speed':
                if (newValue !== null) {
                    this.#video.playbackRate = Math.max(0.25, Math.min(4, parseFloat(newValue)));
                }
                break;
            case 'playlist':
                if (newValue) {
                    this.loadPlaylist(newValue);
                }
                break;
            case 'src':
                if (newValue && !this.hasAttribute('playlist')) {
                    this.#tracks = [{
                        src: newValue,
                        starttime: 0,
                        stoptime: null,
                        speed: null,
                        title: ''
                    }];
                    this.#loadTrack(0);
                }
                break;
            case 'controls':
                // Handled by CSS
                break;
        }
    }

    disconnectedCallback() {
        // Clean up global event listeners
        if (this.#boundFullscreenChangeHandler) {
            document.removeEventListener('fullscreenchange', this.#boundFullscreenChangeHandler);
            this.#boundFullscreenChangeHandler = null;
        }
        if (this.#boundWebkitFullscreenChangeHandler) {
            document.removeEventListener('webkitfullscreenchange', this.#boundWebkitFullscreenChangeHandler);
            this.#boundWebkitFullscreenChangeHandler = null;
        }

        // Disconnect mutation observer
        if (this.#trackObserver) {
            this.#trackObserver.disconnect();
            this.#trackObserver = null;
        }

        // Clear timers
        if (this.#controlsFadeTimer) {
            clearTimeout(this.#controlsFadeTimer);
            this.#controlsFadeTimer = null;
        }
        if (this.#stopTimeCheckInterval) {
            clearInterval(this.#stopTimeCheckInterval);
            this.#stopTimeCheckInterval = null;
        }

        // Call parent disconnectedCallback if it exists
        if (super.disconnectedCallback) {
            super.disconnectedCallback();
        }
    }

    #applyDimension(prop, value) {
        if (value === null || value === undefined) return;

        if (typeof value === 'number' || /^\d+$/.test(value)) {
            this.style[prop] = `${value}px`;
        } else {
            this.style[prop] = value;
        }
    }

    // ========== Playback Control Methods ==========

    /**
     * Start playback
     * @returns {Promise<void>}
     */
    async play() {
        try {
            await this.#video.play();
        } catch (error) {
            Logger.error({ code: "VIDEO_PLAY_FAILED", err: error }, "VideoPlayer: Play failed");
            this.fireEvent(VideoPlayerEvent.ERROR, { error });
        }
    }

    /**
     * Pause playback
     */
    pause() {
        this.#video.pause();
    }

    /**
     * Stop playback and reset to beginning
     */
    stop() {
        this.#video.pause();
        this.#video.currentTime = this.#getCurrentTrack()?.starttime || 0;
        this.#isPlaying = false;
        this.#updatePlayPauseButtons();
        this.#updateProgressBar();
        this.#updateTimeDisplay();
        this.fireEvent(VideoPlayerEvent.STOP, {});
        this.#announce('Stopped');
    }

    /**
     * Toggle between play and pause
     */
    togglePlayPause() {
        if (this.#isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

    /**
     * Seek to specific time
     * @param {number} seconds - Time in seconds
     */
    seek(seconds) {
        const track = this.#getCurrentTrack();
        const minTime = track?.starttime || 0;
        const maxTime = track?.stoptime || this.duration;

        this.#video.currentTime = Math.max(minTime, Math.min(maxTime, seconds));
    }

    /**
     * Skip forward by specified seconds
     * @param {number} seconds - Seconds to skip (default: 10)
     */
    fastForward(seconds = VideoPlayer.#SKIP_SECONDS) {
        this.seek(this.currentTime + seconds);
    }

    /**
     * Skip backward by specified seconds
     * @param {number} seconds - Seconds to skip (default: 10)
     */
    rewind(seconds = VideoPlayer.#SKIP_SECONDS) {
        this.seek(this.currentTime - seconds);
    }

    // ========== Track Navigation Methods ==========

    /**
     * Play next track in playlist
     * @returns {boolean} Success status
     */
    nextTrack() {
        if (this.#currentTrackIndex < this.#tracks.length - 1) {
            this.#loadTrack(this.#currentTrackIndex + 1);
            this.play();
            return true;
        }
        return false;
    }

    /**
     * Play previous track in playlist
     * @returns {boolean} Success status
     */
    previousTrack() {
        if (this.#currentTrackIndex > 0) {
            this.#loadTrack(this.#currentTrackIndex - 1);
            this.play();
            return true;
        }
        return false;
    }

    /**
     * Jump to specific track by index
     * @param {number} index - Track index (0-based)
     */
    goToTrack(index) {
        if (index >= 0 && index < this.#tracks.length) {
            this.#loadTrack(index);
        }
    }

    #loadTrack(index) {
        if (index < 0 || index >= this.#tracks.length) return;

        const wasPlaying = this.#isPlaying;
        const track = this.#tracks[index];
        this.#currentTrackIndex = index;

        this.#video.src = track.src;
        this.#video.load();

        this.fireEvent(VideoPlayerEvent.TRACKCHANGE, {
            trackIndex: index,
            track
        });

        this.#updateTrackNavigationButtons();
        this.#announce(`Now playing: ${track.title || `Track ${index + 1}`}`);

        if (wasPlaying) {
            this.#video.addEventListener('canplay', () => this.play(), { once: true });
        }
    }

    #applyTrackSettings() {
        const track = this.#getCurrentTrack();
        if (!track) return;

        // Apply start time
        if (track.starttime > 0) {
            this.#video.currentTime = track.starttime;
        }

        // Apply speed (track speed overrides player speed)
        const speed = track.speed ?? this.speed ?? 1;
        this.#video.playbackRate = speed;
    }

    #checkStopTime() {
        const track = this.#getCurrentTrack();
        if (track?.stoptime && this.currentTime >= track.stoptime) {
            this.#handleTrackEnded();
        }
    }

    #getCurrentTrack() {
        return this.#tracks[this.#currentTrackIndex];
    }

    /**
     * Get current track index
     * @returns {number}
     */
    get currentTrackIndex() {
        return this.#currentTrackIndex;
    }

    /**
     * Get total track count
     * @returns {number}
     */
    get trackCount() {
        return this.#tracks.length;
    }

    /**
     * Get all tracks
     * @returns {Array<{src: string, starttime: number, stoptime: number|null, speed: number|null, title: string}>}
     */
    getTracks() {
        return [...this.#tracks];
    }

    // ========== Volume Control Methods ==========

    /**
     * Get volume level
     * @returns {number}
     */
    get volume() {
        return this.#video.volume;
    }

    /**
     * Set volume level
     * @param {number} level - Volume (0.0 to 1.0)
     */
    set volume(level) {
        const clamped = Math.max(0, Math.min(1, level));
        this.#video.volume = clamped;
        this.setAttribute('volume', String(clamped));
        this.#updateVolumeUI();
    }

    /**
     * Mute audio
     */
    mute() {
        if (!this.#video.muted) {
            this.#previousVolume = this.#video.volume;
            this.#video.muted = true;
            this.setAttribute('muted', '');
            this.fireEvent(VideoPlayerEvent.MUTE, {});
            this.#announce('Muted');
        }
    }

    /**
     * Unmute audio
     */
    unmute() {
        if (this.#video.muted) {
            this.#video.muted = false;
            this.removeAttribute('muted');
            this.fireEvent(VideoPlayerEvent.UNMUTE, {});
            this.#announce('Unmuted');
        }
    }

    /**
     * Toggle mute state
     */
    toggleMute() {
        if (this.#video.muted) {
            this.unmute();
        } else {
            this.mute();
        }
    }

    /**
     * Check if muted
     * @returns {boolean}
     */
    get muted() {
        return this.#video.muted;
    }

    /**
     * Set muted state
     * @param {boolean} val
     */
    set muted(val) {
        if (val) {
            this.mute();
        } else {
            this.unmute();
        }
    }

    // ========== Playback Properties ==========

    /**
     * Get current playback time
     * @returns {number}
     */
    get currentTime() {
        return this.#video.currentTime;
    }

    /**
     * Set current playback time
     * @param {number} val
     */
    set currentTime(val) {
        this.seek(val);
    }

    /**
     * Get total duration
     * @returns {number}
     */
    get duration() {
        return this.#video.duration || 0;
    }

    /**
     * Get playback speed
     * @returns {number}
     */
    get playbackRate() {
        return this.#video.playbackRate;
    }

    /**
     * Set playback speed
     * @param {number} val
     */
    set playbackRate(val) {
        const clamped = Math.max(0.25, Math.min(4, val));
        this.#video.playbackRate = clamped;
        this.setAttribute('speed', String(clamped));
    }

    /**
     * Get speed attribute value
     * @returns {number}
     */
    get speed() {
        const val = this.getAttribute('speed');
        return val !== null ? parseFloat(val) : 1;
    }

    /**
     * Set speed attribute
     * @param {number} val
     */
    set speed(val) {
        this.playbackRate = val;
    }

    /**
     * Check if currently playing
     * @returns {boolean}
     */
    get playing() {
        return this.#isPlaying;
    }

    /**
     * Check if paused
     * @returns {boolean}
     */
    get paused() {
        return this.#video.paused;
    }

    /**
     * Check if ended
     * @returns {boolean}
     */
    get ended() {
        return this.#video.ended;
    }

    /**
     * Get buffered time ranges
     * @returns {TimeRanges}
     */
    get buffered() {
        return this.#video.buffered;
    }

    /**
     * Get loop attribute
     * @returns {boolean}
     */
    get loop() {
        return this.hasAttribute('loop');
    }

    /**
     * Set loop attribute
     * @param {boolean} val
     */
    set loop(val) {
        if (val) {
            this.setAttribute('loop', '');
        } else {
            this.removeAttribute('loop');
        }
    }

    /**
     * Get disablekb attribute
     * @returns {boolean}
     */
    get disablekb() {
        return this.hasAttribute('disablekb');
    }

    /**
     * Set disablekb attribute
     * @param {boolean} val
     */
    set disablekb(val) {
        if (val) {
            this.setAttribute('disablekb', '');
        } else {
            this.removeAttribute('disablekb');
        }
    }

    // ========== Fullscreen Methods ==========

    /**
     * Enter fullscreen mode
     * @returns {Promise<void>}
     */
    async enterFullscreen() {
        try {
            if (this.#videoContainer.requestFullscreen) {
                await this.#videoContainer.requestFullscreen();
            } else if (this.#videoContainer.webkitRequestFullscreen) {
                await this.#videoContainer.webkitRequestFullscreen();
            }
        } catch (error) {
            Logger.error({ code: "VIDEO_FULLSCREEN_REQUEST_FAILED", err: error }, "VideoPlayer: Fullscreen request failed");
        }
    }

    /**
     * Exit fullscreen mode
     * @returns {Promise<void>}
     */
    async exitFullscreen() {
        try {
            if (document.exitFullscreen) {
                await document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                await document.webkitExitFullscreen();
            }
        } catch (error) {
            Logger.error({ code: "VIDEO_EXIT_FULLSCREEN_FAILED", err: error }, "VideoPlayer: Exit fullscreen failed");
        }
    }

    /**
     * Toggle fullscreen mode
     */
    toggleFullscreen() {
        if (this.isFullscreen) {
            this.exitFullscreen();
        } else {
            this.enterFullscreen();
        }
    }

    /**
     * Check if in fullscreen
     * @returns {boolean}
     */
    get isFullscreen() {
        return document.fullscreenElement === this.#videoContainer ||
               document.webkitFullscreenElement === this.#videoContainer;
    }

    // ========== Playlist Methods ==========

    /**
     * Load playlist from URL
     * @param {string} url - Playlist URL (m3u, pls, xspf)
     * @returns {Promise<void>}
     */
    async loadPlaylist(url) {
        try {
            const tracks = await PlaylistParser.parse(url);
            this.#tracks = tracks.map(t => ({
                src: t.src,
                starttime: 0,
                stoptime: null,
                speed: null,
                title: t.title || ''
            }));

            this.#currentTrackIndex = 0;
            this.#updateTrackNavigationButtons();

            this.fireEvent(VideoPlayerEvent.PLAYLISTLOADED, {
                tracks: this.#tracks,
                count: this.#tracks.length
            });

            if (this.#tracks.length > 0) {
                this.#loadTrack(0);
            }
        } catch (error) {
            Logger.error({ code: "VIDEO_PLAYLIST_LOAD_FAILED", err: error }, "VideoPlayer: Failed to load playlist");
            this.fireEvent(VideoPlayerEvent.ERROR, { error });
        }
    }

    /**
     * Set tracks programmatically
     * @param {Array<{src: string, starttime?: number, stoptime?: number, speed?: number, title?: string}>} tracks
     */
    setTracks(tracks) {
        this.#tracks = tracks.map(t => ({
            src: t.src,
            starttime: t.starttime || 0,
            stoptime: t.stoptime || null,
            speed: t.speed || null,
            title: t.title || ''
        }));

        this.#currentTrackIndex = 0;
        this.#updateTrackNavigationButtons();

        if (this.#tracks.length > 0) {
            this.#loadTrack(0);
        }
    }

    /**
     * Add track to playlist
     * @param {Object} track - Track configuration
     * @param {number} index - Insert position (default: end)
     */
    addTrack(track, index = this.#tracks.length) {
        const normalizedTrack = {
            src: track.src,
            starttime: track.starttime || 0,
            stoptime: track.stoptime || null,
            speed: track.speed || null,
            title: track.title || ''
        };

        this.#tracks.splice(index, 0, normalizedTrack);
        this.#updateTrackNavigationButtons();
    }

    /**
     * Remove track from playlist
     * @param {number} index - Track index
     */
    removeTrack(index) {
        if (index >= 0 && index < this.#tracks.length) {
            this.#tracks.splice(index, 1);

            // Adjust current index if needed
            if (this.#currentTrackIndex >= this.#tracks.length) {
                this.#currentTrackIndex = Math.max(0, this.#tracks.length - 1);
            }

            this.#updateTrackNavigationButtons();
        }
    }

    /**
     * Clear all tracks
     */
    clearTracks() {
        this.#tracks = [];
        this.#currentTrackIndex = 0;
        this.#video.src = '';
        this.#updateTrackNavigationButtons();
    }

    // ========== UI Update Methods ==========

    #updatePlayPauseButtons() {
        if (this.#isPlaying) {
            this.#btnPlay.hidden = true;
            this.#btnPause.hidden = false;
        } else {
            this.#btnPlay.hidden = false;
            this.#btnPause.hidden = true;
        }
    }

    #updateProgressBar() {
        if (this.duration > 0) {
            const percent = (this.currentTime / this.duration) * 100;
            this.#progressBar.value = percent;
            this.#progressBar.setAttribute('aria-valuenow', Math.round(percent));
            this.#progressBar.setAttribute('aria-valuetext',
                `${this.#formatTime(this.currentTime)} of ${this.#formatTime(this.duration)}`);
        }
    }

    #updateTimeDisplay() {
        this.#timeCurrent.textContent = this.#formatTime(this.currentTime);
        this.#timeTotal.textContent = this.#formatTime(this.duration);
    }

    #updateVolumeUI() {
        const volumePercent = Math.round(this.#video.volume * 100);
        this.#volumeSlider.value = volumePercent;
        this.#volumeSlider.setAttribute('aria-valuenow', volumePercent);
        this.#volumeSlider.setAttribute('aria-valuetext', `${volumePercent} percent`);
        this.#updateMuteButton();
    }

    #updateMuteButton() {
        const icon = this.#btnMute.querySelector('span');
        if (this.#video.muted || this.#video.volume === 0) {
            icon.className = 'icon-mute';
            this.#btnMute.setAttribute('aria-label', 'Unmute');
            this.#btnMute.setAttribute('title', 'Unmute');
        } else {
            icon.className = 'icon-volume';
            this.#btnMute.setAttribute('aria-label', 'Mute');
            this.#btnMute.setAttribute('title', 'Mute');
        }
    }

    #updateTrackNavigationButtons() {
        const hasMultipleTracks = this.#tracks.length > 1;

        // Show/hide navigation buttons
        this.#btnPrevious.hidden = !hasMultipleTracks;
        this.#btnNext.hidden = !hasMultipleTracks;

        // Enable/disable based on position
        this.#btnPrevious.disabled = this.#currentTrackIndex === 0;
        this.#btnNext.disabled = this.#currentTrackIndex >= this.#tracks.length - 1;
    }

    #formatTime(seconds) {
        if (!isFinite(seconds) || isNaN(seconds)) {
            return '0:00';
        }

        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    // ========== Accessibility ==========

    #announce(message) {
        this.#srAnnouncer.textContent = message;
        setTimeout(() => {
            this.#srAnnouncer.textContent = '';
        }, 1000);
    }

    // ========== Dimension Properties ==========

    get width() {
        return this.getAttribute('width');
    }

    set width(val) {
        this.setAttribute('width', val);
        try {
            if (this.#constructed) this.#applyDimension('width', val);
        } catch (e) {
            // Private fields not yet initialized - ignore
        }
    }

    get height() {
        return this.getAttribute('height');
    }

    set height(val) {
        this.setAttribute('height', val);
        try {
            if (this.#constructed) this.#applyDimension('height', val);
        } catch (e) {
            // Private fields not yet initialized - ignore
        }
    }

    // ========== Poster Property ==========

    get poster() {
        return this.getAttribute('poster');
    }

    set poster(val) {
        if (val) {
            this.setAttribute('poster', val);
            this.#video.poster = val;
        } else {
            this.removeAttribute('poster');
            this.#video.poster = '';
        }
    }

    // ========== Playlist Property ==========

    get playlist() {
        return this.getAttribute('playlist');
    }

    set playlist(val) {
        if (val) {
            this.setAttribute('playlist', val);
            this.loadPlaylist(val);
        } else {
            this.removeAttribute('playlist');
        }
    }
}
