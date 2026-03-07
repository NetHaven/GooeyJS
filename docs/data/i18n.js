const i18nCategory = {
  "name": "i18n",
  "elements": [
    {
      "name": "I18n",
      "tagName": "gooey-i18n",
      "description": "Declarative configuration element for the global i18n instance. Initializes locale, fallback language, detection strategy, and reads child Locale elements to load translation messages. Supports HTML escaping, debug mode, and customizable namespace and key separators.",
      "inherits": [],
      "attributes": [
        {
          "name": "locale",
          "type": "STRING",
          "description": "Active locale identifier (e.g., 'en', 'fr', 'de'). If omitted, detection or fallback is used.",
          "required": false
        },
        {
          "name": "fallback",
          "type": "STRING",
          "description": "Fallback locale used when a key is missing in the active locale. Comma-separated for a chain (default: 'en').",
          "required": false
        },
        {
          "name": "detect",
          "type": "STRING",
          "description": "Comma-separated detection sources for automatic locale selection (e.g., 'navigator, htmlTag, querystring')",
          "required": false
        },
        {
          "name": "escape-html",
          "type": "BOOLEAN",
          "description": "HTML-escape interpolated values by default (default: true)",
          "required": false
        },
        {
          "name": "debug",
          "type": "BOOLEAN",
          "description": "Enable debug mode that shows translation keys instead of values for CI/testing",
          "required": false
        },
        {
          "name": "ns-separator",
          "type": "STRING",
          "description": "Namespace separator character used in translation keys (default: ':')",
          "required": false
        },
        {
          "name": "key-separator",
          "type": "STRING",
          "description": "Nested key path separator character (default: '.')",
          "required": false
        }
      ],
      "examples": [
        {
          "title": "Basic Inline Locale",
          "description": "Setting up i18n with inline locale messages defined in child Locale elements.",
          "code": "<gooey-i18n locale=\"en\" fallback=\"en\">\n    <gooey-locale lang=\"en\">\n        {\"greeting\": \"Hello\", \"farewell\": \"Goodbye\"}\n    </gooey-locale>\n    <gooey-locale lang=\"fr\">\n        {\"greeting\": \"Bonjour\", \"farewell\": \"Au revoir\"}\n    </gooey-locale>\n</gooey-i18n>"
        },
        {
          "title": "External Locale Files",
          "description": "Loading locale messages from external JSON files with language detection.",
          "code": "<gooey-i18n detect=\"navigator\" fallback=\"en\">\n    <gooey-locale lang=\"en\" src=\"locales/en.json\"></gooey-locale>\n    <gooey-locale lang=\"fr\" src=\"locales/fr.json\" lazy></gooey-locale>\n    <gooey-locale lang=\"de\" src=\"locales/de.json\" lazy></gooey-locale>\n</gooey-i18n>"
        }
      ]
    },
    {
      "name": "Locale",
      "tagName": "gooey-locale",
      "description": "Declarative child element for defining or loading locale messages. Used inside a gooey-i18n element. Messages can be defined inline as JSON text content or loaded from an external file via the src attribute.",
      "inherits": [],
      "attributes": [
        {
          "name": "lang",
          "type": "STRING",
          "description": "Language code for this locale (e.g., 'en', 'fr', 'de')",
          "required": true
        },
        {
          "name": "src",
          "type": "STRING",
          "description": "URL to an external JSON file containing translation messages",
          "required": false
        },
        {
          "name": "lazy",
          "type": "BOOLEAN",
          "description": "When true, delays loading the external file until the locale is actually needed",
          "required": false
        },
        {
          "name": "namespace",
          "type": "STRING",
          "description": "Translation namespace for this locale's messages (default: 'translation')",
          "required": false
        }
      ],
      "examples": [
        {
          "title": "Inline Messages",
          "description": "Defining translation messages directly as JSON text content.",
          "code": "<gooey-locale lang=\"en\">\n    {\"nav.home\": \"Home\", \"nav.about\": \"About\", \"nav.contact\": \"Contact\"}\n</gooey-locale>"
        },
        {
          "title": "External Source",
          "description": "Loading translation messages from an external JSON file.",
          "code": "<gooey-locale lang=\"es\" src=\"locales/es.json\" namespace=\"common\"></gooey-locale>"
        }
      ]
    }
  ]
};
