import AccordionPanel from './gooey/ui/panel/AccordionPanel.js';
import Application from './gooey/ui/Application.js';
import AppPanel from './gooey/ui/panel/AppPanel.js';
import Border from './gooey/ui/Border.js';
import Button from './gooey/ui/button/Button.js';
import Checkbox from './gooey/ui/form/Checkbox.js';
import CheckboxMenuItem from './gooey/ui/menu/CheckboxMenuItem.js';
import ColorPicker from './gooey/ui/ColorPicker.js';
import ComboBox from './gooey/ui/form/list/ComboBox.js';
import ContextMenu from './gooey/ui/menu/ContextMenu.js';
import DatePicker from './gooey/ui/form/DatePicker.js';
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
import ProgressBar from './gooey/ui/ProgressBar.js';
import RadioButton from './gooey/ui/form/RadioButton.js';
import RadioButtonGroup from './gooey/ui/form/RadioButtonGroup.js';
import RichTextEditor from './gooey/ui/form/text/RichTextEditor.js';
import Spinner from './gooey/ui/form/Spinner.js';
import SplitPanel from './gooey/ui/panel/SplitPanel.js';
import Tab from './gooey/ui/panel/Tab.js';
import TabPanel from './gooey/ui/panel/TabPanel.js';
import Template from './gooey/util/Template.js';
import TextArea from './gooey/ui/form/text/TextArea.js';
import TextField from './gooey/ui/form/text/TextField.js';
import TimePicker from './gooey/ui/form/TimePicker.js';
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
    static get basePath() {
        return PATH;
    }
    constructor() {
        let headEl, htmlEl, linkEl;

        // Array of UI component classes
        // To add a new component, just add the class reference to this array
        this.components = [
            AccordionPanel, Application, AppPanel, Border, Button,
            Checkbox, CheckboxMenuItem, ColorPicker, ComboBox, ContextMenu,
            DatePicker, DropDownList, Font, FormPanel, GroupBox,
            Label, ListBox, Menu, Menubar, MenuItem, MenuItemSeparator,
            Panel, PasswordField, ProgressBar, RadioButton, RadioButtonGroup,
            RichTextEditor, Spinner, SplitPanel, Tab, TabPanel,
            TextArea, TextField, TimePicker, ToggleButton, ToggleButtonGroup,
            Toolbar, ToolbarSeparator, Tree, TreeItem, Window
        ];

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
        // Register custom elements using the components array
        this.components.forEach(componentClass => {
            // Convert class name to custom element tag (e.g., "AccordionPanel" -> "ui-accordionpanel")
            const tagName = `ui-${componentClass.name.toLowerCase()}`;
            customElements.define(tagName, componentClass);
        });
    }

    loadTemplates() {
        let templatePath = `${PATH}/templates`;

        // Special cases with custom template IDs (not following ui-ComponentName pattern)
        const specialCases = {
            "MenuHeader": "menuHeader"  // MenuHeader uses "menuHeader" instead of "ui-MenuHeader"
        };

        // Generate Template.load calls for standard components
        const templateLoads = this.components.map(componentClass =>
            Template.load(`${templatePath}/${componentClass.name}.html`, `ui-${componentClass.name}`)
        );

        // Add special cases
        for (const [fileName, templateId] of Object.entries(specialCases)) {
            templateLoads.push(
                Template.load(`${templatePath}/${fileName}.html`, templateId)
            );
        }

        return Promise.all(templateLoads);
    }
}

window.addEventListener('load', function() { new GooeyJS();}());
