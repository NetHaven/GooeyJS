import Template from './gooey/util/Template.js';

const SCRIPT_PATH = new URL(import.meta.url, document.baseURI);
const PATH = SCRIPT_PATH.href.substring(0, SCRIPT_PATH.href.lastIndexOf('/'));

export default class GooeyJS {
    static get basePath() {
        return PATH;
    }
    constructor() {
        let headEl, htmlEl, linkEl;

        this.components = [{
            pkg: "gooey.ui",
            elements: [
                { name: "Application", prefix: "ui" },
                { name: "Border", prefix: "ui" },
                { name: "ColorPicker", prefix: "ui" },
                { name: "Font", prefix: "ui" },
                { name: "Label", prefix: "ui" },
                { name: "ProgressBar", prefix: "ui" },
                { name: "Tree", prefix: "ui" },
                { name: "TreeItem", prefix: "ui" }
            ]
        },{
            pkg: "gooey.ui.button",
            elements: [
                { name: "Button", prefix: "ui" },
                { name: "ToggleButton", prefix: "ui" },
                { name: "ToggleButtonGroup", prefix: "ui" }
            ]
        },{
            pkg: "gooey.ui.form",
            elements: [
                { name: "Checkbox", prefix: "ui" },
                { name: "DatePicker", prefix: "ui" },
                { name: "RadioButton", prefix: "ui" },
                { name: "RadioButtonGroup", prefix: "ui" },
                { name: "Spinner", prefix: "ui" },
                { name: "TimePicker", prefix: "ui" }
            ]
        },{
            pkg: "gooey.ui.form.list",
            elements: [
                { name: "ComboBox", prefix: "ui" },
                { name: "DropDownList", prefix: "ui" },
                { name: "ListBox", prefix: "ui" }
            ]
        },{
            pkg: "gooey.ui.form.text",
            elements: [
                { name: "PasswordField", prefix: "ui" },
                { name: "RichTextEditor", prefix: "ui" },
                { name: "TextArea", prefix: "ui" },
                { name: "TextField", prefix: "ui" }
            ]
        },{
            pkg: "gooey.ui.menu",
            elements: [
                { name: "CheckboxMenuItem", prefix: "ui" },
                { name: "ContextMenu", prefix: "ui" },
                { name: "Menu", prefix: "ui" },
                { name: "Menubar", prefix: "ui" },
                { name: "MenuItem", prefix: "ui" },
                { name: "MenuItemSeparator", prefix: "ui" }
            ]
        },{
            pkg: "gooey.ui.panel",
            elements: [
                { name: "AccordionPanel", prefix: "ui" },
                { name: "AppPanel", prefix: "ui" },
                { name: "FormPanel", prefix: "ui" },
                { name: "GroupBox", prefix: "ui" },
                { name: "Panel", prefix: "ui" },
                { name: "SplitPanel", prefix: "ui" },
                { name: "Tab", prefix: "ui" },
                { name: "TabPanel", prefix: "ui" }
            ]
        },{
            pkg: "gooey.ui.toolbar",
            elements: [
                { name: "Toolbar", prefix: "ui" },
                { name: "ToolbarSeparator", prefix: "ui" }
            ]
        },{
            pkg: "gooey.ui.window",
            elements: [
                { name: "Window", prefix: "ui" }
            ]
        }]

        this.createElements();

        linkEl = document.createElement('link');
        linkEl.setAttribute("rel", "stylesheet");
        linkEl.setAttribute("href", `${PATH}/styles.css`);

        headEl = document.head;
        if (!headEl) {
            htmlEl = document.documentElement;
            headEl = document.createElement('head');
            htmlEl.appendChild(headEl);
        }

        headEl.appendChild(linkEl);
    }

    async createElements() {
        // Special cases with custom template IDs (not following prefix-ComponentName pattern)
        const specialTemplateIds = {
            "MenuHeader": "menuHeader"  // MenuHeader uses "menuHeader" instead of "ui-MenuHeader"
        };

        for (const component of this.components) {
            // Convert dot-separated package name to folder path (e.g., "gooey.ui.button" -> "gooey/ui/button")
            const pkgPath = component.pkg.replace(/\./g, '/');

            for (const element of component.elements) {
                try {
                    // Build relative import path
                    const modulePath = `./${pkgPath}/${element.name}.js`;
                    const templatePath = `./${pkgPath}/${element.name}.html`;

                    // Dynamically import the component class
                    const module = await import(modulePath);
                    const ComponentClass = module.default;

                    // Convert class name to custom element tag using configurable prefix (e.g., "Button" + "ui" -> "ui-button")
                    const tagName = `${element.prefix}-${element.name.toLowerCase()}`;

                    // Register the custom element
                    customElements.define(tagName, ComponentClass);

                    // Load template if it exists (in same folder as component)
                    // Use special template ID if defined, otherwise use standard prefix-ComponentName pattern
                    const templateId = specialTemplateIds[element.name] || `${element.prefix}-${element.name}`;
                    try {
                        await Template.load(`${PATH}/${pkgPath}/${element.name}.html`, templateId);
                        console.log(`Loaded template ${templateId} from ${templatePath}`);
                    } catch (templateError) {
                        // Template might not exist for all components, so this is not necessarily an error
                        console.debug(`No template found for ${element.name} at ${templatePath}`);
                    }

                    console.log(`Registered ${tagName} from ${modulePath}`);
                } catch (error) {
                    console.error(`Failed to load component ${component.pkg}.${element.name}:`, error);
                }
            }
        }
    }

}

window.addEventListener('load', function() { new GooeyJS();}());
