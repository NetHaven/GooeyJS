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
        "name": "data",
        "elements": [
          {
            "name": "Data",
            "tagName": "gooeydata-data",
            "description": "A non-visual component representing a single data record within a Store. Data is defined using standard HTML data-* attributes, which are automatically converted to a JavaScript object with type coercion for numbers, booleans, and null values.",
            "inherits": [],
            "attributes": [],
            "examples": [
              {
                "title": "Basic Data Record",
                "description": "A simple data record with string, number, and boolean fields.",
                "code": "<gooeydata-store id=\"myStore\">\n  <gooeydata-data \n    data-id=\"1\" \n    data-name=\"John Doe\" \n    data-age=\"30\" \n    data-active=\"true\">\n  </gooeydata-data>\n</gooeydata-store>\n\n<script>\n  // Results in: { id: 1, name: 'John Doe', age: 30, active: true }\n  const store = document.getElementById('myStore');\n  console.log(store.getData()[0]);\n</script>"
              },
              {
                "title": "Type Coercion Examples",
                "description": "Demonstrating automatic type conversion from string attributes.",
                "code": "<gooeydata-store id=\"typeStore\">\n  <gooeydata-data \n    data-string=\"hello\"\n    data-integer=\"42\"\n    data-float=\"3.14\"\n    data-bool-true=\"true\"\n    data-bool-false=\"false\"\n    data-null-val=\"null\">\n  </gooeydata-data>\n</gooeydata-store>\n\n<script>\n  const record = document.getElementById('typeStore').getData()[0];\n  // string: 'hello' (string)\n  // integer: 42 (number)\n  // float: 3.14 (number)\n  // boolTrue: true (boolean)\n  // boolFalse: false (boolean)\n  // nullVal: null (null)\n</script>"
              },
              {
                "title": "Dynamic Field Manipulation",
                "description": "Using the Data component API to modify fields programmatically.",
                "code": "<gooeydata-store id=\"dynStore\">\n  <gooeydata-data id=\"record1\" data-name=\"Initial\"></gooeydata-data>\n</gooeydata-store>\n\n<script>\n  const dataEl = document.getElementById('record1');\n  \n  // Set fields\n  dataEl.setField('name', 'Updated Name');\n  dataEl.setField('score', 95);\n  \n  // Get fields\n  console.log(dataEl.getField('name')); // 'Updated Name'\n  console.log(dataEl.getField('score')); // 95\n  \n  // Check and remove fields\n  console.log(dataEl.hasField('score')); // true\n  dataEl.removeField('score');\n</script>"
              }
            ]
          },
          {
            "name": "Store",
            "tagName": "gooeydata-store",
            "description": "A non-visual data store component that holds data records and provides a reactive data API. Data can be defined declaratively using child gooeydata-data elements or programmatically via JavaScript. The store fires events when data changes, enabling automatic updates to bound UI components like DataGrid. Stores can reference a Model to define schema defaults for new records.",
            "inherits": [],
            "attributes": [
              {
                "name": "model",
                "type": "STRING",
                "description": "ID reference to a gooeydata-model element that defines the data schema. When set, the store can use the model's field definitions to create records with default values via createRecord().",
                "required": false
              }
            ],
            "examples": [
              {
                "title": "Basic Store with Static Data",
                "description": "A data store with records defined declaratively using gooeydata-data elements.",
                "code": "<gooeydata-store id=\"userStore\">\n  <gooeydata-data data-id=\"1\" data-name=\"Alice\" data-active=\"true\"></gooeydata-data>\n  <gooeydata-data data-id=\"2\" data-name=\"Bob\" data-active=\"false\"></gooeydata-data>\n</gooeydata-store>\n\n<script>\n  const store = document.getElementById('userStore');\n  console.log(store.getData()); // [{id: 1, name: 'Alice', active: true}, ...]\n</script>"
              },
              {
                "title": "Programmatic Data Management",
                "description": "Using the store API to add, update, and remove records.",
                "code": "<gooeydata-store id=\"taskStore\"></gooeydata-store>\n\n<script>\n  const store = document.getElementById('taskStore');\n  \n  // Add records\n  store.addRecord({ id: 1, task: 'Review PR', done: false });\n  store.addRecord({ id: 2, task: 'Write tests', done: false });\n  \n  // Update a record\n  store.updateRecord(0, { done: true });\n  \n  // Remove by predicate\n  store.removeRecord(r => r.id === 2);\n  \n  // Replace all data\n  store.setData([{ id: 10, task: 'New task', done: false }]);\n</script>"
              },
              {
                "title": "Store with Event Listeners",
                "description": "Listening to store events for data changes.",
                "code": "<gooeydata-store id=\"eventStore\"></gooeydata-store>\n\n<script>\n  const store = document.getElementById('eventStore');\n  \n  store.addEventListener('data-changed', (e, data) => {\n    console.log('Data changed:', data.data, 'Count:', data.count);\n  });\n  \n  store.addEventListener('record-added', (e, data) => {\n    console.log('Added:', data.record, 'at index', data.index);\n  });\n  \n  store.addRecord({ name: 'Test' });\n</script>"
              },
              {
                "title": "Store Bound to DataGrid",
                "description": "A store automatically synchronizing with a DataGrid component.",
                "code": "<gooeydata-store id=\"gridStore\">\n  <gooeydata-data data-id=\"1\" data-product=\"Widget\" data-price=\"29.99\"></gooeydata-data>\n  <gooeydata-data data-id=\"2\" data-product=\"Gadget\" data-price=\"49.99\"></gooeydata-data>\n</gooeydata-store>\n\n<gooeyui-datagrid store=\"gridStore\" height=\"200\">\n  <gooeyui-datagridcolumn field=\"id\" header=\"ID\" width=\"60\"></gooeyui-datagridcolumn>\n  <gooeyui-datagridcolumn field=\"product\" header=\"Product\" width=\"150\"></gooeyui-datagridcolumn>\n  <gooeyui-datagridcolumn field=\"price\" header=\"Price\" width=\"100\"></gooeyui-datagridcolumn>\n</gooeyui-datagrid>"
              },
              {
                "title": "Store with Model Schema",
                "description": "Using a Model to define field types and default values for new records.",
                "code": "<gooeydata-model id=\"employeeModel\">\n  <gooeydata-field name=\"id\" type=\"number\"></gooeydata-field>\n  <gooeydata-field name=\"name\" type=\"string\" defaultvalue=\"New Employee\"></gooeydata-field>\n  <gooeydata-field name=\"active\" type=\"boolean\" defaultvalue=\"true\"></gooeydata-field>\n  <gooeydata-field name=\"salary\" type=\"number\" defaultvalue=\"50000\"></gooeydata-field>\n</gooeydata-model>\n\n<gooeydata-store id=\"employeeStore\" model=\"employeeModel\">\n  <gooeydata-data data-id=\"1\" data-name=\"John Doe\"></gooeydata-data>\n</gooeydata-store>\n\n<script>\n  const store = document.getElementById('employeeStore');\n  \n  // Create a new record with model defaults\n  const newEmployee = store.createRecord({ id: 2 });\n  // Result: { id: 2, name: 'New Employee', active: true, salary: 50000 }\n  \n  store.addRecord(newEmployee);\n</script>"
              }
            ]
          },
          {
            "name": "Field",
            "tagName": "gooeydata-field",
            "description": "A non-visual component that defines a single field in a Model schema. Specifies the field's name, data type, and optional default value. Field elements must be children of a gooeydata-model element.",
            "inherits": [],
            "attributes": [
              {
                "name": "name",
                "type": "STRING",
                "description": "The name of the field. This becomes the property name in data records.",
                "required": true
              },
              {
                "name": "type",
                "type": "ENUM",
                "values": ["string", "number", "boolean", "date"],
                "description": "The data type of the field. Used for type coercion when creating records. Defaults to 'string'.",
                "required": false
              },
              {
                "name": "defaultvalue",
                "type": "STRING",
                "description": "The default value for this field. Will be coerced to the specified type when creating records.",
                "required": false
              }
            ],
            "examples": [
              {
                "title": "Basic Field Definitions",
                "description": "Defining fields with different types and default values.",
                "code": "<gooeydata-model id=\"personModel\">\n  <gooeydata-field name=\"id\" type=\"number\"></gooeydata-field>\n  <gooeydata-field name=\"name\" type=\"string\" defaultvalue=\"Unknown\"></gooeydata-field>\n  <gooeydata-field name=\"age\" type=\"number\" defaultvalue=\"0\"></gooeydata-field>\n  <gooeydata-field name=\"active\" type=\"boolean\" defaultvalue=\"true\"></gooeydata-field>\n  <gooeydata-field name=\"createdAt\" type=\"date\"></gooeydata-field>\n</gooeydata-model>"
              },
              {
                "title": "Accessing Field Definitions",
                "description": "Using the Field API to get field information.",
                "code": "<gooeydata-model id=\"itemModel\">\n  <gooeydata-field id=\"priceField\" name=\"price\" type=\"number\" defaultvalue=\"9.99\"></gooeydata-field>\n</gooeydata-model>\n\n<script>\n  const field = document.getElementById('priceField');\n  \n  console.log(field.name);         // 'price'\n  console.log(field.type);         // 'number'\n  console.log(field.defaultvalue); // '9.99' (string)\n  \n  // Get full definition with coerced default\n  const def = field.toFieldDefinition();\n  // { name: 'price', type: 'number', defaultValue: 9.99 }\n  \n  // Access parent model\n  console.log(field.model.id);     // 'itemModel'\n</script>"
              }
            ]
          },
          {
            "name": "Model",
            "tagName": "gooeydata-model",
            "description": "A non-visual component that defines a data schema for Store components. Models contain Field children that describe the structure of data records, including field names, types, and default values. Stores can reference a Model to create records with proper defaults.",
            "inherits": [],
            "attributes": [],
            "examples": [
              {
                "title": "Basic Model Definition",
                "description": "Defining a schema with multiple field types.",
                "code": "<gooeydata-model id=\"productModel\">\n  <gooeydata-field name=\"id\" type=\"number\"></gooeydata-field>\n  <gooeydata-field name=\"name\" type=\"string\" defaultvalue=\"New Product\"></gooeydata-field>\n  <gooeydata-field name=\"price\" type=\"number\" defaultvalue=\"0\"></gooeydata-field>\n  <gooeydata-field name=\"inStock\" type=\"boolean\" defaultvalue=\"true\"></gooeydata-field>\n  <gooeydata-field name=\"releaseDate\" type=\"date\"></gooeydata-field>\n</gooeydata-model>"
              },
              {
                "title": "Model API Usage",
                "description": "Using the Model API to access field definitions.",
                "code": "<gooeydata-model id=\"userModel\">\n  <gooeydata-field name=\"id\" type=\"number\"></gooeydata-field>\n  <gooeydata-field name=\"username\" type=\"string\" defaultvalue=\"guest\"></gooeydata-field>\n  <gooeydata-field name=\"isAdmin\" type=\"boolean\" defaultvalue=\"false\"></gooeydata-field>\n</gooeydata-model>\n\n<script>\n  const model = document.getElementById('userModel');\n  \n  // Get all fields\n  const fields = model.getFields();\n  // [{ name: 'id', type: 'number', defaultValue: null }, ...]\n  \n  // Get specific field\n  const usernameField = model.getField('username');\n  // { name: 'username', type: 'string', defaultValue: 'guest' }\n  \n  // Get field names\n  const names = model.getFieldNames();\n  // ['id', 'username', 'isAdmin']\n  \n  // Get default record\n  const defaults = model.getDefaultRecord();\n  // { id: null, username: 'guest', isAdmin: false }\n</script>"
              },
              {
                "title": "Model with Store Integration",
                "description": "Binding a Model to a Store for creating records with defaults.",
                "code": "<gooeydata-model id=\"taskModel\">\n  <gooeydata-field name=\"id\" type=\"number\"></gooeydata-field>\n  <gooeydata-field name=\"title\" type=\"string\" defaultvalue=\"Untitled Task\"></gooeydata-field>\n  <gooeydata-field name=\"priority\" type=\"number\" defaultvalue=\"1\"></gooeydata-field>\n  <gooeydata-field name=\"completed\" type=\"boolean\" defaultvalue=\"false\"></gooeydata-field>\n</gooeydata-model>\n\n<gooeydata-store id=\"taskStore\" model=\"taskModel\"></gooeydata-store>\n\n<script>\n  const store = document.getElementById('taskStore');\n  \n  // Create record with all defaults\n  const task1 = store.createRecord();\n  // { id: null, title: 'Untitled Task', priority: 1, completed: false }\n  \n  // Create record with partial overrides\n  const task2 = store.createRecord({ id: 1, title: 'Review PR' });\n  // { id: 1, title: 'Review PR', priority: 1, completed: false }\n  \n  store.addRecord(task1);\n  store.addRecord(task2);\n</script>"
              }
            ]
          }
        ]
      },
      {
        "name": "graphics",
        "subcategories": [
          {
            "name": "gradient",
            "elements": [
              {
                "name": "Gradient",
                "tagName": "gooeyui-gradient",
                "description": "A gradient definition component for creating linear, radial, and conic CSS gradients that can be referenced by other components.",
                "inherits": ["GooeyElement"],
                "attributes": [
                  {
                    "name": "type",
                    "type": "ENUM",
                    "values": ["linear", "radial", "conic"],
                    "description": "Type of gradient to create (default: linear)",
                    "required": false
                  },
                  {
                    "name": "repeating",
                    "type": "BOOLEAN",
                    "description": "When true, creates a repeating gradient pattern",
                    "required": false
                  },
                  {
                    "name": "angle",
                    "type": "STRING",
                    "description": "Direction for linear gradients as angle (45deg) or keyword (to right, to bottom left)",
                    "required": false
                  },
                  {
                    "name": "shape",
                    "type": "ENUM",
                    "values": ["circle", "ellipse"],
                    "description": "Shape for radial gradients (default: ellipse)",
                    "required": false
                  },
                  {
                    "name": "size",
                    "type": "ENUM",
                    "values": ["closest-side", "closest-corner", "farthest-side", "farthest-corner"],
                    "description": "Size keyword for radial gradients (default: farthest-corner)",
                    "required": false
                  },
                  {
                    "name": "position",
                    "type": "STRING",
                    "description": "Center position for radial and conic gradients (default: center)",
                    "required": false
                  },
                  {
                    "name": "from",
                    "type": "STRING",
                    "description": "Starting angle for conic gradients (default: 0deg)",
                    "required": false
                  },
                  {
                    "name": "stops",
                    "type": "STRING",
                    "description": "Comma-separated color stops with optional positions (e.g., 'red 0%, blue 100%')",
                    "required": false
                  }
                ],
                "examples": [
                  {
                    "title": "Simple Linear Gradient",
                    "description": "A basic two-color linear gradient.",
                    "code": "<gooeyui-gradient id=\"simpleGrad\" type=\"linear\" angle=\"to right\" stops=\"#3498db, #9b59b6\"></gooeyui-gradient>"
                  },
                  {
                    "title": "Multi-Color Gradient",
                    "description": "A gradient with multiple color stops.",
                    "code": "<gooeyui-gradient id=\"rainbow\" type=\"linear\" angle=\"90deg\" stops=\"red 0%, orange 20%, yellow 40%, green 60%, blue 80%, purple 100%\"></gooeyui-gradient>"
                  },
                  {
                    "title": "Radial Gradient",
                    "description": "A circular radial gradient from the center.",
                    "code": "<gooeyui-gradient id=\"radialGrad\" type=\"radial\" shape=\"circle\" size=\"farthest-corner\" stops=\"#ffffff, #000000\"></gooeyui-gradient>"
                  },
                  {
                    "title": "Conic Gradient (Color Wheel)",
                    "description": "A conic gradient creating a color wheel effect.",
                    "code": "<gooeyui-gradient id=\"colorWheel\" type=\"conic\" stops=\"red, yellow, lime, aqua, blue, magenta, red\"></gooeyui-gradient>"
                  },
                  {
                    "title": "Repeating Stripe Pattern",
                    "description": "A repeating linear gradient creating stripes.",
                    "code": "<gooeyui-gradient id=\"stripes\" type=\"linear\" repeating angle=\"45deg\" stops=\"#606c88 0px, #606c88 10px, #3f4c6b 10px, #3f4c6b 20px\"></gooeyui-gradient>"
                  },
                  {
                    "title": "Gradient with Child Stops",
                    "description": "Defining color stops as child elements for complex gradients.",
                    "code": "<gooeyui-gradient id=\"complexGrad\" type=\"linear\" angle=\"135deg\">\n  <gooeyui-gradientstop color=\"#667eea\" position=\"0%\"></gooeyui-gradientstop>\n  <gooeyui-gradientstop color=\"#764ba2\" position=\"100%\"></gooeyui-gradientstop>\n</gooeyui-gradient>"
                  }
                ]
              },
              {
                "name": "GradientStop",
                "tagName": "gooeyui-gradientstop",
                "description": "A color stop definition used within a Gradient component to specify individual color positions.",
                "inherits": ["GooeyElement"],
                "attributes": [
                  {
                    "name": "color",
                    "type": "STRING",
                    "description": "CSS color value for this stop (hex, rgb, hsl, or named color)",
                    "required": true
                  },
                  {
                    "name": "position",
                    "type": "STRING",
                    "description": "Position of this color stop as percentage or length (e.g., '50%', '100px')",
                    "required": false
                  },
                  {
                    "name": "hint",
                    "type": "STRING",
                    "description": "Color interpolation hint defining the midpoint between this stop and the next",
                    "required": false
                  }
                ],
                "examples": [
                  {
                    "title": "Basic Color Stop",
                    "description": "A simple color stop at a specific position.",
                    "code": "<gooeyui-gradientstop color=\"#ff0000\" position=\"0%\"></gooeyui-gradientstop>"
                  },
                  {
                    "title": "Color Stop with Hint",
                    "description": "A color stop with interpolation hint for smooth transitions.",
                    "code": "<gooeyui-gradientstop color=\"blue\" position=\"0%\" hint=\"25%\"></gooeyui-gradientstop>"
                  },
                  {
                    "title": "Auto-Positioned Stop",
                    "description": "A color stop without explicit position (auto-distributed).",
                    "code": "<gooeyui-gradientstop color=\"rgba(255,255,255,0.5)\"></gooeyui-gradientstop>"
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        "name": "ui",
        "subcategories": [
          {
            "name": "button",
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
            "name": "data",
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
                  },
                  {
                    "name": "store",
                    "type": "STRING",
                    "description": "ID of a gooeydata-store element to bind to for automatic data synchronization",
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
                    "title": "Editable DataGrid",
                    "description": "A data grid with inline cell editing enabled.",
                    "code": "<gooeyui-datagrid id=\"editableGrid\" height=\"300\" editable>\n  <gooeyui-datagridcolumn field=\"product\" header=\"Product\" editable></gooeyui-datagridcolumn>\n  <gooeyui-datagridcolumn field=\"price\" header=\"Price\" editable></gooeyui-datagridcolumn>\n  <gooeyui-datagridcolumn field=\"quantity\" header=\"Qty\" editable></gooeyui-datagridcolumn>\n</gooeyui-datagrid>"
                  },
                  {
                    "title": "DataGrid with Filters",
                    "description": "A data grid with column filtering enabled.",
                    "code": "<gooeyui-datagrid id=\"filterGrid\" height=\"400\" showfilters>\n  <gooeyui-datagridcolumn field=\"name\" header=\"Name\" filterable></gooeyui-datagridcolumn>\n  <gooeyui-datagridcolumn field=\"department\" header=\"Department\" filterable></gooeyui-datagridcolumn>\n  <gooeyui-datagridcolumn field=\"status\" header=\"Status\" filterable></gooeyui-datagridcolumn>\n</gooeyui-datagrid>"
                  },
                  {
                    "title": "DataGrid with Store Binding",
                    "description": "A data grid bound to a data store for reactive updates.",
                    "code": "<gooeydata-store id=\"employeeStore\">\n  <gooeydata-data data-id=\"1\" data-name=\"Alice\" data-role=\"Developer\"></gooeydata-data>\n  <gooeydata-data data-id=\"2\" data-name=\"Bob\" data-role=\"Designer\"></gooeydata-data>\n</gooeydata-store>\n\n<gooeyui-datagrid store=\"employeeStore\" height=\"200\">\n  <gooeyui-datagridcolumn field=\"id\" header=\"ID\" width=\"60\"></gooeyui-datagridcolumn>\n  <gooeyui-datagridcolumn field=\"name\" header=\"Name\" width=\"150\"></gooeyui-datagridcolumn>\n  <gooeyui-datagridcolumn field=\"role\" header=\"Role\" width=\"150\"></gooeyui-datagridcolumn>\n</gooeyui-datagrid>"
                  }
                ]
              },
              {
                "name": "DataGridColumn",
                "tagName": "gooeyui-datagridcolumn",
                "description": "A column definition for DataGrid specifying field binding, header text, and column behavior.",
                "inherits": ["UIComponent"],
                "attributes": [
                  {
                    "name": "field",
                    "type": "STRING",
                    "description": "Property name in the data object to display in this column",
                    "required": true
                  },
                  {
                    "name": "header",
                    "type": "STRING",
                    "description": "Header text displayed at the top of the column",
                    "required": false
                  },
                  {
                    "name": "width",
                    "type": "NUMBER",
                    "description": "Initial width of the column in pixels",
                    "required": false
                  },
                  {
                    "name": "minwidth",
                    "type": "NUMBER",
                    "description": "Minimum width the column can be resized to",
                    "required": false
                  },
                  {
                    "name": "sortable",
                    "type": "BOOLEAN",
                    "description": "When true, clicking the header sorts the grid by this column",
                    "required": false
                  },
                  {
                    "name": "filterable",
                    "type": "BOOLEAN",
                    "description": "When true, enables filtering for this column when showfilters is enabled on the grid",
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
                    "description": "When true, the column can be resized by dragging its edge",
                    "required": false
                  }
                ],
                "examples": [
                  {
                    "title": "Basic Column",
                    "description": "A simple column displaying a data field.",
                    "code": "<gooeyui-datagridcolumn field=\"name\" header=\"Name\" width=\"150\"></gooeyui-datagridcolumn>"
                  },
                  {
                    "title": "Sortable Column",
                    "description": "A column that can be sorted by clicking the header.",
                    "code": "<gooeyui-datagridcolumn field=\"date\" header=\"Date\" sortable></gooeyui-datagridcolumn>"
                  },
                  {
                    "title": "Full-Featured Column",
                    "description": "A column with all features enabled.",
                    "code": "<gooeyui-datagridcolumn \n  field=\"email\" \n  header=\"Email Address\" \n  width=\"200\" \n  minwidth=\"100\" \n  sortable \n  filterable \n  editable \n  resizable>\n</gooeyui-datagridcolumn>"
                  }
                ]
              }
            ]
          },
          {
            "name": "form",
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
                "name": "list",
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
                "name": "text",
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
            "name": "menu",
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
                "name": "HamburgerMenu",
                "tagName": "gooeyui-hamburgermenu",
                "description": "A collapsible navigation menu triggered by a hamburger icon button. Supports slide-out panels from left, right, top, or bottom positions with multiple animation modes.",
                "inherits": ["UIComponent"],
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
                    "values": ["left", "right", "top", "bottom"],
                    "description": "The edge of the screen from which the panel slides out (default: left)",
                    "required": false
                  },
                  {
                    "name": "mode",
                    "type": "ENUM",
                    "values": ["slide", "overlay", "push"],
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
                "name": "WaffleMenu",
                "tagName": "gooeyui-wafflemenu",
                "description": "A grid-based popup menu (also known as Bento Box or App Launcher) triggered by a waffle icon button. Displays items in a configurable grid layout for quick access to applications, features, or navigation items.",
                "inherits": ["UIComponent"],
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
                    "values": ["top-start", "top-end", "bottom-start", "bottom-end"],
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
                "inherits": ["UIComponent"],
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
                    "values": ["_self", "_blank", "_parent", "_top"],
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
          },
          {
            "name": "panel",
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
            "name": "toolbar",
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
            "name": "window",
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
            "name": "media",
            "elements": [
              {
                "name": "VideoPlayer",
                "tagName": "gooeyui-videoplayer",
                "description": "A full-featured video player with custom controls, playlist support, keyboard navigation, and WCAG accessibility compliance. Supports multiple video sources via child MediaTrack elements or external playlist files (M3U, PLS, XSPF). Features include play/pause, stop, rewind, fast-forward, volume control, mute, fullscreen, and track navigation. Controls automatically fade in fullscreen mode after mouse inactivity.",
                "inherits": ["UIComponent"],
                "attributes": [
                  {
                    "name": "src",
                    "type": "STRING",
                    "description": "URL to a single video source. Ignored when playlist is set or MediaTrack children are present.",
                    "required": false
                  },
                  {
                    "name": "poster",
                    "type": "STRING",
                    "description": "URL to an image displayed before the video plays.",
                    "required": false
                  },
                  {
                    "name": "autoplay",
                    "type": "BOOLEAN",
                    "description": "When true, video starts playing automatically when loaded.",
                    "required": false
                  },
                  {
                    "name": "controls",
                    "type": "ENUM",
                    "values": ["full", "compact", "none"],
                    "description": "Controls layout: 'full' shows all controls, 'compact' shows minimal controls, 'none' hides built-in controls.",
                    "required": false
                  },
                  {
                    "name": "loop",
                    "type": "BOOLEAN",
                    "description": "When true, restarts from the first track after the last track ends.",
                    "required": false
                  },
                  {
                    "name": "muted",
                    "type": "BOOLEAN",
                    "description": "When true, audio is muted.",
                    "required": false
                  },
                  {
                    "name": "volume",
                    "type": "NUMBER",
                    "description": "Volume level from 0.0 (silent) to 1.0 (full volume).",
                    "required": false
                  },
                  {
                    "name": "speed",
                    "type": "NUMBER",
                    "description": "Playback speed from 0.25 to 4.0, where 1.0 is normal speed.",
                    "required": false
                  },
                  {
                    "name": "playlist",
                    "type": "STRING",
                    "description": "URL to a playlist file (M3U, PLS, or XSPF format). When set, MediaTrack children are ignored.",
                    "required": false
                  },
                  {
                    "name": "controlbar",
                    "type": "STRING",
                    "description": "ID reference to an external gooeyui-toolbar. Only used when controls='none'.",
                    "required": false
                  },
                  {
                    "name": "disablekb",
                    "type": "BOOLEAN",
                    "description": "When true, keyboard controls are disabled.",
                    "required": false
                  },
                  {
                    "name": "fullscreen",
                    "type": "BOOLEAN",
                    "description": "Reflects whether the player is in fullscreen mode.",
                    "required": false
                  }
                ],
                "examples": [
                  {
                    "title": "Basic Video Player",
                    "description": "A simple video player with a single video source.",
                    "code": "<gooey-component href=\"GooeyJS/src/gooey/ui/media/VideoPlayer\"></gooey-component>\n\n<gooeyui-videoplayer\n    width=\"800\"\n    height=\"450\"\n    src=\"video.mp4\"\n    poster=\"thumbnail.jpg\">\n</gooeyui-videoplayer>"
                  },
                  {
                    "title": "Multiple Tracks",
                    "description": "A video player with multiple tracks defined as child elements.",
                    "code": "<gooey-component href=\"GooeyJS/src/gooey/ui/media/VideoPlayer\"></gooey-component>\n<gooey-component href=\"GooeyJS/src/gooey/ui/media/MediaTrack\"></gooey-component>\n\n<gooeyui-videoplayer width=\"100%\" height=\"56.25%\" controls=\"full\" loop>\n    <gooeyui-mediatrack src=\"intro.mp4\" title=\"Introduction\"></gooeyui-mediatrack>\n    <gooeyui-mediatrack src=\"chapter1.mp4\" title=\"Chapter 1\" starttime=\"0\" stoptime=\"300\"></gooeyui-mediatrack>\n    <gooeyui-mediatrack src=\"chapter2.mp4\" title=\"Chapter 2\" speed=\"0.75\"></gooeyui-mediatrack>\n</gooeyui-videoplayer>"
                  },
                  {
                    "title": "Playlist Video Player",
                    "description": "A video player loading tracks from an M3U playlist file.",
                    "code": "<gooey-component href=\"GooeyJS/src/gooey/ui/media/VideoPlayer\"></gooey-component>\n\n<gooeyui-videoplayer\n    width=\"640\"\n    height=\"360\"\n    playlist=\"videos.m3u\"\n    loop>\n</gooeyui-videoplayer>"
                  },
                  {
                    "title": "Autoplay with Muted Audio",
                    "description": "A video that starts automatically (muted to comply with browser policies).",
                    "code": "<gooeyui-videoplayer\n    width=\"800\"\n    height=\"450\"\n    src=\"promo.mp4\"\n    poster=\"thumbnail.jpg\"\n    autoplay\n    muted>\n</gooeyui-videoplayer>"
                  },
                  {
                    "title": "Compact Controls",
                    "description": "A video player with minimal controls for embedded scenarios.",
                    "code": "<gooeyui-videoplayer\n    width=\"400\"\n    height=\"225\"\n    src=\"clip.mp4\"\n    controls=\"compact\">\n</gooeyui-videoplayer>"
                  },
                  {
                    "title": "JavaScript API Usage",
                    "description": "Controlling the video player programmatically.",
                    "code": "<gooeyui-videoplayer id=\"myPlayer\" width=\"800\" height=\"450\" src=\"video.mp4\"></gooeyui-videoplayer>\n\n<script>\n  const player = document.getElementById('myPlayer');\n  \n  // Event listeners\n  player.addEventListener('play', () => console.log('Playing'));\n  player.addEventListener('pause', () => console.log('Paused'));\n  player.addEventListener('trackchange', (e) => {\n    console.log('Now playing track', e.detail.trackIndex);\n  });\n  \n  // Playback control\n  player.play();\n  player.pause();\n  player.seek(120); // Jump to 2 minutes\n  player.volume = 0.5; // 50% volume\n  \n  // Track navigation\n  player.nextTrack();\n  player.previousTrack();\n  player.goToTrack(2);\n</script>"
                  },
                  {
                    "title": "Keyboard Controls",
                    "description": "VideoPlayer supports keyboard navigation when focused.",
                    "code": "<!-- Keyboard shortcuts:\n  Space: Play/Pause\n  Left Arrow: Jump back 5 seconds\n  Right Arrow: Jump ahead 5 seconds\n  Up Arrow: Volume up 10%\n  Down Arrow: Volume down 10%\n  M: Toggle mute\n  F: Toggle fullscreen\n  0-9: Jump to 0%-90% of video\n-->\n\n<gooeyui-videoplayer\n    width=\"800\"\n    height=\"450\"\n    src=\"video.mp4\">\n</gooeyui-videoplayer>\n\n<!-- Disable keyboard controls -->\n<gooeyui-videoplayer\n    width=\"800\"\n    height=\"450\"\n    src=\"video.mp4\"\n    disablekb>\n</gooeyui-videoplayer>"
                  }
                ]
              },
              {
                "name": "MediaTrack",
                "tagName": "gooeyui-mediatrack",
                "description": "A non-visual component representing a single video track within a VideoPlayer. Defines the video source URL and optional playback parameters like start time, stop time, and speed. MediaTrack elements must be children of a gooeyui-videoplayer element.",
                "inherits": [],
                "attributes": [
                  {
                    "name": "src",
                    "type": "STRING",
                    "description": "URL to the video file. Supports MP4, M4V, OGV, and WebM formats.",
                    "required": true
                  },
                  {
                    "name": "starttime",
                    "type": "NUMBER",
                    "description": "Start playback at this time in seconds. Default is 0.",
                    "required": false
                  },
                  {
                    "name": "stoptime",
                    "type": "NUMBER",
                    "description": "Stop playback at this time in seconds. If not specified, plays to end of video.",
                    "required": false
                  },
                  {
                    "name": "speed",
                    "type": "NUMBER",
                    "description": "Playback speed from 0.25 to 4.0. Overrides the parent VideoPlayer's speed setting.",
                    "required": false
                  },
                  {
                    "name": "title",
                    "type": "STRING",
                    "description": "MediaTrack title for accessibility and display purposes.",
                    "required": false
                  }
                ],
                "examples": [
                  {
                    "title": "Basic MediaTrack",
                    "description": "A simple track with just a video source.",
                    "code": "<gooeyui-videoplayer width=\"800\" height=\"450\">\n    <gooeyui-mediatrack src=\"video.mp4\"></gooeyui-mediatrack>\n</gooeyui-videoplayer>"
                  },
                  {
                    "title": "MediaTrack with Title",
                    "description": "A track with a descriptive title for accessibility.",
                    "code": "<gooeyui-videoplayer width=\"800\" height=\"450\">\n    <gooeyui-mediatrack src=\"intro.mp4\" title=\"Introduction Video\"></gooeyui-mediatrack>\n    <gooeyui-mediatrack src=\"main.mp4\" title=\"Main Content\"></gooeyui-mediatrack>\n</gooeyui-videoplayer>"
                  },
                  {
                    "title": "MediaTrack with Time Constraints",
                    "description": "A track that plays only a specific segment of the video.",
                    "code": "<gooeyui-videoplayer width=\"800\" height=\"450\">\n    <!-- Play only from 30 seconds to 2 minutes -->\n    <gooeyui-mediatrack\n        src=\"long-video.mp4\"\n        title=\"Highlight Clip\"\n        starttime=\"30\"\n        stoptime=\"120\">\n    </gooeyui-mediatrack>\n</gooeyui-videoplayer>"
                  },
                  {
                    "title": "MediaTrack with Custom Speed",
                    "description": "A track that plays at a slower speed for detailed viewing.",
                    "code": "<gooeyui-videoplayer width=\"800\" height=\"450\">\n    <gooeyui-mediatrack src=\"intro.mp4\" title=\"Introduction\"></gooeyui-mediatrack>\n    <!-- Slow motion tutorial at 50% speed -->\n    <gooeyui-mediatrack\n        src=\"tutorial.mp4\"\n        title=\"Detailed Tutorial\"\n        speed=\"0.5\">\n    </gooeyui-mediatrack>\n    <gooeyui-mediatrack src=\"summary.mp4\" title=\"Summary\"></gooeyui-mediatrack>\n</gooeyui-videoplayer>"
                  }
                ]
              }
            ]
          }
        ],
        "elements": [
          {
            "name": "Background",
                "tagName": "gooeyui-background",
                "description": "A background styling component defining colors, images, and gradients that can be referenced by containers.",
                "inherits": ["GooeyElement"],
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
                    "values": ["auto", "cover", "contain"],
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
                    "values": ["repeat", "repeat-x", "repeat-y", "no-repeat", "space", "round"],
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
        "description": "Dynamic component loader for on-demand loading of GooeyJS components. Instead of loading all components at startup, use gooey-component to load only the components your application needs. The loader reads the component's META.goo configuration, loads its templates and theme CSS, imports the JavaScript module, and registers the custom element. This is the recommended approach for optimizing application load time and reducing initial bundle size. Fires LOADING, LOADED, and ERROR events to track the loading process.",
        "inherits": [],
        "attributes": [
          {
            "name": "href",
            "type": "STRING",
            "description": "Path to the component folder containing META.goo. Can be relative to the document or absolute. The folder must contain META.goo plus the scripts/, templates/, and themes/ subdirectories as defined in the component's metadata.",
            "required": true
          }
        ],
        "examples": [
          {
            "title": "Load a Single Component",
            "description": "Dynamically load the Button component from the GooeyJS library.",
            "code": "<!-- Load the Button component -->\n<gooey-component href=\"GooeyJS/src/gooey/ui/button/Button\"></gooey-component>\n\n<!-- Now you can use the button -->\n<gooeyui-button text=\"Click Me\"></gooeyui-button>"
          },
          {
            "title": "Load Multiple Components",
            "description": "Load several components needed for a form interface.",
            "code": "<!-- Load form components -->\n<gooey-component href=\"GooeyJS/src/gooey/ui/form/text/TextField\"></gooey-component>\n<gooey-component href=\"GooeyJS/src/gooey/ui/form/text/TextArea\"></gooey-component>\n<gooey-component href=\"GooeyJS/src/gooey/ui/button/Button\"></gooey-component>\n<gooey-component href=\"GooeyJS/src/gooey/ui/panel/FormPanel\"></gooey-component>\n\n<!-- Use the loaded components -->\n<gooeyui-formpanel>\n  <gooeyui-textfield placeholder=\"Name\"></gooeyui-textfield>\n  <gooeyui-textarea placeholder=\"Comments\"></gooeyui-textarea>\n  <gooeyui-button text=\"Submit\"></gooeyui-button>\n</gooeyui-formpanel>"
          },
          {
            "title": "Handle Loading Events",
            "description": "Listen for component loading events to show loading states or handle errors.",
            "code": "<gooey-component id=\"gridLoader\" href=\"GooeyJS/src/gooey/ui/data/DataGrid\"></gooey-component>\n\n<script>\n  const loader = document.getElementById('gridLoader');\n  \n  loader.addEventListener('component-loading', (e, data) => {\n    console.log('Loading component:', data.tagName);\n  });\n  \n  loader.addEventListener('component-loaded', (e, data) => {\n    console.log('Component ready:', data.tagName);\n    // Now safe to create/use the component\n  });\n  \n  loader.addEventListener('component-error', (e, data) => {\n    console.error('Failed to load:', data.error);\n  });\n</script>"
          },
          {
            "title": "Conditional Component Loading",
            "description": "Load components only when needed based on user actions.",
            "code": "<gooeyui-button id=\"loadRichEditor\" text=\"Enable Rich Editor\"></gooeyui-button>\n<div id=\"editorContainer\"></div>\n\n<script>\n  document.getElementById('loadRichEditor').addEventListener('click', () => {\n    // Create loader element\n    const loader = document.createElement('gooey-component');\n    loader.setAttribute('href', 'GooeyJS/src/gooey/ui/form/text/RichTextEditor');\n    \n    loader.addEventListener('component-loaded', () => {\n      // Component is now registered, create an instance\n      const editor = document.createElement('gooeyui-richtexteditor');\n      document.getElementById('editorContainer').appendChild(editor);\n    });\n    \n    document.body.appendChild(loader);\n  });\n</script>"
          },
          {
            "title": "Check If Already Loaded",
            "description": "The loader automatically detects if a component is already registered.",
            "code": "<!-- If Button was already loaded, this fires LOADED immediately -->\n<gooey-component href=\"GooeyJS/src/gooey/ui/button/Button\"></gooey-component>\n\n<script>\n  // You can also check programmatically\n  if (customElements.get('gooeyui-button')) {\n    console.log('Button is already available');\n  }\n</script>"
          }
        ]
      }
    ]
  }
};
