const menuCategory = {
  "name": "menu",
  "elements": [
    {
      "name": "CheckboxMenuItem",
      "tagName": "gooeyui-checkboxmenuitem",
      "description": "A menu item with a checkbox for toggling a boolean value.",
      "inherits": [
        "UIComponent"
      ],
      "attributes": [
        {
          "name": "checked",
          "type": "BOOLEAN",
          "description": "Indicates whether the checkbox is currently checked",
          "required": false
        },
        {
          "name": "text",
          "type": "STRING",
          "description": "Display text shown for the menu item",
          "required": false
        },
        {
          "name": "accelerator",
          "type": "STRING",
          "description": "Keyboard shortcut text displayed next to the menu item",
          "required": false
        },
        {
          "name": "action",
          "type": "STRING",
          "description": "Action identifier fired when the menu item is clicked",
          "required": false
        },
        {
          "name": "shortcut",
          "type": "STRING",
          "description": "Keyboard shortcut for triggering the menu item action",
          "required": false
        },
        {
          "name": "icon",
          "type": "STRING",
          "description": "URL path to an icon image displayed in the menu item",
          "required": false
        }
      ],
      "examples": [
        {
          "title": "Basic Checkbox Menu Item",
          "description": "A menu item that toggles a setting on and off.",
          "code": "<gooeyui-checkboxmenuitem text=\"Show Toolbar\"></gooeyui-checkboxmenuitem>"
        },
        {
          "title": "Initially Checked",
          "description": "A checkbox menu item that starts in the checked state.",
          "code": "<gooeyui-checkboxmenuitem text=\"Word Wrap\" checked></gooeyui-checkboxmenuitem>"
        },
        {
          "title": "With Keyboard Shortcut",
          "description": "A checkbox menu item with an accelerator key displayed.",
          "code": "<gooeyui-checkboxmenuitem text=\"Status Bar\" accelerator=\"Ctrl+B\" action=\"toggleStatusBar\"></gooeyui-checkboxmenuitem>"
        }
      ]
    },
    {
      "name": "ContextMenu",
      "tagName": "gooeyui-contextmenu",
      "description": "A context menu that appears at cursor position on right-click.",
      "inherits": [
        "UIComponent",
        "Container"
      ],
      "attributes": [],
      "examples": [
        {
          "title": "Basic Context Menu",
          "description": "A right-click context menu with common actions.",
          "code": "<gooeyui-contextmenu>\n  <gooeyui-menuitem text=\"Cut\" action=\"cut\"></gooeyui-menuitem>\n  <gooeyui-menuitem text=\"Copy\" action=\"copy\"></gooeyui-menuitem>\n  <gooeyui-menuitem text=\"Paste\" action=\"paste\"></gooeyui-menuitem>\n</gooeyui-contextmenu>"
        },
        {
          "title": "Context Menu with Separators",
          "description": "A context menu with grouped items separated by dividers.",
          "code": "<gooeyui-contextmenu>\n  <gooeyui-menuitem text=\"Open\"></gooeyui-menuitem>\n  <gooeyui-menuitem text=\"Edit\"></gooeyui-menuitem>\n  <gooeyui-menuitemseparator></gooeyui-menuitemseparator>\n  <gooeyui-menuitem text=\"Delete\"></gooeyui-menuitem>\n</gooeyui-contextmenu>"
        }
      ]
    },
    {
      "name": "HamburgerMenu",
      "tagName": "gooeyui-hamburgermenu",
      "description": "A collapsible navigation menu triggered by a hamburger icon button. Supports slide-out panels from left, right, top, or bottom positions with multiple animation modes.",
      "inherits": [
        "UIComponent"
      ],
      "attributes": [
        {
          "name": "active",
          "type": "BOOLEAN",
          "description": "When true, the menu panel is open and visible",
          "required": false
        },
        {
          "name": "position",
          "type": "ENUM",
          "values": [
            "left",
            "right",
            "top",
            "bottom"
          ],
          "description": "The edge of the screen from which the panel slides out (default: left)",
          "required": false
        },
        {
          "name": "mode",
          "type": "ENUM",
          "values": [
            "slide",
            "overlay",
            "push"
          ],
          "description": "Animation mode: 'slide' slides panel over content, 'overlay' shows panel with backdrop, 'push' pushes content aside (default: slide)",
          "required": false
        },
        {
          "name": "icon",
          "type": "STRING",
          "description": "URL path to a custom icon image replacing the default hamburger bars",
          "required": false
        },
        {
          "name": "text",
          "type": "STRING",
          "description": "Optional text displayed next to the hamburger icon",
          "required": false
        },
        {
          "name": "panelwidth",
          "type": "STRING",
          "description": "Width of the slide-out panel as CSS value (default: 250px)",
          "required": false
        },
        {
          "name": "panelheight",
          "type": "STRING",
          "description": "Height of the slide-out panel as CSS value (used for top/bottom positions)",
          "required": false
        },
        {
          "name": "closeonselect",
          "type": "BOOLEAN",
          "description": "When true, automatically closes the panel when a menu item is selected (default: true)",
          "required": false
        },
        {
          "name": "closeonclickoutside",
          "type": "BOOLEAN",
          "description": "When true, closes the panel when clicking outside of it (default: true)",
          "required": false
        }
      ],
      "examples": [
        {
          "title": "Basic Hamburger Menu",
          "description": "A simple navigation menu with menu items.",
          "code": "<gooeyui-hamburgermenu>\n  <gooeyui-menuitem text=\"Home\" action=\"navigate-home\"></gooeyui-menuitem>\n  <gooeyui-menuitem text=\"About\" action=\"navigate-about\"></gooeyui-menuitem>\n  <gooeyui-menuitem text=\"Contact\" action=\"navigate-contact\"></gooeyui-menuitem>\n</gooeyui-hamburgermenu>"
        },
        {
          "title": "Right-Side Menu",
          "description": "A hamburger menu that slides out from the right edge.",
          "code": "<gooeyui-hamburgermenu position=\"right\" panelwidth=\"300px\">\n  <gooeyui-menuitem text=\"Profile\"></gooeyui-menuitem>\n  <gooeyui-menuitem text=\"Settings\"></gooeyui-menuitem>\n  <gooeyui-menuitemseparator></gooeyui-menuitemseparator>\n  <gooeyui-menuitem text=\"Logout\"></gooeyui-menuitem>\n</gooeyui-hamburgermenu>"
        },
        {
          "title": "Menu with Text Label",
          "description": "A hamburger menu displaying text next to the icon.",
          "code": "<gooeyui-hamburgermenu text=\"Menu\">\n  <gooeyui-menuitem text=\"Dashboard\"></gooeyui-menuitem>\n  <gooeyui-menuitem text=\"Reports\"></gooeyui-menuitem>\n  <gooeyui-menuitem text=\"Analytics\"></gooeyui-menuitem>\n</gooeyui-hamburgermenu>"
        },
        {
          "title": "Persistent Menu",
          "description": "A hamburger menu that stays open when items are selected.",
          "code": "<gooeyui-hamburgermenu closeonselect=\"false\">\n  <gooeyui-checkboxmenuitem text=\"Option A\"></gooeyui-checkboxmenuitem>\n  <gooeyui-checkboxmenuitem text=\"Option B\"></gooeyui-checkboxmenuitem>\n  <gooeyui-checkboxmenuitem text=\"Option C\"></gooeyui-checkboxmenuitem>\n</gooeyui-hamburgermenu>"
        },
        {
          "title": "Top Navigation Drawer",
          "description": "A hamburger menu that slides down from the top.",
          "code": "<gooeyui-hamburgermenu position=\"top\" panelheight=\"200px\">\n  <gooeyui-menuitem text=\"Quick Actions\"></gooeyui-menuitem>\n  <gooeyui-menuitem text=\"Notifications\"></gooeyui-menuitem>\n</gooeyui-hamburgermenu>"
        }
      ]
    },
    {
      "name": "Menu",
      "tagName": "gooeyui-menu",
      "description": "A dropdown menu containing menu items and submenus.",
      "inherits": [
        "UIComponent",
        "Container"
      ],
      "attributes": [
        {
          "name": "accelerator",
          "type": "STRING",
          "description": "Keyboard shortcut text displayed for the menu",
          "required": false
        },
        {
          "name": "text",
          "type": "STRING",
          "description": "Display text shown for the menu",
          "required": false
        }
      ],
      "examples": [
        {
          "title": "File Menu",
          "description": "A typical File menu with common operations.",
          "code": "<gooeyui-menu text=\"File\">\n  <gooeyui-menuitem text=\"New\" accelerator=\"Ctrl+N\"></gooeyui-menuitem>\n  <gooeyui-menuitem text=\"Open\" accelerator=\"Ctrl+O\"></gooeyui-menuitem>\n  <gooeyui-menuitem text=\"Save\" accelerator=\"Ctrl+S\"></gooeyui-menuitem>\n  <gooeyui-menuitemseparator></gooeyui-menuitemseparator>\n  <gooeyui-menuitem text=\"Exit\"></gooeyui-menuitem>\n</gooeyui-menu>"
        },
        {
          "title": "Nested Submenu",
          "description": "A menu containing a submenu for additional options.",
          "code": "<gooeyui-menu text=\"Edit\">\n  <gooeyui-menuitem text=\"Undo\"></gooeyui-menuitem>\n  <gooeyui-menuitem text=\"Redo\"></gooeyui-menuitem>\n  <gooeyui-menu text=\"Find\">\n    <gooeyui-menuitem text=\"Find...\"></gooeyui-menuitem>\n    <gooeyui-menuitem text=\"Replace...\"></gooeyui-menuitem>\n  </gooeyui-menu>\n</gooeyui-menu>"
        }
      ]
    },
    {
      "name": "Menubar",
      "tagName": "gooeyui-menubar",
      "description": "A horizontal menu bar containing top-level menus.",
      "inherits": [
        "UIComponent",
        "Container"
      ],
      "attributes": [],
      "examples": [
        {
          "title": "Application Menu Bar",
          "description": "A standard menu bar with File, Edit, and Help menus.",
          "code": "<gooeyui-menubar>\n  <gooeyui-menu text=\"File\">\n    <gooeyui-menuitem text=\"New\"></gooeyui-menuitem>\n    <gooeyui-menuitem text=\"Open\"></gooeyui-menuitem>\n    <gooeyui-menuitem text=\"Save\"></gooeyui-menuitem>\n  </gooeyui-menu>\n  <gooeyui-menu text=\"Edit\">\n    <gooeyui-menuitem text=\"Cut\"></gooeyui-menuitem>\n    <gooeyui-menuitem text=\"Copy\"></gooeyui-menuitem>\n    <gooeyui-menuitem text=\"Paste\"></gooeyui-menuitem>\n  </gooeyui-menu>\n  <gooeyui-menu text=\"Help\">\n    <gooeyui-menuitem text=\"About\"></gooeyui-menuitem>\n  </gooeyui-menu>\n</gooeyui-menubar>"
        }
      ]
    },
    {
      "name": "MenuItem",
      "tagName": "gooeyui-menuitem",
      "description": "A clickable item within a menu.",
      "inherits": [
        "UIComponent"
      ],
      "attributes": [
        {
          "name": "accelerator",
          "type": "STRING",
          "description": "Keyboard shortcut text displayed next to the menu item",
          "required": false
        },
        {
          "name": "action",
          "type": "STRING",
          "description": "Action identifier fired when the menu item is clicked",
          "required": false
        },
        {
          "name": "shortcut",
          "type": "STRING",
          "description": "Keyboard shortcut for triggering the menu item action",
          "required": false
        },
        {
          "name": "text",
          "type": "STRING",
          "description": "Display text shown for the menu item",
          "required": false
        },
        {
          "name": "icon",
          "type": "STRING",
          "description": "URL path to an icon image displayed in the menu item",
          "required": false
        }
      ],
      "examples": [
        {
          "title": "Basic Menu Item",
          "description": "A simple clickable menu item.",
          "code": "<gooeyui-menuitem text=\"Print\"></gooeyui-menuitem>"
        },
        {
          "title": "Menu Item with Shortcut",
          "description": "A menu item displaying its keyboard shortcut.",
          "code": "<gooeyui-menuitem text=\"Save\" accelerator=\"Ctrl+S\" action=\"save\"></gooeyui-menuitem>"
        },
        {
          "title": "Menu Item with Icon",
          "description": "A menu item with an icon for visual identification.",
          "code": "<gooeyui-menuitem text=\"Cut\" icon=\"icons/cut.png\" action=\"cut\"></gooeyui-menuitem>"
        },
        {
          "title": "Disabled Menu Item",
          "description": "A menu item that cannot be clicked.",
          "code": "<gooeyui-menuitem text=\"Undo\" disabled></gooeyui-menuitem>"
        }
      ]
    },
    {
      "name": "MenuItemSeparator",
      "tagName": "gooeyui-menuitemseparator",
      "description": "A visual divider line separating menu items for visual grouping.",
      "inherits": [
        "UIComponent"
      ],
      "attributes": [],
      "examples": [
        {
          "title": "Menu Separator",
          "description": "A horizontal line separating groups of menu items.",
          "code": "<gooeyui-menuitem text=\"Copy\"></gooeyui-menuitem>\n<gooeyui-menuitem text=\"Paste\"></gooeyui-menuitem>\n<gooeyui-menuitemseparator></gooeyui-menuitemseparator>\n<gooeyui-menuitem text=\"Select All\"></gooeyui-menuitem>"
        }
      ]
    },
    {
      "name": "WaffleMenu",
      "tagName": "gooeyui-wafflemenu",
      "description": "A grid-based popup menu (also known as Bento Box or App Launcher) triggered by a waffle icon button. Displays items in a configurable grid layout for quick access to applications, features, or navigation items.",
      "inherits": [
        "UIComponent"
      ],
      "attributes": [
        {
          "name": "active",
          "type": "BOOLEAN",
          "description": "When true, the waffle panel is open and visible",
          "required": false
        },
        {
          "name": "columns",
          "type": "NUMBER",
          "description": "Number of columns in the grid layout (1-6, default: 3)",
          "required": false
        },
        {
          "name": "rows",
          "type": "NUMBER",
          "description": "Maximum number of visible rows before scrolling (null for auto)",
          "required": false
        },
        {
          "name": "icon",
          "type": "STRING",
          "description": "URL path to a custom icon image replacing the default waffle (3x3 dots) icon",
          "required": false
        },
        {
          "name": "position",
          "type": "ENUM",
          "values": [
            "top-start",
            "top-end",
            "bottom-start",
            "bottom-end"
          ],
          "description": "Position of the panel relative to the trigger button (default: bottom-start)",
          "required": false
        },
        {
          "name": "panelwidth",
          "type": "STRING",
          "description": "CSS width value for the panel (default: auto)",
          "required": false
        },
        {
          "name": "title",
          "type": "STRING",
          "description": "Optional header title text displayed at the top of the panel",
          "required": false
        },
        {
          "name": "label",
          "type": "STRING",
          "description": "Accessible label for the trigger button (used by screen readers)",
          "required": false
        },
        {
          "name": "closeonselect",
          "type": "BOOLEAN",
          "description": "When true, automatically closes the panel when an item is selected (default: true)",
          "required": false
        },
        {
          "name": "closeonclickoutside",
          "type": "BOOLEAN",
          "description": "When true, closes the panel when clicking outside of it (default: true)",
          "required": false
        }
      ],
      "examples": [
        {
          "title": "Basic Waffle Menu",
          "description": "A simple app launcher with icon and label items.",
          "code": "<gooeyui-wafflemenu>\n  <gooeyui-wafflemenuitem icon=\"icons/mail.svg\" label=\"Mail\" action=\"open-mail\"></gooeyui-wafflemenuitem>\n  <gooeyui-wafflemenuitem icon=\"icons/calendar.svg\" label=\"Calendar\" action=\"open-calendar\"></gooeyui-wafflemenuitem>\n  <gooeyui-wafflemenuitem icon=\"icons/drive.svg\" label=\"Drive\" action=\"open-drive\"></gooeyui-wafflemenuitem>\n  <gooeyui-wafflemenuitem icon=\"icons/docs.svg\" label=\"Docs\" action=\"open-docs\"></gooeyui-wafflemenuitem>\n  <gooeyui-wafflemenuitem icon=\"icons/sheets.svg\" label=\"Sheets\" action=\"open-sheets\"></gooeyui-wafflemenuitem>\n  <gooeyui-wafflemenuitem icon=\"icons/slides.svg\" label=\"Slides\" action=\"open-slides\"></gooeyui-wafflemenuitem>\n</gooeyui-wafflemenu>"
        },
        {
          "title": "Four-Column Grid",
          "description": "A waffle menu with a 4-column layout positioned at bottom-end.",
          "code": "<gooeyui-wafflemenu columns=\"4\" position=\"bottom-end\" label=\"Applications\">\n  <gooeyui-wafflemenuitem icon=\"icons/gmail.png\" label=\"Gmail\" href=\"https://mail.google.com\" target=\"_blank\"></gooeyui-wafflemenuitem>\n  <gooeyui-wafflemenuitem icon=\"icons/drive.png\" label=\"Drive\" href=\"https://drive.google.com\" target=\"_blank\"></gooeyui-wafflemenuitem>\n  <gooeyui-wafflemenuitem icon=\"icons/calendar.png\" label=\"Calendar\" href=\"https://calendar.google.com\" target=\"_blank\"></gooeyui-wafflemenuitem>\n  <gooeyui-wafflemenuitem icon=\"icons/meet.png\" label=\"Meet\" href=\"https://meet.google.com\" target=\"_blank\"></gooeyui-wafflemenuitem>\n</gooeyui-wafflemenu>"
        },
        {
          "title": "With Title and Badges",
          "description": "A waffle menu with a header title and notification badges on items.",
          "code": "<gooeyui-wafflemenu title=\"Quick Access\" icon=\"custom-waffle.svg\">\n  <gooeyui-wafflemenuitem icon=\"icons/notifications.svg\" label=\"Notifications\" badge=\"12\" action=\"open-notifications\"></gooeyui-wafflemenuitem>\n  <gooeyui-wafflemenuitem icon=\"icons/messages.svg\" label=\"Messages\" badge=\"3\" action=\"open-messages\"></gooeyui-wafflemenuitem>\n  <gooeyui-wafflemenuitem icon=\"icons/tasks.svg\" label=\"Tasks\" action=\"open-tasks\"></gooeyui-wafflemenuitem>\n</gooeyui-wafflemenu>"
        },
        {
          "title": "Persistent Menu",
          "description": "A waffle menu that stays open when items are selected.",
          "code": "<gooeyui-wafflemenu closeonselect=\"false\" rows=\"2\">\n  <gooeyui-wafflemenuitem icon=\"icons/tool1.svg\" label=\"Tool 1\"></gooeyui-wafflemenuitem>\n  <gooeyui-wafflemenuitem icon=\"icons/tool2.svg\" label=\"Tool 2\"></gooeyui-wafflemenuitem>\n  <gooeyui-wafflemenuitem icon=\"icons/tool3.svg\" label=\"Tool 3\"></gooeyui-wafflemenuitem>\n  <gooeyui-wafflemenuitem icon=\"icons/tool4.svg\" label=\"Tool 4\"></gooeyui-wafflemenuitem>\n  <gooeyui-wafflemenuitem icon=\"icons/tool5.svg\" label=\"Tool 5\"></gooeyui-wafflemenuitem>\n  <gooeyui-wafflemenuitem icon=\"icons/tool6.svg\" label=\"Tool 6\"></gooeyui-wafflemenuitem>\n</gooeyui-wafflemenu>"
        }
      ]
    },
    {
      "name": "WaffleMenuItem",
      "tagName": "gooeyui-wafflemenuitem",
      "description": "An individual item within a WaffleMenu grid. Displays an icon with a text label and optionally a notification badge. Items can trigger actions or navigate to URLs.",
      "inherits": [
        "UIComponent"
      ],
      "attributes": [
        {
          "name": "icon",
          "type": "STRING",
          "description": "URL path to the icon image displayed in the item",
          "required": false
        },
        {
          "name": "label",
          "type": "STRING",
          "description": "Text label displayed below the icon",
          "required": false
        },
        {
          "name": "action",
          "type": "STRING",
          "description": "Action identifier fired with the select event when the item is clicked",
          "required": false
        },
        {
          "name": "href",
          "type": "STRING",
          "description": "URL to navigate to when the item is clicked",
          "required": false
        },
        {
          "name": "target",
          "type": "ENUM",
          "values": [
            "_self",
            "_blank",
            "_parent",
            "_top"
          ],
          "description": "Target window for href navigation (default: _self)",
          "required": false
        },
        {
          "name": "badge",
          "type": "STRING",
          "description": "Badge text displayed on the icon (e.g., notification count)",
          "required": false
        }
      ],
      "examples": [
        {
          "title": "Basic Item",
          "description": "A simple waffle menu item with icon and label.",
          "code": "<gooeyui-wafflemenuitem icon=\"icons/app.svg\" label=\"My App\" action=\"open-app\"></gooeyui-wafflemenuitem>"
        },
        {
          "title": "Item with Badge",
          "description": "A waffle menu item showing a notification count.",
          "code": "<gooeyui-wafflemenuitem icon=\"icons/inbox.svg\" label=\"Inbox\" badge=\"5\" action=\"open-inbox\"></gooeyui-wafflemenuitem>"
        },
        {
          "title": "Navigation Item",
          "description": "A waffle menu item that opens a URL in a new tab.",
          "code": "<gooeyui-wafflemenuitem icon=\"icons/external.svg\" label=\"Documentation\" href=\"https://docs.example.com\" target=\"_blank\"></gooeyui-wafflemenuitem>"
        },
        {
          "title": "Disabled Item",
          "description": "A waffle menu item that cannot be clicked.",
          "code": "<gooeyui-wafflemenuitem icon=\"icons/locked.svg\" label=\"Premium\" disabled></gooeyui-wafflemenuitem>"
        }
      ]
    }
  ]
};
