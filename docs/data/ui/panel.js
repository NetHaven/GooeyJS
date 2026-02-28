const panelCategory = {
  "name": "panel",
  "elements": [
    {
      "name": "AccordionPanel",
      "tagName": "gooeyui-accordionpanel",
      "description": "A container with collapsible sections that expand/collapse individual sections.",
      "inherits": [
        "UIComponent",
        "Container"
      ],
      "attributes": [
        {
          "name": "multiopen",
          "type": "BOOLEAN",
          "description": "When true, multiple sections can be open simultaneously; when false, only one section is open at a time",
          "required": false
        }
      ],
      "examples": [
        {
          "title": "Basic Accordion",
          "description": "An accordion with collapsible sections where only one can be open at a time.",
          "code": "<gooeyui-accordionpanel>\n  <gooeyui-panel title=\"Section 1\">Content 1</gooeyui-panel>\n  <gooeyui-panel title=\"Section 2\">Content 2</gooeyui-panel>\n  <gooeyui-panel title=\"Section 3\">Content 3</gooeyui-panel>\n</gooeyui-accordionpanel>"
        },
        {
          "title": "Multi-Open Accordion",
          "description": "An accordion that allows multiple sections to be open simultaneously.",
          "code": "<gooeyui-accordionpanel multiopen>\n  <gooeyui-panel title=\"Details\">Details content</gooeyui-panel>\n  <gooeyui-panel title=\"Settings\">Settings content</gooeyui-panel>\n</gooeyui-accordionpanel>"
        }
      ]
    },
    {
      "name": "AppPanel",
      "tagName": "gooeyui-apppanel",
      "description": "A specialized panel designed for application-level layout and organization.",
      "inherits": [
        "UIComponent",
        "Container"
      ],
      "attributes": [
        {
          "name": "formfactor",
          "type": "STRING",
          "description": "Specifies the target device form factor for responsive layout",
          "required": false
        }
      ],
      "examples": [
        {
          "title": "Basic App Panel",
          "description": "A panel for organizing main application content.",
          "code": "<gooeyui-apppanel>\n  <gooeyui-menubar>...</gooeyui-menubar>\n  <gooeyui-toolbar>...</gooeyui-toolbar>\n  <gooeyui-panel>Main content area</gooeyui-panel>\n</gooeyui-apppanel>"
        },
        {
          "title": "Responsive App Panel",
          "description": "An app panel optimized for desktop display.",
          "code": "<gooeyui-apppanel formfactor=\"desktop\">\n  <!-- Application content -->\n</gooeyui-apppanel>"
        }
      ]
    },
    {
      "name": "FormPanel",
      "tagName": "gooeyui-formpanel",
      "description": "A container panel optimized for organizing form controls with optional title.",
      "inherits": [
        "UIComponent",
        "Container"
      ],
      "attributes": [
        {
          "name": "title",
          "type": "STRING",
          "description": "Header text displayed at the top of the form panel",
          "required": false
        }
      ],
      "examples": [
        {
          "title": "Login Form Panel",
          "description": "A form panel containing login controls.",
          "code": "<gooeyui-formpanel title=\"Login\">\n  <gooeyui-textfield placeholder=\"Username\"></gooeyui-textfield>\n  <gooeyui-passwordfield placeholder=\"Password\"></gooeyui-passwordfield>\n  <gooeyui-button text=\"Sign In\"></gooeyui-button>\n</gooeyui-formpanel>"
        },
        {
          "title": "Settings Form",
          "description": "A form panel for configuration settings.",
          "code": "<gooeyui-formpanel title=\"Settings\">\n  <gooeyui-checkbox>Enable notifications</gooeyui-checkbox>\n  <gooeyui-checkbox>Auto-save</gooeyui-checkbox>\n</gooeyui-formpanel>"
        }
      ]
    },
    {
      "name": "GroupBox",
      "tagName": "gooeyui-groupbox",
      "description": "A panel with a border and optional title label for visual grouping of content.",
      "inherits": [
        "UIComponent",
        "Container"
      ],
      "attributes": [
        {
          "name": "text",
          "type": "STRING",
          "description": "Label text displayed in the group box border",
          "required": false
        },
        {
          "name": "title",
          "type": "STRING",
          "description": "Alternative title text for the group box header",
          "required": false
        }
      ],
      "examples": [
        {
          "title": "Basic Group Box",
          "description": "A bordered group with a title label.",
          "code": "<gooeyui-groupbox text=\"Personal Information\">\n  <gooeyui-textfield placeholder=\"First Name\"></gooeyui-textfield>\n  <gooeyui-textfield placeholder=\"Last Name\"></gooeyui-textfield>\n</gooeyui-groupbox>"
        },
        {
          "title": "Options Group",
          "description": "A group box containing related options.",
          "code": "<gooeyui-groupbox text=\"Display Options\">\n  <gooeyui-checkbox>Show grid</gooeyui-checkbox>\n  <gooeyui-checkbox>Show rulers</gooeyui-checkbox>\n</gooeyui-groupbox>"
        }
      ]
    },
    {
      "name": "Panel",
      "tagName": "gooeyui-panel",
      "description": "A basic container panel for organizing and grouping UI content. Supports both slotted children and dynamic HTML content injection.",
      "inherits": [
        "UIComponent",
        "Container"
      ],
      "attributes": [
        {
          "name": "title",
          "type": "STRING",
          "description": "Header text displayed at the top of the panel",
          "required": false
        }
      ],
      "methods": [
        {
          "name": "setContent",
          "signature": "setContent(html)",
          "description": "Set HTML content in the panel. Creates a dynamic content container and replaces its content with the provided HTML string.",
          "parameters": [
            {
              "name": "html",
              "type": "string",
              "description": "HTML string to inject into the panel"
            }
          ]
        },
        {
          "name": "clearContent",
          "signature": "clearContent()",
          "description": "Clear dynamic content from the panel, removing any HTML previously set via setContent()."
        },
        {
          "name": "getContentElement",
          "signature": "getContentElement()",
          "description": "Get the dynamic content container element.",
          "returns": "HTMLElement|null - The dynamic content container, or null if not created"
        }
      ],
      "examples": [
        {
          "title": "Basic Panel",
          "description": "A simple container for grouping elements.",
          "code": "<gooeyui-panel>\n  <gooeyui-label text=\"Welcome!\"></gooeyui-label>\n  <gooeyui-button text=\"Get Started\"></gooeyui-button>\n</gooeyui-panel>"
        },
        {
          "title": "Panel with Title",
          "description": "A panel with a header title.",
          "code": "<gooeyui-panel title=\"Dashboard\">\n  <!-- Dashboard content -->\n</gooeyui-panel>"
        },
        {
          "title": "Sized Panel",
          "description": "A panel with specific dimensions.",
          "code": "<gooeyui-panel width=\"400\" height=\"300\">\n  Panel content\n</gooeyui-panel>"
        },
        {
          "title": "Dynamic HTML Content",
          "description": "Using setContent() to inject dynamic HTML into the panel.",
          "code": "const panel = document.querySelector('gooeyui-panel');\npanel.setContent('<h2>Dynamic Title</h2><p>This content was added programmatically.</p>');"
        },
        {
          "title": "Updating Content",
          "description": "Clearing and replacing dynamic content.",
          "code": "const panel = document.querySelector('gooeyui-panel');\npanel.setContent('<p>Loading...</p>');\n// Later...\npanel.clearContent();\npanel.setContent('<p>Data loaded successfully!</p>');"
        }
      ]
    },
    {
      "name": "SplitPanel",
      "tagName": "gooeyui-splitpanel",
      "description": "A panel divided into two resizable panes separated by a draggable divider.",
      "inherits": [
        "UIComponent",
        "Container"
      ],
      "attributes": [
        {
          "name": "dividersize",
          "type": "NUMBER",
          "description": "Width or height of the divider in pixels",
          "required": false
        },
        {
          "name": "orientation",
          "type": "STRING",
          "description": "Direction of pane layout: 'horizontal' or 'vertical'",
          "required": false
        },
        {
          "name": "dividerlocation",
          "type": "STRING",
          "description": "Initial position of the divider. Plain numbers are interpreted as pixels (e.g., '200'), numbers with '%' suffix are percentages (e.g., '30%'). Default: '50%'",
          "required": false
        },
        {
          "name": "minimumlocation",
          "type": "STRING",
          "description": "Minimum divider position to prevent panes from becoming too small. Plain numbers are pixels, '%' suffix for percentages. Default: '10%'",
          "required": false
        },
        {
          "name": "maximumlocation",
          "type": "STRING",
          "description": "Maximum divider position to prevent panes from becoming too large. Plain numbers are pixels, '%' suffix for percentages. Default: '90%'",
          "required": false
        }
      ],
      "examples": [
        {
          "title": "Horizontal Split (Percentage)",
          "description": "A panel split horizontally at 30% using percentage positioning.",
          "code": "<gooeyui-splitpanel orientation=\"horizontal\" dividerlocation=\"30%\">\n  <gooeyui-panel>Left pane</gooeyui-panel>\n  <gooeyui-panel>Right pane</gooeyui-panel>\n</gooeyui-splitpanel>"
        },
        {
          "title": "Horizontal Split (Pixels)",
          "description": "A panel split horizontally with a fixed 250-pixel left pane.",
          "code": "<gooeyui-splitpanel orientation=\"horizontal\" dividerlocation=\"250\">\n  <gooeyui-panel>Left pane (250px)</gooeyui-panel>\n  <gooeyui-panel>Right pane (fills remaining space)</gooeyui-panel>\n</gooeyui-splitpanel>"
        },
        {
          "title": "Vertical Split",
          "description": "A panel split vertically with top and bottom panes.",
          "code": "<gooeyui-splitpanel orientation=\"vertical\" dividerlocation=\"50%\">\n  <gooeyui-panel>Top pane</gooeyui-panel>\n  <gooeyui-panel>Bottom pane</gooeyui-panel>\n</gooeyui-splitpanel>"
        },
        {
          "title": "Fixed Sidebar with Constraints",
          "description": "A split panel with a pixel-based sidebar and percentage-based min/max constraints.",
          "code": "<gooeyui-splitpanel orientation=\"horizontal\" dividerlocation=\"200\" minimumlocation=\"10%\" maximumlocation=\"50%\">\n  <gooeyui-panel>Navigation</gooeyui-panel>\n  <gooeyui-panel>Content</gooeyui-panel>\n</gooeyui-splitpanel>"
        },
        {
          "title": "Pixel Constraints",
          "description": "A split panel with pixel-based minimum and maximum divider positions.",
          "code": "<gooeyui-splitpanel orientation=\"horizontal\" dividerlocation=\"300\" minimumlocation=\"150\" maximumlocation=\"500\">\n  <gooeyui-panel>Sidebar (150-500px range)</gooeyui-panel>\n  <gooeyui-panel>Main content</gooeyui-panel>\n</gooeyui-splitpanel>"
        }
      ]
    },
    {
      "name": "Tab",
      "tagName": "gooeyui-tab",
      "description": "A single tab within a TabPanel, representing a named content section.",
      "inherits": [
        "UIComponent",
        "Container"
      ],
      "attributes": [
        {
          "name": "name",
          "type": "STRING",
          "description": "Unique identifier for the tab",
          "required": false
        },
        {
          "name": "text",
          "type": "STRING",
          "description": "Display label shown on the tab header",
          "required": false
        },
        {
          "name": "active",
          "type": "BOOLEAN",
          "description": "When true, the tab is currently selected and its content is visible",
          "required": false
        },
        {
          "name": "closeable",
          "type": "BOOLEAN",
          "description": "When true, displays a close button allowing the tab to be removed",
          "required": false
        }
      ],
      "examples": [
        {
          "title": "Basic Tab",
          "description": "A simple tab with content.",
          "code": "<gooeyui-tab text=\"General\" name=\"general\">\n  General settings content\n</gooeyui-tab>"
        },
        {
          "title": "Active Tab",
          "description": "A tab that is initially selected.",
          "code": "<gooeyui-tab text=\"Home\" active>\n  Home content\n</gooeyui-tab>"
        },
        {
          "title": "Closeable Tab",
          "description": "A tab that can be closed by the user.",
          "code": "<gooeyui-tab text=\"Document.txt\" closeable>\n  Document content\n</gooeyui-tab>"
        }
      ]
    },
    {
      "name": "TabPanel",
      "tagName": "gooeyui-tabpanel",
      "description": "A tabbed interface container managing multiple Tab children with individual content.",
      "inherits": [
        "UIComponent",
        "Container"
      ],
      "attributes": [
        {
          "name": "orientation",
          "type": "STRING",
          "description": "Tab placement: 'horizontal' (tabs on top) or 'vertical' (tabs on side)",
          "required": false
        }
      ],
      "examples": [
        {
          "title": "Basic Tab Panel",
          "description": "A tabbed interface with multiple tabs.",
          "code": "<gooeyui-tabpanel>\n  <gooeyui-tab text=\"Home\" active>Home content</gooeyui-tab>\n  <gooeyui-tab text=\"Profile\">Profile content</gooeyui-tab>\n  <gooeyui-tab text=\"Settings\">Settings content</gooeyui-tab>\n</gooeyui-tabpanel>"
        },
        {
          "title": "Vertical Tab Panel",
          "description": "A tab panel with tabs positioned on the side.",
          "code": "<gooeyui-tabpanel orientation=\"vertical\">\n  <gooeyui-tab text=\"Overview\">Overview</gooeyui-tab>\n  <gooeyui-tab text=\"Details\">Details</gooeyui-tab>\n  <gooeyui-tab text=\"History\">History</gooeyui-tab>\n</gooeyui-tabpanel>"
        },
        {
          "title": "Document Tabs",
          "description": "A tab panel for document-style interface with closeable tabs.",
          "code": "<gooeyui-tabpanel>\n  <gooeyui-tab text=\"Untitled\" closeable>New document</gooeyui-tab>\n  <gooeyui-tab text=\"Report.doc\" closeable>Report content</gooeyui-tab>\n</gooeyui-tabpanel>"
        }
      ]
    }
  ]
};
