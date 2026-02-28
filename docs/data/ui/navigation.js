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
