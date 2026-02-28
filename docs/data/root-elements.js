const rootElements = [
  {
    "name": "Application",
    "tagName": "gooey-application",
    "description": "Root container for a GooeyJS application providing the main application structure.",
    "inherits": [
      "UIComponent"
    ],
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
  },
  {
    "name": "Theme",
    "tagName": "gooey-theme",
    "description": "A non-visual component for declarative theme registration and activation. Loads theme CSS containing custom property overrides and registers the complete theme configuration with ThemeManager. Per-component structural overrides are auto-discovered from META.goo metadata; explicit gooey-theme-override children are only needed for non-standard CSS file paths. Supports theme inheritance via the extends attribute and on-demand font loading via the FontFace API. Only one theme can be active at a time (radio-button behavior).",
    "inherits": [],
    "attributes": [
      {
        "name": "name",
        "type": "STRING",
        "description": "Theme identifier used for registration and activation (e.g., 'classic', 'dark')",
        "required": true
      },
      {
        "name": "href",
        "type": "STRING",
        "description": "Path to the theme CSS file containing :root custom property overrides",
        "required": false
      },
      {
        "name": "extends",
        "type": "STRING",
        "description": "Name of a parent theme to inherit from. The parent theme's overrides are used as a base, with this theme's overrides taking precedence",
        "required": false
      },
      {
        "name": "active",
        "type": "BOOLEAN",
        "description": "When present, activates this theme. Only one theme can be active at a time; setting active on one theme automatically deactivates all others",
        "required": false
      },
      {
        "name": "fonts",
        "type": "STRING",
        "description": "Base directory path for theme font files. Used together with font-faces to load custom fonts via the FontFace API",
        "required": false
      },
      {
        "name": "font-faces",
        "type": "STRING",
        "description": "JSON array of font descriptors to load. Each descriptor has family, file, weight, and style properties. Fonts are loaded from the directory specified by the fonts attribute",
        "required": false
      }
    ],
    "examples": [
      {
        "title": "Basic Theme with Auto-Discovery",
        "description": "Register and activate a theme. Per-component overrides are automatically discovered from each component's META.goo themes.available list.",
        "code": "<gooey-theme name=\"classic\" href=\"themes/classic.css\" active></gooey-theme>"
      },
      {
        "title": "Theme with Explicit Overrides",
        "description": "Register a theme with explicit per-component CSS overrides for non-standard paths.",
        "code": "<gooey-theme name=\"custom\" href=\"themes/custom.css\" active>\n  <gooey-theme-override target=\"gooeyui-button\" href=\"custom/button.css\"></gooey-theme-override>\n  <gooey-theme-override target=\"gooeyui-window\" href=\"custom/window.css\"></gooey-theme-override>\n</gooey-theme>"
      },
      {
        "title": "Theme Inheritance",
        "description": "Create a theme that extends another, inheriting its overrides and adding new ones.",
        "code": "<gooey-theme name=\"classic\" href=\"themes/classic.css\"></gooey-theme>\n\n<gooey-theme name=\"classic-dark\" href=\"themes/classic-dark.css\" extends=\"classic\" active></gooey-theme>"
      },
      {
        "title": "Theme with Custom Fonts",
        "description": "Load custom fonts when the theme activates using the FontFace API.",
        "code": "<gooey-theme \n  name=\"retro\" \n  href=\"themes/retro.css\" \n  fonts=\"themes/retro-fonts\"\n  font-faces='[{\"family\": \"RetroFont\", \"file\": \"retro.woff2\", \"weight\": \"normal\"}]'\n  active>\n</gooey-theme>"
      },
      {
        "title": "Theme Switching",
        "description": "Switch between themes programmatically by toggling the active attribute.",
        "code": "<gooey-theme id=\"lightTheme\" name=\"classic\" href=\"themes/classic.css\" active></gooey-theme>\n<gooey-theme id=\"darkTheme\" name=\"dark\" href=\"themes/dark.css\"></gooey-theme>\n\n<script>\n  // Switch to dark theme\n  document.getElementById('darkTheme').active = true;\n  // The light theme is automatically deactivated\n</script>"
      },
      {
        "title": "Theme Loading Events",
        "description": "Listen for theme lifecycle events to track loading progress.",
        "code": "<gooey-theme id=\"myTheme\" name=\"classic\" href=\"themes/classic.css\"></gooey-theme>\n\n<script>\n  const theme = document.getElementById('myTheme');\n  \n  theme.addEventListener('theme-loading', (e, data) => {\n    console.log('Loading theme:', data.name);\n  });\n  \n  theme.addEventListener('theme-loaded', (e, data) => {\n    console.log('Theme ready:', data.name);\n    theme.active = true;\n  });\n  \n  theme.addEventListener('theme-error', (e, data) => {\n    console.error('Theme failed:', data.error);\n  });\n</script>"
      }
    ]
  },
  {
    "name": "ThemeOverride",
    "tagName": "gooey-theme-override",
    "description": "A non-visual child element of gooey-theme that provides per-component structural CSS overrides. When loaded, creates a shared CSSStyleSheet that ThemeManager injects into matching component shadow roots. Most component overrides are auto-discovered from META.goo metadata; ThemeOverride is only needed for non-standard CSS file paths that differ from the conventional themes/ directory structure. Must be a direct child of a gooey-theme element.",
    "inherits": [],
    "attributes": [
      {
        "name": "target",
        "type": "STRING",
        "description": "The custom element tag name to apply the CSS override to (e.g., 'gooeyui-button', 'gooeyui-window')",
        "required": true
      },
      {
        "name": "href",
        "type": "STRING",
        "description": "Path to the structural CSS file for the target component",
        "required": true
      }
    ],
    "examples": [
      {
        "title": "Single Component Override",
        "description": "Override the CSS for a specific component within a theme.",
        "code": "<gooey-theme name=\"custom\" href=\"themes/custom.css\" active>\n  <gooey-theme-override target=\"gooeyui-button\" href=\"themes/custom/button.css\"></gooey-theme-override>\n</gooey-theme>"
      },
      {
        "title": "Multiple Component Overrides",
        "description": "Apply themed CSS to several components at once.",
        "code": "<gooey-theme name=\"branded\" href=\"themes/branded.css\" active>\n  <gooey-theme-override target=\"gooeyui-button\" href=\"themes/branded/button.css\"></gooey-theme-override>\n  <gooey-theme-override target=\"gooeyui-textfield\" href=\"themes/branded/textfield.css\"></gooey-theme-override>\n  <gooey-theme-override target=\"gooeyui-panel\" href=\"themes/branded/panel.css\"></gooey-theme-override>\n  <gooey-theme-override target=\"gooeyui-menubar\" href=\"themes/branded/menubar.css\"></gooey-theme-override>\n</gooey-theme>"
      },
      {
        "title": "Dynamic Override Addition",
        "description": "Add an override at runtime. The parent theme detects the change and re-applies automatically.",
        "code": "<gooey-theme id=\"myTheme\" name=\"custom\" href=\"themes/custom.css\" active></gooey-theme>\n\n<script>\n  const override = document.createElement('gooey-theme-override');\n  override.target = 'gooeyui-datagrid';\n  override.href = 'themes/custom/datagrid.css';\n  document.getElementById('myTheme').appendChild(override);\n</script>"
      }
    ]
  }
];
