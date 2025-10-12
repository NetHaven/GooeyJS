import AccordionPanel from './gooey/ui/panel/AccordionPanel.js';
import Application from './gooey/ui/Application.js';
import AppPanel from './gooey/ui/panel/AppPanel.js';
import Border from './gooey/ui/Border.js';
import Button from './gooey/ui/button/Button.js';
import Checkbox from './gooey/ui/form/CheckBox.js';
import CheckboxMenuItem from './gooey/ui/menu/CheckboxMenuItem.js';
import ColorPicker from './gooey/ui/ColorPicker.js';
import ComboBox from './gooey/ui/form/list/ComboBox.js';
import ContextMenu from './gooey/ui/menu/ContextMenu.js';
import DropDownList from './gooey/ui/form/list/DropDownList.js';
import Font from './gooey/ui/Font.js';
import FormPanel from './gooey/ui/panel/FormPanel.js';
import GroupBox from './gooey/ui/panel/GroupBox.js';
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
import RichTextEditor from './gooey/ui/form/text/RichTextEditor.js';
import SplitPanel from './gooey/ui/panel/SplitPanel.js';
import Tab from './gooey/ui/panel/Tab.js';
import TabPanel from './gooey/ui/panel/TabPanel.js';
import Template from './gooey/util/Template.js';
import TextArea from './gooey/ui/form/text/TextArea.js';
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

    defineElements() {
        customElements.define("ui-application", Application);
        customElements.define("ui-apppanel", AppPanel);
        customElements.define("ui-accordionpanel", AccordionPanel);
        customElements.define("ui-border", Border);
        customElements.define("ui-button", Button);
        customElements.define("ui-checkbox", Checkbox);
        customElements.define("ui-checkboxmenuitem", CheckboxMenuItem);
        customElements.define("ui-colorpicker", ColorPicker);
        customElements.define("ui-combobox", ComboBox);
        customElements.define("ui-contextmenu", ContextMenu);
        customElements.define("ui-dropdownlist", DropDownList);
        customElements.define("ui-font", Font);
        customElements.define("ui-formpanel", FormPanel);
        customElements.define("ui-groupbox", GroupBox);
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
        customElements.define("ui-richtexteditor", RichTextEditor);
        customElements.define("ui-splitpanel", SplitPanel);
        customElements.define("ui-tab", Tab);
        customElements.define("ui-tabpanel", TabPanel);
        customElements.define("ui-textarea", TextArea);
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
            Template.load(`${templatePath}/Button.html`, "ui-Button"),
            Template.load(`${templatePath}/ColorPicker.html`, "ui-ColorPicker"),
            Template.load(`${templatePath}/ComboBox.html`, "ui-ComboBox"),
            Template.load(`${templatePath}/ContextMenu.html`, "ui-ContextMenu"),
            Template.load(`${templatePath}/Menu.html`, "ui-Menu"),
            Template.load(`${templatePath}/MenuHeader.html`, "menuHeader"),
            Template.load(`${templatePath}/MenuItem.html`, "ui-MenuItem"),
            Template.load(`${templatePath}/MenuItemSeparator.html`, "ui-MenuItemSeparator"),
            Template.load(`${templatePath}/SplitPanel`, "ui-SplitPanel"),
            Template.load(`${templatePath}/Tab.html`, "ui-Tab"),
            Template.load(`${templatePath}/TabPanel.html`, "ui-TabPanel"),
            Template.load(`${templatePath}/ToggleButton.html`, "ui-ToggleButton"),
            Template.load(`${templatePath}/ToggleButtonGroup.html`, "ui-ToggleButtonGroup"),
            Template.load(`${templatePath}/ToolbarSeparator.html`, "ui-ToolbarSeparator"),
            Template.load(`${templatePath}/Tree.html`, "ui-Tree"),
            Template.load(`${templatePath}/TreeItem.html`, "ui-TreeItem"),
            Template.load(`${templatePath}/Window.html`, "ui-Window"),
         ]);
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
