import UIComponent from '../../../UIComponent.js';
import Key from '../../../../io/Key.js';
import KeyboardEvent from '../../../../events/KeyboardEvent.js';
import MouseEvent from '../../../../events/MouseEvent.js';
import Template from '../../../../util/Template.js';

export default class Menubar extends UIComponent {
    constructor () {
        var acceleratedItem, activeMenuIndex, menuHeaderList, menuList, menubar, menuHeader;

        super();

        Template.activate("ui-Menubar", this.shadowRoot);
        menubar = this;
        menuList = Array.from(this.querySelectorAll(":scope > gooeyui-menu"));
        menuHeaderList = [];

        menuList.forEach(function(menu) {
            var accelerator, clone, menuText, template;

            template = document.getElementById("menuHeader");
            clone = document.importNode(template.content, true);

            if (menu.hasAttribute("text")) {
                menuHeader = clone.querySelector("div");
                menuText = menu.getAttribute("text");
                accelerator = menu.getAttribute("accelerator");

                // Store raw menu text for lookup (avoids innerHTML parsing issues)
                menuHeader.dataset.menuText = menuText;

                // Build header content safely without innerHTML
                menuHeader.textContent = '';
                if (accelerator && menuText.indexOf(accelerator) !== -1) {
                    const accelIndex = menuText.indexOf(accelerator);
                    const beforeText = menuText.substring(0, accelIndex);
                    const afterText = menuText.substring(accelIndex + accelerator.length);

                    if (beforeText) {
                        menuHeader.appendChild(document.createTextNode(beforeText));
                    }
                    const underline = document.createElement('u');
                    underline.textContent = accelerator;
                    menuHeader.appendChild(underline);
                    if (afterText) {
                        menuHeader.appendChild(document.createTextNode(afterText));
                    }
                } else {
                    menuHeader.textContent = menuText;
                }

                menubar.shadowRoot.appendChild(clone);
                menuHeaderList.push(menuHeader);

                menuHeader.addEventListener(MouseEvent.MOUSE_OVER, event => {
                    var activeMenu, activeMenuHeader, menu, menuText;

                    activeMenuHeader = menubar.getActiveMenuHeader();
                    if (activeMenuHeader === event.currentTarget) {
                        return;
                    }

                    if (activeMenuHeader) {
                        activeMenuHeader.removeAttribute("active");
                    }

                    activeMenu = menubar.getActiveMenu();
                    if (activeMenu) {
                        activeMenu.active = false;
                        event.currentTarget.setAttribute("active", true);

                        menuText = event.currentTarget.dataset.menuText;
                        menu = menubar._findMenuByText(menuText);
                        if (menu) {
                            // Reposition menu before making it active
                            menubar.positionMenu(menu, event.currentTarget);
                            menu.active = true;
                        }
                    }
                });

                menuHeader.addEventListener(MouseEvent.CLICK, event =>  {
                    var activeMenu, activeMenuHeader, menu, menuText;

                    event.stopPropagation(); // Prevent bubbling to document
                    menuText = event.currentTarget.dataset.menuText;
                    menu = menubar._findMenuByText(menuText);

                    activeMenu = menubar.getActiveMenu();
                    if (activeMenu) {
                        activeMenu.active = false;
                    }

                    if (menu) {
                        // Reposition menu before making it active
                        menubar.positionMenu(menu, event.currentTarget);
                        menu.active = true;
                    }

                    activeMenuHeader = menubar.getActiveMenuHeader();
                    if (activeMenuHeader) {
                        activeMenuHeader.removeAttribute("active");
                    }
                    event.currentTarget.setAttribute("active", "");
                });
            }
        });
        
        this._boundDocumentClickHandler = event => {
            var activeMenu, activeMenuHeader;

            // Check if click is inside any menu header or menu
            // Use composedPath() to see through shadow DOM boundaries
            const path = event.composedPath();
            const isMenuClick = path.some(el =>
                el.classList?.contains('menuHeader') ||
                el.tagName?.toLowerCase() === 'gooeyui-menu'
            );

            if (!isMenuClick) {
                activeMenu = this.getActiveMenu();
                activeMenuHeader = this.getActiveMenuHeader();

                if (activeMenu) {
                    activeMenu.active = false;
                }

                if (activeMenuHeader) {
                    activeMenuHeader.removeAttribute("active");
                }
            }
        };
        document.addEventListener(MouseEvent.CLICK, this._boundDocumentClickHandler);

        this._boundKeyDownHandler = (event) => {
            let acceleratedItemIndex, activeMenu;

            activeMenuIndex = menuList.findIndex((element) => element.active);
            if (event.altKey) {
                acceleratedItemIndex = menuList.findIndex((element) => element.accelerator.toLowerCase() === event.key.toLowerCase());
                acceleratedItem = menuList.find((element) => element.accelerator.toLowerCase() === event.key.toLowerCase());

                if (acceleratedItem) {
                    if (activeMenuIndex !== -1) {
                        activeMenu = menuList[activeMenuIndex]
                        activeMenu.active = false;
                        menuHeaderList[activeMenuIndex].removeAttribute("active");
                    }
                    acceleratedItem.active = true;
                    menuHeaderList[acceleratedItemIndex].setAttribute("active", "true");
                }
            
                event.preventDefault();
                event.stopPropagation();
                return false;
            }
            else if (activeMenuIndex !== -1) {
                activeMenu = menuList[activeMenuIndex];
                if (event.key === Key.ARROW_LEFT) {
                    activeMenu.active = false;
                    menuHeaderList[activeMenuIndex].removeAttribute("active");

                    activeMenuIndex--;
                    if (activeMenuIndex < 0 ) {
                        activeMenuIndex = menuList.length - 1;
                    }

                    activeMenu = menuList[activeMenuIndex];
                    activeMenu.active = true;
                    menuHeaderList[activeMenuIndex].setAttribute("active", "");
                }
                else if (event.key === Key.ARROW_RIGHT) {
                    activeMenu.active = false;
                    menuHeaderList[activeMenuIndex].removeAttribute("active");

                    activeMenuIndex++;
                    if (activeMenuIndex > menuList.length - 1) {
                        activeMenuIndex = 0;
                    }

                    activeMenu = menuList[activeMenuIndex];
                    activeMenu.active = true;
                    menuHeaderList[activeMenuIndex].setAttribute("active", "");
                }
                else if (event.key === Key.ESCAPE) {
                    activeMenu.active = false;
                    menuHeaderList[activeMenuIndex].removeAttribute("active");
                }
            }
        };
        document.addEventListener(KeyboardEvent.KEY_DOWN, this._boundKeyDownHandler);
    }

    disconnectedCallback() {
        // Remove document-level listeners to prevent leaks
        document.removeEventListener(MouseEvent.CLICK, this._boundDocumentClickHandler);
        document.removeEventListener(KeyboardEvent.KEY_DOWN, this._boundKeyDownHandler);

        // Call parent cleanup (model unbinding, etc.)
        super.disconnectedCallback?.();
    }

    positionMenu(menu, menuHeader) {
        // Use setTimeout to ensure DOM is fully rendered and positioned
        setTimeout(() => {
            const box = menuHeader.getBoundingClientRect();
            const left = box.left + 1;
            menu.style.position = 'absolute';
            menu.style.top = box.bottom + 'px';
            menu.style.left = left + 'px';
            menu.style.zIndex = '1000';
        }, 0);
    }

    getActiveMenuHeader() {
        const activeHeader = this.shadowRoot.querySelector(".menuHeader[active]");
        return activeHeader;
    }

    getActiveMenu() {
        // Scope to this menubar's direct child menus only
        const activeMenu = this.querySelector(":scope > gooeyui-menu[active]");
        return activeMenu;
    }

    /**
     * Find a menu element by its text attribute
     * Uses CSS.escape to handle spaces and special characters in the selector
     * Scoped to this menubar's direct child menus only
     * @param {string} text - The menu text to search for
     * @returns {Element|null} The matching menu element or null
     */
    _findMenuByText(text) {
        // CSS.escape handles special characters; wrap in quotes for attribute selector
        // Scope to this menubar's direct child menus only
        const escapedText = CSS.escape(text);
        return this.querySelector(`:scope > gooeyui-menu[text="${escapedText}"]`);
    }

    get active() {
        return this.hasAttribute("active");
    }

    set active(value) {
        if (value) {
            this.setAttribute("active", "");
        } else {
            this.removeAttribute("active");
        }
    }
}
