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
- **Tab** - represents an individual tab within a TabPanel. It contains the tab's content and manages its visibility based on the active state.
- **TabPanel** - is a container that manages multiple tab components. It provides the tab strip interface and handles tab activation, keyboard navigation, and optional drag-and-drop reordering of tabs.

### Buttons & Input

- **Button** - represents a clickable button with support for text, icons, and custom actions.
- **ToggleButton** - represents a button that maintains a pressed/unpressed state.
- **ToggleButtonGroup** - is a container component that manages a group of toggle buttons with exclusive selection behavior.

### Text & Editing
- **Label** - displays static text content with optional icons and comprehensive alignment options.

### Menus & Navigation

- **Menubar** - provides a horizontal menu bar container that holds top-level menu items.
- **Menu** - creates a dropdown menu container that holds menu items, separators, and submenus.
- **MenuItem** - represents an individual action item within a menu.
- **CheckboxMenuItem** - represents a menu item with a checkbox that can be toggled on or off.
- **MenuItemSeparator** - provides a visual separator line between menu items.

### Toolbars & Tools

- **Toolbar** - provides a horizontal container for organizing buttons, controls, and other UI elements in a toolbar layout.
- **ToolbarSeparator** - provides a visual separator for organizing and grouping buttons within toolbars.
- **ColorPicker** - provides a comprehensive color selection interface with a color button.

## Getting Started

Download GooeyJS.v0.5.0.zip and unzip to your codebase. To include GooeyJS, just use the following:

    <script type="module" src="GooeyJS/GooeyJS.js"></script>


**Copyright 2025 NetHaven Inc.**
