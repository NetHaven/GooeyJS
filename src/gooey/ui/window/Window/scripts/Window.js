import UIComponent from '../../../UIComponent.js';
import Point from '../../../../graphics/Point.js';
import WindowEvent from '../../../../events/window/WindowEvent.js';
import KeyboardEvent from '../../../../events/KeyboardEvent.js';
import TextFieldEvent from '../../../../events/form/text/TextFieldEvent.js';
import MouseEvent from '../../../../events/MouseEvent.js';
import Key from '../../../../io/Key.js';
import Template from '../../../../util/Template.js';

export default class Window extends UIComponent {
    constructor () {
        var cancelButton, xLocation, yLocation;

        super();

        Template.activate("ui-Window", this.shadowRoot);

        this.buttonbar = this.shadowRoot.querySelector(".WindowButtonbar");
        this.contentArea = this.shadowRoot.querySelector(".WindowContent");
        this.titlebar = this.shadowRoot.querySelector(".WindowTitlebar");

        // ARIA: Set dialog role and attributes
        const dialogType = this.getAttribute('dialogtype');
        this.setAttribute('role', dialogType === 'alert' ? 'alertdialog' : 'dialog');

        // ARIA: Generate unique ID for titlebar and set aria-labelledby
        const titleId = `window-title-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        if (this.titlebar) {
            this.titlebar.id = titleId;
            this.setAttribute('aria-labelledby', titleId);
        }

        // Store reference to previously focused element for restoration
        this._previousFocus = null;

        // Add remaining valid events
        this.addValidEvent(WindowEvent.CLOSE);
        this.addValidEvent(WindowEvent.OPEN);
        this.addValidEvent(WindowEvent.MOVE);
        this.addValidEvent(KeyboardEvent.KEY_DOWN);
        this.addValidEvent(TextFieldEvent.ENTER_PRESSED);

        if (this.hasAttribute("wintitle")) {
            this.winTitle = this.getAttribute("wintitle");
        }
        else {
            this.winTitle = "";
        }

        xLocation = (window.innerWidth - parseInt(this.width)) / 2;
        yLocation = (window.innerHeight - parseInt(this.height)) / 2;
        if (yLocation < 0) {
            yLocation = 0;
        }
        this.style.left = xLocation + "px";
        this.style.top =  yLocation + "px";

        if (this.hasAttribute("draggable")) {
            this.draggable = true;
        }

        cancelButton = this.shadowRoot.querySelector(".WindowCancelButton");
        cancelButton.addEventListener(MouseEvent.CLICK, ()=> {
            this.close();
        });

        if (this.hasAttribute("constrainviewport")) {
            this.constrainViewport = true;
        }

        if (this.hasAttribute("modal")) {
            this.modal = true;
        }
    }

    close() {
        // Dispatch close event before closing
        const shouldClose = this.fireEvent(WindowEvent.CLOSE, {
            window: this,
            winTitle: this.winTitle
        }, { cancelable: true });

        if (shouldClose) {
            this.visible = false;

            // ARIA: Restore focus to previously focused element
            if (this._previousFocus && typeof this._previousFocus.focus === 'function') {
                this._previousFocus.focus();
                this._previousFocus = null;
            }
        }
    }

    get constrainViewport() {
        return this.hasAttribute("constrainViewport");
    }

    get draggable() {
        return this.hasAttribute("draggable");
    }

    get modal() {
        return this.hasAttribute("modal");
    }

    get modalMask() {
        return this.modalScreen;
    }

    get visible() {
        return super.visible;
    }

    get winTitle() {
        return this.getAttribute("title");
    }

    open(position = null) {
        let xLocation, yLocation;

        // ARIA: Store the currently focused element for later restoration
        this._previousFocus = document.activeElement;

        if (position && position instanceof Point) {
            xLocation = position.x;
            yLocation = position.y;
        } else {
            xLocation = (window.innerWidth - parseInt(this.width)) / 2;
            yLocation = (window.innerHeight - parseInt(this.height)) / 2;
            if (yLocation < 0) {
                yLocation = 0;
            }
        }

        this.visible = true;
        this.style.left = xLocation + "px";
        this.style.top = yLocation + "px";

        // Dispatch open event after opening
        this.fireEvent(WindowEvent.OPEN, {
            window: this,
            winTitle: this.winTitle,
            position: { x: xLocation, y: yLocation }
        });

        // ARIA: Focus the first focusable element in the dialog
        setTimeout(() => {
            this._focusFirstElement();
        }, 0);
    }

    /**
     * Focus the first focusable element within the window
     */
    _focusFirstElement() {
        const focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

        // Try shadow root first (for built-in buttons)
        let focusable = this.shadowRoot.querySelector(focusableSelector);
        if (focusable) {
            focusable.focus();
            return;
        }

        // Try light DOM content
        focusable = this.querySelector(focusableSelector);
        if (focusable) {
            focusable.focus();
        }
    }

    set constrainViewport(val) {
        if (val) {
            this.setAttribute("constrainviewport", "");
        }
        else {
            this.removeAttribute("constrainviewport");
        }
    }

    set draggable(val) {
        if (val) {
            this.setAttribute("draggable", "");
            this.dragging = false;

            if (this.titlebar) {
                this.mousedown = e=> {
                    this.box = {
                        top: parseInt(this.style.top),
                        left: parseInt(this.style.left)
                    };
                    this.dragging = true;
                    this.dragStartX = e.screenX;
                    this.dragStartY = e.screenY;
                }

                this.mouseup = ()=> {
                    if (this.dragging) {
                        this.dragging = false;
                    }
                }

                this.mousemove = e=> {
                    let deltaX, deltaY, height, newX, newY, width;

                    if (!this.dragging) {
                        return;
                    }

                    deltaX = e.screenX - this.dragStartX;
                    deltaY = e.screenY - this.dragStartY;

                    newX = this.box.left + deltaX;
                    newY = this.box.top + deltaY;

                    if (this.constrainViewport) {
                        if (newX < 0) {
                            newX = 0;
                        }

                        if (newY < 0) {
                            newY = 0;
                        }

                        height = parseInt(this.height);
                        width = parseInt(this.width);
                        if (newX + width > window.innerWidth) {
                            newX = window.innerWidth - width;
                        }

                        if (newY + height > window.innerHeight) {
                            newY = window.innerHeight - height;
                        }
                    }

                    this.style.left = `${newX}px`;
                    this.style.top = `${newY}px`;
                    
                    // Dispatch move event during drag
                    this.fireEvent(WindowEvent.MOVE, { 
                        window: this,
                        position: { x: newX, y: newY },
                        delta: { x: deltaX, y: deltaY }
                    });
                }

                this.titlebar.addEventListener("mousedown", this.mousedown);
                this.titlebar.addEventListener("mouseup", this.mouseup);
                document.addEventListener("mousemove", this.mousemove);
            }
        }
        else {
            this.removeAttribute("draggable");
            if (this.titlebar) {
                this.titlebar.removeEventListener("mousedown", this.mousedown);
                this.titlebar.removeEventListener("mouseup", this.mouseup);
                document.removeEventListener("mousemove", this.mousemove);
            }
        }
    }

    set modal(val) {
        if (val) {
            this.setAttribute("modal", "");
            // ARIA: Mark dialog as modal
            this.setAttribute("aria-modal", "true");
            if (!this.modalScreen) {
                this.modalScreen = document.createElement('div');
                this.modalScreen.classList.add("uiWindowModal");
                document.body.appendChild(this.modalScreen);

                this.modalScreen.addEventListener('click', e=> {
                    e.stopPropagation();
                });
            }
        }
        else {
            this.removeAttribute("modal");
            this.removeAttribute("aria-modal");
        }
    }

    set visible(val) {
        super.visible = val;
        if (this.modal) {
            if (!this.modalScreen) {
                this.modal = true;
            }

            if (val) {
                this.modalScreen.style.display = 'block';
            }
            else {
                this.modalScreen.style.display = 'none';
            }
        }
        
    }

    set winTitle(val) {
        let titlebar;

        titlebar = this.shadowRoot.querySelector(".WindowTitlebar");
        if (titlebar) {
            titlebar.innerHTML = val;
        }
    }

    // Helper methods for common window components
    get okButton() {
        return this.shadowRoot.querySelector(".WindowOKButton");
    }

    get cancelButton() {
        return this.shadowRoot.querySelector(".WindowCancelButton");
    }
}
