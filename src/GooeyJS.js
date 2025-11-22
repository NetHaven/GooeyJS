import Template from './gooey/util/Template.js';

const SCRIPT_PATH = new URL(import.meta.url, document.baseURI);
const PATH = SCRIPT_PATH.href.substring(0, SCRIPT_PATH.href.lastIndexOf('/'));

export default class GooeyJS {
    constructor() {
        let headEl, htmlEl, linkEl;

        this.components = [{
            pkg: "gooey",
            elements: [
                { name: "Application", prefix: "Gooey" },
                { name: "Component", prefix: "Gooey" }
            ]
        },{
            pkg: "gooey.ui",
            elements: [
                { name: "Border", prefix: "GooeyUI" },
                { name: "ColorPicker", prefix: "GooeyUI" },
                { name: "Font", prefix: "GooeyUI" },
                { name: "Label", prefix: "GooeyUI" },
                { name: "ProgressBar", prefix: "GooeyUI" },
                { name: "Tree", prefix: "GooeyUI" },
                { name: "TreeItem", prefix: "GooeyUI" }
            ]
        },{
            pkg: "gooey.ui.button",
            elements: [
                { name: "Button", prefix: "GooeyUI" },
                { name: "ToggleButton", prefix: "GooeyUI" },
                { name: "ToggleButtonGroup", prefix: "GooeyUI" }
            ]
        },{
            pkg: "gooey.ui.form",
            elements: [
                { name: "Checkbox", prefix: "GooeyUI" },
                { name: "DatePicker", prefix: "GooeyUI" },
                { name: "RadioButton", prefix: "GooeyUI" },
                { name: "RadioButtonGroup", prefix: "GooeyUI" },
                { name: "Spinner", prefix: "GooeyUI" },
                { name: "TimePicker", prefix: "GooeyUI" }
            ]
        },{
            pkg: "gooey.ui.form.list",
            elements: [
                { name: "ComboBox", prefix: "GooeyUI" },
                { name: "DropDownList", prefix: "GooeyUI" },
                { name: "ListBox", prefix: "GooeyUI" }
            ]
        },{
            pkg: "gooey.ui.form.text",
            elements: [
                { name: "PasswordField", prefix: "GooeyUI" },
                { name: "RichTextEditor", prefix: "GooeyUI" },
                { name: "TextArea", prefix: "GooeyUI" },
                { name: "TextField", prefix: "GooeyUI" }
            ]
        },{
            pkg: "gooey.ui.menu",
            elements: [
                { name: "CheckboxMenuItem", prefix: "GooeyUI" },
                { name: "ContextMenu", prefix: "GooeyUI" },
                { name: "Menu", prefix: "GooeyUI" },
                { name: "Menubar", prefix: "GooeyUI" },
                { name: "MenuItem", prefix: "GooeyUI" },
                { name: "MenuItemSeparator", prefix: "GooeyUI" }
            ]
        },{
            pkg: "gooey.ui.panel",
            elements: [
                { name: "AccordionPanel", prefix: "GooeyUI" },
                { name: "AppPanel", prefix: "GooeyUI" },
                { name: "FormPanel", prefix: "GooeyUI" },
                { name: "GroupBox", prefix: "GooeyUI" },
                { name: "Panel", prefix: "GooeyUI" },
                { name: "SplitPanel", prefix: "GooeyUI" },
                { name: "Tab", prefix: "GooeyUI" },
                { name: "TabPanel", prefix: "GooeyUI" }
            ]
        },{
            pkg: "gooey.ui.toolbar",
            elements: [
                { name: "Toolbar", prefix: "GooeyUI" },
                { name: "ToolbarSeparator", prefix: "GooeyUI" }
            ]
        },{
            pkg: "gooey.ui.window",
            elements: [
                { name: "Window", prefix: "GooeyUI" }
                { name: "FloatingPane", prefix: "GooeyUI" }
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

    static get basePath() {
        return PATH;
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
                    // Build relative import path (each component has its own folder)
                    const componentPath = `${pkgPath}/${element.name}`;
                    const modulePath = `./${componentPath}/${element.name}.js`;
                    const templatePath = `./${componentPath}/${element.name}.html`;

                    // Dynamically import the component class
                    const module = await import(modulePath);
                    const ComponentClass = module.default;

                    // Convert class name to custom element tag using configurable prefix (e.g., "Button" + "GooeyUI" -> "ui-button")
                    const tagName = `${element.prefix}-${element.name.toLowerCase()}`;

                    // Register the custom element
                    customElements.define(tagName, ComponentClass);

                    // Load template if it exists (in same folder as component)
                    // Use special template ID if defined, otherwise use standard prefix-ComponentName pattern
                    const templateId = specialTemplateIds[element.name] || `${element.prefix}-${element.name}`;
                    try {
                        await Template.load(`${PATH}/${componentPath}/${element.name}.html`, templateId);
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
