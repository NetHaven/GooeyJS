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
            elements: ["Application", "Border", "ColorPicker", "Font", "Label", "ProgressBar", "Tree", "TreeItem"]
        },{
            pkg: "gooey.ui.button",
            elements: ["Button", "ToggleButton", "ToggleButtonGroup"]
        },{
            pkg: "gooey.ui.form",
            elements: ["Checkbox", "DatePicker", "RadioButton", "RadioButtonGroup", "Spinner", "TimePicker"]
        },{
            pkg: "gooey.ui.form.list",
            elements: ["ComboBox", "DropDownList", "ListBox"]
        },{
            pkg: "gooey.ui.form.text",
            elements: ["PasswordField", "RichTextEditor", "TextArea", "TextField"]
        },{
            pkg: "gooey.ui.menu",
            elements: ["CheckboxMenuItem", "ContextMenu", "Menu", "Menubar", "MenuItem", "MenuItemSeparator"]
        },{
            pkg: "gooey.ui.panel",
            elements: ["AccordionPanel", "AppPanel", "FormPanel", "GroupBox", "Panel", "SplitPanel", "Tab", "TabPanel"]
        },{
            pkg: "gooey.ui.toolbar",
            elements: ["Toolbar", "ToolbarSeparator"]
        },{
            pkg: "gooey.ui.window",
            elements: ["Window"]
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
        // Special cases with custom template IDs (not following ui-ComponentName pattern)
        const specialTemplateIds = {
            "MenuHeader": "menuHeader"  // MenuHeader uses "menuHeader" instead of "ui-MenuHeader"
        };

        for (const component of this.components) {
            // Convert dot-separated package name to folder path (e.g., "gooey.ui.button" -> "gooey/ui/button")
            const pkgPath = component.pkg.replace(/\./g, '/');

            for (const elementName of component.elements) {
                try {
                    // Build relative import path
                    const modulePath = `./${pkgPath}/${elementName}.js`;
                    const templatePath = `./${pkgPath}/${elementName}.html`;

                    // Dynamically import the component class
                    const module = await import(modulePath);
                    const ComponentClass = module.default;

                    // Convert class name to custom element tag (e.g., "Button" -> "ui-button")
                    const tagName = `ui-${elementName.toLowerCase()}`;

                    // Register the custom element
                    customElements.define(tagName, ComponentClass);

                    // Load template if it exists (in same folder as component)
                    // Use special template ID if defined, otherwise use standard ui-ComponentName pattern
                    const templateId = specialTemplateIds[elementName] || `ui-${elementName}`;
                    try {
                        await Template.load(`${PATH}/${pkgPath}/${elementName}.html`, templateId);
                        console.log(`Loaded template ${templateId} from ${templatePath}`);
                    } catch (templateError) {
                        // Template might not exist for all components, so this is not necessarily an error
                        console.debug(`No template found for ${elementName} at ${templatePath}`);
                    }

                    console.log(`Registered ${tagName} from ${modulePath}`);
                } catch (error) {
                    console.error(`Failed to load component ${component.pkg}.${elementName}:`, error);
                }
            }
        }
    }

}

window.addEventListener('load', function() { new GooeyJS();}());
