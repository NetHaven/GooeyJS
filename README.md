# GooeyJS
GooeyJS is a web component framework that provides a set of UI elements. Built using modern web standards, Gooey components are custom HTML elements that can be used in any web application.

## Features

- **Custom Web Components** - All elements are proper custom HTML elements
- **Graphics System** - Point and Dimension classes for calculations

## Components

### Layout & Containers
- **AccordionPanel** - creates a collapsible accordion interface that contains multiple ui-panel elements. Only one accordion section can be open at a time by default, providing an efficient way to organize content in a compact vertical layout.
- **Application** - the root-level component for GooeyJS applications. It provides the foundational viewport setup and base styling for the entire application hierarchy. This component has no template or wrapped HTML elements - it serves purely as the top-level container that establishes the application's viewport and basic layout properties.
- **AppPanel** - the top-level container component for GooeyJS applications. It provides the main application layout structure and serves as the root container for all other UI components.
- **GroupBox** - creates a container with an optional title label that groups related form elements or content together. It extends the Panel component to provide visual organization with classic desktop-style grouping appearance.
- **FormPanel** - is a specialized container that provides automatic grid-based layout for form elements. It organizes labels, input controls, and required field indicators in a consistent, accessible format.
- **Panel** - a fundamental container component that provides a basic rectangular area with consistent styling. It serves as the foundation for more complex layout components and provides essential container functionality.
- **SplitPanel** - a resizable container component that displays two child elements side by side with an adjustable divider between them. Users can drag the divider to dynamically resize the panes, making it ideal for creating split layouts like file explorers, code editors, or any interface requiring adjustable content areas.
- **Tab** - represents an individual tab within a TabPanel. It contains the tab's content and manages its visibility based on the active state. Tabs are automatically registered with their parent TabPanel and provide keyboard navigation support.
- **TabPanel** - is a container that manages multiple tab components. It provides the tab strip interface and handles tab activation, keyboard navigation, and optional drag-and-drop reordering of tabs.

### Buttons & Input
- **Button** - represents a clickable button with support for text, icons, and custom actions. It extends the base Component class and provides desktop-style button appearance with hover and pressed states.
- **Checkbox** - provides a checkbox input control with label text and form validation support. It allows users to select multiple options from a set of choices.
- **RadioButton** - provides a radio button input control for exclusive selection. Radio buttons with the same name form a group where only one can be selected at a time.
- **RadioButtonGroup** - is a container component that manages a group of radio buttons, ensuring exclusive selection and providing convenient group-level properties and methods.
- **ToggleButton** - represents a button that maintains a pressed/unpressed state. When clicked, it toggles between pressed and unpressed states, making it ideal for on/off controls, tool selection, and other binary choices.
- **ToggleButtonGroup** - is a container component that manages a group of toggle buttons with exclusive selection behavior. When one toggle button in the group is pressed, all other buttons in the group are automatically unpressed, similar to radio button behavior.

### Text & Editing
- **CodeBlock** - displays code snippets with optional line numbers, a copy-to-clipboard button, and a language label. Supports any programming language and automatically updates line numbers based on content. Ideal for documentation, tutorials, and any interface displaying source code.
- **Label** - displays static text content with optional icons and comprehensive alignment options. It provides a consistent way to display labels, captions, and informational text throughout GooeyJS applications with support for both horizontal and vertical alignment, clickable actions, and icon integration.
- **PasswordField** - provides a secure password input control that masks entered text. It extends the TextElement class and inherits all form validation capabilities while providing the security benefits of hidden password input. Text entered into this field is automatically masked with asterisks or dots for privacy.
- **Spinner** - provides a numeric input control with integrated increment/decrement buttons. It extends the FormElement class and includes keyboard support, value constraints (min/max), and step values for precise numeric input. This component is ideal for quantity selectors, counters, and any scenario requiring controlled numeric input.
- **RichTextEditor** - provides a WYSIWYG rich text editing interface with formatting tools, supporting bold, italic, underline, font changes, colors, and other text formatting options.
- **TextArea** - provides a multi-line plain text input control with support for scrolling, resize handles, and form validation. Perfect for comments, descriptions, and longer text input.
- **TextField** - provides a single-line text input control with built-in validation support, placeholder text, and various input types. It extends the FormElement class and integrates with GooeyJS's form validation system. All standard HTML input attributes are passed through to the internal HTML input element.

### Lists and Selection
- **ComboBox** - combines a text input field with a dropdown list of options. It extends the ListBox component to provide both selection from predefined options and the ability to enter custom text. The combo box supports both editable and non-editable modes, keyboard navigation, and option filtering.
- **DropDownList** - provides a dropdown selection control that allows users to choose from a predefined list of options. It's ideal for single-selection scenarios where space is limited.
- **ListBox** - provides a scrollable list control that displays multiple options simultaneously and supports both single and multiple selection modes.
- **Tree** - provides a hierarchical tree view for displaying structured data. It manages selection states, keyboard navigation, and expansion/collapse operations for tree items. The tree component serves as a container for tree items and provides a consistent interface for tree manipulation.
- **TreeItem** - represents an individual item within a tree structure. It can contain text, an icon, and child tree items to create hierarchical structures. Tree items support expansion/collapse, drag-and-drop operations, and comprehensive keyboard navigation.

### Menus & Navigation
- **CheckboxMenuItem** - represents a menu item with a checkbox that can be toggled on or off. It extends the basic MenuItem component to provide toggleable state functionality, commonly used for settings, options, or feature toggles in menu systems.
- **ContextMenu** - creates a popup menu that appears when users right-click on an element. It extends the Menu component to provide contextual actions and options specific to the element being clicked. Context menus automatically position themselves near the cursor and close when clicking outside.
- **HamburgerMenu** - provides a collapsible navigation menu triggered by a hamburger icon button. Supports slide-out panels from left, right, top, or bottom positions with multiple display modes (slide, overlay, push). Contains menu items and automatically closes on item selection or clicking outside. Ideal for mobile-responsive navigation and compact menu interfaces.
- **Menubar** - provides a horizontal menu bar container that holds top-level menu items. It's typically positioned at the top of an application window and provides access to application commands and functions.
- **Menu** - creates a dropdown menu container that holds menu items, separators, and submenus. It provides keyboard navigation, cascading submenus, and integration with menu bars and context menus for comprehensive menu system functionality.
- **MenuItem** - represents an individual action item within a menu. It provides clickable menu options with support for icons, keyboard shortcuts, and various states (enabled, disabled, checked).
- **MenuItemSeparator** - provides a visual separator line between menu items. It helps organize menu items into logical groups and improves menu readability.

### Toolbars & Tools
- **Toolbar** - provides a horizontal container for organizing buttons, controls, and other UI elements in a toolbar layout. It extends the Container class and supports configurable button sizes, borders, and flexible content arrangement.
- **ToolbarSeparator** - provides a visual separator for organizing and grouping buttons within toolbars. It creates a vertical line or space that helps distinguish between related groups of toolbar actions, improving the visual organization and usability of toolbar interfaces.
- **ColorPicker** - provides a comprehensive color selection interface with a color button, hex input field, and dropdown color palette. It supports both manual hex entry and visual color selection.
- **DatePicker** - provides a date selection control that wraps the native HTML5 date input with GooeyJS styling and functionality. It supports date constraints through min/max attributes, step values for date increments, and integrates seamlessly with the GooeyJS form validation system.
- **TimePicker** - provides a time selection control that wraps the native HTML5 time input with GooeyJS styling and functionality. It extends the FormElement class and supports time constraints through min/max attributes and integrates with the GooeyJS form validation system. The component provides a consistent cross-browser experience for time selection. 

### Windows & Dialogs
- **Dialog** - provides static methods for displaying system dialog boxes including alerts, confirmations, prompts, and information messages. It replaces native browser dialogs with styled GooeyJS dialogs that match the application's visual theme and provide better customization options.
- **FloatingPane** - a lightweight window component that extends Window, providing a simpler floating container with title bar support, modal behavior, and viewport constraints. Ideal for tooltips, popovers, and lightweight dialogs.
- **Window** - represents a desktop-style window with title bar, close button, and draggable functionality. It provides a container for dialog content and supports modal behavior, viewport constraints, and window management features.

### Feedback & Status
- **ProgressBar** - represents a progress indicator that shows the completion progress of a task. It extends the base Component class and provides desktop-style progress bar appearance with support for both determinate and indeterminate states.

### Data Components
- **Data** - a non-visual component representing a single data record within a Store. Data is defined using HTML `data-*` attributes, which are automatically converted to JavaScript objects with type coercion (numbers, booleans, strings).
- **DataGrid** - a full-featured data grid component with virtual scrolling, multiple selection modes, column sorting/filtering, column resizing, and inline cell editing. Supports binding to a Store component via the `store` attribute for automatic data synchronization.
- **DataGridColumn** - defines a column within a DataGrid, specifying the field name, header text, width, and whether the column is sortable, filterable, or editable.
- **Field** - a non-visual component that defines a single field within a Model schema. Specifies the field's name, data type (string, number, boolean, date), and optional default value for type-safe data handling.
- **Model** - a non-visual component that defines a data schema for Store components. Contains Field children that describe the structure of data records, enabling type coercion and default values for consistent data management.
- **Store** - a non-visual data store component that holds data records and provides a reactive data API. Data can be defined declaratively using child Data elements or programmatically via JavaScript. Fires events when data changes, enabling automatic updates to bound DataGrid components.

### Styling & Utilities
- **Background** - is a utility component that defines background properties for other UI elements. It supports solid colors, images, and gradient references with configurable size, position, repeat, attachment, opacity, and blend modes. Other components can reference a Background via the `background` attribute for consistent styling.
- **Border** - is a utility component that defines border properties for other UI elements. It provides a structured way to configure border color, style, and width for consistent border styling across GooeyJS components.
- **Font** - is a utility component that defines font properties for text styling in GooeyJS applications. It provides a structured way to configure font family, size, and weight for consistent typography across components.
- **Gradient** - is a utility component that defines CSS gradients (linear, radial, conic) which can be referenced by Background components or applied directly to elements. Supports repeating gradients, configurable angles, shapes, sizes, and color stops via the `stops` attribute or child GradientStop elements.
- **GradientStop** - defines a single color stop within a Gradient component. Specifies the color, position (percentage or length), and optional color hint for precise gradient control.

## GooeyJS 3.0 Roadmap

### Overview
GooeyJS 3.0 will include:
- A full suite of mobile UI components
- Improvements to DataGrid, RichTextEditor
- Internationalization
- Filters and Transitions

### New Components
GooeyJS 3.0 will at the very least include the following components:
- Badge
- Breadcrumb
- Carousel
- Pagination
- Toast Notifications
- Video Player
- Waffle Menu

It will also include components specifically geared for configuring:
- Filters
- Transitions

## Getting Started
Download GooeyJS.v2.0.0.zip and unzip to your codebase. To include GooeyJS, just use the following:

    <script type="module" src="GooeyJS/GooeyJS.js"></script>


**Copyright 2025 NetHaven Inc.**
