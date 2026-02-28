const windowCategory = {
  "name": "window",
  "elements": [
    {
      "name": "FloatingPane",
      "tagName": "gooeyui-floatingpane",
      "description": "A floating window pane that can be positioned anywhere on the screen.",
      "inherits": [
        "UIComponent",
        "Container"
      ],
      "attributes": [
        {
          "name": "wintitle",
          "type": "STRING",
          "description": "Title text displayed in the window's title bar",
          "required": false
        },
        {
          "name": "constrainviewport",
          "type": "BOOLEAN",
          "description": "When true, constrains window movement within the viewport bounds",
          "required": false
        },
        {
          "name": "modal",
          "type": "BOOLEAN",
          "description": "When true, the window blocks interaction with elements behind it",
          "required": false
        }
      ],
      "examples": [
        {
          "title": "Basic Floating Pane",
          "description": "A floating pane that can be freely positioned.",
          "code": "<gooeyui-floatingpane wintitle=\"Properties\">\n  <gooeyui-panel>Pane content here</gooeyui-panel>\n</gooeyui-floatingpane>"
        },
        {
          "title": "Constrained Floating Pane",
          "description": "A floating pane that stays within the viewport boundaries.",
          "code": "<gooeyui-floatingpane wintitle=\"Tools\" constrainviewport>\n  <gooeyui-toolbar>...</gooeyui-toolbar>\n</gooeyui-floatingpane>"
        },
        {
          "title": "Sized Floating Pane",
          "description": "A floating pane with specific dimensions.",
          "code": "<gooeyui-floatingpane wintitle=\"Inspector\" width=\"300\" height=\"400\">\n  Inspector content\n</gooeyui-floatingpane>"
        }
      ]
    },
    {
      "name": "Window",
      "tagName": "gooeyui-window",
      "description": "A draggable, resizable dialog window with titlebar control buttons, OK/Cancel button bar, and optional modal overlay. The titlebar provides close, minimize, and maximize buttons. Supports 8-direction edge and corner resizing with configurable minimum and maximum size constraints. The window centers itself on open and can be constrained to the viewport. The close action is cancellable via event listeners.",
      "inherits": [
        "UIComponent",
        "Container"
      ],
      "attributes": [
        {
          "name": "wintitle",
          "type": "STRING",
          "description": "Title text displayed in the window's title bar",
          "required": false
        },
        {
          "name": "constrainviewport",
          "type": "BOOLEAN",
          "description": "When true, constrains window dragging and resizing within the viewport bounds",
          "required": false
        },
        {
          "name": "modal",
          "type": "BOOLEAN",
          "description": "When true, the window displays a modal overlay that blocks interaction with elements behind it",
          "required": false
        },
        {
          "name": "closeable",
          "type": "BOOLEAN",
          "description": "When true, displays a close button in the titlebar and allows the window to be closed",
          "required": false
        },
        {
          "name": "minimizable",
          "type": "BOOLEAN",
          "description": "When true, displays a minimize button in the titlebar",
          "required": false
        },
        {
          "name": "maximizable",
          "type": "BOOLEAN",
          "description": "When true, displays a maximize button in the titlebar. Clicking toggles between maximized (fills viewport) and restored size",
          "required": false
        },
        {
          "name": "resizeable",
          "type": "BOOLEAN",
          "description": "When true, the window can be resized by dragging its edges and corners in 8 directions",
          "required": false
        },
        {
          "name": "minwidth",
          "type": "NUMBER",
          "description": "Minimum width in pixels when resizing the window",
          "required": false
        },
        {
          "name": "minheight",
          "type": "NUMBER",
          "description": "Minimum height in pixels when resizing the window",
          "required": false
        },
        {
          "name": "maxwidth",
          "type": "NUMBER",
          "description": "Maximum width in pixels when resizing the window",
          "required": false
        },
        {
          "name": "maxheight",
          "type": "NUMBER",
          "description": "Maximum height in pixels when resizing the window",
          "required": false
        }
      ],
      "examples": [
        {
          "title": "Basic Dialog Window",
          "description": "A simple dialog window with a title and close button.",
          "code": "<gooeyui-window wintitle=\"Settings\" closeable>\n  <gooeyui-formpanel>\n    <!-- Settings form content -->\n  </gooeyui-formpanel>\n</gooeyui-window>"
        },
        {
          "title": "Modal Dialog",
          "description": "A modal window that blocks interaction with the background.",
          "code": "<gooeyui-window wintitle=\"Confirm Action\" modal closeable>\n  <gooeyui-label text=\"Are you sure?\"></gooeyui-label>\n  <gooeyui-button text=\"Yes\"></gooeyui-button>\n  <gooeyui-button text=\"No\"></gooeyui-button>\n</gooeyui-window>"
        },
        {
          "title": "Resizable Window with Constraints",
          "description": "A resizable window with minimum and maximum size limits, constrained to the viewport.",
          "code": "<gooeyui-window wintitle=\"Editor\" closeable resizeable constrainviewport\n  width=\"600\" height=\"400\"\n  minwidth=\"300\" minheight=\"200\"\n  maxwidth=\"1200\" maxheight=\"800\">\n  <gooeyui-richtexteditor></gooeyui-richtexteditor>\n</gooeyui-window>"
        },
        {
          "title": "Full-Featured Window",
          "description": "A window with all titlebar controls: close, minimize, and maximize buttons.",
          "code": "<gooeyui-window wintitle=\"Application\" closeable minimizable maximizable resizeable\n  width=\"800\" height=\"600\">\n  <gooeyui-panel>Window content</gooeyui-panel>\n</gooeyui-window>"
        },
        {
          "title": "Programmatic Window Control",
          "description": "Opening and closing a window via JavaScript with event handling.",
          "code": "<gooeyui-window id=\"myWindow\" wintitle=\"Details\" closeable modal\n  width=\"500\" height=\"350\">\n  <gooeyui-panel>Window content</gooeyui-panel>\n</gooeyui-window>\n\n<script>\n  const win = document.getElementById('myWindow');\n  \n  // Open centered\n  win.open();\n  \n  // Listen for close (cancellable)\n  win.addEventListener('window-close', (e, data) => {\n    console.log('Window closing');\n  });\n  \n  win.addEventListener('window-resize', (e, data) => {\n    console.log('Window resized');\n  });\n</script>"
        }
      ]
    }
  ]
};
