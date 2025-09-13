import Application from './gooey/ui/Application.js';
import AppPanel from './gooey/ui/panel/AppPanel.js';
import Button from './gooey/ui/button/Button.js';
import CheckboxMenuItem from './gooey/ui/menu/CheckboxMenuItem.js';
import ColorPicker from './gooey/ui/ColorPicker.js';
import Label from './gooey/ui/Label.js';
import Menubar from './gooey/ui/menu/Menubar.js';
import Menu from './gooey/ui/menu/Menu.js';
import MenuItem from './gooey/ui/menu/MenuItem.js';
import MenuItemSeparator from './gooey/ui/menu/MenuItemSeparator.js';
import Panel from './gooey/ui/panel/Panel.js';
import Tab from './gooey/ui/panel/Tab.js';
import TabPanel from './gooey/ui/panel/TabPanel.js';
import ToggleButton from './gooey/ui/button/ToggleButton.js';
import ToggleButtonGroup from './gooey/ui/button/ToggleButtonGroup';
import Toolbar from './gooey/ui/toolbar/Toolbar.js';
import ToolbarSeparator from './gooey/ui/toolbar/ToolbarSeparator.js';

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

    defineElements() {
        customElements.define("ui-application", Application);
        customElements.define("ui-apppanel", AppPanel);
        customElements.define("ui-button", Button);
        customElements.define("ui-checkboxmenuitem", CheckboxMenuItem);
        customElements.define("ui-colorpicker", ColorPicker);
        customElements.define("ui-menu", Menu);
        customElements.define("ui-menubar", Menubar);
        customElements.define("ui-menuitem", MenuItem);
        customElements.define("ui-menuitemseparator", MenuItemSeparator);
        customElements.define("ui-label", Label);
        customElements.define("ui-panel", Panel);
        customElements.define("ui-tab", Tab);
        customElements.define("ui-tabpanel", TabPanel);
        customElements.define("ui-togglebutton", ToggleButton);
        customElements.define("ui-togglebuttongroup", ToggleButtonGroup);
        customElements.define("ui-toolbar", Toolbar);
        customElements.define("ui-toolbarseparator", ToolbarSeparator);
    }

    loadTemplates() {
        let templatePath = `${PATH}/templates`;

        return Promise.all([
            GooeyJS.loadTemplate(`${templatePath}/ColorPicker.html`, "ui-ColorPicker"),
            GooeyJS.loadTemplate(`${templatePath}/Menu.html`, "ui-Menu"),
            GooeyJS.loadTemplate(`${templatePath}/MenuHeader.html`, "menuHeader"),
            GooeyJS.loadTemplate(`${templatePath}/MenuItem.html`, "ui-MenuItem"),
            GooeyJS.loadTemplate(`${templatePath}/MenuItemSeparator.html`, "ui-MenuItemSeparator"),
            GooeyJS.loadTemplate(`${templatePath}/TabPanel.html`, "ui-TabPanel"),
            GooeyJS.loadTemplate(`${templatePath}/ToggleButton.html`, "ui-ToggleButton"),
            GooeyJS.loadTemplate(`${templatePath}/ToggleButtonGroup.html`, "ui-ToggleButtonGroup"),
            GooeyJS.loadTemplate(`${templatePath}/ToolbarSeparator.html`, "ui-ToolbarSeparator"),
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
