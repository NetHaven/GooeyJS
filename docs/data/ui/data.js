const uiDataCategory = {
  "name": "data",
  "elements": [
    {
      "name": "DataGrid",
      "tagName": "gooeyui-datagrid",
      "description": "A full-featured data grid component with virtual scrolling, sorting, filtering, multiple selection modes, column resizing, and inline cell editing. Efficiently handles large datasets (10,000+ rows) through virtual scrolling.",
      "inherits": [
        "UIComponent"
      ],
      "attributes": [
        {
          "name": "selectionmode",
          "type": "ENUM",
          "values": [
            "none",
            "single-row",
            "multiple-row",
            "cell"
          ],
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
      "inherits": [
        "UIComponent"
      ],
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
};
