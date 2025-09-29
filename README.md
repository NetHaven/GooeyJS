# GooeyJS
GooeyJS is a web component framework that provides a set of UI elements. Built using modern web standards, Gooey components are custom HTML elements that can be used in any web application.

## Features

- **Custom Web Components** - All elements are proper custom HTML elements
- **Graphics System** - Point and Dimension classes for calculations

## Components

### Layout & Containers

- **Application** - the root-level component for GooeyJS applications. It provides the foundational viewport setup and base styling for the entire application hierarchy.
- **AppPanel** - the top-level container component for GooeyJS applications. It provides the main application layout structure and serves as the root container for all other UI components.
- **Panel** - a fundamental container component that provides a basic rectangular area with consistent styling. It serves as the foundation for more complex layout components and provides essential container functionality.
- **SplitPanel** - a resizable container component that displays two child elements side by side with an adjustable divider between them. Users can drag the divider to dynamically resize the panes, making it ideal for creating split layouts like file explorers, code editors, or any interface requiring adjustable content areas.
- **Tab** - represents an individual tab within a TabPanel. It contains the tab's content and manages its visibility based on the active state.
- **TabPanel** - is a container that manages multiple tab components. It provides the tab strip interface and handles tab activation, keyboard navigation, and optional drag-and-drop reordering of tabs.

### Buttons & Input

- **Button** - represents a clickable button with support for text, icons, and custom actions. It extends the base Component class and provides desktop-style button appearance with hover and pressed states.
- **ToggleButton** - represents a button that maintains a pressed/unpressed state. When clicked, it toggles between pressed and unpressed states, making it ideal for on/off controls, tool selection, and other binary choices.
- **ToggleButtonGroup** - is a container component that manages a group of toggle buttons with exclusive selection behavior. When one toggle button in the group is pressed, all other buttons in the group are automatically unpressed, similar to radio button behavior.

### Text & Editing
- **Label** - displays static text content with optional icons and comprehensive alignment options. It provides a consistent way to display labels, captions, and informational text throughout GooeyJS applications with support for both horizontal and vertical alignment, clickable actions, and icon integration.

### Lists and Selection
-- **Tree** - provides a hierarchical tree view for displaying structured data. It manages selection states, keyboard navigation, and expansion/collapse operations for tree items.
-- **TreeItem** - represents an individual item within a tree structure. It can contain text, an icon, and child tree items to create hierarchical structures.

### Menus & Navigation

- **Menubar** - provides a horizontal menu bar container that holds top-level menu items. It's typically positioned at the top of an application window and provides access to application commands and functions.
- **Menu** - creates a dropdown menu container that holds menu items, separators, and submenus. It provides keyboard navigation, cascading submenus, and integration with menu bars and context menus for comprehensive menu system functionality.
- **MenuItem** - represents an individual action item within a menu. It provides clickable menu options with support for icons, keyboard shortcuts, and various states (enabled, disabled, checked).
- **CheckboxMenuItem** - represents a menu item with a checkbox that can be toggled on or off. It extends the basic MenuItem component to provide toggleable state functionality, commonly used for settings, options, or feature toggles in menu systems.
- **MenuItemSeparator** - provides a visual separator line between menu items. It helps organize menu items into logical groups and improves menu readability.

### Toolbars & Tools

- **Toolbar** - provides a horizontal container for organizing buttons, controls, and other UI elements in a toolbar layout.
- **ToolbarSeparator** - provides a visual separator for organizing and grouping buttons within toolbars.
- **ColorPicker** - provides a comprehensive color selection interface with a color button.

### Windows & Dialogs
- **Window** - represents a desktop-style window with title bar, close button, and draggable functionality.
- **Dialog** - provides static methods for displaying system dialog boxes including alerts, confirmations, prompts, and information messages.

## Getting Started

Download GooeyJS.v0.7.0.zip and unzip to your codebase. To include GooeyJS, just use the following:

    <script type="module" src="GooeyJS/GooeyJS.js"></script>


**Copyright 2025 NetHaven Inc.**
