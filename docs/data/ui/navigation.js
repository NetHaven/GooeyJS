const navigationCategory = {
  "name": "navigation",
  "elements": [
    {
      "name": "Breadcrumb",
      "tagName": "gooeyui-breadcrumb",
      "description": "A navigation component displaying hierarchical path with clickable segments. Supports collapsible middle items when the path exceeds a maximum visible count, custom separators (text or icon), and full keyboard accessibility. Useful for file system navigation, application section navigation, and multi-step wizard progress indication.",
      "inherits": [
        "UIComponent"
      ],
      "attributes": [
        {
          "name": "separator",
          "type": "STRING",
          "description": "Text separator displayed between breadcrumb items (default: '/')",
          "required": false
        },
        {
          "name": "separatoricon",
          "type": "STRING",
          "description": "URL to an icon image used as separator instead of text. When set, overrides the separator attribute.",
          "required": false
        },
        {
          "name": "collapsible",
          "type": "BOOLEAN",
          "description": "When true, enables collapsing of middle items when maxvisible is exceeded",
          "required": false
        },
        {
          "name": "maxvisible",
          "type": "NUMBER",
          "description": "Maximum number of visible items before collapsing middle items. Values below 3 disable collapsing. 0 means no limit.",
          "required": false
        },
        {
          "name": "label",
          "type": "STRING",
          "description": "Accessible label for the breadcrumb navigation landmark (defaults to 'Breadcrumb')",
          "required": false
        }
      ],
      "examples": [
        {
          "title": "Basic Breadcrumb",
          "description": "A simple breadcrumb navigation with default separator.",
          "code": "<gooey-component href=\"GooeyJS/src/gooey/ui/navigation/Breadcrumb\"></gooey-component>\n<gooey-component href=\"GooeyJS/src/gooey/ui/navigation/BreadcrumbItem\"></gooey-component>\n\n<gooeyui-breadcrumb label=\"Breadcrumb\">\n    <gooeyui-breadcrumbitem text=\"Home\" href=\"/\"></gooeyui-breadcrumbitem>\n    <gooeyui-breadcrumbitem text=\"Products\" href=\"/products\"></gooeyui-breadcrumbitem>\n    <gooeyui-breadcrumbitem text=\"Electronics\" href=\"/products/electronics\"></gooeyui-breadcrumbitem>\n    <gooeyui-breadcrumbitem text=\"Laptops\" active></gooeyui-breadcrumbitem>\n</gooeyui-breadcrumb>"
        },
        {
          "title": "Custom Separator",
          "description": "A breadcrumb using a custom text separator.",
          "code": "<gooeyui-breadcrumb separator=\">\">\n    <gooeyui-breadcrumbitem text=\"Home\" href=\"/\"></gooeyui-breadcrumbitem>\n    <gooeyui-breadcrumbitem text=\"Settings\" href=\"/settings\"></gooeyui-breadcrumbitem>\n    <gooeyui-breadcrumbitem text=\"Profile\" active></gooeyui-breadcrumbitem>\n</gooeyui-breadcrumb>"
        },
        {
          "title": "With Icons",
          "description": "Breadcrumb items with icons and an icon-based separator.",
          "code": "<gooeyui-breadcrumb separatoricon=\"icons/chevron-right.svg\">\n    <gooeyui-breadcrumbitem text=\"Home\" icon=\"icons/home.svg\" href=\"/\"></gooeyui-breadcrumbitem>\n    <gooeyui-breadcrumbitem text=\"Documents\" icon=\"icons/folder.svg\" href=\"/docs\"></gooeyui-breadcrumbitem>\n    <gooeyui-breadcrumbitem text=\"Report.pdf\" icon=\"icons/file.svg\" active></gooeyui-breadcrumbitem>\n</gooeyui-breadcrumb>"
        },
        {
          "title": "Collapsible Breadcrumbs",
          "description": "A breadcrumb that collapses middle items when the path is too long.",
          "code": "<gooeyui-breadcrumb collapsible maxvisible=\"4\">\n    <gooeyui-breadcrumbitem text=\"Home\" href=\"/\"></gooeyui-breadcrumbitem>\n    <gooeyui-breadcrumbitem text=\"Category\" href=\"/category\"></gooeyui-breadcrumbitem>\n    <gooeyui-breadcrumbitem text=\"Subcategory\" href=\"/category/sub\"></gooeyui-breadcrumbitem>\n    <gooeyui-breadcrumbitem text=\"Section\" href=\"/category/sub/section\"></gooeyui-breadcrumbitem>\n    <gooeyui-breadcrumbitem text=\"Page\" href=\"/category/sub/section/page\"></gooeyui-breadcrumbitem>\n    <gooeyui-breadcrumbitem text=\"Current\" active></gooeyui-breadcrumbitem>\n</gooeyui-breadcrumb>"
        },
        {
          "title": "Programmatic Usage",
          "description": "Using the Breadcrumb API to build and navigate paths programmatically.",
          "code": "<gooeyui-breadcrumb id=\"navBreadcrumb\"></gooeyui-breadcrumb>\n\n<script>\n  const breadcrumb = document.getElementById('navBreadcrumb');\n  \n  // Listen for navigation events\n  breadcrumb.addEventListener('navigate', (e) => {\n    console.log('Navigating to:', e.detail.item.text);\n    console.log('Index:', e.detail.index);\n    \n    // Truncate path to clicked item\n    breadcrumb.truncateAfter(e.detail.index);\n    breadcrumb.setActiveIndex(e.detail.index);\n  });\n  \n  // Set path programmatically\n  breadcrumb.setPath([\n    { text: 'Home', href: '/' },\n    { text: 'Users', href: '/users' },\n    { text: 'John Doe', active: true }\n  ]);\n  \n  // Add new item\n  breadcrumb.addItem({\n    text: 'Settings',\n    href: '/users/john/settings',\n    active: true\n  });\n  \n  // Get current path\n  const items = breadcrumb.getItems();\n  const path = items.map(item => item.text).join(' / ');\n</script>"
        }
      ]
    },
    {
      "name": "BreadcrumbItem",
      "tagName": "gooeyui-breadcrumbitem",
      "description": "An individual navigation segment within a Breadcrumb component. Represents a single level in the hierarchical path with optional text, icon, href, and value attributes. The active item represents the current location and is not clickable.",
      "inherits": [
        "UIComponent"
      ],
      "attributes": [
        {
          "name": "text",
          "type": "STRING",
          "description": "Display text shown for this breadcrumb item",
          "required": false
        },
        {
          "name": "href",
          "type": "STRING",
          "description": "Navigation URL for this item. When set, the item renders as a link.",
          "required": false
        },
        {
          "name": "icon",
          "type": "STRING",
          "description": "URL to an icon image displayed before the text",
          "required": false
        },
        {
          "name": "value",
          "type": "STRING",
          "description": "Associated data value for this item, useful for data binding and event handling",
          "required": false
        },
        {
          "name": "active",
          "type": "BOOLEAN",
          "description": "When true, indicates this is the current/selected item. Active items are not clickable and display with distinct styling.",
          "required": false
        }
      ],
      "examples": [
        {
          "title": "Basic Item with Link",
          "description": "A breadcrumb item with text and navigation URL.",
          "code": "<gooeyui-breadcrumbitem text=\"Home\" href=\"/\"></gooeyui-breadcrumbitem>"
        },
        {
          "title": "Active Item",
          "description": "A breadcrumb item representing the current page.",
          "code": "<gooeyui-breadcrumbitem text=\"Current Page\" active></gooeyui-breadcrumbitem>"
        },
        {
          "title": "Item with Icon",
          "description": "A breadcrumb item displaying an icon before the text.",
          "code": "<gooeyui-breadcrumbitem text=\"Documents\" icon=\"icons/folder.svg\" href=\"/docs\"></gooeyui-breadcrumbitem>"
        },
        {
          "title": "Item with Value",
          "description": "A breadcrumb item with an associated data value for event handling.",
          "code": "<gooeyui-breadcrumbitem text=\"Category\" href=\"/category/123\" value=\"123\"></gooeyui-breadcrumbitem>\n\n<script>\n  breadcrumb.addEventListener('navigate', (e) => {\n    const categoryId = e.detail.value; // '123'\n    loadCategory(categoryId);\n  });\n</script>"
        }
      ]
    },
    {
      "name": "Tree",
      "tagName": "gooeyui-tree",
      "description": "A hierarchical tree structure for displaying nested items with expand/collapse.",
      "inherits": [
        "UIComponent",
        "Container"
      ],
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
      "name": "Pagination",
      "tagName": "gooeyui-pagination",
      "description": "A standalone navigation control for paging through data sets. Renders a configurable page bar with numbered buttons, previous/next controls, ellipsis compression, optional first/last buttons, page-size selector, go-to-page input, and navigator summary. Integrates with Store and DataGrid components for automatic data binding.",
      "inherits": [
        "UIComponent"
      ],
      "attributes": [
        {
          "name": "totalrecords",
          "type": "NUMBER",
          "description": "Total number of records in the data set. Drives total page count calculation.",
          "required": false
        },
        {
          "name": "pagesize",
          "type": "NUMBER",
          "description": "Number of records per page (default: 10)",
          "required": false
        },
        {
          "name": "currentpage",
          "type": "NUMBER",
          "description": "The currently active page (1-based). Setting programmatically navigates and fires PAGE_CHANGE.",
          "required": false
        },
        {
          "name": "pagerange",
          "type": "NUMBER",
          "description": "Number of page buttons shown on each side of the current page. Set to 0 to show all pages.",
          "required": false
        },
        {
          "name": "marginpages",
          "type": "NUMBER",
          "description": "Number of page buttons pinned at the start and end of the page list (outer window)",
          "required": false
        },
        {
          "name": "showprevious",
          "type": "BOOLEAN",
          "description": "Show the Previous button (default: true)",
          "required": false
        },
        {
          "name": "shownext",
          "type": "BOOLEAN",
          "description": "Show the Next button (default: true)",
          "required": false
        },
        {
          "name": "showfirst",
          "type": "BOOLEAN",
          "description": "Show a First Page button that jumps to page 1",
          "required": false
        },
        {
          "name": "showlast",
          "type": "BOOLEAN",
          "description": "Show a Last Page button that jumps to the final page",
          "required": false
        },
        {
          "name": "showpagenumbers",
          "type": "BOOLEAN",
          "description": "Show numbered page buttons. When false, only prev/next/first/last controls are rendered.",
          "required": false
        },
        {
          "name": "showsizechanger",
          "type": "BOOLEAN",
          "description": "Show a dropdown selector that lets users change pagesize at runtime",
          "required": false
        },
        {
          "name": "shownavigator",
          "type": "BOOLEAN",
          "description": "Show a textual summary such as '1-10 of 195 items'",
          "required": false
        },
        {
          "name": "showgoinput",
          "type": "BOOLEAN",
          "description": "Show a text input field for direct page entry",
          "required": false
        },
        {
          "name": "showgobutton",
          "type": "BOOLEAN",
          "description": "Show a Go button next to the go-to-page input",
          "required": false
        },
        {
          "name": "hideonlyone",
          "type": "BOOLEAN",
          "description": "Hide the entire pagination bar when there is only one page or zero pages",
          "required": false
        },
        {
          "name": "autohideprevious",
          "type": "BOOLEAN",
          "description": "Hide (rather than disable) the Previous button when on the first page",
          "required": false
        },
        {
          "name": "autohidenext",
          "type": "BOOLEAN",
          "description": "Hide (rather than disable) the Next button when on the last page",
          "required": false
        },
        {
          "name": "hidefirstonellipsis",
          "type": "BOOLEAN",
          "description": "Suppress the first margin page button when the leading ellipsis is visible",
          "required": false
        },
        {
          "name": "hidelastonellipsis",
          "type": "BOOLEAN",
          "description": "Suppress the last margin page button when the trailing ellipsis is visible",
          "required": false
        },
        {
          "name": "previoustext",
          "type": "STRING",
          "description": "Label text for the Previous button (default: 'Prev')",
          "required": false
        },
        {
          "name": "nexttext",
          "type": "STRING",
          "description": "Label text for the Next button (default: 'Next')",
          "required": false
        },
        {
          "name": "firsttext",
          "type": "STRING",
          "description": "Label text for the First Page button (default: 'First')",
          "required": false
        },
        {
          "name": "lasttext",
          "type": "STRING",
          "description": "Label text for the Last Page button (default: 'Last')",
          "required": false
        },
        {
          "name": "ellipsistext",
          "type": "STRING",
          "description": "Text displayed for the ellipsis indicator (default: '...')",
          "required": false
        },
        {
          "name": "gobuttontext",
          "type": "STRING",
          "description": "Label text for the Go button (default: 'Go')",
          "required": false
        },
        {
          "name": "navigatorformat",
          "type": "ENUM",
          "values": [
            "RANGE",
            "PAGES",
            "ITEMS"
          ],
          "description": "Format of the navigator text. RANGE: '1-10 of 195'. PAGES: 'Page 1 of 20'. ITEMS: 'Showing 10 of 195 items'.",
          "required": false
        },
        {
          "name": "sizechangeroptions",
          "type": "STRING",
          "description": "Comma-separated list of page size values for the size changer dropdown (default: '10,20,50,100')",
          "required": false
        },
        {
          "name": "pagelabelformat",
          "type": "STRING",
          "description": "Custom format string for page number labels. Use {page} as placeholder.",
          "required": false
        },
        {
          "name": "store",
          "type": "STRING",
          "description": "ID of a gooeydata-store element to bind to. Totalrecords is derived from the store's record count.",
          "required": false
        },
        {
          "name": "datagrid",
          "type": "STRING",
          "description": "ID of a gooeyui-datagrid element to bind to. Automatically synchronizes page state with the DataGrid.",
          "required": false
        },
        {
          "name": "size",
          "type": "ENUM",
          "values": [
            "SMALL",
            "DEFAULT",
            "LARGE"
          ],
          "description": "Visual size variant for the pagination bar",
          "required": false
        },
        {
          "name": "halign",
          "type": "ENUM",
          "values": [
            "LEFT",
            "CENTER",
            "RIGHT"
          ],
          "description": "Horizontal alignment of the pagination bar within its container",
          "required": false
        }
      ],
      "examples": [
        {
          "title": "Basic Pagination",
          "description": "A simple pagination bar with total records and page size.",
          "code": "<gooey-component href=\"GooeyJS/src/gooey/ui/navigation/Pagination\"></gooey-component>\n\n<gooeyui-pagination totalrecords=\"195\" pagesize=\"10\"></gooeyui-pagination>"
        },
        {
          "title": "Full Featured",
          "description": "Pagination with navigator summary, size changer, and go-to-page input.",
          "code": "<gooeyui-pagination\n    totalrecords=\"500\"\n    pagesize=\"20\"\n    shownavigator\n    showsizechanger\n    showgoinput\n    showgobutton\n    showfirst\n    showlast\n    halign=\"CENTER\">\n</gooeyui-pagination>"
        },
        {
          "title": "Store Binding",
          "description": "Pagination bound to a data store, automatically deriving total records.",
          "code": "<gooeydata-store id=\"myStore\">\n    <gooeydata-data data-id=\"1\" data-name=\"Item 1\"></gooeydata-data>\n    <gooeydata-data data-id=\"2\" data-name=\"Item 2\"></gooeydata-data>\n</gooeydata-store>\n\n<gooeyui-pagination store=\"myStore\" pagesize=\"10\"></gooeyui-pagination>"
        }
      ]
    },
    {
      "name": "TreeItem",
      "tagName": "gooeyui-treeitem",
      "description": "A single node within a Tree hierarchy with optional icon and expand capability.",
      "inherits": [
        "UIComponent"
      ],
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
};
