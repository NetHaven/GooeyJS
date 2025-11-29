import Template from './gooey/util/Template.js';
import MetaLoader from './gooey/util/MetaLoader.js';
import AttributeRegistry from './gooey/util/AttributeRegistry.js';

const SCRIPT_PATH = new URL(import.meta.url, document.baseURI);
const PATH = SCRIPT_PATH.href.substring(0, SCRIPT_PATH.href.lastIndexOf('/'));

export default class GooeyJS {
    constructor() {
        let headEl, htmlEl, linkEl;

        // Component packages to load - META.goo in each component provides the details
        this.components = [{
            pkg: "gooey",
            elements: [
                { name: "Application" },
                { name: "Component" }
            ]
        },{
            pkg: "gooey.ui",
            elements: [
                { name: "Border" },
                { name: "ColorPicker" },
                { name: "Font" },
                { name: "Label" },
                { name: "ProgressBar" },
                { name: "Tree" },
                { name: "TreeItem" }
            ]
        },{
            pkg: "gooey.ui.button",
            elements: [
                { name: "Button" },
                { name: "ToggleButton" },
                { name: "ToggleButtonGroup" }
            ]
        },{
            pkg: "gooey.ui.form",
            elements: [
                { name: "Checkbox" },
                { name: "DatePicker" },
                { name: "RadioButton" },
                { name: "RadioButtonGroup" },
                { name: "Spinner" },
                { name: "TimePicker" }
            ]
        },{
            pkg: "gooey.ui.form.list",
            elements: [
                { name: "ComboBox" },
                { name: "DropDownList" },
                { name: "ListBox" }
            ]
        },{
            pkg: "gooey.ui.form.text",
            elements: [
                { name: "PasswordField" },
                { name: "RichTextEditor" },
                { name: "TextArea" },
                { name: "TextField" }
            ]
        },{
            pkg: "gooey.ui.menu",
            elements: [
                { name: "CheckboxMenuItem" },
                { name: "ContextMenu" },
                { name: "Menu" },
                { name: "Menubar" },
                { name: "MenuItem" },
                { name: "MenuItemSeparator" }
            ]
        },{
            pkg: "gooey.ui.panel",
            elements: [
                { name: "AccordionPanel" },
                { name: "AppPanel" },
                { name: "FormPanel" },
                { name: "GroupBox" },
                { name: "Panel" },
                { name: "SplitPanel" },
                { name: "Tab" },
                { name: "TabPanel" }
            ]
        },{
            pkg: "gooey.ui.toolbar",
            elements: [
                { name: "Toolbar" },
                { name: "ToolbarSeparator" }
            ]
        },{
            pkg: "gooey.ui.window",
            elements: [
                { name: "Window" },
                { name: "FloatingPane" }
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
        for (const component of this.components) {
            // Convert dot-separated package name to folder path (e.g., "gooey.ui.button" -> "gooey/ui/button")
            const pkgPath = component.pkg.replace(/\./g, '/');

            for (const element of component.elements) {
                try {
                    // Build component path
                    const componentPath = `${pkgPath}/${element.name}`;
                    const fullComponentPath = `${PATH}/${componentPath}`;

                    // Load and validate META.goo (required - strict mode)
                    const meta = await MetaLoader.loadAndValidate(fullComponentPath);

                    // Register in AttributeRegistry
                    AttributeRegistry.register(meta.tagName, meta);

                    // Build script path from META.goo
                    const modulePath = `./${componentPath}/scripts/${meta.script}`;

                    // Dynamically import the component class
                    const module = await import(modulePath);
                    const ComponentClass = module.default;

                    // Inject observedAttributes from registry
                    this._injectObservedAttributes(ComponentClass, meta.tagName);

                    // Register the custom element with tag name from META.goo
                    customElements.define(meta.tagName, ComponentClass);

                    // Load templates from META.goo
                    if (meta.templates && meta.templates.length > 0) {
                        for (const template of meta.templates) {
                            try {
                                await Template.load(
                                    `${fullComponentPath}/templates/${template.file}`,
                                    template.id
                                );
                                console.log(`Loaded template ${template.id} from ${template.file}`);
                            } catch (templateError) {
                                console.warn(`Failed to load template ${template.id}:`, templateError);
                            }
                        }
                    }

                    // Load and cache default theme CSS for Shadow DOM injection
                    if (meta.themes && meta.themes.default) {
                        try {
                            const cssResult = await MetaLoader.loadThemeCSS(fullComponentPath, meta.themes.default);
                            AttributeRegistry.setThemeCSS(meta.tagName, cssResult);
                            AttributeRegistry.setComponentPath(meta.tagName, fullComponentPath);
                            console.log(`Loaded theme CSS for ${meta.tagName}: ${meta.themes.default}`);
                        } catch (themeError) {
                            console.warn(`Failed to load theme CSS for ${meta.tagName}:`, themeError);
                        }
                    }

                    // Store component path for theme switching even if no default theme
                    AttributeRegistry.setComponentPath(meta.tagName, fullComponentPath);

                    console.log(`Registered ${meta.tagName} from ${modulePath}`);
                } catch (error) {
                    console.error(`Failed to load component ${component.pkg}.${element.name}:`, error);
                }
            }
        }
    }

    /**
     * Inject observedAttributes getter into component class from registry
     * @param {Function} ComponentClass - The component class
     * @param {string} tagName - The custom element tag name
     */
    _injectObservedAttributes(ComponentClass, tagName) {
        Object.defineProperty(ComponentClass, 'observedAttributes', {
            configurable: true,
            get: () => AttributeRegistry.getObservedAttributes(tagName)
        });
    }

}

window.addEventListener('load', function() { new GooeyJS();}());
