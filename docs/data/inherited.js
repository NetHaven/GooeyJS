const inheritedAttributes = {
  "UIComponent": [
    {
      "name": "disabled",
      "type": "BOOLEAN",
      "description": "When true, the component is disabled and does not respond to user interaction",
      "required": false
    },
    {
      "name": "draggable",
      "type": "BOOLEAN",
      "description": "When true, enables drag-and-drop functionality for the component",
      "required": false
    },
    {
      "name": "droppable",
      "type": "BOOLEAN",
      "description": "When true, the component can accept dropped items from drag operations",
      "required": false
    },
    {
      "name": "dropzone",
      "type": "STRING",
      "description": "CSS class name identifying the drop zone group this component belongs to",
      "required": false
    },
    {
      "name": "height",
      "type": "STRING",
      "description": "Height of the component in pixels",
      "required": false
    },
    {
      "name": "tooltip",
      "type": "STRING",
      "description": "Tooltip text displayed when hovering over the component",
      "required": false
    },
    {
      "name": "visible",
      "type": "BOOLEAN",
      "description": "When true, the component is visible; when false, the component is hidden",
      "required": false
    },
    {
      "name": "width",
      "type": "STRING",
      "description": "Width of the component in pixels",
      "required": false
    }
  ],
  "Container": [
    {
      "name": "active",
      "type": "STRING",
      "description": "Identifier of the currently active child component within the container",
      "required": false
    },
    {
      "name": "border",
      "type": "STRING",
      "description": "CSS selector referencing a gooeyui-border element for border styling",
      "required": false
    },
    {
      "name": "font",
      "type": "STRING",
      "description": "CSS selector referencing a gooeyui-font element for text styling",
      "required": false
    },
    {
      "name": "layout",
      "type": "STRING",
      "description": "CSS selector referencing a layout element that defines the container's layout behavior",
      "required": false
    }
  ],
  "FormElement": [
    {
      "name": "required",
      "type": "BOOLEAN",
      "description": "When true, the field must have a value before form submission; displays a required indicator",
      "required": false
    }
  ],
  "TextElement": [
    {
      "name": "maxLength",
      "type": "NUMBER",
      "description": "Maximum number of characters allowed in the input field",
      "required": false
    },
    {
      "name": "minLength",
      "type": "NUMBER",
      "description": "Minimum number of characters required in the input field",
      "required": false
    },
    {
      "name": "placeholder",
      "type": "STRING",
      "description": "Placeholder text displayed when the input field is empty",
      "required": false
    },
    {
      "name": "readOnly",
      "type": "BOOLEAN",
      "description": "When true, the field displays its value but cannot be edited by the user",
      "required": false
    }
  ]
};
