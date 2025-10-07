import Application from './gooey/ui/Application.js';
import AppPanel from './gooey/ui/panel/AppPanel.js';
import Button from './gooey/ui/button/Button.js';
import Checkbox from './gooey/ui/form/CheckBox.js';
import CheckboxMenuItem from './gooey/ui/menu/CheckboxMenuItem.js';
import ColorPicker from './gooey/ui/ColorPicker.js';
import ComboBox from './gooey/ui/form/list/ComboBox.js';
import ContextMenu from './gooey/ui/menu/ContextMenu.js';
import DropDownList from './gooey/ui/form/list/DropDownList.js';
import Label from './gooey/ui/Label.js';
import ListBox from './gooey/ui/form/list/ListBox.js';
import Menubar from './gooey/ui/menu/Menubar.js';
import Menu from './gooey/ui/menu/Menu.js';
import MenuItem from './gooey/ui/menu/MenuItem.js';
import MenuItemSeparator from './gooey/ui/menu/MenuItemSeparator.js';
import Panel from './gooey/ui/panel/Panel.js';
import PasswordField from './gooey/ui/form/text/PasswordField.js';
import RadioButton from './gooey/ui/form/RadioButton.js';
import RadioButtonGroup from './gooey/ui/form/RadioButtonGroup.js';
import SplitPanel from './gooey/ui/panel/SplitPanel.js';
import Tab from './gooey/ui/panel/Tab.js';
import TabPanel from './gooey/ui/panel/TabPanel.js';
import TextArea from './gooey/ui/form/text/TextArea.js';
import RichTextEditor from './gooey/ui/form/text/RichTextEditor.js';
import TextField from './gooey/ui/form/text/TextField.js';
import ToggleButton from './gooey/ui/button/ToggleButton.js';
import ToggleButtonGroup from './gooey/ui/button/ToggleButtonGroup.js';
import Toolbar from './gooey/ui/toolbar/Toolbar.js';
import ToolbarSeparator from './gooey/ui/toolbar/ToolbarSeparator.js';
import Tree from './gooey/ui/Tree.js';
import TreeItem from './gooey/ui/TreeItem.js';
import Window from './gooey/ui/window/Window.js';

const SCRIPT_PATH = new URL(import.meta.url, document.baseURI);
const PATH = SCRIPT_PATH.href.substring(0, SCRIPT_PATH.href.lastIndexOf('/'));
 
export default class GooeyJS {
    constructor() {
        let headEl, htmlEl, linkEl;

        this.loadTemplates().then(() => {
            this.defineElements();
        });

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

    static activateTemplate(id) {
        let clone, template;

        template = document.getElementById(id);
        if (template) {
            clone = document.importNode(template.content, true);
            document.body.appendChild(clone);
        }
    }

    defineElements() {
        customElements.define("ui-application", Application);
        customElements.define("ui-apppanel", AppPanel);
        customElements.define("ui-button", Button);
        customElements.define("ui-checkbox", Checkbox);
        customElements.define("ui-checkboxmenuitem", CheckboxMenuItem);
        customElements.define("ui-colorpicker", ColorPicker);
        customElements.define("ui-combobox", ComboBox);
        customElements.define("ui-contextmenu", ContextMenu);
        customElements.define("ui-dropdownlist", DropDownList);
        customElements.define("ui-label", Label);
        customElements.define("ui-listbox", ListBox);
        customElements.define("ui-menu", Menu);
        customElements.define("ui-menubar", Menubar);
        customElements.define("ui-menuitem", MenuItem);
        customElements.define("ui-menuitemseparator", MenuItemSeparator);
        customElements.define("ui-panel", Panel);
        customElements.define("ui-passwordfield", PasswordField);
        customElements.define("ui-radiobutton", RadioButton);
        customElements.define("ui-radiobuttongroup", RadioButtonGroup);
        customElements.define("ui-splitpanel", SplitPanel);
        customElements.define("ui-tab", Tab);
        customElements.define("ui-tabpanel", TabPanel);
        customElements.define("ui-textarea", TextArea);
        customElements.define("ui-richtexteditor", RichTextEditor);
        customElements.define("ui-textfield", TextField);
        customElements.define("ui-togglebutton", ToggleButton);
        customElements.define("ui-togglebuttongroup", ToggleButtonGroup);
        customElements.define("ui-toolbar", Toolbar);
        customElements.define("ui-toolbarseparator", ToolbarSeparator);
        customElements.define("ui-tree", Tree);
        customElements.define("ui-treeitem", TreeItem);
        customElements.define("ui-window", Window);
    }

    loadTemplates() {
        let templatePath = `${PATH}/templates`;

        return Promise.all([
            GooeyJS.loadTemplate(`${templatePath}/ColorPicker.html`, "ui-ColorPicker"),
            GooeyJS.loadTemplate(`${templatePath}/ComboBox.html`, "ui-ComboBox"),
            GooeyJS.loadTemplate(`${templatePath}/ContextMenu.html`, "ui-ContextMenu"),
            GooeyJS.loadTemplate(`${templatePath}/Menu.html`, "ui-Menu"),
            GooeyJS.loadTemplate(`${templatePath}/MenuHeader.html`, "menuHeader"),
            GooeyJS.loadTemplate(`${templatePath}/MenuItem.html`, "ui-MenuItem"),
            GooeyJS.loadTemplate(`${templatePath}/MenuItemSeparator.html`, "ui-MenuItemSeparator"),
            GooeyJS.loadTemplate(`${templatePath}/SplitPanel`, "ui-SplitPanel"),
            GooeyJS.loadTemplate(`${templatePath}/Tab.html`, "ui-Tab"),
            GooeyJS.loadTemplate(`${templatePath}/TabPanel.html`, "ui-TabPanel"),
            GooeyJS.loadTemplate(`${templatePath}/ToggleButton.html`, "ui-ToggleButton"),
            GooeyJS.loadTemplate(`${templatePath}/ToggleButtonGroup.html`, "ui-ToggleButtonGroup"),
            GooeyJS.loadTemplate(`${templatePath}/ToolbarSeparator.html`, "ui-ToolbarSeparator"),
            GooeyJS.loadTemplate(`${templatePath}/Tree.html`, "ui-Tree"),
            GooeyJS.loadTemplate(`${templatePath}/TreeItem.html`, "ui-TreeItem"),
            GooeyJS.loadTemplate(`${templatePath}/Window.html`, "ui-Window"),
         ]);
    }

    static loadTemplate(templateName, templateId, retryCount = 0) {
        // Check if already loaded (race condition protection)
        if (document.getElementById(templateId)) {
            return Promise.resolve();
        }

        // Add loading flag to prevent concurrent loads
        if (GooeyJS._loadingTemplates?.has(templateId)) {
            return GooeyJS._loadingTemplates.get(templateId);
        }

        const maxRetries = 3;
        const retryDelay = 1000; // 1 second

        // Create timeout-wrapped fetch with proper async error handling
        const timeoutMs = 10000; // 10 second timeout
        const loadPromise = GooeyJS._timeoutPromise(
            fetch(templateName, {
                method: 'GET',
                cache: 'default',
                headers: {
                    'Accept': 'text/html,text/plain,*/*',
                    'Cache-Control': 'max-age=3600'
                }
            }),
            timeoutMs,
            `Template loading timeout for ${templateName}`
        )
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to load template ${templateName}: ${response.status} ${response.statusText}`);
                }
                return response.text();
            })
            .then(html => {
                if (!html || html.trim().length === 0) {
                    throw new Error(`Template ${templateName} is empty or invalid`);
                }
                
                try {
                    // Final check before DOM injection
                    if (!document.getElementById(templateId)) {
                        const fragment = document.createRange().createContextualFragment(html);
                        document.body.appendChild(fragment);
                        console.info('TEMPLATE_LOADED', `Template loaded successfully: ${templateId}`);
                    }
                } catch (domError) {
                    throw new Error(`Failed to inject template ${templateId} into DOM: ${domError.message}`);
                }
            })
            .catch(error => {
                console.error('TEMPLATE_LOAD_ERROR', `Template loading error for ${templateId}`, { error: error.message, templateId });
                
                // Retry logic for network errors
                if (retryCount < maxRetries && (error.name === 'TypeError' || error.message.includes('Failed to fetch'))) {
                    console.warn('TEMPLATE_RETRY', `Retrying template load for ${templateId} (attempt ${retryCount + 1}/${maxRetries})`);
                    return new Promise(resolve => {
                        setTimeout(() => {
                            resolve(GooeyJS.loadTemplate(templateName, templateId, retryCount + 1));
                        }, retryDelay * (retryCount + 1)); // Exponential backoff
                    });
                }     
            });

        // Track loading state
        if (!GooeyJS._loadingTemplates) {
            GooeyJS._loadingTemplates = new Map();
        }
        GooeyJS._loadingTemplates.set(templateId, loadPromise);

        return loadPromise;
    }

     /**
     * Creates a timeout-wrapped promise for async operations
     * @param {Promise} promise - The promise to wrap with timeout
     * @param {number} timeoutMs - Timeout in milliseconds
     * @param {string} errorMessage - Error message for timeout
     * @returns {Promise} - Promise that rejects if timeout is reached
     */
    static _timeoutPromise(promise, timeoutMs, errorMessage) {
        return new Promise((resolve, reject) => {
            // Create timeout promise that rejects after specified time
            const timeoutPromise = new Promise((_, timeoutReject) => {
                setTimeout(() => {
                    timeoutReject(new Error(errorMessage || `Operation timed out after ${timeoutMs}ms`));
                }, timeoutMs);
            });

            // Race between the original promise and timeout
            Promise.race([promise, timeoutPromise])
                .then(resolve)
                .catch(reject);
        });
    }
}

window.addEventListener('load', function() { new GooeyJS();}());

