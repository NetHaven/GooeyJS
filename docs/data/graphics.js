const graphicsCategory = {
  "name": "graphics",
  "subcategories": [
    {
      "name": "gradient",
      "elements": [
        {
          "name": "Gradient",
          "tagName": "gooeyui-gradient",
          "description": "A gradient definition component for creating linear, radial, and conic CSS gradients that can be referenced by other components.",
          "inherits": [
            "GooeyElement"
          ],
          "attributes": [
            {
              "name": "type",
              "type": "ENUM",
              "values": [
                "linear",
                "radial",
                "conic"
              ],
              "description": "Type of gradient to create (default: linear)",
              "required": false
            },
            {
              "name": "repeating",
              "type": "BOOLEAN",
              "description": "When true, creates a repeating gradient pattern",
              "required": false
            },
            {
              "name": "angle",
              "type": "STRING",
              "description": "Direction for linear gradients as angle (45deg) or keyword (to right, to bottom left)",
              "required": false
            },
            {
              "name": "shape",
              "type": "ENUM",
              "values": [
                "circle",
                "ellipse"
              ],
              "description": "Shape for radial gradients (default: ellipse)",
              "required": false
            },
            {
              "name": "size",
              "type": "ENUM",
              "values": [
                "closest-side",
                "closest-corner",
                "farthest-side",
                "farthest-corner"
              ],
              "description": "Size keyword for radial gradients (default: farthest-corner)",
              "required": false
            },
            {
              "name": "position",
              "type": "STRING",
              "description": "Center position for radial and conic gradients (default: center)",
              "required": false
            },
            {
              "name": "from",
              "type": "STRING",
              "description": "Starting angle for conic gradients (default: 0deg)",
              "required": false
            },
            {
              "name": "stops",
              "type": "STRING",
              "description": "Comma-separated color stops with optional positions (e.g., 'red 0%, blue 100%')",
              "required": false
            }
          ],
          "examples": [
            {
              "title": "Simple Linear Gradient",
              "description": "A basic two-color linear gradient.",
              "code": "<gooeyui-gradient id=\"simpleGrad\" type=\"linear\" angle=\"to right\" stops=\"#3498db, #9b59b6\"></gooeyui-gradient>"
            },
            {
              "title": "Multi-Color Gradient",
              "description": "A gradient with multiple color stops.",
              "code": "<gooeyui-gradient id=\"rainbow\" type=\"linear\" angle=\"90deg\" stops=\"red 0%, orange 20%, yellow 40%, green 60%, blue 80%, purple 100%\"></gooeyui-gradient>"
            },
            {
              "title": "Radial Gradient",
              "description": "A circular radial gradient from the center.",
              "code": "<gooeyui-gradient id=\"radialGrad\" type=\"radial\" shape=\"circle\" size=\"farthest-corner\" stops=\"#ffffff, #000000\"></gooeyui-gradient>"
            },
            {
              "title": "Conic Gradient (Color Wheel)",
              "description": "A conic gradient creating a color wheel effect.",
              "code": "<gooeyui-gradient id=\"colorWheel\" type=\"conic\" stops=\"red, yellow, lime, aqua, blue, magenta, red\"></gooeyui-gradient>"
            },
            {
              "title": "Repeating Stripe Pattern",
              "description": "A repeating linear gradient creating stripes.",
              "code": "<gooeyui-gradient id=\"stripes\" type=\"linear\" repeating angle=\"45deg\" stops=\"#606c88 0px, #606c88 10px, #3f4c6b 10px, #3f4c6b 20px\"></gooeyui-gradient>"
            },
            {
              "title": "Gradient with Child Stops",
              "description": "Defining color stops as child elements for complex gradients.",
              "code": "<gooeyui-gradient id=\"complexGrad\" type=\"linear\" angle=\"135deg\">\n  <gooeyui-gradientstop color=\"#667eea\" position=\"0%\"></gooeyui-gradientstop>\n  <gooeyui-gradientstop color=\"#764ba2\" position=\"100%\"></gooeyui-gradientstop>\n</gooeyui-gradient>"
            }
          ]
        },
        {
          "name": "GradientStop",
          "tagName": "gooeyui-gradientstop",
          "description": "A color stop definition used within a Gradient component to specify individual color positions.",
          "inherits": [
            "GooeyElement"
          ],
          "attributes": [
            {
              "name": "color",
              "type": "STRING",
              "description": "CSS color value for this stop (hex, rgb, hsl, or named color)",
              "required": true
            },
            {
              "name": "position",
              "type": "STRING",
              "description": "Position of this color stop as percentage or length (e.g., '50%', '100px')",
              "required": false
            },
            {
              "name": "hint",
              "type": "STRING",
              "description": "Color interpolation hint defining the midpoint between this stop and the next",
              "required": false
            }
          ],
          "examples": [
            {
              "title": "Basic Color Stop",
              "description": "A simple color stop at a specific position.",
              "code": "<gooeyui-gradientstop color=\"#ff0000\" position=\"0%\"></gooeyui-gradientstop>"
            },
            {
              "title": "Color Stop with Hint",
              "description": "A color stop with interpolation hint for smooth transitions.",
              "code": "<gooeyui-gradientstop color=\"blue\" position=\"0%\" hint=\"25%\"></gooeyui-gradientstop>"
            },
            {
              "title": "Auto-Positioned Stop",
              "description": "A color stop without explicit position (auto-distributed).",
              "code": "<gooeyui-gradientstop color=\"rgba(255,255,255,0.5)\"></gooeyui-gradientstop>"
            }
          ]
        }
      ]
    }
  ]
};
