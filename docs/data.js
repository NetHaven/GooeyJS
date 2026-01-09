/**
 * GooeyJS Element Reference Data
 * This file contains all component metadata for the documentation
 */
const GooeyData = {
  "inheritedAttributes": {
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
  },
  "root": {
    "name": "Gooey Elements",
    "subcategories": [
    {
      "name": "Buttons",
      "elements": [
        {
          "name": "Button",
          "tagName": "gooeyui-button",
          "description": "A clickable button component with optional text and icon support.",
          "inherits": ["UIComponent"],
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
          "inherits": ["UIComponent"],
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
          "inherits": ["UIComponent", "Container"],
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
    },
    {
      "name": "Forms",
      "elements": [
        {
          "name": "Checkbox",
          "tagName": "gooeyui-checkbox",
          "description": "A checkbox input control for binary true/false selection.",
          "inherits": ["UIComponent", "FormElement"],
          "attributes": [],
          "examples": [
            {
              "title": "Basic Checkbox",
              "description": "A simple checkbox for accepting terms.",
              "code": "<gooeyui-checkbox>I agree to the terms</gooeyui-checkbox>"
            },
            {
              "title": "Required Checkbox",
              "description": "A checkbox that must be checked before form submission.",
              "code": "<gooeyui-checkbox required>Accept privacy policy</gooeyui-checkbox>"
            },
            {
              "title": "Disabled Checkbox",
              "description": "A checkbox that cannot be interacted with.",
              "code": "<gooeyui-checkbox disabled>Unavailable option</gooeyui-checkbox>"
            }
          ]
        },
        {
          "name": "DatePicker",
          "tagName": "gooeyui-datepicker",
          "description": "A date input control for selecting calendar dates.",
          "inherits": ["UIComponent", "FormElement"],
          "attributes": [
            {
              "name": "max",
              "type": "STRING",
              "description": "Maximum selectable date in ISO format (YYYY-MM-DD)",
              "required": false
            },
            {
              "name": "min",
              "type": "STRING",
              "description": "Minimum selectable date in ISO format (YYYY-MM-DD)",
              "required": false
            },
            {
              "name": "step",
              "type": "STRING",
              "description": "Step interval for date selection",
              "required": false
            }
          ],
          "examples": [
            {
              "title": "Basic Date Picker",
              "description": "A simple date selection control.",
              "code": "<gooeyui-datepicker></gooeyui-datepicker>"
            },
            {
              "title": "Date Range Constraint",
              "description": "A date picker with minimum and maximum date limits.",
              "code": "<gooeyui-datepicker min=\"2024-01-01\" max=\"2024-12-31\"></gooeyui-datepicker>"
            },
            {
              "title": "Required Date Field",
              "description": "A date picker that must have a value selected.",
              "code": "<gooeyui-datepicker required></gooeyui-datepicker>"
            }
          ]
        },
        {
          "name": "RadioButton",
          "tagName": "gooeyui-radiobutton",
          "description": "A radio button control for single selection within a group.",
          "inherits": ["UIComponent", "FormElement"],
          "attributes": [],
          "examples": [
            {
              "title": "Basic Radio Button",
              "description": "A single radio button option.",
              "code": "<gooeyui-radiobutton>Option A</gooeyui-radiobutton>"
            },
            {
              "title": "Disabled Radio Button",
              "description": "A radio button that cannot be selected.",
              "code": "<gooeyui-radiobutton disabled>Unavailable</gooeyui-radiobutton>"
            }
          ]
        },
        {
          "name": "RadioButtonGroup",
          "tagName": "gooeyui-radiobuttongroup",
          "description": "Container that manages radio button grouping for mutually exclusive selection.",
          "inherits": ["UIComponent", "Container"],
          "attributes": [],
          "examples": [
            {
              "title": "Basic Radio Group",
              "description": "A group of mutually exclusive radio options.",
              "code": "<gooeyui-radiobuttongroup>\n  <gooeyui-radiobutton>Small</gooeyui-radiobutton>\n  <gooeyui-radiobutton>Medium</gooeyui-radiobutton>\n  <gooeyui-radiobutton>Large</gooeyui-radiobutton>\n</gooeyui-radiobuttongroup>"
            },
            {
              "title": "Required Selection",
              "description": "A radio group where one option must be selected.",
              "code": "<gooeyui-radiobuttongroup required>\n  <gooeyui-radiobutton>Yes</gooeyui-radiobutton>\n  <gooeyui-radiobutton>No</gooeyui-radiobutton>\n</gooeyui-radiobuttongroup>"
            }
          ]
        },
        {
          "name": "Spinner",
          "tagName": "gooeyui-spinner",
          "description": "A numeric input control with increment and decrement buttons.",
          "inherits": ["UIComponent", "FormElement"],
          "attributes": [
            {
              "name": "value",
              "type": "NUMBER",
              "description": "Current numeric value of the spinner",
              "required": false
            },
            {
              "name": "min",
              "type": "NUMBER",
              "description": "Minimum allowed numeric value",
              "required": false
            },
            {
              "name": "max",
              "type": "NUMBER",
              "description": "Maximum allowed numeric value",
              "required": false
            },
            {
              "name": "step",
              "type": "NUMBER",
              "description": "Increment/decrement step value when buttons are clicked",
              "required": false
            }
          ],
          "examples": [
            {
              "title": "Basic Spinner",
              "description": "A simple numeric spinner control.",
              "code": "<gooeyui-spinner value=\"5\"></gooeyui-spinner>"
            },
            {
              "title": "Constrained Range",
              "description": "A spinner limited to values between 0 and 100.",
              "code": "<gooeyui-spinner min=\"0\" max=\"100\" value=\"50\"></gooeyui-spinner>"
            },
            {
              "title": "Custom Step Value",
              "description": "A spinner that increments by 5 with each click.",
              "code": "<gooeyui-spinner min=\"0\" max=\"100\" step=\"5\" value=\"0\"></gooeyui-spinner>"
            }
          ]
        },
        {
          "name": "TimePicker",
          "tagName": "gooeyui-timepicker",
          "description": "A time input control for selecting hours and minutes.",
          "inherits": ["UIComponent", "FormElement"],
          "attributes": [
            {
              "name": "max",
              "type": "STRING",
              "description": "Maximum selectable time in HH:MM format",
              "required": false
            },
            {
              "name": "min",
              "type": "STRING",
              "description": "Minimum selectable time in HH:MM format",
              "required": false
            }
          ],
          "examples": [
            {
              "title": "Basic Time Picker",
              "description": "A simple time selection control.",
              "code": "<gooeyui-timepicker></gooeyui-timepicker>"
            },
            {
              "title": "Business Hours Only",
              "description": "A time picker constrained to business hours.",
              "code": "<gooeyui-timepicker min=\"09:00\" max=\"17:00\"></gooeyui-timepicker>"
            },
            {
              "title": "Required Time Field",
              "description": "A time picker that must have a value selected.",
              "code": "<gooeyui-timepicker required></gooeyui-timepicker>"
            }
          ]
        }
      ],
      "subcategories": [
        {
          "name": "Lists",
          "elements": [
            {
              "name": "ComboBox",
              "tagName": "gooeyui-combobox",
              "description": "A dropdown list with optional editable text input for filtering and selection.",
              "inherits": ["UIComponent", "FormElement"],
              "attributes": [
                {
                  "name": "editable",
                  "type": "BOOLEAN",
                  "description": "When true, allows typing in the text field to filter options; when false, dropdown only",
                  "required": false
                },
                {
                  "name": "pattern",
                  "type": "STRING",
                  "description": "Regular expression pattern for validating text input in editable mode",
                  "required": false
                },
                {
                  "name": "text",
                  "type": "STRING",
                  "description": "The display text shown in the input field",
                  "required": false
                },
                {
                  "name": "value",
                  "type": "STRING",
                  "description": "The value of the selected option",
                  "required": false
                },
                {
                  "name": "size",
                  "type": "NUMBER",
                  "description": "Number of visible rows in the dropdown list",
                  "required": false
                }
              ],
              "examples": [
                {
                  "title": "Basic ComboBox",
                  "description": "A dropdown combobox with predefined options.",
                  "code": "<gooeyui-combobox>\n  <option value=\"1\">Option 1</option>\n  <option value=\"2\">Option 2</option>\n  <option value=\"3\">Option 3</option>\n</gooeyui-combobox>"
                },
                {
                  "title": "Editable ComboBox",
                  "description": "A combobox that allows typing to filter or enter custom values.",
                  "code": "<gooeyui-combobox editable>\n  <option value=\"red\">Red</option>\n  <option value=\"green\">Green</option>\n  <option value=\"blue\">Blue</option>\n</gooeyui-combobox>"
                },
                {
                  "title": "ComboBox with Validation",
                  "description": "An editable combobox with pattern validation.",
                  "code": "<gooeyui-combobox editable pattern=\"^[A-Za-z]+$\">\n  <option>Apple</option>\n  <option>Banana</option>\n</gooeyui-combobox>"
                }
              ]
            },
            {
              "name": "DropDownList",
              "tagName": "gooeyui-dropdownlist",
              "description": "A dropdown selection control for choosing one item from a list.",
              "inherits": ["UIComponent", "FormElement"],
              "attributes": [],
              "examples": [
                {
                  "title": "Basic Dropdown List",
                  "description": "A simple dropdown for selecting a single option.",
                  "code": "<gooeyui-dropdownlist>\n  <option value=\"us\">United States</option>\n  <option value=\"uk\">United Kingdom</option>\n  <option value=\"ca\">Canada</option>\n</gooeyui-dropdownlist>"
                },
                {
                  "title": "Required Dropdown",
                  "description": "A dropdown that requires a selection.",
                  "code": "<gooeyui-dropdownlist required>\n  <option value=\"\">Select a country...</option>\n  <option value=\"us\">United States</option>\n  <option value=\"uk\">United Kingdom</option>\n</gooeyui-dropdownlist>"
                }
              ]
            },
            {
              "name": "ListBox",
              "tagName": "gooeyui-listbox",
              "description": "A scrollable list control supporting single or multiple selection.",
              "inherits": ["UIComponent", "FormElement"],
              "attributes": [
                {
                  "name": "size",
                  "type": "NUMBER",
                  "description": "Number of visible rows displayed in the list without scrolling",
                  "required": false
                }
              ],
              "examples": [
                {
                  "title": "Basic ListBox",
                  "description": "A list displaying multiple visible options.",
                  "code": "<gooeyui-listbox size=\"5\">\n  <option>Item 1</option>\n  <option>Item 2</option>\n  <option>Item 3</option>\n  <option>Item 4</option>\n  <option>Item 5</option>\n</gooeyui-listbox>"
                },
                {
                  "title": "Compact ListBox",
                  "description": "A smaller list showing fewer visible items.",
                  "code": "<gooeyui-listbox size=\"3\">\n  <option>Choice A</option>\n  <option>Choice B</option>\n  <option>Choice C</option>\n</gooeyui-listbox>"
                }
              ]
            }
          ]
        },
        {
          "name": "Text",
          "elements": [
            {
              "name": "PasswordField",
              "tagName": "gooeyui-passwordfield",
              "description": "A text input control that masks entered characters for password entry.",
              "inherits": ["UIComponent", "FormElement", "TextElement"],
              "attributes": [
                {
                  "name": "inputmode",
                  "type": "ENUM",
                  "values": ["decimal", "email", "none", "numeric", "search", "tel", "text", "url"],
                  "description": "Hint to the browser about the type of virtual keyboard to display",
                  "required": false
                },
                {
                  "name": "pattern",
                  "type": "STRING",
                  "description": "Regular expression pattern for validating the password input",
                  "required": false
                },
                {
                  "name": "size",
                  "type": "NUMBER",
                  "description": "Visible width of the input field in characters",
                  "required": false
                }
              ],
              "examples": [
                {
                  "title": "Basic Password Field",
                  "description": "A simple password input field.",
                  "code": "<gooeyui-passwordfield placeholder=\"Enter password\"></gooeyui-passwordfield>"
                },
                {
                  "title": "Password with Requirements",
                  "description": "A password field with minimum length and pattern validation.",
                  "code": "<gooeyui-passwordfield minLength=\"8\" pattern=\"^(?=.*[A-Z])(?=.*[0-9]).*$\" required></gooeyui-passwordfield>"
                },
                {
                  "title": "Sized Password Field",
                  "description": "A password field with specific visible width.",
                  "code": "<gooeyui-passwordfield size=\"20\" placeholder=\"Password\"></gooeyui-passwordfield>"
                }
              ]
            },
            {
              "name": "RichTextEditor",
              "tagName": "gooeyui-richtexteditor",
              "description": "A WYSIWYG HTML editor with formatting toolbar for rich text content.",
              "inherits": ["UIComponent", "FormElement"],
              "attributes": [
                {
                  "name": "value",
                  "type": "STRING",
                  "description": "The HTML content displayed and edited in the rich text editor",
                  "required": false
                }
              ],
              "examples": [
                {
                  "title": "Basic Rich Text Editor",
                  "description": "A WYSIWYG editor for formatted content.",
                  "code": "<gooeyui-richtexteditor></gooeyui-richtexteditor>"
                },
                {
                  "title": "Editor with Initial Content",
                  "description": "A rich text editor with pre-populated HTML content.",
                  "code": "<gooeyui-richtexteditor value=\"<p>Welcome to the <strong>editor</strong>!</p>\"></gooeyui-richtexteditor>"
                },
                {
                  "title": "Sized Editor",
                  "description": "A rich text editor with specific dimensions.",
                  "code": "<gooeyui-richtexteditor width=\"600\" height=\"400\"></gooeyui-richtexteditor>"
                }
              ]
            },
            {
              "name": "TextArea",
              "tagName": "gooeyui-textarea",
              "description": "A multi-line text input control for longer text content.",
              "inherits": ["UIComponent", "FormElement", "TextElement"],
              "attributes": [
                {
                  "name": "cols",
                  "type": "NUMBER",
                  "description": "Visible width of the textarea in character columns",
                  "required": false
                },
                {
                  "name": "rows",
                  "type": "NUMBER",
                  "description": "Visible height of the textarea in text lines",
                  "required": false
                },
                {
                  "name": "wrap",
                  "type": "ENUM",
                  "values": ["hard", "off", "soft"],
                  "description": "Line wrapping behavior: 'soft' wraps but no newlines, 'hard' wraps with newlines, 'off' no wrapping",
                  "required": false
                },
                {
                  "name": "resize",
                  "type": "BOOLEAN",
                  "description": "When true, allows user to resize the textarea; when false, resizing is disabled",
                  "required": false
                }
              ],
              "examples": [
                {
                  "title": "Basic TextArea",
                  "description": "A multi-line text input for comments or descriptions.",
                  "code": "<gooeyui-textarea rows=\"4\" cols=\"50\" placeholder=\"Enter your message...\"></gooeyui-textarea>"
                },
                {
                  "title": "Non-Resizable TextArea",
                  "description": "A textarea that cannot be resized by the user.",
                  "code": "<gooeyui-textarea rows=\"6\" cols=\"40\" resize=\"false\"></gooeyui-textarea>"
                },
                {
                  "title": "TextArea with Character Limit",
                  "description": "A textarea with maximum character constraint.",
                  "code": "<gooeyui-textarea rows=\"3\" maxLength=\"500\" placeholder=\"Max 500 characters\"></gooeyui-textarea>"
                }
              ]
            },
            {
              "name": "TextField",
              "tagName": "gooeyui-textfield",
              "description": "A single-line text input control for various data types.",
              "inherits": ["UIComponent", "FormElement", "TextElement"],
              "attributes": [
                {
                  "name": "inputmode",
                  "type": "ENUM",
                  "values": ["decimal", "email", "none", "numeric", "search", "tel", "text", "url"],
                  "description": "Hint to the browser about the type of virtual keyboard to display",
                  "required": false
                },
                {
                  "name": "pattern",
                  "type": "STRING",
                  "description": "Regular expression pattern for validating the input value",
                  "required": false
                },
                {
                  "name": "size",
                  "type": "NUMBER",
                  "description": "Visible width of the input field in characters",
                  "required": false
                },
                {
                  "name": "type",
                  "type": "STRING",
                  "description": "Input type determining behavior (e.g., 'text', 'email', 'number', 'url')",
                  "required": false
                }
              ],
              "examples": [
                {
                  "title": "Basic Text Field",
                  "description": "A simple single-line text input.",
                  "code": "<gooeyui-textfield placeholder=\"Enter your name\"></gooeyui-textfield>"
                },
                {
                  "title": "Email Input",
                  "description": "A text field optimized for email entry.",
                  "code": "<gooeyui-textfield type=\"email\" inputmode=\"email\" placeholder=\"email@example.com\"></gooeyui-textfield>"
                },
                {
                  "title": "Phone Number Input",
                  "description": "A text field with pattern validation for phone numbers.",
                  "code": "<gooeyui-textfield inputmode=\"tel\" pattern=\"^[0-9]{3}-[0-9]{3}-[0-9]{4}$\" placeholder=\"123-456-7890\"></gooeyui-textfield>"
                },
                {
                  "title": "Required Field",
                  "description": "A text field that must be filled before form submission.",
                  "code": "<gooeyui-textfield required placeholder=\"Required field\"></gooeyui-textfield>"
                }
              ]
            }
          ]
        }
      ]
    },
    {
      "name": "Panels",
      "elements": [
        {
          "name": "AccordionPanel",
          "tagName": "gooeyui-accordionpanel",
          "description": "A container with collapsible sections that expand/collapse individual sections.",
          "inherits": ["UIComponent", "Container"],
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
          "inherits": ["UIComponent", "Container"],
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
          "inherits": ["UIComponent", "Container"],
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
          "inherits": ["UIComponent", "Container"],
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
          "description": "A basic container panel for organizing and grouping UI content.",
          "inherits": ["UIComponent", "Container"],
          "attributes": [
            {
              "name": "title",
              "type": "STRING",
              "description": "Header text displayed at the top of the panel",
              "required": false
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
            }
          ]
        },
        {
          "name": "SplitPanel",
          "tagName": "gooeyui-splitpanel",
          "description": "A panel divided into two resizable panes separated by a draggable divider.",
          "inherits": ["UIComponent", "Container"],
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
              "type": "NUMBER",
              "description": "Initial position of the divider as a percentage (0-100) of the panel size",
              "required": false
            },
            {
              "name": "minimumlocation",
              "type": "NUMBER",
              "description": "Minimum divider position as a percentage to prevent panes from becoming too small",
              "required": false
            },
            {
              "name": "maximumlocation",
              "type": "NUMBER",
              "description": "Maximum divider position as a percentage to prevent panes from becoming too large",
              "required": false
            }
          ],
          "examples": [
            {
              "title": "Horizontal Split",
              "description": "A panel split horizontally with left and right panes.",
              "code": "<gooeyui-splitpanel orientation=\"horizontal\" dividerlocation=\"30\">\n  <gooeyui-panel>Left pane</gooeyui-panel>\n  <gooeyui-panel>Right pane</gooeyui-panel>\n</gooeyui-splitpanel>"
            },
            {
              "title": "Vertical Split",
              "description": "A panel split vertically with top and bottom panes.",
              "code": "<gooeyui-splitpanel orientation=\"vertical\" dividerlocation=\"50\">\n  <gooeyui-panel>Top pane</gooeyui-panel>\n  <gooeyui-panel>Bottom pane</gooeyui-panel>\n</gooeyui-splitpanel>"
            },
            {
              "title": "Constrained Split",
              "description": "A split panel with minimum and maximum divider positions.",
              "code": "<gooeyui-splitpanel orientation=\"horizontal\" dividerlocation=\"25\" minimumlocation=\"20\" maximumlocation=\"40\">\n  <gooeyui-panel>Navigation</gooeyui-panel>\n  <gooeyui-panel>Content</gooeyui-panel>\n</gooeyui-splitpanel>"
            }
          ]
        },
        {
          "name": "Tab",
          "tagName": "gooeyui-tab",
          "description": "A single tab within a TabPanel, representing a named content section.",
          "inherits": ["UIComponent", "Container"],
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
          "inherits": ["UIComponent", "Container"],
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
    },
    {
      "name": "Menus",
      "elements": [
        {
          "name": "CheckboxMenuItem",
          "tagName": "gooeyui-checkboxmenuitem",
          "description": "A menu item with a checkbox for toggling a boolean value.",
          "inherits": ["UIComponent"],
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
          "inherits": ["UIComponent", "Container"],
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
          "name": "Menu",
          "tagName": "gooeyui-menu",
          "description": "A dropdown menu containing menu items and submenus.",
          "inherits": ["UIComponent", "Container"],
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
          "name": "MenuItem",
          "tagName": "gooeyui-menuitem",
          "description": "A clickable item within a menu.",
          "inherits": ["UIComponent"],
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
          "inherits": ["UIComponent"],
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
          "name": "Menubar",
          "tagName": "gooeyui-menubar",
          "description": "A horizontal menu bar containing top-level menus.",
          "inherits": ["UIComponent", "Container"],
          "attributes": [],
          "examples": [
            {
              "title": "Application Menu Bar",
              "description": "A standard menu bar with File, Edit, and Help menus.",
              "code": "<gooeyui-menubar>\n  <gooeyui-menu text=\"File\">\n    <gooeyui-menuitem text=\"New\"></gooeyui-menuitem>\n    <gooeyui-menuitem text=\"Open\"></gooeyui-menuitem>\n    <gooeyui-menuitem text=\"Save\"></gooeyui-menuitem>\n  </gooeyui-menu>\n  <gooeyui-menu text=\"Edit\">\n    <gooeyui-menuitem text=\"Cut\"></gooeyui-menuitem>\n    <gooeyui-menuitem text=\"Copy\"></gooeyui-menuitem>\n    <gooeyui-menuitem text=\"Paste\"></gooeyui-menuitem>\n  </gooeyui-menu>\n  <gooeyui-menu text=\"Help\">\n    <gooeyui-menuitem text=\"About\"></gooeyui-menuitem>\n  </gooeyui-menu>\n</gooeyui-menubar>"
            }
          ]
        }
      ]
    },
    {
      "name": "Toolbars",
      "elements": [
        {
          "name": "Toolbar",
          "tagName": "gooeyui-toolbar",
          "description": "A container bar for organizing action buttons and controls.",
          "inherits": ["UIComponent", "Container"],
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
          "inherits": ["UIComponent"],
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
    },
    {
      "name": "Windows",
      "elements": [
        {
          "name": "FloatingPane",
          "tagName": "gooeyui-floatingpane",
          "description": "A floating window pane that can be positioned anywhere on the screen.",
          "inherits": ["UIComponent", "Container"],
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
          "description": "A modal or modeless dialog window with title bar and close button.",
          "inherits": ["UIComponent", "Container"],
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
              "title": "Basic Dialog Window",
              "description": "A simple dialog window with a title.",
              "code": "<gooeyui-window wintitle=\"Settings\">\n  <gooeyui-formpanel>\n    <!-- Settings form content -->\n  </gooeyui-formpanel>\n</gooeyui-window>"
            },
            {
              "title": "Modal Dialog",
              "description": "A modal window that blocks interaction with the background.",
              "code": "<gooeyui-window wintitle=\"Confirm Action\" modal>\n  <gooeyui-label text=\"Are you sure?\"></gooeyui-label>\n  <gooeyui-button text=\"Yes\"></gooeyui-button>\n  <gooeyui-button text=\"No\"></gooeyui-button>\n</gooeyui-window>"
            },
            {
              "title": "Constrained Window",
              "description": "A window that cannot be moved outside the viewport.",
              "code": "<gooeyui-window wintitle=\"Editor\" constrainviewport width=\"600\" height=\"400\">\n  <gooeyui-richtexteditor></gooeyui-richtexteditor>\n</gooeyui-window>"
            }
          ]
        }
      ]
    },
    {
      "name": "Other",
      "elements": [
        {
          "name": "Border",
          "tagName": "gooeyui-border",
          "description": "A border styling component defining edge styles and colors.",
          "inherits": ["UIComponent"],
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
              "values": ["DASHED", "DOTTED", "DOUBLE", "GROOVE", "HIDDEN", "INSET", "NONE", "OUTSET", "RIDGE", "SOLID"],
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
          "name": "ColorPicker",
          "tagName": "gooeyui-colorpicker",
          "description": "An interactive color picker for selecting and displaying colors.",
          "inherits": ["UIComponent"],
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
          "inherits": ["UIComponent"],
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
              "values": ["400", "700"],
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
          "inherits": ["UIComponent"],
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
              "values": ["LEFT", "CENTER", "RIGHT"],
              "description": "Horizontal alignment of label content",
              "required": false
            },
            {
              "name": "valign",
              "type": "ENUM",
              "values": ["TOP", "CENTER", "BOTTOM"],
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
          "name": "ProgressBar",
          "tagName": "gooeyui-progressbar",
          "description": "A visual progress indicator showing completion percentage or indeterminate progress.",
          "inherits": ["UIComponent"],
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
        },
        {
          "name": "Tree",
          "tagName": "gooeyui-tree",
          "description": "A hierarchical tree structure for displaying nested items with expand/collapse.",
          "inherits": ["UIComponent", "Container"],
          "attributes": [],
          "examples": [
            {
              "title": "Basic Tree",
              "description": "A hierarchical tree structure with nested items.",
              "code": "<gooeyui-tree>\n  <gooeyui-treeitem text=\"Documents\" expanded>\n    <gooeyui-treeitem text=\"Work\"></gooeyui-treeitem>\n    <gooeyui-treeitem text=\"Personal\"></gooeyui-treeitem>\n  </gooeyui-treeitem>\n  <gooeyui-treeitem text=\"Pictures\"></gooeyui-treeitem>\n</gooeyui-tree>"
            },
            {
              "title": "File Browser Tree",
              "description": "A tree structure for file system navigation.",
              "code": "<gooeyui-tree>\n  <gooeyui-treeitem text=\"C:\" icon=\"icons/drive.png\" expanded>\n    <gooeyui-treeitem text=\"Program Files\" icon=\"icons/folder.png\"></gooeyui-treeitem>\n    <gooeyui-treeitem text=\"Users\" icon=\"icons/folder.png\"></gooeyui-treeitem>\n  </gooeyui-treeitem>\n</gooeyui-tree>"
            }
          ]
        },
        {
          "name": "TreeItem",
          "tagName": "gooeyui-treeitem",
          "description": "A single node within a Tree hierarchy with optional icon and expand capability.",
          "inherits": ["UIComponent"],
          "attributes": [
            {
              "name": "text",
              "type": "STRING",
              "description": "Display text for the tree item node",
              "required": false
            },
            {
              "name": "icon",
              "type": "STRING",
              "description": "URL path to an icon image displayed for the tree item",
              "required": false
            },
            {
              "name": "expanded",
              "type": "BOOLEAN",
              "description": "When true, child items are displayed; when false, child items are hidden",
              "required": false
            },
            {
              "name": "droptree",
              "type": "STRING",
              "description": "Identifier of a tree that items can be dropped into",
              "required": false
            },
            {
              "name": "editable",
              "type": "BOOLEAN",
              "description": "When true, the tree item text can be edited by user",
              "required": false
            }
          ],
          "examples": [
            {
              "title": "Basic Tree Item",
              "description": "A simple tree item node.",
              "code": "<gooeyui-treeitem text=\"Folder\"></gooeyui-treeitem>"
            },
            {
              "title": "Tree Item with Icon",
              "description": "A tree item with a custom icon.",
              "code": "<gooeyui-treeitem text=\"Document.pdf\" icon=\"icons/pdf.png\"></gooeyui-treeitem>"
            },
            {
              "title": "Expandable Tree Item",
              "description": "A tree item with child items that starts expanded.",
              "code": "<gooeyui-treeitem text=\"Projects\" expanded>\n  <gooeyui-treeitem text=\"Project A\"></gooeyui-treeitem>\n  <gooeyui-treeitem text=\"Project B\"></gooeyui-treeitem>\n</gooeyui-treeitem>"
            },
            {
              "title": "Editable Tree Item",
              "description": "A tree item whose text can be edited by the user.",
              "code": "<gooeyui-treeitem text=\"New Folder\" editable></gooeyui-treeitem>"
            }
          ]
        },
        {
          "name": "CodeBlock",
          "tagName": "gooeyui-codeblock",
          "description": "A code display component for showing code snippets with line numbers, copy button, and language label.",
          "inherits": ["UIComponent"],
          "attributes": [
            {
              "name": "language",
              "type": "STRING",
              "description": "Language name displayed in the header badge (e.g., 'javascript', 'python')",
              "required": false
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
              "title": "Code Block without Line Numbers",
              "description": "A minimal code block without line numbers.",
              "code": "<gooeyui-codeblock linenumbers=\"false\">\nnpm install gooeyjs\n</gooeyui-codeblock>"
            },
            {
              "title": "Minimal Code Block",
              "description": "A code block with no header elements.",
              "code": "<gooeyui-codeblock linenumbers=\"false\" copybutton=\"false\">\nSimple text display\n</gooeyui-codeblock>"
            },
            {
              "title": "Multi-language Examples",
              "description": "Code blocks for different programming languages.",
              "code": "<gooeyui-codeblock language=\"python\">\ndef greet(name):\n    print(f\"Hello, {name}!\")\n</gooeyui-codeblock>\n\n<gooeyui-codeblock language=\"html\">\n<div class=\"container\">\n    <h1>Title</h1>\n</div>\n</gooeyui-codeblock>"
            }
          ]
        }
      ]
    },
    {
      "name": "Data",
      "elements": [
        {
          "name": "DataGrid",
          "tagName": "gooeyui-datagrid",
          "description": "A full-featured data grid component with virtual scrolling, sorting, filtering, multiple selection modes, column resizing, and inline cell editing. Efficiently handles large datasets (10,000+ rows) through virtual scrolling.",
          "inherits": ["UIComponent"],
          "attributes": [
            {
              "name": "selectionmode",
              "type": "ENUM",
              "values": ["none", "single-row", "multiple-row", "cell"],
              "description": "Selection behavior: 'none' disables selection, 'single-row' allows one row, 'multiple-row' allows multiple rows with Ctrl/Shift, 'cell' allows individual cell selection",
              "required": false
            },
            {
              "name": "rowheight",
              "type": "NUMBER",
              "description": "Height of each row in pixels (default: 30)",
              "required": false
            },
            {
              "name": "showfilters",
              "type": "BOOLEAN",
              "description": "When true, displays a filter row below the header for column filtering",
              "required": false
            },
            {
              "name": "editable",
              "type": "BOOLEAN",
              "description": "When true, enables inline cell editing via double-click or F2 key",
              "required": false
            }
          ],
          "examples": [
            {
              "title": "Basic DataGrid",
              "description": "A simple data grid with sortable columns.",
              "code": "<gooeyui-datagrid id=\"grid\" height=\"300\">\n  <gooeyui-datagridcolumn field=\"id\" header=\"ID\" width=\"60\"></gooeyui-datagridcolumn>\n  <gooeyui-datagridcolumn field=\"name\" header=\"Name\" width=\"150\"></gooeyui-datagridcolumn>\n  <gooeyui-datagridcolumn field=\"email\" header=\"Email\" width=\"200\"></gooeyui-datagridcolumn>\n</gooeyui-datagrid>\n\n<script>\n  document.getElementById('grid').setData([\n    { id: 1, name: 'John Doe', email: 'john@example.com' },\n    { id: 2, name: 'Jane Smith', email: 'jane@example.com' }\n  ]);\n</script>"
            },
            {
              "title": "DataGrid with Filtering",
              "description": "A data grid with filter row enabled for searching data.",
              "code": "<gooeyui-datagrid showfilters=\"true\" selectionmode=\"multiple-row\">\n  <gooeyui-datagridcolumn field=\"name\" header=\"Name\" filterable></gooeyui-datagridcolumn>\n  <gooeyui-datagridcolumn field=\"department\" header=\"Department\" filterable></gooeyui-datagridcolumn>\n  <gooeyui-datagridcolumn field=\"salary\" header=\"Salary\"></gooeyui-datagridcolumn>\n</gooeyui-datagrid>"
            },
            {
              "title": "Editable DataGrid",
              "description": "A data grid with inline cell editing capability.",
              "code": "<gooeyui-datagrid editable=\"true\" selectionmode=\"cell\">\n  <gooeyui-datagridcolumn field=\"product\" header=\"Product\" editable></gooeyui-datagridcolumn>\n  <gooeyui-datagridcolumn field=\"quantity\" header=\"Qty\" width=\"80\" editable></gooeyui-datagridcolumn>\n  <gooeyui-datagridcolumn field=\"price\" header=\"Price\" width=\"100\" editable></gooeyui-datagridcolumn>\n</gooeyui-datagrid>"
            },
            {
              "title": "DataGrid with Event Handling",
              "description": "A data grid with event listeners for user interactions.",
              "code": "<gooeyui-datagrid id=\"eventGrid\" selectionmode=\"single-row\">\n  <gooeyui-datagridcolumn field=\"id\" header=\"ID\" width=\"60\"></gooeyui-datagridcolumn>\n  <gooeyui-datagridcolumn field=\"title\" header=\"Title\" width=\"200\"></gooeyui-datagridcolumn>\n</gooeyui-datagrid>\n\n<script>\n  const grid = document.getElementById('eventGrid');\n  \n  grid.addEventListener('selection-changed', (e, detail) => {\n    console.log('Selected:', detail.selectedRows);\n  });\n  \n  grid.addEventListener('sort-changed', (e, detail) => {\n    console.log('Sorted by:', detail.field, detail.direction);\n  });\n  \n  grid.addEventListener('row-activated', (e, detail) => {\n    console.log('Double-clicked row:', detail.data);\n  });\n</script>"
            }
          ]
        },
        {
          "name": "DataGridColumn",
          "tagName": "gooeyui-datagridcolumn",
          "description": "A column definition component used within DataGrid to define column properties including data field binding, header text, width, and behavior flags for sorting, filtering, editing, and resizing.",
          "inherits": ["UIComponent"],
          "attributes": [
            {
              "name": "field",
              "type": "STRING",
              "description": "The data field name this column displays from the row data object",
              "required": true
            },
            {
              "name": "header",
              "type": "STRING",
              "description": "Display text shown in the column header (defaults to field name if not specified)",
              "required": false
            },
            {
              "name": "width",
              "type": "NUMBER",
              "description": "Column width in pixels (default: 100)",
              "required": false
            },
            {
              "name": "minwidth",
              "type": "NUMBER",
              "description": "Minimum column width in pixels when resizing (default: 50)",
              "required": false
            },
            {
              "name": "sortable",
              "type": "BOOLEAN",
              "description": "When true (default), clicking the column header sorts the data",
              "required": false
            },
            {
              "name": "filterable",
              "type": "BOOLEAN",
              "description": "When true, displays a filter input for this column when showfilters is enabled on the grid",
              "required": false
            },
            {
              "name": "editable",
              "type": "BOOLEAN",
              "description": "When true, cells in this column can be edited inline",
              "required": false
            },
            {
              "name": "resizable",
              "type": "BOOLEAN",
              "description": "When true (default), the column can be resized by dragging the header border",
              "required": false
            }
          ],
          "examples": [
            {
              "title": "Basic Column",
              "description": "A simple sortable column definition.",
              "code": "<gooeyui-datagridcolumn field=\"name\" header=\"Full Name\" width=\"150\"></gooeyui-datagridcolumn>"
            },
            {
              "title": "ID Column (Non-Sortable)",
              "description": "A narrow column for identifiers that cannot be sorted.",
              "code": "<gooeyui-datagridcolumn field=\"id\" header=\"ID\" width=\"60\" sortable=\"false\" resizable=\"false\"></gooeyui-datagridcolumn>"
            },
            {
              "title": "Filterable Column",
              "description": "A column that shows a filter input when filters are enabled.",
              "code": "<gooeyui-datagridcolumn field=\"department\" header=\"Department\" filterable></gooeyui-datagridcolumn>"
            },
            {
              "title": "Editable Column",
              "description": "A column whose cells can be edited by double-clicking.",
              "code": "<gooeyui-datagridcolumn field=\"notes\" header=\"Notes\" width=\"250\" editable></gooeyui-datagridcolumn>"
            },
            {
              "title": "Full-Featured Column",
              "description": "A column with all features enabled.",
              "code": "<gooeyui-datagridcolumn \n  field=\"email\" \n  header=\"Email Address\" \n  width=\"200\" \n  minwidth=\"100\" \n  sortable \n  filterable \n  editable \n  resizable>\n</gooeyui-datagridcolumn>"
            }
          ]
        }
      ]
    }
    ],
    "elements": [
      {
        "name": "Application",
        "tagName": "gooey-application",
        "description": "Root container for a GooeyJS application providing the main application structure.",
        "inherits": ["UIComponent"],
        "attributes": [],
        "examples": [
          {
            "title": "Basic Application",
            "description": "A simple GooeyJS application structure.",
            "code": "<gooey-application>\n  <gooeyui-apppanel>\n    <gooeyui-menubar>...</gooeyui-menubar>\n    <gooeyui-panel>Application content</gooeyui-panel>\n  </gooeyui-apppanel>\n</gooey-application>"
          },
          {
            "title": "Full Application Layout",
            "description": "A complete application with menubar, toolbar, and content area.",
            "code": "<gooey-application>\n  <gooeyui-apppanel>\n    <gooeyui-menubar>\n      <gooeyui-menu text=\"File\">...</gooeyui-menu>\n      <gooeyui-menu text=\"Edit\">...</gooeyui-menu>\n    </gooeyui-menubar>\n    <gooeyui-toolbar>...</gooeyui-toolbar>\n    <gooeyui-splitpanel orientation=\"horizontal\">\n      <gooeyui-tree>...</gooeyui-tree>\n      <gooeyui-panel>Main content</gooeyui-panel>\n    </gooeyui-splitpanel>\n  </gooeyui-apppanel>\n</gooey-application>"
          }
        ]
      },
      {
        "name": "Component",
        "tagName": "gooey-component",
        "description": "A component loader that dynamically loads and renders component HTML from an external file.",
        "inherits": [],
        "attributes": [
          {
            "name": "href",
            "type": "STRING",
            "description": "URL path to the external HTML file containing the component to load",
            "required": true
          }
        ],
        "examples": [
          {
            "title": "Load External Component",
            "description": "Dynamically load a component from an external HTML file.",
            "code": "<gooey-component href=\"components/header.html\"></gooey-component>"
          },
          {
            "title": "Modular Page Layout",
            "description": "Building a page from multiple external component files.",
            "code": "<gooey-application>\n  <gooey-component href=\"components/navigation.html\"></gooey-component>\n  <gooey-component href=\"components/sidebar.html\"></gooey-component>\n  <gooey-component href=\"components/main-content.html\"></gooey-component>\n  <gooey-component href=\"components/footer.html\"></gooey-component>\n</gooey-application>"
          },
          {
            "title": "Lazy Loading",
            "description": "Load a component only when needed.",
            "code": "<!-- Component loads when rendered -->\n<gooey-component href=\"views/settings-panel.html\"></gooey-component>"
          }
        ]
      }
    ]
  }
};
