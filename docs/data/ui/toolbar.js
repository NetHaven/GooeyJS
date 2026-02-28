const toolbarCategory = {
  "name": "toolbar",
  "elements": [
    {
      "name": "Toolbar",
      "tagName": "gooeyui-toolbar",
      "description": "A container bar for organizing action buttons and controls.",
      "inherits": [
        "UIComponent",
        "Container"
      ],
      "attributes": [
        {
          "name": "buttonsize",
          "type": "STRING",
          "description": "Size of toolbar buttons (e.g., 'small', 'medium', 'large')",
          "required": false
        },
        {
          "name": "wrap",
          "type": "BOOLEAN",
          "description": "When true, toolbar buttons wrap to next row if space is limited",
          "required": false
        }
      ],
      "examples": [
        {
          "title": "Basic Toolbar",
          "description": "A toolbar with action buttons.",
          "code": "<gooeyui-toolbar>\n  <gooeyui-button icon=\"icons/new.png\" tooltip=\"New\"></gooeyui-button>\n  <gooeyui-button icon=\"icons/open.png\" tooltip=\"Open\"></gooeyui-button>\n  <gooeyui-button icon=\"icons/save.png\" tooltip=\"Save\"></gooeyui-button>\n</gooeyui-toolbar>"
        },
        {
          "title": "Toolbar with Separators",
          "description": "A toolbar with grouped buttons separated by dividers.",
          "code": "<gooeyui-toolbar>\n  <gooeyui-button icon=\"icons/cut.png\"></gooeyui-button>\n  <gooeyui-button icon=\"icons/copy.png\"></gooeyui-button>\n  <gooeyui-button icon=\"icons/paste.png\"></gooeyui-button>\n  <gooeyui-toolbarseparator></gooeyui-toolbarseparator>\n  <gooeyui-button icon=\"icons/undo.png\"></gooeyui-button>\n  <gooeyui-button icon=\"icons/redo.png\"></gooeyui-button>\n</gooeyui-toolbar>"
        },
        {
          "title": "Wrapping Toolbar",
          "description": "A toolbar that wraps buttons to multiple rows when space is limited.",
          "code": "<gooeyui-toolbar wrap>\n  <gooeyui-button text=\"Action 1\"></gooeyui-button>\n  <gooeyui-button text=\"Action 2\"></gooeyui-button>\n  <gooeyui-button text=\"Action 3\"></gooeyui-button>\n</gooeyui-toolbar>"
        }
      ]
    },
    {
      "name": "ToolbarSeparator",
      "tagName": "gooeyui-toolbarseparator",
      "description": "A visual divider separating groups of toolbar buttons.",
      "inherits": [
        "UIComponent"
      ],
      "attributes": [],
      "examples": [
        {
          "title": "Toolbar Separator",
          "description": "A vertical line separating groups of toolbar buttons.",
          "code": "<gooeyui-button icon=\"icons/bold.png\"></gooeyui-button>\n<gooeyui-button icon=\"icons/italic.png\"></gooeyui-button>\n<gooeyui-toolbarseparator></gooeyui-toolbarseparator>\n<gooeyui-button icon=\"icons/alignleft.png\"></gooeyui-button>"
        }
      ]
    }
  ]
};
