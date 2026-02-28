import UIComponent from '../../../UIComponent.js';
import Point from '../../../../graphics/Point.js';
import WindowEvent from '../../../../events/window/WindowEvent.js';
import KeyboardEvent from '../../../../events/KeyboardEvent.js';
import TextFieldEvent from '../../../../events/form/text/TextFieldEvent.js';
import MouseEvent from '../../../../events/MouseEvent.js';
import Key from '../../../../io/Key.js';
import Template from '../../../../util/Template.js';

const RESIZE_DIRECTIONS = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'];
const RESIZE_CURSORS = {
    n: 'ns-resize', s: 'ns-resize',
    e: 'ew-resize', w: 'ew-resize',
    ne: 'nesw-resize', sw: 'nesw-resize',
    nw: 'nwse-resize', se: 'nwse-resize'
};
const DEFAULT_MIN_WIDTH = 100;
const DEFAULT_MIN_HEIGHT = 50;

export default class Window extends UIComponent {
    constructor () {
        var cancelButton;

        super();

        Template.activate("ui-Window", this.shadowRoot);

        this.buttonbar = this.shadowRoot.querySelector(".WindowButtonbar");
        this.contentArea = this.shadowRoot.querySelector(".WindowContent");
        this.titlebar = this.shadowRoot.querySelector(".WindowTitlebar");

        // Titlebar control button references
        this._titleText = this.shadowRoot.querySelector('.WindowTitleText');
        this._minimizeBtn = this.shadowRoot.querySelector('.WindowMinimizeBtn');
        this._maximizeBtn = this.shadowRoot.querySelector('.WindowMaximizeBtn');
        this._closeBtn = this.shadowRoot.querySelector('.WindowCloseBtn');

        // Maximize state tracking
        this._maximized = false;
        this._preMaximizeState = null;

        // Resize state tracking
        this._resizing = false;
        this._resizeHandles = null;
        this._resizeContainer = null;
        this._minWidth = null;
        this._minHeight = null;
        this._maxWidth = null;
        this._maxHeight = null;

        // Store reference to previously focused element for restoration
        this._previousFocus = null;

        // Add remaining valid events
        this.addValidEvent(WindowEvent.CLOSE);
        this.addValidEvent(WindowEvent.OPEN);
        this.addValidEvent(WindowEvent.MOVE);
        this.addValidEvent(WindowEvent.MINIMIZE);
        this.addValidEvent(WindowEvent.MAXIMIZE);
        this.addValidEvent(WindowEvent.RESIZE);
        this.addValidEvent(KeyboardEvent.KEY_DOWN);
        this.addValidEvent(TextFieldEvent.ENTER_PRESSED);

        // Titlebar control button listeners
        if (this._closeBtn) {
            this._closeBtn.addEventListener(MouseEvent.CLICK, (e) => {
                e.stopPropagation();
                this.close();
            });
        }

        if (this._minimizeBtn) {
            this._minimizeBtn.addEventListener(MouseEvent.CLICK, (e) => {
                e.stopPropagation();
                this.fireEvent(WindowEvent.MINIMIZE, { window: this });
            });
        }

        if (this._maximizeBtn) {
            this._maximizeBtn.addEventListener(MouseEvent.CLICK, (e) => {
                e.stopPropagation();
                this._toggleMaximize();
            });
        }

        const okButton = this.shadowRoot.querySelector(".WindowOKButton");
        if (okButton) {
            okButton.addEventListener(MouseEvent.CLICK, ()=> {
                this.close();
            });
        }

        cancelButton = this.shadowRoot.querySelector(".WindowCancelButton");
        if (cancelButton) {
            cancelButton.addEventListener(MouseEvent.CLICK, ()=> {
                this.close();
            });
        }
    }

    connectedCallback() {
        super.connectedCallback?.();
        if (!this._windowInit) {
            this._windowInit = true;

            // ARIA: Set dialog role and attributes
            const dialogType = this.getAttribute('dialogtype');
            this.setAttribute('role', dialogType === 'alert' ? 'alertdialog' : 'dialog');

            // ARIA: Generate unique ID for titlebar and set aria-labelledby
            const titleId = `window-title-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            if (this.titlebar) {
                this.titlebar.id = titleId;
                this.setAttribute('aria-labelledby', titleId);
            }

            if (this.hasAttribute("wintitle")) {
                this.winTitle = this.getAttribute("wintitle");
            }
            else {
                this.winTitle = "";
            }

            // Defer initial centering until element has layout
            requestAnimationFrame(() => {
                const dims = this._getComputedDimensions();
                const xLocation = (window.innerWidth - dims.width) / 2;
                let yLocation = (window.innerHeight - dims.height) / 2;
                if (yLocation < 0) {
                    yLocation = 0;
                }
                this.style.left = xLocation + "px";
                this.style.top = yLocation + "px";
            });

            if (this.hasAttribute("draggable")) {
                this.draggable = true;
            }

            if (this.hasAttribute("constrainviewport")) {
                this.constrainViewport = true;
            }

            if (this.hasAttribute("modal")) {
                this.modal = true;
            }

            // Titlebar control button attributes
            if (this.hasAttribute("closeable")) {
                this.closeable = true;
            }

            if (this.hasAttribute("minimizable")) {
                this.minimizable = true;
            }

            if (this.hasAttribute("maximizable")) {
                this.maximizable = true;
            }

            // Resize attribute
            if (this.hasAttribute("resizeable")) {
                this.resizeable = true;
            }

            // Resize constraint attributes
            if (this.hasAttribute("minwidth")) {
                this._minWidth = parseInt(this.getAttribute("minwidth"));
            }
            if (this.hasAttribute("minheight")) {
                this._minHeight = parseInt(this.getAttribute("minheight"));
            }
            if (this.hasAttribute("maxwidth")) {
                this._maxWidth = parseInt(this.getAttribute("maxwidth"));
            }
            if (this.hasAttribute("maxheight")) {
                this._maxHeight = parseInt(this.getAttribute("maxheight"));
            }
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

    disconnectedCallback() {
        // Clean up document-level drag listeners to prevent memory leaks
        if (this.mousemove) {
            document.removeEventListener("mousemove", this.mousemove);
        }

        // Clean up resize listeners
        if (this._resizeMove) {
            document.removeEventListener('mousemove', this._resizeMove);
            document.removeEventListener('mouseup', this._resizeEnd);
            document.removeEventListener('touchmove', this._resizeMove);
            document.removeEventListener('touchend', this._resizeEnd);
            this._resizeMove = null;
            this._resizeEnd = null;
        }

        // Clean up resize handles
        this._destroyResizeHandles();

        // Clean up modal screen element
        if (this.modalScreen && this.modalScreen.parentNode) {
            this.modalScreen.parentNode.removeChild(this.modalScreen);
            this.modalScreen = null;
        }

        // Call parent cleanup (model unbinding, etc.)
        super.disconnectedCallback?.();
    }

    // ─── Getters ───────────────────────────────────────────

    get closeable() {
        return this.hasAttribute("closeable");
    }

    get constrainViewport() {
        return this.hasAttribute("constrainViewport");
    }

    get draggable() {
        return this.hasAttribute("draggable");
    }

    get maximizable() {
        return this.hasAttribute("maximizable");
    }

    get minWidth() {
        return this._minWidth;
    }

    get minHeight() {
        return this._minHeight;
    }

    get maxWidth() {
        return this._maxWidth;
    }

    get maxHeight() {
        return this._maxHeight;
    }

    get minimizable() {
        return this.hasAttribute("minimizable");
    }

    get modal() {
        return this.hasAttribute("modal");
    }

    get modalMask() {
        return this.modalScreen;
    }

    get resizeable() {
        return this.hasAttribute("resizeable");
    }

    get visible() {
        return super.visible;
    }

    get winTitle() {
        return this.getAttribute("wintitle");
    }

    // ─── Methods ───────────────────────────────────────────

    open(position = null) {
        let xLocation, yLocation;

        // ARIA: Store the currently focused element for later restoration
        this._previousFocus = document.activeElement;

        if (position && position instanceof Point) {
            xLocation = position.x;
            yLocation = position.y;
        } else {
            const dims = this._getComputedDimensions();
            xLocation = (window.innerWidth - dims.width) / 2;
            yLocation = (window.innerHeight - dims.height) / 2;
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

    /**
     * Toggle between maximized and restored window state.
     * When maximizing, saves current position/size for restoration.
     * Fires WindowEvent.MAXIMIZE with the new maximized state.
     */
    _toggleMaximize() {
        if (!this._maximized) {
            // Save current state for restoration
            this._preMaximizeState = {
                left: this.style.left,
                top: this.style.top,
                width: this.style.width,
                height: this.style.height
            };

            // Maximize to fill viewport
            this.style.left = '0';
            this.style.top = '0';
            this.style.width = '100vw';
            this.style.height = '100vh';
            this._maximized = true;

            // Update button icon to restore icon (two joined squares)
            if (this._maximizeBtn) {
                this._maximizeBtn.textContent = '\u29C9';
            }

            // Hide resize handles when maximized
            if (this._resizeContainer) {
                this._resizeContainer.style.display = 'none';
            }
        } else {
            // Restore previous state
            if (this._preMaximizeState) {
                this.style.left = this._preMaximizeState.left;
                this.style.top = this._preMaximizeState.top;
                this.style.width = this._preMaximizeState.width;
                this.style.height = this._preMaximizeState.height;
            }
            this._maximized = false;

            // Update button icon back to maximize icon (square)
            if (this._maximizeBtn) {
                this._maximizeBtn.textContent = '\u25A1';
            }

            // Show resize handles when restored
            if (this._resizeContainer) {
                this._resizeContainer.style.display = '';
            }
        }

        this.fireEvent(WindowEvent.MAXIMIZE, {
            window: this,
            maximized: this._maximized
        });
    }

    // ─── Resize Handle Methods ─────────────────────────────

    /**
     * Create and attach 8-direction resize handles to the shadow root.
     */
    _initResizeHandles() {
        if (this._resizeContainer) return; // Already initialized

        this._resizeContainer = document.createElement('div');
        this._resizeContainer.className = 'WindowResizeHandles';

        for (const dir of RESIZE_DIRECTIONS) {
            const handle = document.createElement('div');
            handle.className = `WindowResizeHandle WindowResizeHandle-${dir}`;
            handle.style.cursor = RESIZE_CURSORS[dir];

            handle.addEventListener('mousedown', (e) => this._startResize(e, dir));
            handle.addEventListener('touchstart', (e) => this._startResize(e, dir), { passive: false });

            this._resizeContainer.appendChild(handle);
        }

        this.shadowRoot.appendChild(this._resizeContainer);
    }

    /**
     * Remove resize handles from the shadow root.
     */
    _destroyResizeHandles() {
        if (this._resizeContainer && this._resizeContainer.parentNode) {
            this._resizeContainer.parentNode.removeChild(this._resizeContainer);
        }
        this._resizeContainer = null;
    }

    /**
     * Begin a resize operation on mousedown/touchstart.
     * @param {Event} e - Mouse or touch event
     * @param {string} direction - Resize direction (n, ne, e, se, s, sw, w, nw)
     */
    _startResize(e, direction) {
        if (this._maximized) return; // No resize while maximized

        e.preventDefault();
        e.stopPropagation();

        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        this._resizing = true;
        this._resizeDir = direction;
        this._resizeStartX = clientX;
        this._resizeStartY = clientY;
        this._resizeStartRect = {
            left: parseInt(this.style.left) || 0,
            top: parseInt(this.style.top) || 0,
            width: this.getBoundingClientRect().width,
            height: this.getBoundingClientRect().height
        };

        this._resizeMove = (e) => this._onResizeMove(e);
        this._resizeEnd = (e) => this._onResizeEnd(e);

        document.addEventListener('mousemove', this._resizeMove);
        document.addEventListener('mouseup', this._resizeEnd);
        document.addEventListener('touchmove', this._resizeMove, { passive: false });
        document.addEventListener('touchend', this._resizeEnd);
    }

    /**
     * Handle resize drag movement.
     * @param {Event} e - Mouse or touch event
     */
    _onResizeMove(e) {
        if (!this._resizing) return;
        e.preventDefault();

        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        const dx = clientX - this._resizeStartX;
        const dy = clientY - this._resizeStartY;

        let left = this._resizeStartRect.left;
        let top = this._resizeStartRect.top;
        let width = this._resizeStartRect.width;
        let height = this._resizeStartRect.height;
        const dir = this._resizeDir;

        // Apply deltas based on direction
        if (dir.includes('e')) width += dx;
        if (dir.includes('w')) { left += dx; width -= dx; }
        if (dir.includes('s')) height += dy;
        if (dir.includes('n')) { top += dy; height -= dy; }

        // Apply constraints
        const minW = this._minWidth || DEFAULT_MIN_WIDTH;
        const minH = this._minHeight || DEFAULT_MIN_HEIGHT;

        if (width < minW) {
            if (dir.includes('w')) left -= (minW - width);
            width = minW;
        }
        if (height < minH) {
            if (dir.includes('n')) top -= (minH - height);
            height = minH;
        }
        if (this._maxWidth && width > this._maxWidth) {
            if (dir.includes('w')) left -= (this._maxWidth - width);
            width = this._maxWidth;
        }
        if (this._maxHeight && height > this._maxHeight) {
            if (dir.includes('n')) top -= (this._maxHeight - height);
            height = this._maxHeight;
        }

        // Viewport constraints
        if (this.constrainViewport) {
            if (left < 0) { width += left; left = 0; }
            if (top < 0) { height += top; top = 0; }
            if (left + width > window.innerWidth) {
                width = window.innerWidth - left;
            }
            if (top + height > window.innerHeight) {
                height = window.innerHeight - top;
            }
        }

        this.style.left = left + 'px';
        this.style.top = top + 'px';
        this.style.width = width + 'px';
        this.style.height = height + 'px';

        this.fireEvent(WindowEvent.RESIZE, {
            window: this,
            width,
            height,
            position: { x: left, y: top }
        });
    }

    /**
     * End resize operation on mouseup/touchend.
     */
    _onResizeEnd() {
        if (!this._resizing) return;
        this._resizing = false;

        document.removeEventListener('mousemove', this._resizeMove);
        document.removeEventListener('mouseup', this._resizeEnd);
        document.removeEventListener('touchmove', this._resizeMove);
        document.removeEventListener('touchend', this._resizeEnd);

        // Fire final resize event
        const rect = this.getBoundingClientRect();
        this.fireEvent(WindowEvent.RESIZE, {
            window: this,
            width: rect.width,
            height: rect.height,
            position: { x: parseInt(this.style.left) || 0, y: parseInt(this.style.top) || 0 }
        });

        this._resizeMove = null;
        this._resizeEnd = null;
    }

    // ─── Setters ───────────────────────────────────────────

    set closeable(val) {
        if (val) {
            this.setAttribute("closeable", "");
            if (this._closeBtn) this._closeBtn.style.display = '';
        } else {
            this.removeAttribute("closeable");
            if (this._closeBtn) this._closeBtn.style.display = 'none';
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
                    // Don't start drag when clicking control buttons
                    if (e.target.closest('.WindowControlButtons')) return;

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
                    let deltaX, deltaY, newX, newY;

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

                        const dims = this._getComputedDimensions();
                        if (newX + dims.width > window.innerWidth) {
                            newX = window.innerWidth - dims.width;
                        }

                        if (newY + dims.height > window.innerHeight) {
                            newY = window.innerHeight - dims.height;
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

    set maximizable(val) {
        if (val) {
            this.setAttribute("maximizable", "");
            if (this._maximizeBtn) this._maximizeBtn.style.display = '';
        } else {
            this.removeAttribute("maximizable");
            if (this._maximizeBtn) this._maximizeBtn.style.display = 'none';
        }
    }

    set minWidth(val) {
        this._minWidth = val ? parseInt(val) : null;
        if (val) {
            this.setAttribute("minwidth", val);
        } else {
            this.removeAttribute("minwidth");
        }
    }

    set minHeight(val) {
        this._minHeight = val ? parseInt(val) : null;
        if (val) {
            this.setAttribute("minheight", val);
        } else {
            this.removeAttribute("minheight");
        }
    }

    set maxWidth(val) {
        this._maxWidth = val ? parseInt(val) : null;
        if (val) {
            this.setAttribute("maxwidth", val);
        } else {
            this.removeAttribute("maxwidth");
        }
    }

    set maxHeight(val) {
        this._maxHeight = val ? parseInt(val) : null;
        if (val) {
            this.setAttribute("maxheight", val);
        } else {
            this.removeAttribute("maxheight");
        }
    }

    set minimizable(val) {
        if (val) {
            this.setAttribute("minimizable", "");
            if (this._minimizeBtn) this._minimizeBtn.style.display = '';
        } else {
            this.removeAttribute("minimizable");
            if (this._minimizeBtn) this._minimizeBtn.style.display = 'none';
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
            // Remove modal screen when modal is toggled off
            if (this.modalScreen && this.modalScreen.parentNode) {
                this.modalScreen.parentNode.removeChild(this.modalScreen);
                this.modalScreen = null;
            }
        }
    }

    set resizeable(val) {
        if (val) {
            this.setAttribute("resizeable", "");
            this._initResizeHandles();
        } else {
            this.removeAttribute("resizeable");
            this._destroyResizeHandles();
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
        if (this._titleText) {
            this._titleText.textContent = val;
        }

        this.setAttribute("wintitle", val);
    }

    // Helper methods for common window components
    get okButton() {
        return this.shadowRoot.querySelector(".WindowOKButton");
    }

    get cancelButton() {
        return this.shadowRoot.querySelector(".WindowCancelButton");
    }

    /**
     * Get the window's actual dimensions using computed layout.
     * Falls back to 0 if dimensions cannot be determined.
     * @returns {{ width: number, height: number }}
     */
    _getComputedDimensions() {
        const rect = this.getBoundingClientRect();
        return {
            width: rect.width || 0,
            height: rect.height || 0
        };
    }
}
