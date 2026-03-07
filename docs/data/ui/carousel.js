const carouselCategory = {
  "name": "carousel",
  "elements": [
    {
      "name": "Carousel",
      "tagName": "gooeyui-carousel",
      "description": "A modular carousel component for cycling through content slides. Supports horizontal and vertical orientations, snap and free-scroll modes, multi-slide views, infinite looping, mouse and touch dragging, responsive breakpoints, and an extension module architecture for autoplay, keyboard navigation, lazy loading, and fade effects.",
      "inherits": [
        "UIComponent",
        "Container"
      ],
      "attributes": [
        {
          "name": "direction",
          "type": "ENUM",
          "values": [
            "HORIZONTAL",
            "VERTICAL"
          ],
          "description": "Slide orientation: horizontal (left-to-right) or vertical (top-to-bottom)",
          "required": false
        },
        {
          "name": "mode",
          "type": "ENUM",
          "values": [
            "SNAP",
            "FREE",
            "FREE-SNAP"
          ],
          "description": "Scrolling mode: snap for discrete positions, free for continuous drag, free-snap for free drag settling on nearest snap point",
          "required": false
        },
        {
          "name": "perpage",
          "type": "NUMBER",
          "description": "Number of slides visible at once (default: 1)",
          "required": false
        },
        {
          "name": "permove",
          "type": "NUMBER",
          "description": "Number of slides to advance per navigation action (default: 1)",
          "required": false
        },
        {
          "name": "startindex",
          "type": "NUMBER",
          "description": "Initial active slide index (default: 0)",
          "required": false
        },
        {
          "name": "gap",
          "type": "STRING",
          "description": "Space between slides as a CSS length value (default: '0px')",
          "required": false
        },
        {
          "name": "speed",
          "type": "NUMBER",
          "description": "Transition duration in milliseconds (default: 300)",
          "required": false
        },
        {
          "name": "easing",
          "type": "STRING",
          "description": "CSS easing function for slide transitions (default: 'ease')",
          "required": false
        },
        {
          "name": "loop",
          "type": "BOOLEAN",
          "description": "Enable seamless infinite scrolling by cloning edge slides",
          "required": false
        },
        {
          "name": "rewind",
          "type": "BOOLEAN",
          "description": "Snap back to first/last slide at boundaries instead of looping",
          "required": false
        },
        {
          "name": "mousedrag",
          "type": "BOOLEAN",
          "description": "Enable mouse pointer dragging on desktop (default: true)",
          "required": false
        },
        {
          "name": "touchdrag",
          "type": "BOOLEAN",
          "description": "Enable touch pointer dragging on touch devices (default: true)",
          "required": false
        },
        {
          "name": "dragthreshold",
          "type": "NUMBER",
          "description": "Minimum pixel distance before a drag engages (default: 10)",
          "required": false
        },
        {
          "name": "rubberband",
          "type": "BOOLEAN",
          "description": "Enable elastic overscroll at boundaries when not looping (default: true)",
          "required": false
        },
        {
          "name": "padding",
          "type": "STRING",
          "description": "Reveal partial adjacent slides via container padding (default: '0px')",
          "required": false
        },
        {
          "name": "arialabel",
          "type": "STRING",
          "description": "Accessible label for the carousel (default: 'Carousel')",
          "required": false
        },
        {
          "name": "arialabelledby",
          "type": "STRING",
          "description": "ID of element providing an accessible label for the carousel",
          "required": false
        },
        {
          "name": "announcetemplate",
          "type": "STRING",
          "description": "Template for screen reader slide announcements (default: 'Slide ${index} of ${total}')",
          "required": false
        },
        {
          "name": "liveregion",
          "type": "ENUM",
          "values": [
            "POLITE",
            "ASSERTIVE"
          ],
          "description": "ARIA live region politeness setting (default: polite)",
          "required": false
        },
        {
          "name": "modules",
          "type": "STRING",
          "description": "Comma-separated list of modules to load (e.g., 'autoplay, keyboard, effect-fade')",
          "required": false
        },
        {
          "name": "mobilefirst",
          "type": "BOOLEAN",
          "description": "Whether breakpoints use min-width (true) or max-width (false)",
          "required": false
        },
        {
          "name": "effect",
          "type": "ENUM",
          "values": [
            "SLIDE",
            "FADE"
          ],
          "description": "Transition effect: slide (default) or fade (requires EffectFade module)",
          "required": false
        },
        {
          "name": "syncwith",
          "type": "STRING",
          "description": "ID of another carousel to synchronize with",
          "required": false
        },
        {
          "name": "clicktoselect",
          "type": "BOOLEAN",
          "description": "Clicking a non-active slide navigates to it",
          "required": false
        }
      ],
      "examples": [
        {
          "title": "Basic Carousel",
          "description": "A simple carousel with three slides.",
          "code": "<gooey-component href=\"GooeyJS/src/gooey/ui/carousel/Carousel\"></gooey-component>\n<gooey-component href=\"GooeyJS/src/gooey/ui/carousel/CarouselSlide\"></gooey-component>\n<gooey-component href=\"GooeyJS/src/gooey/ui/carousel/CarouselNav\"></gooey-component>\n\n<gooeyui-carousel>\n    <gooeyui-carousel-slide>Slide 1</gooeyui-carousel-slide>\n    <gooeyui-carousel-slide>Slide 2</gooeyui-carousel-slide>\n    <gooeyui-carousel-slide>Slide 3</gooeyui-carousel-slide>\n    <gooeyui-carousel-nav type=\"arrows\"></gooeyui-carousel-nav>\n</gooeyui-carousel>"
        },
        {
          "title": "Looping Carousel",
          "description": "A carousel with infinite loop enabled and dot navigation.",
          "code": "<gooeyui-carousel loop speed=\"500\">\n    <gooeyui-carousel-slide>Slide 1</gooeyui-carousel-slide>\n    <gooeyui-carousel-slide>Slide 2</gooeyui-carousel-slide>\n    <gooeyui-carousel-slide>Slide 3</gooeyui-carousel-slide>\n    <gooeyui-carousel-slide>Slide 4</gooeyui-carousel-slide>\n    <gooeyui-carousel-nav type=\"dots\"></gooeyui-carousel-nav>\n</gooeyui-carousel>"
        },
        {
          "title": "Multi-Slide Carousel",
          "description": "A carousel showing multiple slides at once with a gap between them.",
          "code": "<gooeyui-carousel perpage=\"3\" permove=\"1\" gap=\"16px\">\n    <gooeyui-carousel-slide>Card 1</gooeyui-carousel-slide>\n    <gooeyui-carousel-slide>Card 2</gooeyui-carousel-slide>\n    <gooeyui-carousel-slide>Card 3</gooeyui-carousel-slide>\n    <gooeyui-carousel-slide>Card 4</gooeyui-carousel-slide>\n    <gooeyui-carousel-slide>Card 5</gooeyui-carousel-slide>\n    <gooeyui-carousel-nav type=\"arrows\"></gooeyui-carousel-nav>\n</gooeyui-carousel>"
        }
      ]
    },
    {
      "name": "CarouselSlide",
      "tagName": "gooeyui-carousel-slide",
      "description": "Individual slide wrapper for the Carousel component. Contains the content for a single slide. Placed as a direct child of a Carousel element.",
      "inherits": [
        "UIComponent"
      ],
      "attributes": [
        {
          "name": "active",
          "type": "BOOLEAN",
          "description": "Indicates whether this slide is the currently active/visible slide",
          "required": false
        },
        {
          "name": "data-autoplay",
          "type": "NUMBER",
          "description": "Per-slide autoplay duration override in milliseconds",
          "required": false
        }
      ],
      "examples": [
        {
          "title": "Slides in a Carousel",
          "description": "Multiple slides containing different content inside a carousel.",
          "code": "<gooeyui-carousel>\n    <gooeyui-carousel-slide>\n        <h2>Welcome</h2>\n        <p>First slide content</p>\n    </gooeyui-carousel-slide>\n    <gooeyui-carousel-slide>\n        <h2>Features</h2>\n        <p>Second slide content</p>\n    </gooeyui-carousel-slide>\n    <gooeyui-carousel-slide>\n        <h2>Get Started</h2>\n        <p>Third slide content</p>\n    </gooeyui-carousel-slide>\n</gooeyui-carousel>"
        }
      ]
    },
    {
      "name": "CarouselNav",
      "tagName": "gooeyui-carousel-nav",
      "description": "Configurable navigation chrome for the Carousel component. Renders arrows, dots, scrollbar, progress bar, thumbnail, or custom navigation controls. Placed as a child of a Carousel element.",
      "inherits": [
        "UIComponent"
      ],
      "attributes": [
        {
          "name": "type",
          "type": "ENUM",
          "values": [
            "ARROWS",
            "DOTS",
            "SCROLLBAR",
            "PROGRESS",
            "CUSTOM",
            "THUMBNAILS"
          ],
          "description": "Type of navigation control to render (default: arrows)",
          "required": false
        }
      ],
      "examples": [
        {
          "title": "Arrow Navigation",
          "description": "Carousel with arrow-based navigation controls.",
          "code": "<gooeyui-carousel>\n    <gooeyui-carousel-slide>Slide 1</gooeyui-carousel-slide>\n    <gooeyui-carousel-slide>Slide 2</gooeyui-carousel-slide>\n    <gooeyui-carousel-nav type=\"arrows\"></gooeyui-carousel-nav>\n</gooeyui-carousel>"
        },
        {
          "title": "Dot Navigation",
          "description": "Carousel with dot indicator navigation.",
          "code": "<gooeyui-carousel>\n    <gooeyui-carousel-slide>Slide 1</gooeyui-carousel-slide>\n    <gooeyui-carousel-slide>Slide 2</gooeyui-carousel-slide>\n    <gooeyui-carousel-slide>Slide 3</gooeyui-carousel-slide>\n    <gooeyui-carousel-nav type=\"dots\"></gooeyui-carousel-nav>\n</gooeyui-carousel>"
        }
      ]
    }
  ]
};
