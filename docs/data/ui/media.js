const mediaCategory = {
  "name": "media",
  "elements": [
    {
      "name": "VideoPlayer",
      "tagName": "gooeyui-videoplayer",
      "description": "A full-featured video player with custom controls, playlist support, keyboard navigation, and WCAG accessibility compliance. Supports multiple video sources via child MediaTrack elements or external playlist files (M3U, PLS, XSPF). Features include play/pause, stop, rewind, fast-forward, volume control, mute, fullscreen, and track navigation. Controls automatically fade in fullscreen mode after mouse inactivity.",
      "inherits": [
        "UIComponent"
      ],
      "attributes": [
        {
          "name": "src",
          "type": "STRING",
          "description": "URL to a single video source. Ignored when playlist is set or MediaTrack children are present.",
          "required": false
        },
        {
          "name": "poster",
          "type": "STRING",
          "description": "URL to an image displayed before the video plays.",
          "required": false
        },
        {
          "name": "autoplay",
          "type": "BOOLEAN",
          "description": "When true, video starts playing automatically when loaded.",
          "required": false
        },
        {
          "name": "controls",
          "type": "ENUM",
          "values": [
            "full",
            "compact",
            "none"
          ],
          "description": "Controls layout: 'full' shows all controls, 'compact' shows minimal controls, 'none' hides built-in controls.",
          "required": false
        },
        {
          "name": "loop",
          "type": "BOOLEAN",
          "description": "When true, restarts from the first track after the last track ends.",
          "required": false
        },
        {
          "name": "muted",
          "type": "BOOLEAN",
          "description": "When true, audio is muted.",
          "required": false
        },
        {
          "name": "volume",
          "type": "NUMBER",
          "description": "Volume level from 0.0 (silent) to 1.0 (full volume).",
          "required": false
        },
        {
          "name": "speed",
          "type": "NUMBER",
          "description": "Playback speed from 0.25 to 4.0, where 1.0 is normal speed.",
          "required": false
        },
        {
          "name": "playlist",
          "type": "STRING",
          "description": "URL to a playlist file (M3U, PLS, or XSPF format). When set, MediaTrack children are ignored.",
          "required": false
        },
        {
          "name": "controlbar",
          "type": "STRING",
          "description": "ID reference to an external gooeyui-toolbar. Only used when controls='none'.",
          "required": false
        },
        {
          "name": "disablekb",
          "type": "BOOLEAN",
          "description": "When true, keyboard controls are disabled.",
          "required": false
        },
        {
          "name": "fullscreen",
          "type": "BOOLEAN",
          "description": "Reflects whether the player is in fullscreen mode.",
          "required": false
        }
      ],
      "examples": [
        {
          "title": "Basic Video Player",
          "description": "A simple video player with a single video source.",
          "code": "<gooey-component href=\"GooeyJS/src/gooey/ui/media/VideoPlayer\"></gooey-component>\n\n<gooeyui-videoplayer\n    width=\"800\"\n    height=\"450\"\n    src=\"video.mp4\"\n    poster=\"thumbnail.jpg\">\n</gooeyui-videoplayer>"
        },
        {
          "title": "Multiple Tracks",
          "description": "A video player with multiple tracks defined as child elements.",
          "code": "<gooey-component href=\"GooeyJS/src/gooey/ui/media/VideoPlayer\"></gooey-component>\n<gooey-component href=\"GooeyJS/src/gooey/ui/media/MediaTrack\"></gooey-component>\n\n<gooeyui-videoplayer width=\"100%\" height=\"56.25%\" controls=\"full\" loop>\n    <gooeyui-mediatrack src=\"intro.mp4\" title=\"Introduction\"></gooeyui-mediatrack>\n    <gooeyui-mediatrack src=\"chapter1.mp4\" title=\"Chapter 1\" starttime=\"0\" stoptime=\"300\"></gooeyui-mediatrack>\n    <gooeyui-mediatrack src=\"chapter2.mp4\" title=\"Chapter 2\" speed=\"0.75\"></gooeyui-mediatrack>\n</gooeyui-videoplayer>"
        },
        {
          "title": "Playlist Video Player",
          "description": "A video player loading tracks from an M3U playlist file.",
          "code": "<gooey-component href=\"GooeyJS/src/gooey/ui/media/VideoPlayer\"></gooey-component>\n\n<gooeyui-videoplayer\n    width=\"640\"\n    height=\"360\"\n    playlist=\"videos.m3u\"\n    loop>\n</gooeyui-videoplayer>"
        },
        {
          "title": "Autoplay with Muted Audio",
          "description": "A video that starts automatically (muted to comply with browser policies).",
          "code": "<gooeyui-videoplayer\n    width=\"800\"\n    height=\"450\"\n    src=\"promo.mp4\"\n    poster=\"thumbnail.jpg\"\n    autoplay\n    muted>\n</gooeyui-videoplayer>"
        },
        {
          "title": "Compact Controls",
          "description": "A video player with minimal controls for embedded scenarios.",
          "code": "<gooeyui-videoplayer\n    width=\"400\"\n    height=\"225\"\n    src=\"clip.mp4\"\n    controls=\"compact\">\n</gooeyui-videoplayer>"
        },
        {
          "title": "JavaScript API Usage",
          "description": "Controlling the video player programmatically.",
          "code": "<gooeyui-videoplayer id=\"myPlayer\" width=\"800\" height=\"450\" src=\"video.mp4\"></gooeyui-videoplayer>\n\n<script>\n  const player = document.getElementById('myPlayer');\n  \n  // Event listeners\n  player.addEventListener('play', () => console.log('Playing'));\n  player.addEventListener('pause', () => console.log('Paused'));\n  player.addEventListener('trackchange', (e) => {\n    console.log('Now playing track', e.detail.trackIndex);\n  });\n  \n  // Playback control\n  player.play();\n  player.pause();\n  player.seek(120); // Jump to 2 minutes\n  player.volume = 0.5; // 50% volume\n  \n  // Track navigation\n  player.nextTrack();\n  player.previousTrack();\n  player.goToTrack(2);\n</script>"
        },
        {
          "title": "Keyboard Controls",
          "description": "VideoPlayer supports keyboard navigation when focused.",
          "code": "<!-- Keyboard shortcuts:\n  Space: Play/Pause\n  Left Arrow: Jump back 5 seconds\n  Right Arrow: Jump ahead 5 seconds\n  Up Arrow: Volume up 10%\n  Down Arrow: Volume down 10%\n  M: Toggle mute\n  F: Toggle fullscreen\n  0-9: Jump to 0%-90% of video\n-->\n\n<gooeyui-videoplayer\n    width=\"800\"\n    height=\"450\"\n    src=\"video.mp4\">\n</gooeyui-videoplayer>\n\n<!-- Disable keyboard controls -->\n<gooeyui-videoplayer\n    width=\"800\"\n    height=\"450\"\n    src=\"video.mp4\"\n    disablekb>\n</gooeyui-videoplayer>"
        }
      ]
    },
    {
      "name": "MediaTrack",
      "tagName": "gooeyui-mediatrack",
      "description": "A non-visual component representing a single video track within a VideoPlayer. Defines the video source URL and optional playback parameters like start time, stop time, and speed. MediaTrack elements must be children of a gooeyui-videoplayer element.",
      "inherits": [],
      "attributes": [
        {
          "name": "src",
          "type": "STRING",
          "description": "URL to the video file. Supports MP4, M4V, OGV, and WebM formats.",
          "required": true
        },
        {
          "name": "starttime",
          "type": "NUMBER",
          "description": "Start playback at this time in seconds. Default is 0.",
          "required": false
        },
        {
          "name": "stoptime",
          "type": "NUMBER",
          "description": "Stop playback at this time in seconds. If not specified, plays to end of video.",
          "required": false
        },
        {
          "name": "speed",
          "type": "NUMBER",
          "description": "Playback speed from 0.25 to 4.0. Overrides the parent VideoPlayer's speed setting.",
          "required": false
        },
        {
          "name": "title",
          "type": "STRING",
          "description": "MediaTrack title for accessibility and display purposes.",
          "required": false
        }
      ],
      "examples": [
        {
          "title": "Basic MediaTrack",
          "description": "A simple track with just a video source.",
          "code": "<gooeyui-videoplayer width=\"800\" height=\"450\">\n    <gooeyui-mediatrack src=\"video.mp4\"></gooeyui-mediatrack>\n</gooeyui-videoplayer>"
        },
        {
          "title": "MediaTrack with Title",
          "description": "A track with a descriptive title for accessibility.",
          "code": "<gooeyui-videoplayer width=\"800\" height=\"450\">\n    <gooeyui-mediatrack src=\"intro.mp4\" title=\"Introduction Video\"></gooeyui-mediatrack>\n    <gooeyui-mediatrack src=\"main.mp4\" title=\"Main Content\"></gooeyui-mediatrack>\n</gooeyui-videoplayer>"
        },
        {
          "title": "MediaTrack with Time Constraints",
          "description": "A track that plays only a specific segment of the video.",
          "code": "<gooeyui-videoplayer width=\"800\" height=\"450\">\n    <!-- Play only from 30 seconds to 2 minutes -->\n    <gooeyui-mediatrack\n        src=\"long-video.mp4\"\n        title=\"Highlight Clip\"\n        starttime=\"30\"\n        stoptime=\"120\">\n    </gooeyui-mediatrack>\n</gooeyui-videoplayer>"
        },
        {
          "title": "MediaTrack with Custom Speed",
          "description": "A track that plays at a slower speed for detailed viewing.",
          "code": "<gooeyui-videoplayer width=\"800\" height=\"450\">\n    <gooeyui-mediatrack src=\"intro.mp4\" title=\"Introduction\"></gooeyui-mediatrack>\n    <!-- Slow motion tutorial at 50% speed -->\n    <gooeyui-mediatrack\n        src=\"tutorial.mp4\"\n        title=\"Detailed Tutorial\"\n        speed=\"0.5\">\n    </gooeyui-mediatrack>\n    <gooeyui-mediatrack src=\"summary.mp4\" title=\"Summary\"></gooeyui-mediatrack>\n</gooeyui-videoplayer>"
        }
      ]
    }
  ]
};
