const formCategory = {
  "name": "form",
  "elements": [
    {
      "name": "Checkbox",
      "tagName": "gooeyui-checkbox",
      "description": "A checkbox input control for binary true/false selection.",
      "inherits": [
        "UIComponent",
        "FormElement"
      ],
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
      "inherits": [
        "UIComponent",
        "FormElement"
      ],
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
      "inherits": [
        "UIComponent",
        "FormElement"
      ],
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
      "inherits": [
        "UIComponent",
        "Container"
      ],
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
      "name": "Slider",
      "tagName": "gooeyui-slider",
      "description": "A range input control for selecting a numeric value by dragging a thumb along a track. Supports both horizontal and vertical orientations, optional tick marks with value labels, and a floating tooltip that follows the thumb during interaction. The value is clamped to the min/max range and snapped to the nearest step increment. Supports mouse, touch, and full keyboard navigation with arrow keys, Page Up/Down, and Home/End.",
      "inherits": [
        "UIComponent",
        "FormElement"
      ],
      "attributes": [
        {
          "name": "value",
          "type": "NUMBER",
          "description": "Current slider value, clamped to the min/max range and snapped to the nearest step increment",
          "required": false
        },
        {
          "name": "min",
          "type": "NUMBER",
          "description": "Minimum allowed value (default: 0)",
          "required": false
        },
        {
          "name": "max",
          "type": "NUMBER",
          "description": "Maximum allowed value (default: 100)",
          "required": false
        },
        {
          "name": "step",
          "type": "NUMBER",
          "description": "Step increment for value changes. Supports decimal values for fine-grained control (default: 1)",
          "required": false
        },
        {
          "name": "orientation",
          "type": "ENUM",
          "values": ["horizontal", "vertical"],
          "description": "Direction of the slider track (default: horizontal)",
          "required": false
        },
        {
          "name": "showTicks",
          "type": "BOOLEAN",
          "description": "When true, displays tick marks along the track at each step or tickInterval",
          "required": false
        },
        {
          "name": "tickInterval",
          "type": "NUMBER",
          "description": "Spacing between tick marks. When not set, ticks appear at every step value",
          "required": false
        },
        {
          "name": "showValue",
          "type": "BOOLEAN",
          "description": "When true, displays value labels alongside tick marks",
          "required": false
        },
        {
          "name": "showTooltip",
          "type": "BOOLEAN",
          "description": "When true, shows a floating tooltip displaying the current value on hover and during drag",
          "required": false
        },
        {
          "name": "readOnly",
          "type": "BOOLEAN",
          "description": "When true, the slider displays its value but cannot be changed by user interaction",
          "required": false
        }
      ],
      "examples": [
        {
          "title": "Basic Slider",
          "description": "A simple horizontal slider with default range 0-100.",
          "code": "<gooeyui-slider value=\"50\"></gooeyui-slider>"
        },
        {
          "title": "Constrained Range with Step",
          "description": "A slider limited to a specific range with step increments of 5.",
          "code": "<gooeyui-slider min=\"0\" max=\"50\" step=\"5\" value=\"25\"></gooeyui-slider>"
        },
        {
          "title": "Slider with Tick Marks and Labels",
          "description": "A slider displaying tick marks and value labels at intervals of 20.",
          "code": "<gooeyui-slider min=\"0\" max=\"100\" step=\"1\" showTicks tickInterval=\"20\" showValue value=\"40\"></gooeyui-slider>"
        },
        {
          "title": "Slider with Tooltip",
          "description": "A slider that shows a floating tooltip with the current value during interaction.",
          "code": "<gooeyui-slider min=\"0\" max=\"100\" showTooltip value=\"75\"></gooeyui-slider>"
        },
        {
          "title": "Decimal Step Slider",
          "description": "A slider for fine-grained numeric selection using decimal step values.",
          "code": "<gooeyui-slider min=\"0\" max=\"1\" step=\"0.01\" value=\"0.5\" showTooltip></gooeyui-slider>"
        },
        {
          "title": "Vertical Slider",
          "description": "A slider oriented vertically.",
          "code": "<gooeyui-slider orientation=\"vertical\" min=\"0\" max=\"100\" value=\"30\" height=\"200\"></gooeyui-slider>"
        },
        {
          "title": "Slider with Event Handling",
          "description": "Listening for slider events during user interaction.",
          "code": "<gooeyui-slider id=\"volumeSlider\" min=\"0\" max=\"100\" value=\"50\" showTooltip></gooeyui-slider>\n\n<script>\n  const slider = document.getElementById('volumeSlider');\n  \n  slider.addEventListener('slider-input', (e, data) => {\n    console.log('Dragging:', data.value);\n  });\n  \n  slider.addEventListener('slider-change', (e, data) => {\n    console.log('Final value:', data.value);\n  });\n</script>"
        }
      ]
    },
    {
      "name": "Spinner",
      "tagName": "gooeyui-spinner",
      "description": "A numeric input control with increment and decrement buttons.",
      "inherits": [
        "UIComponent",
        "FormElement"
      ],
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
      "inherits": [
        "UIComponent",
        "FormElement"
      ],
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
      "name": "list",
      "elements": [
        {
          "name": "ComboBox",
          "tagName": "gooeyui-combobox",
          "description": "A dropdown list with optional editable text input for filtering and selection.",
          "inherits": [
            "UIComponent",
            "FormElement"
          ],
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
          "inherits": [
            "UIComponent",
            "FormElement"
          ],
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
          "inherits": [
            "UIComponent",
            "FormElement"
          ],
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
      "name": "text",
      "elements": [
        {
          "name": "PasswordField",
          "tagName": "gooeyui-passwordfield",
          "description": "A text input control that masks entered characters for password entry.",
          "inherits": [
            "UIComponent",
            "FormElement",
            "TextElement"
          ],
          "attributes": [
            {
              "name": "inputmode",
              "type": "ENUM",
              "values": [
                "decimal",
                "email",
                "none",
                "numeric",
                "search",
                "tel",
                "text",
                "url"
              ],
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
          "description": "A model-driven WYSIWYG HTML editor with a pluggable architecture. Provides a full formatting toolbar with text styling, block types, alignment, indentation, lists (bullet, ordered, checklist), tables, media insertion (images, video, embeds), search and replace, and undo/redo history. Supports two toolbar modes: an internal full toolbar and external toolbar binding via the group attribute. Air mode provides a floating toolbar that appears on text selection. Content is sanitized on input and output for XSS prevention. Includes full keyboard navigation and input handling via a hidden textarea.",
          "inherits": [
            "UIComponent",
            "FormElement",
            "TextElement"
          ],
          "attributes": [
            {
              "name": "value",
              "type": "STRING",
              "description": "The HTML content displayed and edited in the rich text editor",
              "required": false
            },
            {
              "name": "toolbar",
              "type": "STRING",
              "description": "Toolbar mode. Set to 'full' for the built-in toolbar or omit to use an external toolbar bound via the group attribute (default: full)",
              "required": false
            },
            {
              "name": "group",
              "type": "STRING",
              "description": "Group identifier for binding to an external toolbar. Multiple editors and toolbars with the same group value are synchronized",
              "required": false
            },
            {
              "name": "airMode",
              "type": "BOOLEAN",
              "description": "When true, hides the fixed toolbar and shows a floating toolbar on text selection",
              "required": false
            },
            {
              "name": "spellcheck",
              "type": "BOOLEAN",
              "description": "When true, enables browser spell checking in the editor content area (default: true)",
              "required": false
            },
            {
              "name": "autofocus",
              "type": "BOOLEAN",
              "description": "When true, the editor receives focus automatically when connected to the DOM",
              "required": false
            },
            {
              "name": "placeholder",
              "type": "STRING",
              "description": "Placeholder text displayed when the editor content is empty",
              "required": false
            }
          ],
          "examples": [
            {
              "title": "Basic Rich Text Editor",
              "description": "A WYSIWYG editor with the full built-in toolbar.",
              "code": "<gooeyui-richtexteditor></gooeyui-richtexteditor>"
            },
            {
              "title": "Editor with Initial Content",
              "description": "A rich text editor with pre-populated HTML content.",
              "code": "<gooeyui-richtexteditor value=\"<p>Welcome to the <strong>editor</strong>!</p>\"></gooeyui-richtexteditor>"
            },
            {
              "title": "Sized Editor with Placeholder",
              "description": "A rich text editor with specific dimensions and placeholder text.",
              "code": "<gooeyui-richtexteditor width=\"600\" height=\"400\" placeholder=\"Start writing...\"></gooeyui-richtexteditor>"
            },
            {
              "title": "Air Mode Editor",
              "description": "An editor with no fixed toolbar. A floating toolbar appears when text is selected.",
              "code": "<gooeyui-richtexteditor airMode width=\"600\" height=\"300\"></gooeyui-richtexteditor>"
            },
            {
              "title": "Read-Only Editor",
              "description": "An editor displaying formatted content that cannot be modified.",
              "code": "<gooeyui-richtexteditor readOnly value=\"<h2>Terms of Service</h2><p>Read-only content displayed with full formatting.</p>\"></gooeyui-richtexteditor>"
            },
            {
              "title": "Programmatic Content and Formatting",
              "description": "Using the editor API to manipulate content and apply formatting.",
              "code": "<gooeyui-richtexteditor id=\"myEditor\"></gooeyui-richtexteditor>\n\n<script>\n  const editor = document.getElementById('myEditor');\n  \n  // Set HTML content\n  editor.setHTML('<p>Hello <strong>World</strong></p>');\n  \n  // Apply formatting to selection\n  editor.formatText('bold');\n  editor.formatText('italic');\n  \n  // Insert content\n  editor.insertText('New text here');\n  editor.insertHTML('<table><tr><td>Cell</td></tr></table>');\n  \n  // Query state\n  console.log(editor.getWordCount());\n  console.log(editor.canUndo());\n</script>"
            },
            {
              "title": "Editor Events",
              "description": "Listening for editor lifecycle and content change events.",
              "code": "<gooeyui-richtexteditor id=\"eventEditor\"></gooeyui-richtexteditor>\n\n<script>\n  const editor = document.getElementById('eventEditor');\n  \n  editor.addEventListener('rte-model-changed', (e, data) => {\n    console.log('Content changed');\n  });\n  \n  editor.addEventListener('rte-ready', (e, data) => {\n    console.log('Editor ready');\n  });\n  \n  editor.addEventListener('input', (e, data) => {\n    console.log('User input detected');\n  });\n</script>"
            }
          ]
        },
        {
          "name": "TextArea",
          "tagName": "gooeyui-textarea",
          "description": "A multi-line text input control for longer text content.",
          "inherits": [
            "UIComponent",
            "FormElement",
            "TextElement"
          ],
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
              "values": [
                "hard",
                "off",
                "soft"
              ],
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
          "inherits": [
            "UIComponent",
            "FormElement",
            "TextElement"
          ],
          "attributes": [
            {
              "name": "inputmode",
              "type": "ENUM",
              "values": [
                "decimal",
                "email",
                "none",
                "numeric",
                "search",
                "tel",
                "text",
                "url"
              ],
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
};
