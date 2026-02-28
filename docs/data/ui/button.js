const buttonCategory = {
  "name": "button",
  "elements": [
    {
      "name": "Button",
      "tagName": "gooeyui-button",
      "description": "A clickable button component with optional text and icon support.",
      "inherits": [
        "UIComponent"
      ],
      "attributes": [
        {
          "name": "action",
          "type": "STRING",
          "description": "Optional action identifier fired when button is clicked",
          "required": false
        },
        {
          "name": "icon",
          "type": "STRING",
          "description": "URL path to an icon image displayed in the button",
          "required": false
        },
        {
          "name": "text",
          "type": "STRING",
          "description": "Display text shown on the button",
          "required": false
        }
      ],
      "examples": [
        {
          "title": "Basic Button",
          "description": "A simple button with text label.",
          "code": "<gooeyui-button text=\"Click Me\"></gooeyui-button>"
        },
        {
          "title": "Button with Icon",
          "description": "A button displaying both an icon and text.",
          "code": "<gooeyui-button text=\"Save\" icon=\"icons/save.png\"></gooeyui-button>"
        },
        {
          "title": "Button with Action",
          "description": "A button that fires a named action when clicked.",
          "code": "<gooeyui-button text=\"Submit\" action=\"submitForm\"></gooeyui-button>"
        }
      ]
    },
    {
      "name": "ToggleButton",
      "tagName": "gooeyui-togglebutton",
      "description": "A button that can be toggled between pressed and unpressed states.",
      "inherits": [
        "UIComponent"
      ],
      "attributes": [
        {
          "name": "action",
          "type": "STRING",
          "description": "Optional action identifier fired when button state changes",
          "required": false
        },
        {
          "name": "icon",
          "type": "STRING",
          "description": "URL path to an icon image displayed in the button",
          "required": false
        },
        {
          "name": "text",
          "type": "STRING",
          "description": "Display text shown on the button",
          "required": false
        },
        {
          "name": "pressed",
          "type": "BOOLEAN",
          "description": "Indicates whether the button is currently in pressed state",
          "required": false
        }
      ],
      "examples": [
        {
          "title": "Basic Toggle Button",
          "description": "A toggle button that can be pressed and unpressed.",
          "code": "<gooeyui-togglebutton text=\"Bold\"></gooeyui-togglebutton>"
        },
        {
          "title": "Initially Pressed Toggle",
          "description": "A toggle button that starts in the pressed state.",
          "code": "<gooeyui-togglebutton text=\"Active\" pressed></gooeyui-togglebutton>"
        },
        {
          "title": "Toggle with Icon",
          "description": "A toggle button with an icon for toolbar-style usage.",
          "code": "<gooeyui-togglebutton icon=\"icons/bold.png\" tooltip=\"Bold\"></gooeyui-togglebutton>"
        }
      ]
    },
    {
      "name": "ToggleButtonGroup",
      "tagName": "gooeyui-togglebuttongroup",
      "description": "Container managing a group of toggle buttons with single or multiple selection.",
      "inherits": [
        "UIComponent",
        "Container"
      ],
      "attributes": [
        {
          "name": "allowdeselect",
          "type": "BOOLEAN",
          "description": "When true, allows deselecting the selected button; when false, at least one button must remain selected",
          "required": false
        },
        {
          "name": "autoselect",
          "type": "BOOLEAN",
          "description": "When true, automatically selects the first button if no button is initially selected",
          "required": false
        }
      ],
      "examples": [
        {
          "title": "Text Alignment Group",
          "description": "A group of toggle buttons for text alignment selection.",
          "code": "<gooeyui-togglebuttongroup>\n  <gooeyui-togglebutton text=\"Left\"></gooeyui-togglebutton>\n  <gooeyui-togglebutton text=\"Center\"></gooeyui-togglebutton>\n  <gooeyui-togglebutton text=\"Right\"></gooeyui-togglebutton>\n</gooeyui-togglebuttongroup>"
        },
        {
          "title": "Auto-Select First",
          "description": "A toggle group that automatically selects the first button.",
          "code": "<gooeyui-togglebuttongroup autoselect>\n  <gooeyui-togglebutton text=\"Option 1\"></gooeyui-togglebutton>\n  <gooeyui-togglebutton text=\"Option 2\"></gooeyui-togglebutton>\n</gooeyui-togglebuttongroup>"
        },
        {
          "title": "Allow Deselection",
          "description": "A toggle group where all buttons can be deselected.",
          "code": "<gooeyui-togglebuttongroup allowdeselect>\n  <gooeyui-togglebutton text=\"Filter A\"></gooeyui-togglebutton>\n  <gooeyui-togglebutton text=\"Filter B\"></gooeyui-togglebutton>\n</gooeyui-togglebuttongroup>"
        }
      ]
    }
  ]
};
