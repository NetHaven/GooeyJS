/**
 * ImagePlugin provides drag-drop, paste, resize, and alignment popover
 * support for media nodes (image, video, embed) in the RichTextEditor.
 *
 * Follows the ClipboardPlugin/TablePlugin pattern: a plain ES6 class
 * that receives an editor reference and attaches event handlers.
 */

import {
    insertImage,
    handleImageUpload,
    setMediaAlignment,
    updateMediaAttrs,
    deleteMedia,
    _validateImageSrc,
    _findMediaNodeAtPos
} from "../../commands/MediaCommands.js";
import { Selection } from "../../model/Position.js";


export default class ImagePlugin {

    /**
     * Unique plugin name for registry identification.
     * @returns {string}
     */
    static get pluginName() { return 'image'; }

    /**
     * @param {object} [editor] - RichTextEditor component instance (optional for PluginManager path)
     */
    constructor(editor) {
        /** @type {object} */
        this._editor = editor || null;

        /** @type {object|null} Active resize state */
        this._resizing = null;

        /** @type {object|null} Currently selected media { node, pos, type, element } */
        this._selectedMedia = null;

        /** @type {HTMLElement|null} Resize handle overlay div */
        this._handleOverlay = null;

        /** @type {HTMLElement|null} Alignment popover div */
        this._alignPopover = null;

        /** @type {number} Minimum width constraint for resize */
        this._minWidth = 50;

        /** @type {number} Minimum height constraint for resize */
        this._minHeight = 50;

        // Bind handlers
        this._onDrop = this._onDrop.bind(this);
        this._onDragOver = this._onDragOver.bind(this);
        this._onPaste = this._onPaste.bind(this);
        this._onContentClick = this._onContentClick.bind(this);
        this._onMouseMove = this._onMouseMove.bind(this);
        this._onMouseUp = this._onMouseUp.bind(this);
        this._onKeyDown = this._onKeyDown.bind(this);

        // Attach to editor if provided via constructor (backward-compatible path)
        if (this._editor) {
            this._attach();
        }
    }

    // =========================================================================
    // Plugin interface methods
    // =========================================================================

    /**
     * Initialize the plugin with the editor instance.
     * Called by PluginManager after construction.
     * No-op if already initialized via constructor.
     *
     * @param {object} editor - RichTextEditor instance
     */
    init(editor) {
        if (this._editor) return; // Already initialized via constructor
        this._editor = editor;
        this._attach();
    }

    /**
     * Return toolbar item descriptors for image insertion.
     *
     * @returns {Array<object>}
     */
    toolbarItems() {
        return [
            {
                name: 'insertImage',
                type: 'button',
                command: () => {
                    if (this._editor && typeof this._editor._showImageDialog === 'function') {
                        this._editor._showImageDialog();
                    }
                },
                label: 'Insert Image',
                icon: 'image'
            }
        ];
    }

    /**
     * Return context menu item descriptors for media alignment and deletion.
     * Only returns items when context targets an image or video node.
     *
     * @param {object} context - { pos, node, selection, ... }
     * @returns {Array<object>}
     */
    contextMenuItems(context) {
        if (!context || !context.node) return [];
        if (context.node.type !== 'image' && context.node.type !== 'video') return [];
        return [
            { name: 'imageAlignLeft', label: 'Align Left', command: setMediaAlignment('left'), group: 'media', order: 1 },
            { name: 'imageAlignCenter', label: 'Align Center', command: setMediaAlignment('center'), group: 'media', order: 2 },
            { name: 'imageAlignRight', label: 'Align Right', command: setMediaAlignment('right'), group: 'media', order: 3 },
            { name: 'deleteMedia', label: 'Delete', command: deleteMedia, group: 'media', order: 10 }
        ];
    }


    // =========================================================================
    // Lifecycle
    // =========================================================================

    /**
     * Attach event listeners to the editor's DOM elements.
     * @private
     */
    _attach() {
        const content = this._editor._content;
        const inputSink = this._editor._inputSink;

        if (content) {
            content.addEventListener("dragover", this._onDragOver);
            content.addEventListener("drop", this._onDrop);
            content.addEventListener("click", this._onContentClick);
        }

        if (inputSink) {
            inputSink.addEventListener("paste", this._onPaste, true);
            inputSink.addEventListener("keydown", this._onKeyDown);
        }
    }

    /**
     * Remove all event listeners and clean up overlays.
     */
    destroy() {
        const content = this._editor._content;
        const inputSink = this._editor._inputSink;

        if (content) {
            content.removeEventListener("dragover", this._onDragOver);
            content.removeEventListener("drop", this._onDrop);
            content.removeEventListener("click", this._onContentClick);
        }

        if (inputSink) {
            inputSink.removeEventListener("paste", this._onPaste, true);
            inputSink.removeEventListener("keydown", this._onKeyDown);
        }

        // Clean up global listeners if actively resizing
        document.removeEventListener("mousemove", this._onMouseMove);
        document.removeEventListener("mouseup", this._onMouseUp);

        this._clearSelection();
    }


    // =========================================================================
    // Drag and Drop
    // =========================================================================

    /**
     * Handle dragover to indicate drop is accepted.
     * @param {DragEvent} e
     * @private
     */
    _onDragOver(e) {
        if (!e.dataTransfer) return;
        const types = e.dataTransfer.types;
        if (types.includes("Files") || types.includes("text/uri-list") || types.includes("text/html")) {
            e.preventDefault();
            e.dataTransfer.dropEffect = "copy";
        }
    }

    /**
     * Handle drop events for files, URLs, and HTML with images.
     * @param {DragEvent} e
     * @private
     */
    _onDrop(e) {
        e.preventDefault();
        e.stopPropagation();

        const dt = e.dataTransfer;
        if (!dt) return;

        // Check for image files first
        if (dt.files && dt.files.length > 0) {
            for (let i = 0; i < dt.files.length; i++) {
                const file = dt.files[i];
                if (file.type.startsWith("image/")) {
                    this._handleFileUpload(file);
                }
            }
            return;
        }

        // Check for URL text
        const uriList = dt.getData("text/uri-list") || dt.getData("text/plain");
        if (uriList && _validateImageSrc(uriList.trim())) {
            const src = uriList.trim();
            insertImage(src, {})(this._editor._state, (tr) => this._editor._dispatch(tr));
            return;
        }

        // Check for HTML with img tags
        const html = dt.getData("text/html");
        if (html && html.includes("<img")) {
            const srcs = this._extractImgSrcs(html);
            for (const src of srcs) {
                if (_validateImageSrc(src)) {
                    insertImage(src, {})(this._editor._state, (tr) => this._editor._dispatch(tr));
                }
            }
        }
    }


    // =========================================================================
    // File Upload
    // =========================================================================

    /**
     * Upload a file via the configured upload handler or base64 fallback.
     * @param {File} file
     * @private
     */
    async _handleFileUpload(file) {
        const uploadHandler = this._editor._config ? this._editor._config.imageUpload : null;
        const result = await handleImageUpload(file, uploadHandler);
        if (result && result.src) {
            insertImage(result.src, result)(this._editor._state, (tr) => this._editor._dispatch(tr));
        }
    }


    // =========================================================================
    // Paste
    // =========================================================================

    /**
     * Handle paste events for image data in clipboard.
     *
     * Only intercepts paste when clipboard contains raw image data (image/* type).
     * Lets ClipboardPlugin handle HTML paste normally.
     *
     * @param {ClipboardEvent} e
     * @private
     */
    _onPaste(e) {
        if (!e.clipboardData || !e.clipboardData.items) return;

        // Check for raw image data first
        for (let i = 0; i < e.clipboardData.items.length; i++) {
            const item = e.clipboardData.items[i];
            if (item.type.startsWith("image/")) {
                e.preventDefault();
                e.stopPropagation();
                const file = item.getAsFile();
                if (file) {
                    this._handleFileUpload(file);
                }
                return;
            }
        }

        // No raw image data — let ClipboardPlugin handle it
    }


    // =========================================================================
    // Media Selection
    // =========================================================================

    /**
     * Handle clicks on media elements to select them.
     * @param {MouseEvent} e
     * @private
     */
    _onContentClick(e) {
        const mediaEl = this._findMediaElement(e.target);

        if (mediaEl) {
            const mediaInfo = _findMediaNodeAtPos(this._editor._state);
            if (mediaInfo) {
                this._selectedMedia = {
                    node: mediaInfo.node,
                    pos: mediaInfo.pos,
                    type: mediaInfo.type,
                    element: mediaEl
                };
                this._showResizeHandles(mediaEl);

                // Set selection to the media node's position
                const tr = this._editor._state.transaction;
                tr.setSelection(Selection.cursor(mediaInfo.pos));
                this._editor._dispatch(tr);

                e.preventDefault();
                return;
            }
        }

        // Clicked elsewhere — clear selection
        this._clearSelection();
    }

    /**
     * Walk up from a target element to find a media element.
     * @param {Element} target
     * @returns {Element|null}
     * @private
     */
    _findMediaElement(target) {
        let el = target;
        const content = this._editor._content;

        while (el && el !== content) {
            const tagName = el.tagName ? el.tagName.toLowerCase() : "";
            if (tagName === "img" || tagName === "video" || tagName === "iframe") {
                return el;
            }
            if (el.classList && (
                el.classList.contains("rte-media-wrapper") ||
                el.classList.contains("rte-media-figure") ||
                el.classList.contains("rte-embed") ||
                el.classList.contains("rte-video")
            )) {
                return el;
            }
            el = el.parentElement;
        }
        return null;
    }


    // =========================================================================
    // Resize Handles
    // =========================================================================

    /**
     * Show resize handle overlay on a selected media element.
     * @param {Element} element
     * @private
     */
    _showResizeHandles(element) {
        this._removeOverlay();

        const selectionLayer = this._editor._selectionLayer;
        if (!selectionLayer) return;

        const editorArea = this._editor._editorArea;
        if (!editorArea) return;

        const editorRect = editorArea.getBoundingClientRect();
        const elRect = element.getBoundingClientRect();

        // Create overlay
        const overlay = document.createElement("div");
        overlay.className = "rte-resize-overlay";
        overlay.style.left = (elRect.left - editorRect.left) + "px";
        overlay.style.top = (elRect.top - editorRect.top) + "px";
        overlay.style.width = elRect.width + "px";
        overlay.style.height = elRect.height + "px";

        // Create corner handles
        const corners = ["nw", "ne", "sw", "se"];
        for (const corner of corners) {
            const handle = document.createElement("div");
            handle.className = `rte-resize-handle rte-resize-handle-${corner}`;
            handle.dataset.corner = corner;
            handle.addEventListener("mousedown", (e) => this._onResizeStart(e, corner, element));
            overlay.appendChild(handle);
        }

        selectionLayer.appendChild(overlay);
        this._handleOverlay = overlay;

        // Add selected class to media element
        element.classList.add("rte-media-selected");

        // Show alignment popover
        this._showAlignmentPopover(element);
    }


    // =========================================================================
    // Alignment Popover
    // =========================================================================

    /**
     * Show alignment popover above the selected media element.
     * Only shown for image and video nodes (not embeds).
     * @param {Element} element
     * @private
     */
    _showAlignmentPopover(element) {
        this._hideAlignmentPopover();

        // Only show for image and video
        if (this._selectedMedia && this._selectedMedia.type !== "image" && this._selectedMedia.type !== "video") {
            return;
        }

        const selectionLayer = this._editor._selectionLayer;
        if (!selectionLayer) return;

        const editorArea = this._editor._editorArea;
        if (!editorArea) return;

        const editorRect = editorArea.getBoundingClientRect();
        const elRect = element.getBoundingClientRect();

        const popover = document.createElement("div");
        popover.className = "rte-media-align-popover";

        // Position centered above the element
        const popoverWidth = 124; // 4 buttons * 28px + gaps + padding
        const left = (elRect.left - editorRect.left) + (elRect.width / 2) - (popoverWidth / 2);
        const top = (elRect.top - editorRect.top) - 36;

        popover.style.left = Math.max(0, left) + "px";
        popover.style.top = Math.max(0, top) + "px";

        // Get current alignment
        const currentAlign = this._selectedMedia ? (this._selectedMedia.node.attrs.align || null) : null;

        // Create alignment buttons
        const buttons = [
            { align: "left", label: "\u2190" },   // left arrow
            { align: "center", label: "\u2194" },  // left-right arrow
            { align: "right", label: "\u2192" },   // right arrow
            { align: "none", label: "\u00D7" }      // multiplication sign (X)
        ];

        for (const btnDef of buttons) {
            const btn = document.createElement("div");
            btn.className = "rte-media-align-btn";
            if ((btnDef.align === "none" && currentAlign === null) ||
                (btnDef.align !== "none" && btnDef.align === currentAlign)) {
                btn.classList.add("active");
            }
            btn.dataset.align = btnDef.align;
            btn.textContent = btnDef.label;
            btn.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                const align = btnDef.align === "none" ? null : btnDef.align;
                setMediaAlignment(align)(this._editor._state, (tr) => this._editor._dispatch(tr));

                // Update active button state
                popover.querySelectorAll(".rte-media-align-btn").forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
            });
            popover.appendChild(btn);
        }

        selectionLayer.appendChild(popover);
        this._alignPopover = popover;
    }

    /**
     * Remove the alignment popover from the DOM.
     * @private
     */
    _hideAlignmentPopover() {
        if (this._alignPopover && this._alignPopover.parentNode) {
            this._alignPopover.parentNode.removeChild(this._alignPopover);
        }
        this._alignPopover = null;
    }


    // =========================================================================
    // Resize Flow
    // =========================================================================

    /**
     * Start a resize operation from a corner handle mousedown.
     * @param {MouseEvent} e
     * @param {string} corner - "nw", "ne", "sw", "se"
     * @param {Element} element - The media element being resized
     * @private
     */
    _onResizeStart(e, corner, element) {
        e.preventDefault();
        e.stopPropagation();

        const rect = element.getBoundingClientRect();

        this._resizing = {
            startX: e.clientX,
            startY: e.clientY,
            startWidth: rect.width,
            startHeight: rect.height,
            aspectRatio: rect.width / rect.height,
            corner,
            element
        };

        // Attach global listeners for out-of-bounds dragging
        document.addEventListener("mousemove", this._onMouseMove);
        document.addEventListener("mouseup", this._onMouseUp);
    }

    /**
     * Handle mouse move during resize.
     * @param {MouseEvent} e
     * @private
     */
    _onMouseMove(e) {
        if (!this._resizing) return;

        const { startX, startY, startWidth, startHeight, aspectRatio, corner, element } = this._resizing;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        let newWidth, newHeight;

        // All corners resize proportionally (maintaining aspect ratio)
        switch (corner) {
            case "se":
                newWidth = startWidth + dx;
                newHeight = newWidth / aspectRatio;
                break;
            case "sw":
                newWidth = startWidth - dx;
                newHeight = newWidth / aspectRatio;
                break;
            case "ne":
                newWidth = startWidth + dx;
                newHeight = newWidth / aspectRatio;
                break;
            case "nw":
                newWidth = startWidth - dx;
                newHeight = newWidth / aspectRatio;
                break;
            default:
                return;
        }

        // Clamp to minimum constraints
        newWidth = Math.max(this._minWidth, newWidth);
        newHeight = Math.max(this._minHeight, newHeight);

        // Live preview on the element
        element.style.width = newWidth + "px";
        element.style.height = newHeight + "px";

        // Update overlay dimensions if present
        if (this._handleOverlay) {
            this._handleOverlay.style.width = newWidth + "px";
            this._handleOverlay.style.height = newHeight + "px";
        }
    }

    /**
     * Finalize resize on mouse up.
     * @param {MouseEvent} e
     * @private
     */
    _onMouseUp(e) {
        if (!this._resizing) return;

        const { element } = this._resizing;

        // Get final dimensions
        const finalWidth = Math.round(parseFloat(element.style.width));
        const finalHeight = Math.round(parseFloat(element.style.height));

        // Dispatch single transaction to update model
        if (finalWidth > 0 && finalHeight > 0) {
            updateMediaAttrs({
                width: finalWidth + "px",
                height: finalHeight + "px"
            })(this._editor._state, (tr) => this._editor._dispatch(tr));
        }

        // Clean up
        this._resizing = null;
        document.removeEventListener("mousemove", this._onMouseMove);
        document.removeEventListener("mouseup", this._onMouseUp);

        // Reposition handles on the resized element
        if (this._selectedMedia) {
            this._showResizeHandles(element);
        }
    }


    // =========================================================================
    // Keyboard
    // =========================================================================

    /**
     * Handle keydown for Delete/Backspace on selected media and Escape.
     * @param {KeyboardEvent} e
     * @private
     */
    _onKeyDown(e) {
        if (!this._selectedMedia) return;

        if (e.key === "Backspace" || e.key === "Delete") {
            e.preventDefault();
            deleteMedia(this._editor._state, (tr) => this._editor._dispatch(tr));
            this._clearSelection();
        } else if (e.key === "Escape") {
            this._clearSelection();
        }
    }


    // =========================================================================
    // Selection Cleanup
    // =========================================================================

    /**
     * Clear the current media selection and remove all overlays.
     * @private
     */
    _clearSelection() {
        this._removeOverlay();
        this._hideAlignmentPopover();

        // Remove selected class from previously selected element
        if (this._selectedMedia && this._selectedMedia.element) {
            this._selectedMedia.element.classList.remove("rte-media-selected");
        }

        this._selectedMedia = null;
    }

    /**
     * Remove the resize handle overlay from the DOM.
     * @private
     */
    _removeOverlay() {
        if (this._handleOverlay && this._handleOverlay.parentNode) {
            this._handleOverlay.parentNode.removeChild(this._handleOverlay);
        }
        this._handleOverlay = null;
    }


    // =========================================================================
    // Utility
    // =========================================================================

    /**
     * Extract image src attributes from an HTML string.
     * @param {string} html
     * @returns {string[]}
     * @private
     */
    _extractImgSrcs(html) {
        const srcs = [];
        const regex = /<img[^>]+src=["']([^"']+)["']/gi;
        let match;
        while ((match = regex.exec(html)) !== null) {
            srcs.push(match[1]);
        }
        return srcs;
    }
}
