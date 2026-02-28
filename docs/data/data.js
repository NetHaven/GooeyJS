const dataCategory = {
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
          "values": [
            "string",
            "number",
            "boolean",
            "date"
          ],
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
};
