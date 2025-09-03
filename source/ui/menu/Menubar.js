import Component from '../Component.js';
import KeyboardEvent from '../../events/KeyboardEvent.js';
import MouseEvent from '../../events/MouseEvent.js';

export default class Menubar extends Component {
    constructor () {
        var acceleratedItem, activeMenuIndex, box, left, menuHeaderList, 
            menuList, menubar, menuHeader;
        
        super();

        menubar = this;
        menuList = Array.from(this.querySelectorAll(":scope > ui-Menu"));
        menuHeaderList = [];

        menuList.forEach(function(menu) {
            var accelerator, clone, menuText, template;

            template = document.getElementById("menuHeader");
            clone = document.importNode(template.content, true);

            if (menu.hasAttribute("text")) {
                menuHeader = clone.querySelector("div");
                menuText = menu.getAttribute("text");
                accelerator = menu.getAttribute("accelerator");
                if (accelerator) {
                    if (menuText.indexOf(accelerator) != -1) {
                        menuText = menuText.replace(accelerator, "<u>" + accelerator + "</u>");
                    }
                }
                menuHeader.innerHTML = menuText;
                menubar.appendChild(clone);
                menuHeaderList.push(menuHeader);

                menuHeader.addEventListener(MouseEvent.MOUSE_OVER, event => {
                    var activeMenu, activeMenuHeader, menu, menuText;

                    activeMenuHeader = menubar.getActiveMenuHeader();
                    if (activeMenuHeader == event.currentTarget) {
                        return;
                    }

                    if (activeMenuHeader) {
                        activeMenuHeader.removeAttribute("active");
                    }

                    activeMenu = menubar.getActiveMenu();
                    if (activeMenu) {
                        activeMenu.active = false;
                        event.currentTarget.setAttribute("active", true);

                        menuText = event.currentTarget.innerHTML;
                        menuText = menuText.replace("<u>", "");
                        menuText = menuText.replace("</u>", "");
                        menu = document.querySelector("ui-Menu[text=" + menuText + "]");
                        if (menu) {
                            // Reposition menu before making it active
                            menubar.positionMenu(menu, event.currentTarget);
                            menu.active = true;
                        }
                    }
                });

                menuHeader.addEventListener(MouseEvent.CLICK, event =>  {
                    var activeMenu, activeMenuHeader, menu, menuText;

                    console.log("MENU_DEBUG: Menu header clicked:", event.currentTarget);
                    event.stopPropagation(); // Prevent bubbling to document                    
                    menuText = event.currentTarget.innerHTML;
                    menuText = menuText.replace("<u>", "");
                    menuText = menuText.replace("</u>", "");
                    console.log("MENU_DEBUG: Looking for menu with text:", menuText);
                    menu = document.querySelector("ui-Menu[text=" + menuText + "]");
                    console.log("MENU_DEBUG: Found menu:", menu);
                    
                    activeMenu = menubar.getActiveMenu();
                    if (activeMenu) {
                        console.log("MENU_DEBUG: Closing currently active menu:", activeMenu);
                        activeMenu.active = false;
                    }

                    if (menu) {
                        console.log("MENU_DEBUG: Activating new menu:", menu);
                        // Reposition menu before making it active
                        menubar.positionMenu(menu, event.currentTarget);
                        menu.active = true;
                    } else {
                        console.log("MENU_DEBUG: No menu found to activate");
                    }

                    activeMenuHeader = menubar.getActiveMenuHeader();
                    if (activeMenuHeader) {
                        console.log("MENU_DEBUG: Removing active from previous header:", activeMenuHeader);
                        activeMenuHeader.removeAttribute("active");
                    }
                    console.log("MENU_DEBUG: Setting current header as active:", event.currentTarget);
                    event.currentTarget.setAttribute("active", "");
                });
            }
        });
        
        document.addEventListener(MouseEvent.CLICK, event => {
            var activeMenu, activeMenuHeader;

            // Check if click is inside any menu header or menu
            const isMenuClick = event.target.closest('.menuHeader') || 
                                event.target.closest('ui-Menu');
            
            console.log("MENU_DEBUG: Document click - target:", event.target, "isMenuClick:", isMenuClick);
            
            if (!isMenuClick) {
                console.log("MENU_DEBUG: Click outside menu, attempting to close menus");
                activeMenu = this.getActiveMenu();
                activeMenuHeader = this.getActiveMenuHeader();

                if (activeMenu) {
                    console.log("MENU_DEBUG: Closing active menu:", activeMenu);
                    activeMenu.active = false;
                }

                if (activeMenuHeader) {
                    console.log("MENU_DEBUG: Removing active from menu header:", activeMenuHeader);
                    activeMenuHeader.removeAttribute("active");
                }
            } else {
                console.log("MENU_DEBUG: Click inside menu area, not closing");
            }
        });

        document.addEventListener(KeyboardEvent.KEY_DOWN, (event) => {
            let acceleratedItemIndex, activeMenu;

            activeMenuIndex = menuList.findIndex((element) => element.active);
            if (event.altKey) {
                acceleratedItemIndex = menuList.findIndex((element) => element.accelerator.toLowerCase() == event.key.toLowerCase());
                acceleratedItem = menuList.find((element) => element.accelerator.toLowerCase() == event.key.toLowerCase());

                if (acceleratedItem) {
                    if (activeMenuIndex != -1) {
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
            else if (activeMenuIndex != -1) {
                activeMenu = menuList[activeMenuIndex];
                if (event.key == 'ArrowLeft') {
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
                else if (event.key == 'ArrowRight') {
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
                else if (event.key == 'Escape') {
                    activeMenu.active = false;
                    menuHeaderList[activeMenuIndex].removeAttribute("active");
                }
            }
        });
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
        const activeHeader = document.querySelector(".menuHeader[active]");
        console.log("MENU_DEBUG: getActiveMenuHeader found:", activeHeader);
        return activeHeader;
    }

    getActiveMenu() {
        const activeMenu = document.querySelector("ui-Menu[active]");
        console.log("MENU_DEBUG: getActiveMenu found:", activeMenu);
        return activeMenu;
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
