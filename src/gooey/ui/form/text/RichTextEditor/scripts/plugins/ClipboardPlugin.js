/**
 * ClipboardPlugin provides clipboard operations for the RichTextEditor.
 *
 * Handles copy (serialize to text/html + text/plain), cut (copy + delete),
 * paste (sanitize + parse + insert), and paste-as-plain-text (Mod-Shift-V).
 *
 * Includes an HTML Sanitizer pipeline that strips dangerous elements,
 * attributes, and URL schemes before content enters the editor model.
 *
 * Clipboard events are attached directly to the textarea input sink,
 * NOT through the keymap system, since copy/cut/paste are native browser
 * events. The Mod-Shift-V shortcut IS a keydown event and goes through
 * the keymap.
 */

import { Selection } from '../model/Position.js';


// ============================================================================
// Sanitizer — HTML sanitization pipeline (Section 8.1-8.3)
// ============================================================================

/**
 * Allowed HTML elements for paste content.
 * @type {Set<string>}
 */
const ALLOWED_ELEMENTS = new Set([
    'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'blockquote', 'pre', 'code',
    'ul', 'ol', 'li',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'a', 'img', 'video', 'source',
    'br', 'hr',
    'em', 'strong', 'u', 's', 'del', 'sub', 'sup', 'span',
    'b', 'i'
]);

/**
 * Elements that are always stripped regardless of schema.
 * @type {Set<string>}
 */
const FORBIDDEN_ELEMENTS = new Set([
    'script', 'iframe', 'object', 'embed', 'form', 'input',
    'style', 'link', 'meta', 'noscript', 'applet'
]);

/**
 * Allowed attributes on paste content.
 * @type {Set<string>}
 */
const ALLOWED_ATTRIBUTES = new Set([
    'href', 'src', 'alt', 'title', 'target',
    'width', 'height', 'colspan', 'rowspan',
    'start', 'type', 'style', 'class'
]);

/**
 * Allowed CSS properties in style attributes.
 * @type {Set<string>}
 */
const ALLOWED_STYLE_PROPERTIES = new Set([
    'color', 'background-color', 'font-size', 'font-family',
    'text-align', 'line-height', 'text-decoration'
]);

/**
 * Dangerous URL scheme patterns.
 * @type {RegExp}
 */
const DANGEROUS_URL_RE = /^\s*(javascript|vbscript|data\s*:\s*text\/html)\s*:/i;


/**
 * Sanitizer provides a pipeline for cleaning HTML content.
 *
 * Pipeline stages:
 * 1. Parse HTML via DOMParser
 * 2. Walk tree removing disallowed elements/attributes
 * 3. Strip scripts, event handlers, dangerous URLs
 * 4. Filter style properties to allow-list
 * 5. Normalize structure (unwrap bare divs to paragraphs)
 * 6. Return cleaned HTML string
 */
export class Sanitizer {

    /**
     * Sanitize an HTML string through the full pipeline.
     *
     * @param {string} html - Raw HTML string
     * @returns {string} Sanitized HTML string
     */
    sanitize(html) {
        if (!html || typeof html !== 'string') return '';

        // Stage 1: Parse HTML into DOM tree
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const body = doc.body;

        if (!body) return '';

        // Stage 2-5: Walk and clean the tree
        this._walkAndClean(body);

        // Stage 6: Normalize structure
        this._normalizeStructure(body);

        return body.innerHTML;
    }

    /**
     * Walk the DOM tree and remove disallowed elements and attributes.
     *
     * @param {Element} root - Root element to walk
     * @private
     */
    _walkAndClean(root) {
        // Collect nodes to process (snapshot to avoid mutation during iteration)
        const walker = document.createTreeWalker(
            root,
            NodeFilter.SHOW_ELEMENT,
            null
        );

        const toRemove = [];
        const toUnwrap = [];

        let node;
        while ((node = walker.nextNode())) {
            const tag = node.tagName.toLowerCase();

            // Stage 3: Always strip forbidden elements entirely
            if (FORBIDDEN_ELEMENTS.has(tag)) {
                toRemove.push(node);
                continue;
            }

            // Stage 2: If not in allow-list, unwrap (keep children)
            if (!ALLOWED_ELEMENTS.has(tag)) {
                // Special case: div -> treat as paragraph wrapper
                if (tag === 'div') {
                    // Will be handled in normalize step
                } else {
                    toUnwrap.push(node);
                    continue;
                }
            }

            // Stage 3-4: Clean attributes
            this._cleanAttributes(node);
        }

        // Remove forbidden elements (and all descendants)
        for (const el of toRemove) {
            if (el.parentNode) {
                el.parentNode.removeChild(el);
            }
        }

        // Unwrap disallowed elements (keep children)
        for (const el of toUnwrap) {
            if (el.parentNode) {
                while (el.firstChild) {
                    el.parentNode.insertBefore(el.firstChild, el);
                }
                el.parentNode.removeChild(el);
            }
        }
    }

    /**
     * Clean attributes on a single element.
     * Removes on* handlers, dangerous URLs, and filters style properties.
     *
     * @param {Element} el - Element to clean
     * @private
     */
    _cleanAttributes(el) {
        const attrsToRemove = [];

        for (const attr of Array.from(el.attributes)) {
            const name = attr.name.toLowerCase();

            // Strip on* event handler attributes
            if (name.startsWith('on')) {
                attrsToRemove.push(attr.name);
                continue;
            }

            // Strip disallowed attributes
            if (!ALLOWED_ATTRIBUTES.has(name)) {
                attrsToRemove.push(attr.name);
                continue;
            }

            // Check for dangerous URL schemes in href/src
            if (name === 'href' || name === 'src') {
                if (DANGEROUS_URL_RE.test(attr.value)) {
                    attrsToRemove.push(attr.name);
                    continue;
                }
            }

            // Filter style attribute
            if (name === 'style') {
                const filtered = this._filterStyle(attr.value);
                if (filtered) {
                    el.setAttribute('style', filtered);
                } else {
                    attrsToRemove.push(attr.name);
                }
                continue;
            }

            // Filter class attribute (strip all classes by default)
            if (name === 'class') {
                attrsToRemove.push(attr.name);
                continue;
            }
        }

        for (const name of attrsToRemove) {
            el.removeAttribute(name);
        }
    }

    /**
     * Filter a CSS style string to only allowed properties.
     *
     * @param {string} styleStr - Raw style attribute value
     * @returns {string} Filtered style string, or empty string
     * @private
     */
    _filterStyle(styleStr) {
        if (!styleStr) return '';

        const parts = styleStr.split(';').filter(Boolean);
        const allowed = [];

        for (const part of parts) {
            const colonIdx = part.indexOf(':');
            if (colonIdx === -1) continue;

            const prop = part.slice(0, colonIdx).trim().toLowerCase();
            const value = part.slice(colonIdx + 1).trim();

            if (ALLOWED_STYLE_PROPERTIES.has(prop) && value) {
                allowed.push(`${prop}: ${value}`);
            }
        }

        return allowed.length > 0 ? allowed.join('; ') : '';
    }

    /**
     * Normalize document structure: unwrap bare divs to paragraphs,
     * flatten excessive nesting.
     *
     * @param {Element} body - Body element to normalize
     * @private
     */
    _normalizeStructure(body) {
        // Convert bare <div> elements to <p>
        const divs = Array.from(body.querySelectorAll('div'));
        for (const div of divs) {
            const p = document.createElement('p');
            while (div.firstChild) {
                p.appendChild(div.firstChild);
            }
            // Copy over allowed attributes
            for (const attr of Array.from(div.attributes)) {
                if (ALLOWED_ATTRIBUTES.has(attr.name.toLowerCase())) {
                    p.setAttribute(attr.name, attr.value);
                }
            }
            if (div.parentNode) {
                div.parentNode.replaceChild(p, div);
            }
        }

        // Remove empty spans and font wrappers that contribute no formatting
        const empties = Array.from(body.querySelectorAll('span, font'));
        for (const el of empties) {
            if (!el.hasAttribute('style') && el.attributes.length === 0) {
                while (el.firstChild) {
                    el.parentNode.insertBefore(el.firstChild, el);
                }
                el.parentNode.removeChild(el);
            }
        }
    }
}


// ============================================================================
// WordPasteMatcher — strips Microsoft Word markup
// ============================================================================

/**
 * WordPasteMatcher detects and normalizes HTML pasted from Microsoft Word.
 *
 * Detection: looks for mso-* styles, o: namespace elements, MsoNormal classes,
 * or Microsoft Word generator meta tag.
 *
 * Transform: strips mso-* style properties, VML/Office elements, maps Word
 * heading classes to heading elements, converts Word list markup to ul/ol/li.
 */
export class WordPasteMatcher {

    static get name() { return 'word'; }

    get name() { return 'word'; }

    /**
     * Detect if HTML was generated by Microsoft Word.
     *
     * @param {string} html - Raw HTML string
     * @returns {boolean}
     */
    detect(html) {
        if (!html) return false;
        return (
            html.includes('mso-') ||
            html.includes('<o:') ||
            html.includes('class="Mso') ||
            html.includes('class=Mso') ||
            html.includes('content="Microsoft Word"') ||
            html.includes('urn:schemas-microsoft-com:office')
        );
    }

    /**
     * Transform Word HTML to clean HTML.
     *
     * @param {string} html - Raw Word HTML
     * @returns {string} Cleaned HTML
     */
    transform(html) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const body = doc.body;
        if (!body) return html;

        // Remove VML elements (<v:*>)
        this._removeNamespacedElements(body, 'v:');

        // Remove Office elements (<o:*>)
        this._removeNamespacedElements(body, 'o:');

        // Walk all elements
        const allElements = Array.from(body.querySelectorAll('*'));
        for (const el of allElements) {
            if (!el.parentNode) continue; // already removed

            // Strip mso-* style properties
            this._stripMsoStyles(el);

            // Remove lang and xml:* attributes
            el.removeAttribute('lang');
            const xmlAttrs = Array.from(el.attributes).filter(a => a.name.startsWith('xml:'));
            for (const attr of xmlAttrs) {
                el.removeAttribute(attr.name);
            }

            // Convert mso-spacerun spans to spaces
            if (el.tagName.toLowerCase() === 'span') {
                const style = el.getAttribute('style') || '';
                if (style.includes('mso-spacerun:yes') || style.includes('mso-spacerun: yes')) {
                    el.textContent = ' ';
                }
            }
        }

        // Map Word heading classes to heading elements
        this._mapHeadingClasses(body);

        // Convert Word list markup to standard lists
        this._convertWordLists(body);

        // Remove empty span/font wrappers
        const empties = Array.from(body.querySelectorAll('span, font'));
        for (const el of empties) {
            if (!el.parentNode) continue;
            if (!el.hasAttribute('style') && !el.hasAttribute('class') && el.attributes.length <= 0) {
                while (el.firstChild) {
                    el.parentNode.insertBefore(el.firstChild, el);
                }
                el.parentNode.removeChild(el);
            }
        }

        return body.innerHTML;
    }

    /**
     * Remove elements with a namespace prefix (e.g., v:shape, o:p).
     * @param {Element} root
     * @param {string} prefix
     * @private
     */
    _removeNamespacedElements(root, prefix) {
        // querySelectorAll doesn't work with namespaced elements,
        // so use regex on innerHTML
        const regex = new RegExp(`<${prefix}[^>]*>([\\s\\S]*?)<\\/${prefix}[^>]*>`, 'gi');
        root.innerHTML = root.innerHTML.replace(regex, '');
        // Also remove self-closing
        const selfClose = new RegExp(`<${prefix}[^/>]*/?>`, 'gi');
        root.innerHTML = root.innerHTML.replace(selfClose, '');
    }

    /**
     * Strip mso-* properties from an element's style attribute.
     * @param {Element} el
     * @private
     */
    _stripMsoStyles(el) {
        const style = el.getAttribute('style');
        if (!style) return;

        // Remove mso-* properties
        const cleaned = style.replace(/mso-[^;:"]+\s*:\s*[^;"]*(;|$)/gi, '').trim();
        if (cleaned) {
            el.setAttribute('style', cleaned);
        } else {
            el.removeAttribute('style');
        }
    }

    /**
     * Map Word heading classes to proper heading elements.
     * @param {Element} root
     * @private
     */
    _mapHeadingClasses(root) {
        const headingMap = {
            'Heading1': 'h1', 'Heading2': 'h2', 'Heading3': 'h3',
            'Heading4': 'h4', 'Heading5': 'h5', 'Heading6': 'h6',
            'MsoTitle': 'h1', 'MsoSubtitle': 'h2'
        };

        for (const [className, tagName] of Object.entries(headingMap)) {
            const elements = root.querySelectorAll(`.${className}, [class*="${className}"]`);
            for (const el of elements) {
                if (!el.parentNode) continue;
                const heading = document.createElement(tagName);
                heading.innerHTML = el.innerHTML;
                el.parentNode.replaceChild(heading, el);
            }
        }
    }

    /**
     * Convert Word list paragraphs to standard ul/ol/li.
     * @param {Element} root
     * @private
     */
    _convertWordLists(root) {
        const listClasses = [
            'MsoListBullet', 'MsoListBulletCxSpFirst', 'MsoListBulletCxSpMiddle', 'MsoListBulletCxSpLast',
            'MsoListNumber', 'MsoListNumberCxSpFirst', 'MsoListNumberCxSpMiddle', 'MsoListNumberCxSpLast',
            'MsoListParagraph', 'MsoListParagraphCxSpFirst', 'MsoListParagraphCxSpMiddle', 'MsoListParagraphCxSpLast'
        ];

        // Group consecutive list paragraphs
        const children = Array.from(root.children);
        let i = 0;

        while (i < children.length) {
            const el = children[i];
            if (!el.parentNode) { i++; continue; }

            const cls = el.getAttribute('class') || '';
            const isListPara = listClasses.some(lc => cls.includes(lc));

            if (!isListPara) {
                i++;
                continue;
            }

            // Determine list type
            const isOrdered = cls.includes('MsoListNumber');
            const listTag = isOrdered ? 'ol' : 'ul';

            // Collect consecutive list paragraphs of the same type
            const group = [el];
            let j = i + 1;
            while (j < children.length) {
                const next = children[j];
                const nextCls = next.getAttribute('class') || '';
                const nextIsList = listClasses.some(lc => nextCls.includes(lc));
                if (!nextIsList) break;
                group.push(next);
                j++;
            }

            // Create list and items
            const list = document.createElement(listTag);
            for (const para of group) {
                const li = document.createElement('li');
                li.innerHTML = para.innerHTML;
                list.appendChild(li);
            }

            // Replace first paragraph with list, remove the rest
            root.insertBefore(list, group[0]);
            for (const para of group) {
                if (para.parentNode) {
                    para.parentNode.removeChild(para);
                }
            }

            // Update children array for next iteration
            children.splice(i, group.length, list);
            i++;
        }
    }
}


// ============================================================================
// GoogleDocsPasteMatcher — strips Google Docs markup
// ============================================================================

/**
 * GoogleDocsPasteMatcher detects and normalizes HTML pasted from Google Docs.
 *
 * Detection: looks for docs-internal-guid IDs, data-sheets-* attributes,
 * Google-specific class patterns.
 *
 * Transform: strips data-* attributes, -webkit-* vendor prefixes, converts
 * Google Docs list divs to ul/ol/li, removes zero-width spaces.
 */
export class GoogleDocsPasteMatcher {

    static get name() { return 'googleDocs'; }

    get name() { return 'googleDocs'; }

    /**
     * Detect if HTML was generated by Google Docs.
     *
     * @param {string} html - Raw HTML string
     * @returns {boolean}
     */
    detect(html) {
        if (!html) return false;
        return (
            html.includes('docs-internal-guid') ||
            html.includes('data-sheets-value') ||
            html.includes('data-sheets-formula') ||
            html.includes('id="docs-internal-guid')
        );
    }

    /**
     * Transform Google Docs HTML to clean HTML.
     *
     * @param {string} html - Raw Google Docs HTML
     * @returns {string} Cleaned HTML
     */
    transform(html) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const body = doc.body;
        if (!body) return html;

        // Walk all elements
        const allElements = Array.from(body.querySelectorAll('*'));
        for (const el of allElements) {
            if (!el.parentNode) continue;

            // Strip data-* attributes (Google Docs internal state)
            const dataAttrs = Array.from(el.attributes).filter(a => a.name.startsWith('data-'));
            for (const attr of dataAttrs) {
                el.removeAttribute(attr.name);
            }

            // Strip id attributes containing docs-internal-guid
            const id = el.getAttribute('id') || '';
            if (id.includes('docs-internal-guid')) {
                el.removeAttribute('id');
            }

            // Strip -webkit-* vendor prefixes from style
            this._stripWebkitStyles(el);

            // Convert font-weight:700 spans to strong
            // Convert font-style:italic spans to em
            if (el.tagName.toLowerCase() === 'span') {
                const style = el.getAttribute('style') || '';

                if (style.includes('font-weight:700') || style.includes('font-weight: 700') ||
                    style.includes('font-weight:bold') || style.includes('font-weight: bold')) {
                    const strong = document.createElement('strong');
                    strong.innerHTML = el.innerHTML;
                    // Copy remaining style
                    const remaining = style
                        .replace(/font-weight\s*:\s*[^;]*(;|$)/gi, '')
                        .trim();
                    if (remaining) strong.setAttribute('style', remaining);
                    el.parentNode.replaceChild(strong, el);
                    continue;
                }

                if (style.includes('font-style:italic') || style.includes('font-style: italic')) {
                    const em = document.createElement('em');
                    em.innerHTML = el.innerHTML;
                    const remaining = style
                        .replace(/font-style\s*:\s*[^;]*(;|$)/gi, '')
                        .trim();
                    if (remaining) em.setAttribute('style', remaining);
                    el.parentNode.replaceChild(em, el);
                    continue;
                }
            }
        }

        // Remove zero-width spaces
        body.innerHTML = body.innerHTML
            .replace(/\u200B/g, '')
            .replace(/\uFEFF/g, '');

        // Unwrap excessive wrapper divs (Google Docs wraps in many layers)
        this._unwrapExcessiveDivs(body);

        return body.innerHTML;
    }

    /**
     * Strip -webkit-* properties from an element's style attribute.
     * @param {Element} el
     * @private
     */
    _stripWebkitStyles(el) {
        const style = el.getAttribute('style');
        if (!style) return;

        const cleaned = style
            .replace(/-webkit-[^;:]+\s*:\s*[^;]*(;|$)/gi, '')
            .trim();

        if (cleaned) {
            el.setAttribute('style', cleaned);
        } else {
            el.removeAttribute('style');
        }
    }

    /**
     * Unwrap excessive wrapper divs.
     * Google Docs wraps content in multiple div layers.
     * @param {Element} root
     * @private
     */
    _unwrapExcessiveDivs(root) {
        const divs = Array.from(root.querySelectorAll('div'));
        for (const div of divs) {
            if (!div.parentNode) continue;

            // If a div has no useful attributes and only wraps other block content,
            // unwrap it
            if (div.attributes.length === 0 ||
                (div.attributes.length === 1 && div.hasAttribute('dir'))) {
                // Check if it contains block-level children
                const hasBlockChild = Array.from(div.children).some(child => {
                    const tag = child.tagName.toLowerCase();
                    return ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'blockquote', 'div', 'table'].includes(tag);
                });

                if (hasBlockChild) {
                    while (div.firstChild) {
                        div.parentNode.insertBefore(div.firstChild, div);
                    }
                    div.parentNode.removeChild(div);
                }
            }
        }
    }
}


// ============================================================================
// ClipboardPlugin
// ============================================================================

/**
 * ClipboardPlugin manages clipboard operations for the RichTextEditor.
 *
 * Attaches copy/cut/paste event listeners on the textarea input sink
 * and provides programmatic clipboard methods.
 */
export default class ClipboardPlugin {

    /**
     * Unique plugin name for registry identification.
     * @returns {string}
     */
    static get pluginName() { return 'clipboard'; }

    /**
     * @param {import('../RichTextEditor.js').default} [editor] - RichTextEditor instance (optional for PluginManager path)
     */
    constructor(editor) {
        /** @type {import('../RichTextEditor.js').default} */
        this.editor = editor || null;

        /** @type {Sanitizer} */
        this._sanitizer = new Sanitizer();

        /** @type {boolean} Flag for Mod-Shift-V plain text paste */
        this._forcePlainText = false;

        /**
         * Ordered list of paste matchers. Each matcher has:
         * - name: string identifier
         * - detect(html, clipboardData): boolean
         * - transform(html): string
         * @type {Array<{name: string, detect: function, transform: function}>}
         */
        this._pasteMatchers = [
            new WordPasteMatcher(),
            new GoogleDocsPasteMatcher()
        ];

        // If editor provided via constructor (backward-compatible path), set up immediately
        if (this.editor) {
            this._setupClipboardListeners();
            this._setupDragDrop();
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
        if (this.editor) return; // Already initialized via constructor
        this.editor = editor;
        this._setupClipboardListeners();
        this._setupDragDrop();
    }

    /**
     * Return keybindings for clipboard operations.
     *
     * @returns {object} Keymap bindings
     */
    keymap() {
        return {
            'Mod-Shift-v': (state, dispatch) => this.pasteAsPlainText(state, dispatch)
        };
    }

    /**
     * Return context menu item descriptors for clipboard operations.
     *
     * @param {object} context - Menu context
     * @returns {Array<object>}
     */
    contextMenuItems(context) {
        return [
            { name: 'cut', label: 'Cut', command: () => document.execCommand('cut'), group: 'clipboard', order: 1 },
            { name: 'copy', label: 'Copy', command: () => document.execCommand('copy'), group: 'clipboard', order: 2 },
            { name: 'paste', label: 'Paste', command: () => document.execCommand('paste'), group: 'clipboard', order: 3 }
        ];
    }

    // =========================================================================
    // Setup helpers
    // =========================================================================

    /**
     * Attach clipboard event listeners to the textarea input sink.
     * @private
     */
    _setupClipboardListeners() {
        // Load custom paste rules from editor config (prepend for priority)
        if (this.editor._config && this.editor._config.pasteRules) {
            for (const rule of this.editor._config.pasteRules) {
                this._pasteMatchers.unshift(rule);
            }
        }

        // Bind handlers
        this._onCopy = this._handleCopy.bind(this);
        this._onCut = this._handleCut.bind(this);
        this._onPaste = this._handlePaste.bind(this);

        // Attach to textarea input sink
        const textarea = this.editor._inputSink;
        if (textarea) {
            textarea.addEventListener('copy', this._onCopy);
            textarea.addEventListener('cut', this._onCut);
            textarea.addEventListener('paste', this._onPaste);
        }
    }

    /**
     * Set up drag-drop elements and event listeners.
     * @private
     */
    _setupDragDrop() {
        /** @type {{ blockEl: Element, blockIndex: number }|null} */
        this._dragSource = null;

        // Create drop cursor element
        this._dropCursor = document.createElement('div');
        this._dropCursor.className = 'rte-drop-cursor';
        if (this.editor._editorArea) {
            this.editor._editorArea.appendChild(this._dropCursor);
        }

        // Create drag handle element
        this._dragHandle = document.createElement('div');
        this._dragHandle.className = 'rte-drag-handle';
        this._dragHandle.textContent = '\u22EE\u22EE'; // double vertical ellipsis
        this._dragHandle.setAttribute('draggable', 'true');
        this._dragHandle.setAttribute('aria-label', 'Drag to reorder');
        if (this.editor._editorArea) {
            this.editor._editorArea.appendChild(this._dragHandle);
        }

        /** @type {Element|null} The block element that the drag handle is associated with */
        this._dragHandleBlock = null;

        /** @type {number} Target block index for drops */
        this._dropTargetIndex = -1;

        // Bind drag-drop handlers
        this._onDragStart = this._handleDragStart.bind(this);
        this._onDragOver = this._handleDragOver.bind(this);
        this._onDrop = this._handleDrop.bind(this);
        this._onDragEnd = this._handleDragEnd.bind(this);
        this._onDragLeave = this._handleDragLeave.bind(this);
        this._onContentMouseMove = this._handleContentMouseMove.bind(this);
        this._onContentMouseLeave = this._handleContentMouseLeave.bind(this);
        this._onHandleDragStart = this._handleHandleDragStart.bind(this);

        // Attach drag-drop listeners to content container
        const content = this.editor._content;
        if (content) {
            content.addEventListener('dragover', this._onDragOver);
            content.addEventListener('drop', this._onDrop);
            content.addEventListener('dragend', this._onDragEnd);
            content.addEventListener('dragleave', this._onDragLeave);
            content.addEventListener('mousemove', this._onContentMouseMove);
            content.addEventListener('mouseleave', this._onContentMouseLeave);
        }

        // Attach dragstart to the drag handle
        this._dragHandle.addEventListener('dragstart', this._onHandleDragStart);
    }

    // =========================================================================
    // Paste Matcher Registry
    // =========================================================================

    /**
     * Register a custom paste matcher. Custom matchers are prepended
     * (higher priority than built-in matchers).
     *
     * @param {object} matcher - { name, detect(html, clipboardData), transform(html) }
     */
    addPasteMatcher(matcher) {
        if (!matcher || !matcher.name || !matcher.detect || !matcher.transform) {
            throw new Error('Paste matcher must have name, detect, and transform');
        }
        this._pasteMatchers.unshift(matcher);
    }

    /**
     * Remove a paste matcher by name.
     *
     * @param {string} name - Matcher name to remove
     */
    removePasteMatcher(name) {
        this._pasteMatchers = this._pasteMatchers.filter(m => m.name !== name);
    }

    /**
     * Get the current paste matchers list (for plugin interface pasteRules()).
     *
     * @returns {Array<{name: string, detect: function, transform: function}>}
     */
    pasteRules() {
        return [...this._pasteMatchers];
    }

    /**
     * Run paste matchers against HTML content.
     * First matching matcher transforms the HTML.
     *
     * @param {string} html - Raw HTML
     * @param {DataTransfer} [clipboardData] - Clipboard data transfer
     * @returns {string} Transformed HTML (or original if no matcher matched)
     * @private
     */
    _runPasteMatchers(html, clipboardData) {
        for (const matcher of this._pasteMatchers) {
            try {
                if (matcher.detect(html, clipboardData)) {
                    return matcher.transform(html);
                }
            } catch (e) {
                // Skip broken matchers
                console.warn(`Paste matcher '${matcher.name}' failed:`, e);
            }
        }
        return html;
    }

    // =========================================================================
    // Clipboard Event Handlers
    // =========================================================================

    /**
     * Handle copy event — serialize selection to clipboard.
     *
     * @param {ClipboardEvent} event
     * @private
     */
    _handleCopy(event) {
        const state = this.editor._state;
        if (!state) return;

        const { from, to, empty } = state.selection;
        if (empty) return; // Nothing to copy

        event.preventDefault();

        // Serialize selection to HTML
        const htmlStr = this._serializeSlice(from, to);
        // Serialize selection to plain text
        const plainStr = this._serializePlainText(state.doc, from, to);

        event.clipboardData.setData('text/html', htmlStr);
        event.clipboardData.setData('text/plain', plainStr);
    }

    /**
     * Handle cut event — copy + delete selection.
     *
     * @param {ClipboardEvent} event
     * @private
     */
    _handleCut(event) {
        const state = this.editor._state;
        if (!state) return;

        const { from, to, empty } = state.selection;
        if (empty) return; // Nothing to cut

        // First, serialize to clipboard (same as copy)
        this._handleCopy(event);

        // Then delete the selection
        const tr = state.transaction;
        tr.deleteRange(from, to);
        tr.setSelection(Selection.cursor(from));
        this.editor._dispatch(tr);
    }

    /**
     * Handle paste event — sanitize and insert content.
     *
     * @param {ClipboardEvent} event
     * @private
     */
    _handlePaste(event) {
        const state = this.editor._state;
        if (!state) return;

        event.preventDefault();

        // Fire PASTE_START event
        this.editor.fireEvent('pastestart', {});

        const clipboardData = event.clipboardData;
        if (!clipboardData) {
            this.editor.fireEvent('pasteend', {});
            return;
        }

        const { from, to, empty } = state.selection;

        try {
            // Check if forced plain text mode (Mod-Shift-V)
            if (this._forcePlainText) {
                this._forcePlainText = false;
                const text = clipboardData.getData('text/plain');
                if (text) {
                    this._insertPlainText(text, from, to);
                }
                this.editor.fireEvent('pasteend', {});
                return;
            }

            // Try HTML paste first
            if (clipboardData.types.includes('text/html')) {
                let html = clipboardData.getData('text/html');

                // Run paste matchers (Word, Google Docs, custom)
                html = this._runPasteMatchers(html, clipboardData);

                // Sanitize HTML
                html = this._sanitizer.sanitize(html);

                if (html && html.trim()) {
                    this._insertHTMLContent(html, from, to);
                    this.editor.fireEvent('pasteend', {});
                    return;
                }
            }

            // Fallback to plain text
            const text = clipboardData.getData('text/plain');
            if (text) {
                this._insertPlainText(text, from, to);
            }
        } catch (e) {
            console.error('Paste failed:', e);
        }

        this.editor.fireEvent('pasteend', {});
    }

    // =========================================================================
    // Paste-as-Plain-Text Command
    // =========================================================================

    /**
     * Command function for Mod-Shift-V: paste clipboard as plain text.
     *
     * Uses navigator.clipboard.readText() for async clipboard access.
     * Returns true to indicate the command was handled.
     *
     * @param {object} state - EditorState
     * @param {function} dispatch - Dispatch function
     * @returns {boolean}
     */
    pasteAsPlainText(state, dispatch) {
        if (!dispatch) return true; // Can-execute check: always available

        const { from, to } = state.selection;

        // Use async clipboard API
        if (navigator.clipboard && navigator.clipboard.readText) {
            navigator.clipboard.readText().then(text => {
                if (text) {
                    this._insertPlainText(text, from, to);
                }
            }).catch(() => {
                // Clipboard API denied — fall back to flag approach
                this._forcePlainText = true;
            });
        } else {
            // No clipboard API — set flag for next paste event
            this._forcePlainText = true;
        }

        return true;
    }

    // =========================================================================
    // Content Insertion
    // =========================================================================

    /**
     * Insert plain text at a position, splitting by newlines into paragraphs.
     *
     * @param {string} text - Plain text to insert
     * @param {number} from - Start of selection
     * @param {number} to - End of selection
     * @private
     */
    _insertPlainText(text, from, to) {
        const state = this.editor._state;
        const tr = state.transaction;

        // Delete selection first if not collapsed
        if (from !== to) {
            tr.deleteRange(from, to);
        }

        const lines = text.split('\n');

        if (lines.length === 1) {
            // Single line: simple text insert
            tr.insertText(text, from);
            tr.setSelection(Selection.cursor(from + text.length));
        } else {
            // Multi-line: insert first line as text, then split blocks for each subsequent line
            let pos = from;

            // Insert first line
            if (lines[0]) {
                tr.insertText(lines[0], pos);
                pos += lines[0].length;
            }

            // For subsequent lines, we insert newline-separated content
            // Since splitBlock is complex, insert all text with newlines
            // and let each newline become a paragraph boundary
            for (let i = 1; i < lines.length; i++) {
                const lineText = lines[i];
                // Insert newline as text (will be within same block)
                tr.insertText('\n' + lineText, pos);
                pos += 1 + lineText.length;
            }

            tr.setSelection(Selection.cursor(pos));
        }

        this.editor._dispatch(tr);
    }

    /**
     * Insert sanitized HTML content at a position.
     *
     * @param {string} html - Sanitized HTML string
     * @param {number} from - Start of selection
     * @param {number} to - End of selection
     * @private
     */
    _insertHTMLContent(html, from, to) {
        // Parse HTML into model nodes using the editor's parser
        const parsedDoc = this.editor._parseHTML(html);

        if (!parsedDoc || !parsedDoc.children || parsedDoc.children.length === 0) {
            return;
        }

        const state = this.editor._state;
        const tr = state.transaction;

        // Delete selection first if not collapsed
        if (from !== to) {
            tr.deleteRange(from, to);
        }

        // Extract block children from parsed document
        const blocks = parsedDoc.children;

        // If only one block with text children, try to insert inline
        if (blocks.length === 1 && blocks[0].children) {
            const block = blocks[0];
            if (block.type === 'paragraph' && block.children.length > 0) {
                // Check if all children are text/inline nodes
                const allInline = block.children.every(c => c.type === 'text');
                if (allInline) {
                    // Insert text content inline
                    let pos = from;
                    for (const child of block.children) {
                        if (child.text) {
                            tr.insertText(child.text, pos);
                            // Apply marks if any
                            if (child.marks && child.marks.length > 0) {
                                for (const mark of child.marks) {
                                    tr.addMark(pos, pos + child.text.length, mark);
                                }
                            }
                            pos += child.text.length;
                        }
                    }
                    tr.setSelection(Selection.cursor(pos));
                    this.editor._dispatch(tr);
                    return;
                }
            }
        }

        // Multi-block paste: replace range with blocks
        // Calculate the size of inserted content
        let insertedSize = 0;
        for (const block of blocks) {
            insertedSize += block.nodeSize;
        }

        tr.replaceRange(from, from, blocks);
        tr.setSelection(Selection.cursor(from + insertedSize));
        this.editor._dispatch(tr);
    }

    // =========================================================================
    // Serialization
    // =========================================================================

    /**
     * Serialize a slice of the document model (from..to) to an HTML string.
     *
     * @param {number} from - Start position
     * @param {number} to - End position
     * @returns {string} HTML string
     */
    _serializeSlice(from, to) {
        const doc = this.editor._state.doc;
        if (!doc.children) return '';

        const fragments = [];
        let accum = 0;

        for (const child of doc.children) {
            const childStart = accum;
            const childEnd = accum + child.nodeSize;

            if (childEnd <= from || childStart >= to) {
                accum = childEnd;
                continue;
            }

            if (childStart >= from && childEnd <= to) {
                // Entire block is in range
                fragments.push(this.editor._serializeNode(child));
            } else if (child.type === 'text') {
                // Partial text node
                const textFrom = Math.max(from, childStart) - childStart;
                const textTo = Math.min(to, childEnd) - childStart;
                const sliced = child.text.slice(textFrom, textTo);
                if (sliced) {
                    fragments.push(this.editor._escapeHTML(sliced));
                }
            } else if (child.children) {
                // Block partially in range — serialize the whole block
                // (a simpler approach than trying to slice within nested structures)
                fragments.push(this.editor._serializeNode(child));
            }

            accum = childEnd;
        }

        return fragments.join('');
    }

    /**
     * Serialize a range of the document to plain text.
     *
     * @param {import('../model/Node.js').default} doc - Document node
     * @param {number} from - Start position
     * @param {number} to - End position
     * @returns {string} Plain text string
     */
    _serializePlainText(doc, from, to) {
        if (!doc.children) return '';

        const parts = [];
        this._collectText(doc, from, to, 0, parts);
        return parts.join('');
    }

    /**
     * Recursively collect text content within a position range.
     *
     * @param {import('../model/Node.js').default} node - Current node
     * @param {number} from - Range start
     * @param {number} to - Range end
     * @param {number} offset - Current position offset
     * @param {string[]} parts - Accumulator array
     * @returns {number} Updated offset
     * @private
     */
    _collectText(node, from, to, offset, parts) {
        if (node.type === 'text') {
            const textStart = offset;
            const textEnd = offset + node.text.length;

            if (textEnd <= from || textStart >= to) {
                return textEnd;
            }

            const sliceFrom = Math.max(from, textStart) - textStart;
            const sliceTo = Math.min(to, textEnd) - textStart;
            parts.push(node.text.slice(sliceFrom, sliceTo));
            return textEnd;
        }

        if (node.children === null) {
            // Leaf node (e.g., horizontalRule, hardBreak)
            if (node.type === 'hardBreak') {
                if (offset >= from && offset < to) {
                    parts.push('\n');
                }
            }
            return offset + node.nodeSize;
        }

        // Container node
        const contentStart = offset + (node.type === 'document' ? 0 : 1);
        let pos = contentStart;
        let isFirstBlock = true;

        for (const child of node.children) {
            // Add newline between blocks (but not for the first one)
            if (child.type !== 'text' && child.children !== null && !isFirstBlock) {
                if (pos > from && pos <= to) {
                    parts.push('\n');
                }
            }

            pos = this._collectText(child, from, to, pos, parts);
            isFirstBlock = false;
        }

        // Account for closing boundary
        if (node.type !== 'document') {
            pos += 1; // closing boundary
        }

        return pos;
    }

    // =========================================================================
    // Drag-Drop Event Handlers
    // =========================================================================

    /**
     * Handle dragstart events initiated from the drag handle.
     * Identifies the associated block, serializes it, and stores
     * internal drag metadata.
     *
     * @param {DragEvent} event
     * @private
     */
    _handleHandleDragStart(event) {
        if (!this._dragHandleBlock) return;

        const blockEl = this._dragHandleBlock;
        const blockIndex = this._getBlockIndexForElement(blockEl);
        if (blockIndex === -1) return;

        // Store drag source for internal move detection
        this._dragSource = { blockEl, blockIndex };

        // Add visual feedback to the dragged block
        blockEl.classList.add('rte-dragging');

        // Set data transfer
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('application/x-gooey-rte-drag', JSON.stringify({ blockIndex }));

        // Serialize the block to HTML and plain text
        const doc = this.editor._state.doc;
        if (doc.children && blockIndex < doc.children.length) {
            const blockNode = doc.children[blockIndex];
            const htmlStr = this.editor._serializeNode(blockNode);
            const plainStr = this._serializePlainText(doc, this._blockStartPos(blockIndex), this._blockEndPos(blockIndex));
            event.dataTransfer.setData('text/html', htmlStr);
            event.dataTransfer.setData('text/plain', plainStr);
        }
    }

    /**
     * Handle dragstart events from direct content interactions.
     * Prevents default browser drag behavior on content elements.
     *
     * @param {DragEvent} event
     * @private
     */
    _handleDragStart(event) {
        // Only allow drags initiated from the drag handle
        if (event.target !== this._dragHandle) {
            // Prevent text/element drags from the content area
            event.preventDefault();
        }
    }

    /**
     * Handle dragover events — determine drop position and show cursor.
     *
     * @param {DragEvent} event
     * @private
     */
    _handleDragOver(event) {
        event.preventDefault();

        // Determine if this is an internal or external drag
        const isInternal = this._dragSource !== null;
        event.dataTransfer.dropEffect = isInternal ? 'move' : 'copy';

        // Find the block element and position under the cursor
        const view = this.editor._view;
        if (!view) return;

        const blockInfo = view.blockAtCoords(event.clientX, event.clientY);
        if (!blockInfo) {
            this._hideDropCursor();
            return;
        }

        // Calculate the target insertion index
        let targetIndex;
        if (blockInfo.position === 'above') {
            targetIndex = blockInfo.blockIndex;
        } else {
            targetIndex = blockInfo.blockIndex + 1;
        }

        // For internal moves, check if the drop is a no-op
        if (isInternal) {
            const sourceIndex = this._dragSource.blockIndex;
            if (targetIndex === sourceIndex || targetIndex === sourceIndex + 1) {
                // Dropping at the same position — show invalid cursor
                this._showDropCursor(blockInfo.blockEl, blockInfo.position, true);
                this._dropTargetIndex = -1;
                return;
            }
        }

        this._dropTargetIndex = targetIndex;
        this._showDropCursor(blockInfo.blockEl, blockInfo.position, false);
    }

    /**
     * Handle drop events — perform block move or insert external content.
     *
     * @param {DragEvent} event
     * @private
     */
    _handleDrop(event) {
        event.preventDefault();
        this._hideDropCursor();

        const isInternal = event.dataTransfer.types.includes('application/x-gooey-rte-drag') && this._dragSource;

        if (isInternal) {
            this._handleInternalDrop(event);
        } else {
            this._handleExternalDrop(event);
        }

        this._clearDragState();
    }

    /**
     * Handle an internal drag-drop to reorder blocks.
     *
     * @param {DragEvent} event
     * @private
     */
    _handleInternalDrop(event) {
        if (this._dropTargetIndex === -1) return;

        const sourceIndex = this._dragSource.blockIndex;
        const targetIndex = this._dropTargetIndex;

        // No-op check
        if (targetIndex === sourceIndex || targetIndex === sourceIndex + 1) return;

        const doc = this.editor._state.doc;
        if (!doc.children || sourceIndex >= doc.children.length) return;

        const blockNode = doc.children[sourceIndex];
        const state = this.editor._state;
        const tr = state.transaction;

        // Calculate positions for the source block
        const sourceStart = this._blockStartPos(sourceIndex);
        const sourceEnd = this._blockEndPos(sourceIndex);

        // Determine insert position
        // If the target is after the source, adjust for the removal
        let insertIndex = targetIndex;
        if (insertIndex > sourceIndex) {
            insertIndex--;
        }

        // Step 1: Delete the source block
        tr.deleteRange(sourceStart, sourceEnd);

        // Step 2: Calculate the new insert position after deletion
        let insertPos;
        if (insertIndex >= doc.children.length - 1) {
            // Insert at the end — sum up all remaining blocks
            insertPos = 0;
            for (let i = 0; i < doc.children.length; i++) {
                if (i === sourceIndex) continue;
                insertPos += doc.children[i].nodeSize;
            }
        } else {
            insertPos = 0;
            let count = 0;
            for (let i = 0; i < doc.children.length; i++) {
                if (i === sourceIndex) continue;
                if (count === insertIndex) break;
                insertPos += doc.children[i].nodeSize;
                count++;
            }
        }

        // Step 3: Insert the block at the new position using replaceRange
        tr.replaceRange(insertPos, insertPos, [blockNode]);

        // Set cursor to the start of the moved block
        tr.setSelection(Selection.cursor(insertPos + 1));

        this.editor._dispatch(tr);
    }

    /**
     * Handle an external drop — insert content from outside the editor.
     *
     * @param {DragEvent} event
     * @private
     */
    _handleExternalDrop(event) {
        const dt = event.dataTransfer;
        const view = this.editor._view;
        if (!view) return;

        // Determine insertion position from coordinates
        const blockInfo = view.blockAtCoords(event.clientX, event.clientY);
        if (!blockInfo) return;

        let insertPos;
        if (blockInfo.position === 'above') {
            insertPos = this._blockStartPos(blockInfo.blockIndex);
        } else {
            insertPos = this._blockEndPos(blockInfo.blockIndex);
        }

        // Check for image files
        if (dt.files && dt.files.length > 0) {
            const imageFiles = Array.from(dt.files).filter(f => f.type.startsWith('image/'));
            if (imageFiles.length > 0) {
                // Placeholder for images (full support in Phase 39)
                const state = this.editor._state;
                const tr = state.transaction;
                const placeholderText = imageFiles.map(f => `[Image: ${f.name}]`).join('\n');
                tr.insertText(placeholderText, insertPos);
                tr.setSelection(Selection.cursor(insertPos + placeholderText.length));
                this.editor._dispatch(tr);
                console.warn('Image drop detected — full image support will be available in a future update.');
                return;
            }
        }

        // Check for HTML content
        const html = dt.getData('text/html');
        if (html && html.trim()) {
            // Run through paste pipeline: matchers -> sanitizer -> parse -> insert
            let processed = this._runPasteMatchers(html, dt);
            processed = this._sanitizer.sanitize(processed);

            if (processed && processed.trim()) {
                this._insertHTMLContent(processed, insertPos, insertPos);
                return;
            }
        }

        // Fallback to plain text
        const text = dt.getData('text/plain');
        if (text) {
            this._insertPlainText(text, insertPos, insertPos);
        }
    }

    /**
     * Handle dragend events — clean up drag state.
     *
     * @param {DragEvent} event
     * @private
     */
    _handleDragEnd(event) {
        this._hideDropCursor();
        this._clearDragState();
    }

    /**
     * Handle dragleave events — hide cursor if leaving the content area.
     *
     * @param {DragEvent} event
     * @private
     */
    _handleDragLeave(event) {
        const content = this.editor._content;
        if (!content) return;

        // Only hide if we're truly leaving the content area
        // relatedTarget is the element the mouse entered
        if (!event.relatedTarget || !content.contains(event.relatedTarget)) {
            this._hideDropCursor();
        }
    }

    // =========================================================================
    // Drag Handle (hover reveal)
    // =========================================================================

    /**
     * Handle mousemove on the content area to show/reposition the drag handle.
     *
     * @param {MouseEvent} event
     * @private
     */
    _handleContentMouseMove(event) {
        if (this.editor.disabled) return;

        const view = this.editor._view;
        if (!view) return;

        const blockInfo = view.blockAtCoords(event.clientX, event.clientY);
        if (!blockInfo) {
            this._hideDragHandle();
            return;
        }

        const blockEl = blockInfo.blockEl;

        // Don't re-position if it's the same block
        if (this._dragHandleBlock === blockEl) return;

        this._dragHandleBlock = blockEl;

        // Position the handle at the left of the block, vertically centered
        const blockRect = blockEl.getBoundingClientRect();
        const editorAreaRect = this.editor._editorArea.getBoundingClientRect();

        const handleTop = blockRect.top - editorAreaRect.top + (blockRect.height / 2) - 10; // center vertically (handle is 20px)
        const handleLeft = blockRect.left - editorAreaRect.left - 24; // 24px to the left of the block

        this._dragHandle.style.display = 'block';
        this._dragHandle.style.top = `${handleTop}px`;
        this._dragHandle.style.left = `${Math.max(0, handleLeft)}px`;
    }

    /**
     * Handle mouseleave on the content area — hide drag handle.
     *
     * @param {MouseEvent} event
     * @private
     */
    _handleContentMouseLeave(event) {
        // Only hide if mouse is not entering the drag handle itself
        if (event.relatedTarget === this._dragHandle) return;
        this._hideDragHandle();
    }

    // =========================================================================
    // Drag-Drop Visual Helpers
    // =========================================================================

    /**
     * Show the drop cursor at a block boundary.
     *
     * @param {Element} blockEl - Reference block element
     * @param {string} position - "above" or "below"
     * @param {boolean} invalid - Whether this is an invalid drop position
     * @private
     */
    _showDropCursor(blockEl, position, invalid) {
        if (!this._dropCursor || !this.editor._editorArea) return;

        const blockRect = blockEl.getBoundingClientRect();
        const areaRect = this.editor._editorArea.getBoundingClientRect();

        let cursorTop;
        if (position === 'above') {
            cursorTop = blockRect.top - areaRect.top;
        } else {
            cursorTop = blockRect.bottom - areaRect.top;
        }

        this._dropCursor.style.display = 'block';
        this._dropCursor.style.top = `${cursorTop}px`;

        if (invalid) {
            this._dropCursor.classList.add('rte-drop-invalid');
        } else {
            this._dropCursor.classList.remove('rte-drop-invalid');
        }
    }

    /**
     * Hide the drop cursor.
     * @private
     */
    _hideDropCursor() {
        if (this._dropCursor) {
            this._dropCursor.style.display = 'none';
            this._dropCursor.classList.remove('rte-drop-invalid');
        }
    }

    /**
     * Hide the drag handle.
     * @private
     */
    _hideDragHandle() {
        if (this._dragHandle) {
            this._dragHandle.style.display = 'none';
        }
        this._dragHandleBlock = null;
    }

    /**
     * Clear all drag-related state.
     * @private
     */
    _clearDragState() {
        if (this._dragSource) {
            this._dragSource.blockEl.classList.remove('rte-dragging');
        }
        this._dragSource = null;
        this._dropTargetIndex = -1;
    }

    // =========================================================================
    // Drag-Drop Position Helpers
    // =========================================================================

    /**
     * Get the block index (in doc.children) for a DOM element.
     *
     * @param {Element} el - DOM element (must be a direct child of the content container)
     * @returns {number} Block index, or -1 if not found
     * @private
     */
    _getBlockIndexForElement(el) {
        const container = this.editor._content;
        if (!container) return -1;

        const children = container.children;
        for (let i = 0; i < children.length; i++) {
            if (children[i] === el) return i;
        }
        return -1;
    }

    /**
     * Get the model position where a block starts.
     *
     * @param {number} blockIndex - Index in doc.children
     * @returns {number} Model position at start of block
     * @private
     */
    _blockStartPos(blockIndex) {
        const doc = this.editor._state.doc;
        if (!doc.children) return 0;

        let pos = 0;
        for (let i = 0; i < blockIndex && i < doc.children.length; i++) {
            pos += doc.children[i].nodeSize;
        }
        return pos;
    }

    /**
     * Get the model position where a block ends.
     *
     * @param {number} blockIndex - Index in doc.children
     * @returns {number} Model position at end of block
     * @private
     */
    _blockEndPos(blockIndex) {
        const doc = this.editor._state.doc;
        if (!doc.children) return 0;

        let pos = 0;
        for (let i = 0; i <= blockIndex && i < doc.children.length; i++) {
            pos += doc.children[i].nodeSize;
        }
        return pos;
    }

    // =========================================================================
    // Cleanup
    // =========================================================================

    /**
     * Remove clipboard event listeners and clean up.
     */
    destroy() {
        const textarea = this.editor._inputSink;
        if (textarea) {
            textarea.removeEventListener('copy', this._onCopy);
            textarea.removeEventListener('cut', this._onCut);
            textarea.removeEventListener('paste', this._onPaste);
        }

        // Clean up drag-drop listeners
        const content = this.editor._content;
        if (content) {
            content.removeEventListener('dragover', this._onDragOver);
            content.removeEventListener('drop', this._onDrop);
            content.removeEventListener('dragend', this._onDragEnd);
            content.removeEventListener('dragleave', this._onDragLeave);
            content.removeEventListener('mousemove', this._onContentMouseMove);
            content.removeEventListener('mouseleave', this._onContentMouseLeave);
        }

        // Clean up drag handle
        if (this._dragHandle) {
            this._dragHandle.removeEventListener('dragstart', this._onHandleDragStart);
            if (this._dragHandle.parentNode) {
                this._dragHandle.parentNode.removeChild(this._dragHandle);
            }
        }

        // Clean up drop cursor
        if (this._dropCursor && this._dropCursor.parentNode) {
            this._dropCursor.parentNode.removeChild(this._dropCursor);
        }

        this.editor = null;
        this._sanitizer = null;
        this._pasteMatchers = [];
        this._dragSource = null;
        this._dragHandleBlock = null;
    }
}
