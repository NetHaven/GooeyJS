import Event from "../Event.js";

export default class VideoPlayerEvent extends Event {
    // Playback State Events
    static PLAY = "play";
    static PAUSE = "pause";
    static STOP = "stop";
    static ENDED = "ended";
    static SEEKING = "seeking";
    static SEEKED = "seeked";
    static WAITING = "waiting";
    static PLAYING = "playing";
    static STALLED = "stalled";

    // Time Events
    static TIMEUPDATE = "timeupdate";
    static DURATIONCHANGE = "durationchange";
    static RATECHANGE = "ratechange";

    // Loading Events
    static LOADSTART = "loadstart";
    static LOADEDDATA = "loadeddata";
    static LOADEDMETADATA = "loadedmetadata";
    static CANPLAY = "canplay";
    static CANPLAYTHROUGH = "canplaythrough";
    static PROGRESS = "progress";
    static SUSPEND = "suspend";
    static ABORT = "abort";
    static ERROR = "error";
    static EMPTIED = "emptied";

    // Volume Events
    static VOLUMECHANGE = "volumechange";
    static MUTE = "mute";
    static UNMUTE = "unmute";

    // Track Events
    static TRACKCHANGE = "trackchange";
    static TRACKENDED = "trackended";
    static PLAYLISTLOADED = "playlistloaded";
    static PLAYLISTENDED = "playlistended";

    // Fullscreen Events
    static ENTERFULLSCREEN = "enterfullscreen";
    static EXITFULLSCREEN = "exitfullscreen";

    constructor() {
        super();
    }
}
