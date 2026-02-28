const notificationCategory = {
  "name": "notification",
  "elements": [
    {
      "name": "Toast",
      "tagName": "gooeyui-toast",
      "description": "A notification toast component with four severity types (INFO, SUCCESS, WARNING, ERROR), six viewport positions, auto-hide with configurable duration, optional close and action buttons, progress bar, and queue management. Supports static convenience methods (Toast.info, Toast.success, Toast.warning, Toast.error) following the Dialog pattern. Includes base and dark themes.",
      "inherits": [
        "UIComponent"
      ],
      "attributes": [
        {
          "name": "message",
          "type": "STRING",
          "description": "The notification message text displayed in the toast body",
          "required": false
        },
        {
          "name": "type",
          "type": "ENUM",
          "values": [
            "info",
            "success",
            "warning",
            "error"
          ],
          "description": "Severity type controlling color scheme, icon, and ARIA role (default: info)",
          "required": false
        },
        {
          "name": "duration",
          "type": "NUMBER",
          "description": "Auto-hide delay in milliseconds. Set to 0 for manual-close only (default: 5000)",
          "required": false
        },
        {
          "name": "position",
          "type": "ENUM",
          "values": [
            "top-left",
            "top-center",
            "top-right",
            "bottom-left",
            "bottom-center",
            "bottom-right"
          ],
          "description": "Viewport position where the toast appears (default: top-right)",
          "required": false
        },
        {
          "name": "closable",
          "type": "BOOLEAN",
          "description": "When true, shows a close button that fires DISMISS event on click (default: true)",
          "required": false
        },
        {
          "name": "showicon",
          "type": "BOOLEAN",
          "description": "When true, displays the type-specific icon (default: true)",
          "required": false
        },
        {
          "name": "actiontext",
          "type": "STRING",
          "description": "Text for an optional action button. When set, the button is visible and fires ACTION event on click",
          "required": false
        },
        {
          "name": "progressbar",
          "type": "BOOLEAN",
          "description": "When true, shows an animated countdown bar synced to the auto-hide timer (default: false)",
          "required": false
        }
      ],
      "examples": [
        {
          "title": "Static Convenience Methods",
          "description": "Create toasts using the static API (recommended approach).",
          "code": "<gooey-component href=\"GooeyJS/src/gooey/ui/notification/Toast\"></gooey-component>\n\n<script type=\"module\">\n  import Toast from './src/gooey/ui/notification/Toast/scripts/Toast.js';\n\n  Toast.info('File uploaded successfully');\n  Toast.success('Changes saved');\n  Toast.warning('Connection unstable');\n  Toast.error('Failed to save changes');\n</script>"
        },
        {
          "title": "With Options",
          "description": "Configure toast behavior with an options object.",
          "code": "<script type=\"module\">\n  import Toast from './src/gooey/ui/notification/Toast/scripts/Toast.js';\n\n  Toast.info('Processing complete', {\n    position: 'bottom-center',\n    duration: 3000,\n    closable: true,\n    progressBar: true\n  });\n</script>"
        },
        {
          "title": "Action Button and Events",
          "description": "Add an action button and listen to toast events.",
          "code": "<script type=\"module\">\n  import Toast from './src/gooey/ui/notification/Toast/scripts/Toast.js';\n  import ToastEvent from './src/gooey/events/notification/ToastEvent.js';\n\n  const toast = Toast.error('Upload failed', {\n    actionText: 'Retry',\n    duration: 0\n  });\n\n  toast.addEventListener(ToastEvent.ACTION, () => {\n    console.log('Retry clicked');\n    toast.hide();\n  });\n</script>"
        },
        {
          "title": "Declarative Usage",
          "description": "Create a toast element declaratively in HTML.",
          "code": "<gooey-component href=\"GooeyJS/src/gooey/ui/notification/Toast\"></gooey-component>\n\n<gooeyui-toast\n  message=\"Welcome back!\"\n  type=\"success\"\n  duration=\"3000\"\n  position=\"top-center\"\n  closable=\"true\"\n  progressbar=\"true\">\n</gooeyui-toast>"
        }
      ]
    },
    {
      "name": "Badge",
      "tagName": "gooeyui-badge",
      "description": "A small visual indicator for displaying status, counts, notifications, or labels. Supports variants, sizes, dot mode, overlay positioning on other elements, and pulse animation. Content precedence: dot > value > text.",
      "inherits": [
        "UIComponent"
      ],
      "attributes": [
        {
          "name": "text",
          "type": "STRING",
          "description": "Text content displayed in the badge (lowest precedence after value)",
          "required": false
        },
        {
          "name": "value",
          "type": "NUMBER",
          "description": "Numeric value to display (takes precedence over text). Shows overflow indicator when exceeding max.",
          "required": false
        },
        {
          "name": "max",
          "type": "NUMBER",
          "description": "Maximum value before showing overflow indicator (e.g., '99+'). Default: 99. Set to 0 for no limit.",
          "required": false
        },
        {
          "name": "icon",
          "type": "STRING",
          "description": "URL path to an icon image displayed in the badge",
          "required": false
        },
        {
          "name": "label",
          "type": "STRING",
          "description": "Accessible label for screen readers (maps to aria-label)",
          "required": false
        },
        {
          "name": "variant",
          "type": "ENUM",
          "values": [
            "default",
            "primary",
            "success",
            "warning",
            "error",
            "info"
          ],
          "description": "Visual style variant determining the badge color scheme",
          "required": false
        },
        {
          "name": "size",
          "type": "ENUM",
          "values": [
            "small",
            "medium",
            "large"
          ],
          "description": "Size of the badge",
          "required": false
        },
        {
          "name": "pill",
          "type": "BOOLEAN",
          "description": "When true, uses fully rounded pill shape instead of rectangular",
          "required": false
        },
        {
          "name": "dot",
          "type": "BOOLEAN",
          "description": "When true, displays as a small dot indicator ignoring text/value (highest precedence)",
          "required": false
        },
        {
          "name": "outline",
          "type": "BOOLEAN",
          "description": "When true, uses outline style with transparent background instead of filled",
          "required": false
        },
        {
          "name": "pulse",
          "type": "BOOLEAN",
          "description": "When true, enables pulse animation for attention",
          "required": false
        },
        {
          "name": "position",
          "type": "ENUM",
          "values": [
            "top-right",
            "top-left",
            "bottom-right",
            "bottom-left"
          ],
          "description": "Position when used as overlay on slotted content. Badge becomes absolutely positioned.",
          "required": false
        }
      ],
      "examples": [
        {
          "title": "Basic Text Badge",
          "description": "A simple badge displaying text.",
          "code": "<gooeyui-badge text=\"New\"></gooeyui-badge>\n<gooeyui-badge text=\"Beta\" variant=\"info\"></gooeyui-badge>"
        },
        {
          "title": "Numeric Badge with Overflow",
          "description": "A badge showing a count with automatic overflow handling.",
          "code": "<gooeyui-badge value=\"5\"></gooeyui-badge>\n<gooeyui-badge value=\"150\" max=\"99\"></gooeyui-badge>\n<!-- Displays: 5 and 99+ -->"
        },
        {
          "title": "Variant Styles",
          "description": "Badges with different color variants.",
          "code": "<gooeyui-badge text=\"Default\"></gooeyui-badge>\n<gooeyui-badge text=\"Primary\" variant=\"primary\"></gooeyui-badge>\n<gooeyui-badge text=\"Success\" variant=\"success\"></gooeyui-badge>\n<gooeyui-badge text=\"Warning\" variant=\"warning\"></gooeyui-badge>\n<gooeyui-badge text=\"Error\" variant=\"error\"></gooeyui-badge>\n<gooeyui-badge text=\"Info\" variant=\"info\"></gooeyui-badge>"
        },
        {
          "title": "Outline and Pill Styles",
          "description": "Badges with outline and pill shape variations.",
          "code": "<gooeyui-badge text=\"Outline\" outline></gooeyui-badge>\n<gooeyui-badge text=\"Pill\" pill></gooeyui-badge>\n<gooeyui-badge text=\"Both\" outline pill variant=\"primary\"></gooeyui-badge>"
        },
        {
          "title": "Dot Indicator with Overlay",
          "description": "A dot badge positioned on a button for notification indication.",
          "code": "<gooeyui-badge dot variant=\"error\" position=\"top-right\">\n  <gooeyui-button text=\"Messages\"></gooeyui-button>\n</gooeyui-badge>"
        },
        {
          "title": "Badge Sizes",
          "description": "Badges in different sizes.",
          "code": "<gooeyui-badge text=\"Small\" size=\"small\"></gooeyui-badge>\n<gooeyui-badge text=\"Medium\" size=\"medium\"></gooeyui-badge>\n<gooeyui-badge text=\"Large\" size=\"large\"></gooeyui-badge>"
        },
        {
          "title": "Icon Badge",
          "description": "A badge displaying an icon.",
          "code": "<gooeyui-badge icon=\"icons/star.svg\" variant=\"warning\"></gooeyui-badge>"
        },
        {
          "title": "Pulsing Attention Badge",
          "description": "A badge with pulse animation for urgent attention.",
          "code": "<gooeyui-badge text=\"Urgent\" variant=\"error\" pulse></gooeyui-badge>\n<gooeyui-badge dot variant=\"error\" pulse position=\"top-right\">\n  <gooeyui-button text=\"Alerts\"></gooeyui-button>\n</gooeyui-badge>"
        },
        {
          "title": "Programmatic Usage",
          "description": "Controlling badge value and appearance via JavaScript.",
          "code": "<gooeyui-badge id=\"notifBadge\" value=\"0\" variant=\"primary\"></gooeyui-badge>\n\n<script>\n  const badge = document.getElementById('notifBadge');\n  \n  // Increment/decrement\n  badge.increment();      // value = 1\n  badge.increment(5);     // value = 6\n  badge.decrement(2);     // value = 4\n  \n  // Set directly\n  badge.value = 10;\n  badge.variant = 'error';\n  badge.pulse = true;\n  \n  // Clear content\n  badge.clear();\n</script>"
        }
      ]
    }
  ]
};
