/**
 * Media manipulation commands for the RichTextEditor.
 *
 * All commands follow the (state, dispatch) => boolean pattern.
 * Factory commands (like insertImage) accept parameters and return
 * a command function.
 *
 * Provides image, video, and embed insertion plus media attribute
 * manipulation (alignment, alt text, captions, resize).
 */

import Node from "../model/Node.js";
import { Selection } from "../model/Position.js";
import { _findBlockAtPos } from "../state/Commands.js";


// ============================================================================
// Private helpers
// ============================================================================

/**
 * Find a media node (image, video, or embed) at the current cursor position.
 *
 * Walks document children to check if the cursor's `from` position falls
 * within a media block node's position range.
 *
 * @param {object} state - EditorState
 * @returns {{ node: object, pos: number, type: string }|null}
 */
export function _findMediaNodeAtPos(state) {
    const { from } = state.selection;
    const doc = state.doc;
    if (!doc.children) return null;

    const MEDIA_TYPES = new Set(["image", "video", "embed"]);

    let accum = 0;
    for (let i = 0; i < doc.children.length; i++) {
        const child = doc.children[i];
        const childEnd = accum + child.nodeSize;

        if (from >= accum && from <= childEnd) {
            if (MEDIA_TYPES.has(child.type)) {
                return { node: child, pos: accum, type: child.type };
            }
        }

        accum = childEnd;
    }
    return null;
}


/**
 * Parse a video URL to detect provider and extract video ID.
 *
 * Supports YouTube (multiple URL formats), Vimeo, and direct video URLs.
 *
 * @param {string} url - Video URL string
 * @returns {{ provider: string, videoId: string|null }}
 */
export function _parseVideoProvider(url) {
    if (!url) return { provider: "direct", videoId: null };

    // YouTube patterns
    const ytWatch = url.match(/youtube\.com\/watch\?v=([^&]+)/);
    if (ytWatch) return { provider: "youtube", videoId: ytWatch[1] };

    const ytShort = url.match(/youtu\.be\/([^?]+)/);
    if (ytShort) return { provider: "youtube", videoId: ytShort[1] };

    const ytEmbed = url.match(/youtube\.com\/embed\/([^?]+)/);
    if (ytEmbed) return { provider: "youtube", videoId: ytEmbed[1] };

    // Vimeo pattern
    const vimeo = url.match(/vimeo\.com\/(\d+)/);
    if (vimeo) return { provider: "vimeo", videoId: vimeo[1] };

    // Direct video
    return { provider: "direct", videoId: null };
}


/**
 * Convert a File object to a base64 data URL.
 *
 * Uses FileReader.readAsDataURL() and returns a Promise.
 *
 * @param {File} file - File object to convert
 * @returns {Promise<string>} Base64 data URL
 */
export function _fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
    });
}


/**
 * Validate image src for XSS safety.
 *
 * Rejects javascript:, vbscript:, data:text/html protocols.
 * Allows http:, https:, data:image/ prefixes and relative URLs.
 *
 * @param {string} src - Image source URL
 * @returns {boolean} True if src is safe
 */
export function _validateImageSrc(src) {
    if (!src || typeof src !== "string") return false;

    const trimmed = src.trim().toLowerCase();

    // Reject dangerous protocols
    if (trimmed.startsWith("javascript:")) return false;
    if (trimmed.startsWith("vbscript:")) return false;
    if (trimmed.startsWith("data:text/html")) return false;

    // Allow safe protocols
    if (trimmed.startsWith("http:") || trimmed.startsWith("https:")) return true;
    if (trimmed.startsWith("data:image/")) return true;

    // Allow relative URLs (no protocol prefix)
    if (!trimmed.includes(":") || trimmed.indexOf(":") > trimmed.indexOf("/")) return true;

    return false;
}


// ============================================================================
// Command functions
// ============================================================================

/**
 * Create a command that inserts an image node at the cursor position.
 *
 * Validates the src for XSS safety before insertion. Returns false
 * if the src is invalid.
 *
 * @param {string} src - Image source URL
 * @param {object} [attrs={}] - Additional attributes (alt, title, width, height, align, caption)
 * @returns {function(state, dispatch): boolean}
 */
export function insertImage(src, attrs = {}) {
    return function (state, dispatch) {
        if (!_validateImageSrc(src)) return false;

        if (dispatch) {
            const tr = state.transaction;
            const { from } = state.selection;

            const imageNode = new Node("image", {
                src,
                alt: attrs.alt || "",
                title: attrs.title || null,
                width: attrs.width || null,
                height: attrs.height || null,
                align: attrs.align || null,
                caption: attrs.caption || null
            }, null);

            tr.replaceRange(from, from, imageNode);
            tr.setSelection(Selection.cursor(from + 1));
            dispatch(tr);
        }
        return true;
    };
}


/**
 * Create a command that inserts a video node at the cursor position.
 *
 * Automatically detects YouTube, Vimeo, or direct video from the URL
 * and sets the appropriate provider attribute.
 *
 * @param {string} url - Video URL
 * @param {object} [attrs={}] - Additional attributes (width, height, title)
 * @returns {function(state, dispatch): boolean}
 */
export function insertVideo(url, attrs = {}) {
    return function (state, dispatch) {
        if (!url) return false;

        const { provider } = _parseVideoProvider(url);

        if (dispatch) {
            const tr = state.transaction;
            const { from } = state.selection;

            const videoNode = new Node("video", {
                src: url,
                provider,
                width: attrs.width || null,
                height: attrs.height || null,
                title: attrs.title || null
            }, null);

            tr.replaceRange(from, from, videoNode);
            tr.setSelection(Selection.cursor(from + 1));
            dispatch(tr);
        }
        return true;
    };
}


/**
 * Create a command that inserts an embed node at the cursor position.
 *
 * @param {string} url - Embed URL
 * @param {object} [attrs={}] - Additional attributes (html, provider, title, width, height)
 * @returns {function(state, dispatch): boolean}
 */
export function insertEmbed(url, attrs = {}) {
    return function (state, dispatch) {
        if (!url) return false;

        if (dispatch) {
            const tr = state.transaction;
            const { from } = state.selection;

            const embedNode = new Node("embed", {
                url,
                html: attrs.html || "",
                provider: attrs.provider || null,
                title: attrs.title || null,
                width: attrs.width || null,
                height: attrs.height || null
            }, null);

            tr.replaceRange(from, from, embedNode);
            tr.setSelection(Selection.cursor(from + 1));
            dispatch(tr);
        }
        return true;
    };
}


/**
 * Create a command that sets the alignment on a selected media node.
 *
 * Only applies to image and video nodes (embeds do not support alignment).
 * Returns false if no media node is selected or node type does not support alignment.
 *
 * @param {string|null} align - Alignment value ("left", "center", "right", or null for none)
 * @returns {function(state, dispatch): boolean}
 */
export function setMediaAlignment(align) {
    return function (state, dispatch) {
        const mediaInfo = _findMediaNodeAtPos(state);
        if (!mediaInfo) return false;

        // Only image and video support alignment
        if (mediaInfo.type !== "image" && mediaInfo.type !== "video") return false;

        if (dispatch) {
            const tr = state.transaction;
            tr.setNodeAttrs(mediaInfo.pos, { align });
            dispatch(tr);
        }
        return true;
    };
}


/**
 * Create a command that sets the alt text on a selected image node.
 *
 * Returns false if the cursor is not on an image node.
 *
 * @param {string} text - Alt text value
 * @returns {function(state, dispatch): boolean}
 */
export function setImageAlt(text) {
    return function (state, dispatch) {
        const mediaInfo = _findMediaNodeAtPos(state);
        if (!mediaInfo || mediaInfo.type !== "image") return false;

        if (dispatch) {
            const tr = state.transaction;
            tr.setNodeAttrs(mediaInfo.pos, { alt: text });
            dispatch(tr);
        }
        return true;
    };
}


/**
 * Create a command that sets the caption on a selected image node.
 *
 * Pass null to remove the caption.
 *
 * @param {string|null} caption - Caption text or null to remove
 * @returns {function(state, dispatch): boolean}
 */
export function setImageCaption(caption) {
    return function (state, dispatch) {
        const mediaInfo = _findMediaNodeAtPos(state);
        if (!mediaInfo || mediaInfo.type !== "image") return false;

        if (dispatch) {
            const tr = state.transaction;
            tr.setNodeAttrs(mediaInfo.pos, { caption });
            dispatch(tr);
        }
        return true;
    };
}


/**
 * Create a command that updates arbitrary attributes on a selected media node.
 *
 * Generic command for updating any media node attribute (used by resize
 * handles to set width/height after drag).
 *
 * @param {object} attrs - Attributes to merge onto the media node
 * @returns {function(state, dispatch): boolean}
 */
export function updateMediaAttrs(attrs) {
    return function (state, dispatch) {
        const mediaInfo = _findMediaNodeAtPos(state);
        if (!mediaInfo) return false;

        if (dispatch) {
            const tr = state.transaction;
            tr.setNodeAttrs(mediaInfo.pos, attrs);
            dispatch(tr);
        }
        return true;
    };
}


/**
 * Command that deletes the media node at the cursor position.
 *
 * Removes the media node and places the cursor at the position
 * before the deleted node.
 *
 * @param {object} state - EditorState
 * @param {function|null} dispatch - Dispatch function or null for can-execute check
 * @returns {boolean}
 */
export function deleteMedia(state, dispatch) {
    const mediaInfo = _findMediaNodeAtPos(state);
    if (!mediaInfo) return false;

    if (dispatch) {
        const tr = state.transaction;
        const { pos, node } = mediaInfo;

        tr.deleteRange(pos, pos + node.nodeSize);

        // Place cursor at the position where the media was
        const newDoc = tr.doc;
        const safePos = Math.min(pos, newDoc.contentSize);
        const cursorTarget = safePos > 0 ? safePos : (newDoc.contentSize > 0 ? 1 : 0);
        tr.setSelection(Selection.cursor(cursorTarget));

        dispatch(tr);
    }
    return true;
}


/**
 * Handle image file upload via custom upload handler or base64 fallback.
 *
 * This is an async utility function, NOT a command. It processes a File
 * object and returns the result suitable for passing to insertImage.
 *
 * @param {File} file - Image file to upload
 * @param {function|null} uploadHandler - Custom upload handler (async, returns { src, alt?, width?, height? })
 * @returns {Promise<{ src: string, alt?: string, width?: string, height?: string }|null>}
 */
export async function handleImageUpload(file, uploadHandler) {
    try {
        if (uploadHandler && typeof uploadHandler === "function") {
            const result = await uploadHandler(file);
            return result || null;
        }

        // Default: convert to base64 data URL
        const src = await _fileToBase64(file);
        return { src };
    } catch (e) {
        return null;
    }
}
