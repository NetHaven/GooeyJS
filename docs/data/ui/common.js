const commonElements = [
  {
    "name": "Background",
    "tagName": "gooeyui-background",
    "description": "A background styling component defining colors, images, and gradients that can be referenced by containers.",
    "inherits": [
      "GooeyElement"
    ],
    "attributes": [
      {
        "name": "color",
        "type": "STRING",
        "description": "CSS color value for solid background (hex, rgb, hsl, or named color)",
        "required": false
      },
      {
        "name": "image",
        "type": "STRING",
        "description": "URL path to a background image",
        "required": false
      },
      {
        "name": "gradient",
        "type": "STRING",
        "description": "CSS selector referencing a gooeyui-gradient element",
        "required": false
      },
      {
        "name": "size",
        "type": "ENUM",
        "values": [
          "auto",
          "cover",
          "contain"
        ],
        "description": "Background size behavior for images (default: auto)",
        "required": false
      },
      {
        "name": "position",
        "type": "STRING",
        "description": "CSS background-position value (default: center)",
        "required": false
      },
      {
        "name": "repeat",
        "type": "ENUM",
        "values": [
          "repeat",
          "repeat-x",
          "repeat-y",
          "no-repeat",
          "space",
          "round"
        ],
        "description": "Background repeat behavior (default: no-repeat)",
        "required": false
      }
    ],
    "examples": [
      {
        "title": "Solid Color Background",
        "description": "A simple solid color background.",
        "code": "<gooeyui-background id=\"blueBg\" color=\"#3498db\"></gooeyui-background>\n<gooeyui-panel background=\"#blueBg\">Blue panel</gooeyui-panel>"
      },
      {
        "title": "Image Background",
        "description": "A background using an image with cover sizing.",
        "code": "<gooeyui-background id=\"heroBg\" image=\"images/hero.jpg\" size=\"cover\" position=\"center\"></gooeyui-background>\n<gooeyui-panel background=\"#heroBg\" height=\"300\">Hero section</gooeyui-panel>"
      },
      {
        "title": "Gradient Background",
        "description": "A background using a referenced gradient element.",
        "code": "<gooeyui-gradient id=\"sunsetGrad\" type=\"linear\" angle=\"135deg\" stops=\"#667eea 0%, #764ba2 100%\"></gooeyui-gradient>\n<gooeyui-background id=\"gradBg\" gradient=\"#sunsetGrad\"></gooeyui-background>\n<gooeyui-panel background=\"#gradBg\">Gradient panel</gooeyui-panel>"
      },
      {
        "title": "Tiled Pattern",
        "description": "A repeating pattern background.",
        "code": "<gooeyui-background id=\"patternBg\" image=\"images/pattern.png\" repeat=\"repeat\" size=\"auto\"></gooeyui-background>"
      },
      {
        "title": "Fixed Parallax Background",
        "description": "A background image that stays fixed during scroll.",
        "code": "<gooeyui-background id=\"parallaxBg\" image=\"images/landscape.jpg\" size=\"cover\" attachment=\"fixed\"></gooeyui-background>"
      }
    ]
  },
  {
    "name": "Border",
    "tagName": "gooeyui-border",
    "description": "A border styling component defining edge styles and colors.",
    "inherits": [
      "UIComponent"
    ],
    "attributes": [
      {
        "name": "color",
        "type": "STRING",
        "description": "CSS color value for the border",
        "required": false
      },
      {
        "name": "style",
        "type": "ENUM",
        "values": [
          "DASHED",
          "DOTTED",
          "DOUBLE",
          "GROOVE",
          "HIDDEN",
          "INSET",
          "NONE",
          "OUTSET",
          "RIDGE",
          "SOLID"
        ],
        "description": "Visual style of the border line",
        "required": false
      },
      {
        "name": "width",
        "type": "STRING",
        "description": "Thickness of the border",
        "required": false
      }
    ],
    "examples": [
      {
        "title": "Solid Border",
        "description": "A border definition with solid style.",
        "code": "<gooeyui-border id=\"solidBorder\" style=\"SOLID\" color=\"#333\" width=\"1px\"></gooeyui-border>\n<gooeyui-panel border=\"#solidBorder\">Content</gooeyui-panel>"
      },
      {
        "title": "Dashed Border",
        "description": "A dashed border style for emphasis.",
        "code": "<gooeyui-border id=\"dashedBorder\" style=\"DASHED\" color=\"blue\" width=\"2px\"></gooeyui-border>"
      },
      {
        "title": "Inset Border",
        "description": "A 3D inset border effect.",
        "code": "<gooeyui-border id=\"insetBorder\" style=\"INSET\" width=\"3px\"></gooeyui-border>"
      }
    ]
  },
  {
    "name": "CodeBlock",
    "tagName": "gooeyui-codeblock",
    "description": "A code display component for showing code snippets with line numbers, copy button, language label, and optional syntax highlighting. Supports a pluggable tokenizer system with built-in tokenizers for HTML/XML, JavaScript/TypeScript, and CSS. When syntax highlighting is enabled, the component lazy-loads the appropriate tokenizer based on the language attribute and renders color-coded tokens. The copy button always copies the raw source text regardless of highlighting state.",
    "inherits": [
      "UIComponent"
    ],
    "attributes": [
      {
        "name": "language",
        "type": "STRING",
        "description": "Language identifier displayed in the header and used to select the syntax highlighting tokenizer. Built-in tokenizers: html, htm, xml, svg, javascript, js, jsx, typescript, ts, tsx, php, python, py, css, scss, less.",
        "required": false
      },
      {
        "name": "syntaxhighlight",
        "type": "BOOLEAN",
        "description": "When present, enables syntax highlighting. Requires the language attribute to be set to a supported language. The tokenizer is lazy-loaded on first use.",
        "required": false,
        "default": "false"
      },
      {
        "name": "linenumbers",
        "type": "BOOLEAN",
        "description": "When true, displays line numbers in a gutter on the left side",
        "required": false,
        "default": "true"
      },
      {
        "name": "copybutton",
        "type": "BOOLEAN",
        "description": "When true, displays a copy button to copy code to clipboard",
        "required": false,
        "default": "true"
      }
    ],
    "examples": [
      {
        "title": "Basic Code Block",
        "description": "A simple code block with line numbers.",
        "code": "<gooeyui-codeblock>\nfunction hello() {\n    console.log(\"Hello, World!\");\n}\n</gooeyui-codeblock>"
      },
      {
        "title": "Code Block with Language",
        "description": "A code block displaying the language name in the header.",
        "code": "<gooeyui-codeblock language=\"javascript\">\nconst greeting = \"Hello\";\nconsole.log(greeting);\n</gooeyui-codeblock>"
      },
      {
        "title": "HTML Syntax Highlighting",
        "description": "A code block with syntax highlighting enabled for HTML. Tag names, attribute names, attribute values, and comments are color-coded.",
        "code": "<gooeyui-codeblock language=\"html\" syntaxhighlight>\n<!-- Navigation -->\n<nav class=\"main-nav\">\n    <a href=\"/home\">Home</a>\n    <a href=\"/about\">About</a>\n</nav>\n</gooeyui-codeblock>"
      },
      {
        "title": "JavaScript Syntax Highlighting",
        "description": "A code block with syntax highlighting enabled for JavaScript. Keywords, strings, numbers, comments, and operators are color-coded.",
        "code": "<gooeyui-codeblock language=\"javascript\" syntaxhighlight>\n// Fetch user data\nasync function getUser(id) {\n    const response = await fetch(`/api/users/${id}`);\n    if (!response.ok) {\n        throw new Error(\"Not found\");\n    }\n    return response.json();\n}\n</gooeyui-codeblock>"
      },
      {
        "title": "CSS Syntax Highlighting",
        "description": "A code block with syntax highlighting enabled for CSS. Selectors, properties, values, and at-rules are color-coded.",
        "code": "<gooeyui-codeblock language=\"css\" syntaxhighlight>\n/* Card component styles */\n@media (min-width: 768px) {\n    .card {\n        display: flex;\n        padding: 16px;\n        border-radius: 8px;\n        background-color: #ffffff;\n        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);\n    }\n}\n</gooeyui-codeblock>"
      },
      {
        "title": "Python Syntax Highlighting",
        "description": "A code block with syntax highlighting enabled for Python. Keywords, strings, numbers, decorators, and comments are color-coded.",
        "code": "<gooeyui-codeblock language=\"python\" syntaxhighlight>\nimport os\n\ndef read_config(path):\n    \"\"\"Read configuration from file.\"\"\"\n    with open(path, 'r') as f:\n        return json.load(f)\n\nif __name__ == '__main__':\n    config = read_config('settings.json')\n    print(config)\n</gooeyui-codeblock>"
      },
      {
        "title": "PHP Syntax Highlighting",
        "description": "A code block with syntax highlighting enabled for PHP. Keywords, variables, strings, and comments are color-coded.",
        "code": "<gooeyui-codeblock language=\"php\" syntaxhighlight>\n&lt;?php\nfunction getUserById($id) {\n    $query = \"SELECT * FROM users WHERE id = ?\";\n    $stmt = $pdo->prepare($query);\n    $stmt->execute([$id]);\n    return $stmt->fetch();\n}\n?&gt;\n</gooeyui-codeblock>"
      },
      {
        "title": "Code Block without Line Numbers",
        "description": "A minimal code block without line numbers.",
        "code": "<gooeyui-codeblock linenumbers=\"false\">\nnpm install gooeyjs\n</gooeyui-codeblock>"
      },
      {
        "title": "Minimal Code Block",
        "description": "A code block with no header elements.",
        "code": "<gooeyui-codeblock linenumbers=\"false\" copybutton=\"false\">\nSimple text display\n</gooeyui-codeblock>"
      }
    ]
  },
  {
    "name": "ColorPicker",
    "tagName": "gooeyui-colorpicker",
    "description": "An interactive color picker for selecting and displaying colors.",
    "inherits": [
      "UIComponent"
    ],
    "attributes": [
      {
        "name": "value",
        "type": "STRING",
        "description": "The currently selected color value in hex format",
        "required": false
      }
    ],
    "examples": [
      {
        "title": "Basic Color Picker",
        "description": "A simple color picker for selecting colors.",
        "code": "<gooeyui-colorpicker></gooeyui-colorpicker>"
      },
      {
        "title": "Color Picker with Default",
        "description": "A color picker with an initial color value.",
        "code": "<gooeyui-colorpicker value=\"#ff5500\"></gooeyui-colorpicker>"
      },
      {
        "title": "Color Picker in Form",
        "description": "A color picker used within a form panel.",
        "code": "<gooeyui-formpanel>\n  <gooeyui-label text=\"Background Color:\"></gooeyui-label>\n  <gooeyui-colorpicker value=\"#ffffff\"></gooeyui-colorpicker>\n</gooeyui-formpanel>"
      }
    ]
  },
  {
    "name": "Font",
    "tagName": "gooeyui-font",
    "description": "A font styling component defining typeface, size, and weight.",
    "inherits": [
      "UIComponent"
    ],
    "attributes": [
      {
        "name": "family",
        "type": "STRING",
        "description": "Font family name",
        "required": false
      },
      {
        "name": "size",
        "type": "STRING",
        "description": "Font size as CSS value",
        "required": false
      },
      {
        "name": "weight",
        "type": "ENUM",
        "values": [
          "400",
          "700"
        ],
        "description": "Font weight (400 = normal, 700 = bold)",
        "required": false
      }
    ],
    "examples": [
      {
        "title": "Basic Font Definition",
        "description": "A font definition for styling text.",
        "code": "<gooeyui-font id=\"headingFont\" family=\"Arial\" size=\"18px\" weight=\"700\"></gooeyui-font>\n<gooeyui-panel font=\"#headingFont\">Styled text</gooeyui-panel>"
      },
      {
        "title": "Monospace Font",
        "description": "A monospace font for code display.",
        "code": "<gooeyui-font id=\"codeFont\" family=\"Consolas, monospace\" size=\"14px\"></gooeyui-font>"
      }
    ]
  },
  {
    "name": "Label",
    "tagName": "gooeyui-label",
    "description": "A text label with optional icon support for displaying information.",
    "inherits": [
      "UIComponent"
    ],
    "attributes": [
      {
        "name": "text",
        "type": "STRING",
        "description": "Display text content of the label",
        "required": false
      },
      {
        "name": "icon",
        "type": "STRING",
        "description": "URL path to an icon image displayed in the label",
        "required": false
      },
      {
        "name": "action",
        "type": "STRING",
        "description": "Action identifier fired when the label is clicked",
        "required": false
      },
      {
        "name": "halign",
        "type": "ENUM",
        "values": [
          "LEFT",
          "CENTER",
          "RIGHT"
        ],
        "description": "Horizontal alignment of label content",
        "required": false
      },
      {
        "name": "valign",
        "type": "ENUM",
        "values": [
          "TOP",
          "CENTER",
          "BOTTOM"
        ],
        "description": "Vertical alignment of label content",
        "required": false
      }
    ],
    "examples": [
      {
        "title": "Basic Label",
        "description": "A simple text label.",
        "code": "<gooeyui-label text=\"Username:\"></gooeyui-label>"
      },
      {
        "title": "Label with Icon",
        "description": "A label displaying an icon alongside text.",
        "code": "<gooeyui-label text=\"Settings\" icon=\"icons/settings.png\"></gooeyui-label>"
      },
      {
        "title": "Centered Label",
        "description": "A label with centered text alignment.",
        "code": "<gooeyui-label text=\"Welcome!\" halign=\"CENTER\"></gooeyui-label>"
      },
      {
        "title": "Clickable Label",
        "description": "A label that fires an action when clicked.",
        "code": "<gooeyui-label text=\"Learn more...\" action=\"showHelp\"></gooeyui-label>"
      }
    ]
  },
  {
    "name": "StatusBar",
    "tagName": "gooeyui-statusbar",
    "description": "A horizontal bar for displaying status information, typically positioned at the bottom or top of an application window. Provides a three-part layout with left, center, and right slots for declarative content and supports programmatic item management via addStatusItem(). Automatically detects content overflow and fires an event when any slot exceeds its available space.",
    "inherits": [
      "UIComponent",
      "Container"
    ],
    "attributes": [
      {
        "name": "position",
        "type": "ENUM",
        "values": ["top", "bottom"],
        "description": "Placement of the status bar within its parent container (default: bottom)",
        "required": false
      },
      {
        "name": "height",
        "type": "NUMBER",
        "description": "Height of the status bar in pixels (default: 24)",
        "required": false
      }
    ],
    "examples": [
      {
        "title": "Basic Status Bar",
        "description": "A simple status bar with slotted content in the default (left) position.",
        "code": "<gooeyui-statusbar>\n  <span slot=\"left\">Ready</span>\n</gooeyui-statusbar>"
      },
      {
        "title": "Three-Part Layout",
        "description": "A status bar using left, center, and right slots for different status information.",
        "code": "<gooeyui-statusbar>\n  <span slot=\"left\">Line 42, Col 18</span>\n  <span slot=\"center\">UTF-8</span>\n  <span slot=\"right\">LF | JavaScript</span>\n</gooeyui-statusbar>"
      },
      {
        "title": "Programmatic Item Management",
        "description": "Adding and removing status items via the JavaScript API.",
        "code": "<gooeyui-statusbar id=\"appStatus\"></gooeyui-statusbar>\n\n<script>\n  const statusbar = document.getElementById('appStatus');\n  \n  // Add items to different positions\n  const readyItem = statusbar.addStatusItem('Ready', 'left');\n  statusbar.addStatusItem('100%', 'right');\n  statusbar.addStatusItem('UTF-8', 'center');\n  \n  // Remove a specific item\n  statusbar.removeStatusItem(readyItem);\n  \n  // Clear all programmatic items\n  statusbar.clearStatusItems();\n</script>"
      },
      {
        "title": "Status Bar Events",
        "description": "Listening for item management and overflow events.",
        "code": "<gooeyui-statusbar id=\"eventStatus\">\n  <span slot=\"left\">Status</span>\n</gooeyui-statusbar>\n\n<script>\n  const bar = document.getElementById('eventStatus');\n  \n  bar.addEventListener('statusbar-item-added', (e, data) => {\n    console.log('Added:', data.item, 'at', data.position);\n  });\n  \n  bar.addEventListener('statusbar-overflow', (e, data) => {\n    console.log('Overflow:', data.overflowing, 'slots:', data.slots);\n  });\n</script>"
      },
      {
        "title": "Top-Positioned Status Bar",
        "description": "A status bar placed at the top of its container.",
        "code": "<gooeyui-statusbar position=\"top\" height=\"28\">\n  <span slot=\"left\">Application Title</span>\n  <span slot=\"right\">v2.3.0</span>\n</gooeyui-statusbar>"
      }
    ]
  },
  {
    "name": "ProgressBar",
    "tagName": "gooeyui-progressbar",
    "description": "A visual progress indicator showing completion percentage or indeterminate progress.",
    "inherits": [
      "UIComponent"
    ],
    "attributes": [
      {
        "name": "value",
        "type": "NUMBER",
        "description": "Current progress value (0 to max)",
        "required": false
      },
      {
        "name": "max",
        "type": "NUMBER",
        "description": "Maximum progress value representing 100% completion",
        "required": false
      },
      {
        "name": "indeterminate",
        "type": "BOOLEAN",
        "description": "When true, shows indeterminate progress animation instead of percentage",
        "required": false
      }
    ],
    "examples": [
      {
        "title": "Basic Progress Bar",
        "description": "A progress bar showing 50% completion.",
        "code": "<gooeyui-progressbar value=\"50\" max=\"100\"></gooeyui-progressbar>"
      },
      {
        "title": "Indeterminate Progress",
        "description": "A progress bar with animated indeterminate state.",
        "code": "<gooeyui-progressbar indeterminate></gooeyui-progressbar>"
      },
      {
        "title": "Download Progress",
        "description": "A progress bar showing file download status.",
        "code": "<gooeyui-progressbar value=\"75\" max=\"100\" width=\"200\"></gooeyui-progressbar>"
      }
    ]
  }
];
