import TextElement from './TextElement.js';
import RichTextEditorEvent from '../../../events/form/text/RichTextEditorEvent.js';
import TextElementEvent from '../../../events/form/text/TextElementEvent.js';

export default class RichTextEditor extends TextElement {
    constructor() {
        super();

        // Create a div for Quill editor
        this.textElement = document.createElement("div");
        this.textElement.style.minHeight = "100px";
        this.textElement.style.border = "1px solid #ccc";
        this.formElement = this.textElement;
        this.appendChild(this.textElement);

        // Store reference for cleanup
        this.quillInstance = null;
        
        // Promise that resolves when Quill is ready
        this._readyPromise = null;
        this._readyResolve = null;

        // Add valid events for RichTextEditor
        this.addValidEvent(RichTextEditorEvent.MODEL_CHANGED);
        this.addValidEvent(RichTextEditorEvent.EDITOR_ACTION);
        this.addValidEvent(RichTextEditorEvent.HIGHLIGHT);
        this.addValidEvent(RichTextEditorEvent.UNHIGHLIGHT);
        this.addValidEvent(RichTextEditorEvent.TEXT_CURSOR_MOVE);
        this.addValidEvent(TextElementEvent.INPUT);
        this.addValidEvent(TextElementEvent.CHANGE);

        // Create ready promise
        this._readyPromise = new Promise((resolve) => {
            this._readyResolve = resolve;
        });

        // Load Quill library and initialize editor
        this.initializeQuillEditor();
    }

    /**
     * Gets the toolbar configuration based on the toolbar attribute
     */
    get toolbar() {
        return this.getAttribute('toolbar');
    }

    /**
     * Sets the toolbar attribute
     */
    set toolbar(value) {
        if (value !== null && value !== undefined) {
            this.setAttribute('toolbar', value);
        } else {
            this.removeAttribute('toolbar');
        }
    }

    /**
     * Loads Quill CSS and JS files if not already loaded, then initializes the editor
     */
    async initializeQuillEditor() {
        try {
            // Ensure Quill library is loaded
            await this.ensureQuillLoaded();
            
            // Initialize Quill editor
            this.initializeQuill();
            
        } catch (error) {
            console.error('Failed to initialize Quill editor:', error);
            // Fallback to basic contentEditable if Quill fails
            this.fallbackToBasicEditor();
        }
    }

    /**
     * Ensures Quill CSS and JS are loaded in the page head
     */
    async ensureQuillLoaded() {
        const basePath = 'resources/libraries/GooeyJS/resources/libraries/Quill/';
        
        // Check and load CSS
        await this.loadQuillCSS(basePath);
        
        // Check and load JS
        await this.loadQuillJS(basePath);
        
        // Wait for Quill to be available
        await this.waitForQuill();
    }

    /**
     * Loads Quill CSS if not already present
     */
    async loadQuillCSS(basePath) {
        const cssId = 'quill-snow-theme-css';
        
        // Check if CSS is already loaded
        if (document.getElementById(cssId)) {
            return Promise.resolve();
        }
        
        return new Promise((resolve, reject) => {
            const link = document.createElement('link');
            link.id = cssId;
            link.rel = 'stylesheet';
            link.href = basePath + 'quill.snow.css';
            
            link.onload = () => resolve();
            link.onerror = () => reject(new Error('Failed to load Quill CSS'));
            
            document.head.appendChild(link);
        });
    }

    /**
     * Loads Quill JS if not already present
     */
    async loadQuillJS(basePath) {
        const scriptId = 'quill-editor-js';
        
        // Check if script is already loaded
        if (document.getElementById(scriptId)) {
            return Promise.resolve();
        }
        
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.id = scriptId;
            script.src = basePath + 'quill.js';
            
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load Quill JS'));
            
            document.head.appendChild(script);
        });
    }

    /**
     * Waits for Quill to be available in the global scope
     */
    async waitForQuill() {
        const maxAttempts = 50;
        const delay = 100;
        
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            if (typeof Quill !== 'undefined') {
                return Promise.resolve();
            }
            
            await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        throw new Error('Quill library not available after loading');
    }

    /**
     * Initializes the Quill editor instance
     */
    initializeQuill() {
        if (typeof Quill === 'undefined') {
            throw new Error('Quill is not available');
        }

        // Configure custom font list
        const Font = Quill.import('formats/font');
        Font.whitelist = [
            'Arial', 'Comic Sans MS', 'Courier', 'Courier New', 
            'Georgia', 'Impact', 'Lucida Sans Unicode', 'Palatino Linotype', 
            'Tahoma', 'Times', 'Times New Roman', 'Trebuchet MS', 'Verdana'
        ];
        Quill.register(Font, true);

        // Get toolbar configuration from attribute
        const toolbarConfig = this.getToolbarConfiguration();

        // Configure Quill options with enhanced modules
        const options = {
            theme: 'snow',
            modules: {
                toolbar: toolbarConfig,
                history: {
                    delay: 2000,
                    maxStack: 500,
                    userOnly: true
                }
            },
            placeholder: 'Start writing...'
        };

        // Initialize Quill
        this.quillInstance = new Quill(this.textElement, options);

        // Add custom CSS for font dropdown display
        this.addFontDropdownCSS();

        // Set up event listeners for integration with GooeyJS
        this.setupQuillEventListeners();

        // Set up pass-through wrapper methods to Quill API
        this.setupQuillPassThroughMethods();
    }

    /**
     * Gets the toolbar configuration based on the toolbar attribute
     */
    getToolbarConfiguration() {
        const toolbarAttr = this.toolbar;
        
        // If toolbar attribute is explicitly set to "false", disable toolbar
        if (toolbarAttr === 'false') {
            return false;
        }
        
        // If toolbar attribute is explicitly set to "true" or not set, use enhanced toolbar
        if (toolbarAttr === 'true' || toolbarAttr === null || toolbarAttr === undefined) {
            return [
                ['bold', 'italic', 'underline'],
                [{ 'font': [] }, { 'size': [] }],
                [{ 'color': [] }, { 'background': [] }],
                [{ 'align': [] }],
                ['clean']
            ];
        }
        
        // If toolbar attribute has a custom value, try to parse it as JSON
        try {
            return JSON.parse(toolbarAttr);
        } catch (error) {
            console.warn('Invalid toolbar configuration, using default:', error);
            return [
                ['bold', 'italic', 'underline'],
                [{ 'align': [] }],
                ['clean']
            ];
        }
    }

    /**
     * Sets up event listeners for Quill editor
     */
    setupQuillEventListeners() {
        if (!this.quillInstance) return;

        // Listen for text changes
        this.quillInstance.on('text-change', () => {
            // Dispatch GooeyJS event for text input integration
            this.fireEvent(TextElementEvent.INPUT, {
                value: this.value,
                editor: this.quillInstance
            });
            
            // Dispatch autosave event for content changes
            this._dispatchAutosaveEvent();
        });

        // Listen for selection changes
        this.quillInstance.on('selection-change', (range) => {
            if (range) {
                // Dispatch focus event when editor gains focus
                const event = new CustomEvent('focus', {
                    detail: { 
                        range: range,
                        editor: this.quillInstance 
                    }
                });
                this.dispatchEvent(event);
            }
        });
    }

    /**
     * Sets up pass-through wrapper methods to expose Quill API
     */
    setupQuillPassThroughMethods() {
        if (!this.quillInstance) return;

        // Content manipulation methods
        this.setText = this.quillInstance.setText.bind(this.quillInstance);
        this.getText = this.quillInstance.getText.bind(this.quillInstance);
        this.getContents = this.quillInstance.getContents.bind(this.quillInstance);
        this.setContents = this.quillInstance.setContents.bind(this.quillInstance);
        this.insertText = this.quillInstance.insertText.bind(this.quillInstance);
        this.deleteText = this.quillInstance.deleteText.bind(this.quillInstance);
        this.insertEmbed = this.quillInstance.insertEmbed.bind(this.quillInstance);
        
        // Formatting methods
        this.format = this.quillInstance.format.bind(this.quillInstance);
        this.formatText = this.quillInstance.formatText.bind(this.quillInstance);
        this.formatLine = this.quillInstance.formatLine.bind(this.quillInstance);
        this.getFormat = this.quillInstance.getFormat.bind(this.quillInstance);
        this.removeFormat = this.quillInstance.removeFormat.bind(this.quillInstance);
        
        // Selection methods
        this.getSelection = this.quillInstance.getSelection.bind(this.quillInstance);
        this.setSelection = this.quillInstance.setSelection.bind(this.quillInstance);
        this.getBounds = this.quillInstance.getBounds.bind(this.quillInstance);
        
        // Editor state methods
        this.blur = this.quillInstance.blur.bind(this.quillInstance);
        this.enable = this.quillInstance.enable.bind(this.quillInstance);
        this.disable = this.quillInstance.disable.bind(this.quillInstance);
        this.hasFocus = this.quillInstance.hasFocus.bind(this.quillInstance);
        
        // Override focus to maintain fallback behavior
        const originalFocus = this.quillInstance.focus.bind(this.quillInstance);
        this.focus = () => {
            if (this.quillInstance) {
                originalFocus();
            } else {
                this.textElement.focus();
            }
        };
        
        // Event methods
        this.on = this.quillInstance.on.bind(this.quillInstance);
        this.once = this.quillInstance.once.bind(this.quillInstance);
        this.off = this.quillInstance.off.bind(this.quillInstance);
        
        // History methods
        this.history = {
            clear: this.quillInstance.history.clear.bind(this.quillInstance.history),
            cutoff: this.quillInstance.history.cutoff.bind(this.quillInstance.history),
            undo: this.quillInstance.history.undo.bind(this.quillInstance.history),
            redo: this.quillInstance.history.redo.bind(this.quillInstance.history)
        };
        
        // Additional useful methods
        this.getLength = this.quillInstance.getLength.bind(this.quillInstance);
        this.getLine = this.quillInstance.getLine.bind(this.quillInstance);
        this.getLines = this.quillInstance.getLines.bind(this.quillInstance);
        this.getModule = this.quillInstance.getModule.bind(this.quillInstance);
        this.addContainer = this.quillInstance.addContainer.bind(this.quillInstance);
        this.updateContents = this.quillInstance.updateContents.bind(this.quillInstance);
        
        // Expose the scroll method
        this.scrollIntoView = this.quillInstance.scrollIntoView.bind(this.quillInstance);
        
        // Resolve the ready promise
        if (this._readyResolve) {
            this._readyResolve();
        }
    }
    
    /**
     * Returns a promise that resolves when the editor is ready
     */
    whenReady() {
        return this._readyPromise;
    }

    /**
     * Fallback to basic contentEditable if Quill fails
     */
    fallbackToBasicEditor() {
        console.warn('Falling back to basic contentEditable editor');
        
        this.textElement.contentEditable = true;
        this.textElement.style.padding = "8px";
        this.textElement.style.outline = "none";
        this.textElement.style.overflowY = "auto";
        
        // Add basic event listener
        this.textElement.addEventListener('input', (event) => {
            this.fireEvent(TextElementEvent.INPUT, {
                value: this.value
            });
            
            // Dispatch autosave event for content changes
            this._dispatchAutosaveEvent();
        });
    }

    /**
     * Gets the current text value
     */
    get value() {
        if (this.quillInstance) {
            return this.quillInstance.getText();
        } else {
            return this.textElement.textContent || '';
        }
    }

    /**
     * Sets the text value
     */
    set value(text) {
        if (this.quillInstance) {
            this.quillInstance.setText(text);
        } else {
            this.textElement.textContent = text;
        }
    }

    /**
     * Gets the HTML content
     */
    get html() {
        if (this.quillInstance) {
            return this.quillInstance.root.innerHTML;
        } else {
            return this.textElement.innerHTML;
        }
    }

    /**
     * Sets the HTML content
     */
    set html(htmlContent) {
        if (this.quillInstance) {
            this.quillInstance.root.innerHTML = htmlContent;
        } else {
            this.textElement.innerHTML = htmlContent;
        }
    }



    /**
     * Dispatches autosave event for content changes with debouncing
     */
    _dispatchAutosaveEvent() {
        // Clear existing debounce timer
        if (this._autosaveDebounce) {
            clearTimeout(this._autosaveDebounce);
        }
        
        // Debounce autosave events to prevent excessive saves during rapid typing
        this._autosaveDebounce = setTimeout(() => {
            const content = this.innerHTML || this.value;
            
            // Only dispatch if content has actually changed
            if (this._lastAutosaveContent !== content) {
                this._lastAutosaveContent = content;
                
                const event = new CustomEvent('editorContentChanged', {
                    detail: {
                        editor: this,
                        content: content,
                        timestamp: Date.now(),
                        field: 'content'
                    }
                });
                
                window.dispatchEvent(event);
            }
        }, 500); // 500ms debounce for editor changes
    }

    /**
     * Adds CSS to display font names in their respective fonts in the dropdown
     */
    addFontDropdownCSS() {
        const cssId = 'quill-font-dropdown-css';
        
        // Check if CSS is already added
        if (document.getElementById(cssId)) {
            return;
        }
        
        const css = `
            /* Display font names in their respective fonts in the Quill toolbar */
            .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="Arial"]::before,
            .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="Arial"]::before {
                font-family: Arial, sans-serif !important;
            }
            
            .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="Comic Sans MS"]::before,
            .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="Comic Sans MS"]::before {
                font-family: "Comic Sans MS", cursive !important;
            }
            
            .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="Courier"]::before,
            .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="Courier"]::before {
                font-family: Courier, monospace !important;
            }
            
            .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="Courier New"]::before,
            .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="Courier New"]::before {
                font-family: "Courier New", monospace !important;
            }
            
            .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="Georgia"]::before,
            .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="Georgia"]::before {
                font-family: Georgia, serif !important;
            }
            
            .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="Impact"]::before,
            .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="Impact"]::before {
                font-family: Impact, sans-serif !important;
            }
            
            .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="Lucida Sans Unicode"]::before,
            .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="Lucida Sans Unicode"]::before {
                font-family: "Lucida Sans Unicode", sans-serif !important;
            }
            
            .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="Palatino Linotype"]::before,
            .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="Palatino Linotype"]::before {
                font-family: "Palatino Linotype", serif !important;
            }
            
            .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="Tahoma"]::before,
            .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="Tahoma"]::before {
                font-family: Tahoma, sans-serif !important;
            }
            
            .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="Times"]::before,
            .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="Times"]::before {
                font-family: Times, serif !important;
            }
            
            .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="Times New Roman"]::before,
            .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="Times New Roman"]::before {
                font-family: "Times New Roman", serif !important;
            }
            
            .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="Trebuchet MS"]::before,
            .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="Trebuchet MS"]::before {
                font-family: "Trebuchet MS", sans-serif !important;
            }
            
            .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="Verdana"]::before,
            .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="Verdana"]::before {
                font-family: Verdana, sans-serif !important;
            }
            
            /* Also apply fonts to the actual editor content */
            .ql-font-Arial { font-family: Arial, sans-serif; }
            .ql-font-'Comic Sans MS' { font-family: "Comic Sans MS", cursive; }
            .ql-font-Courier { font-family: Courier, monospace; }
            .ql-font-'Courier New' { font-family: "Courier New", monospace; }
            .ql-font-Georgia { font-family: Georgia, serif; }
            .ql-font-Impact { font-family: Impact, sans-serif; }
            .ql-font-'Lucida Sans Unicode' { font-family: "Lucida Sans Unicode", sans-serif; }
            .ql-font-'Palatino Linotype' { font-family: "Palatino Linotype", serif; }
            .ql-font-Tahoma { font-family: Tahoma, sans-serif; }
            .ql-font-Times { font-family: Times, serif; }
            .ql-font-'Times New Roman' { font-family: "Times New Roman", serif; }
            .ql-font-'Trebuchet MS' { font-family: "Trebuchet MS", sans-serif; }
            .ql-font-Verdana { font-family: Verdana, sans-serif; }
        `;
        
        const style = document.createElement('style');
        style.id = cssId;
        style.type = 'text/css';
        style.innerHTML = css;
        document.head.appendChild(style);
    }

    /**
     * Cleanup when component is destroyed
     */
    destroy() {
        // Clear autosave debounce timer
        if (this._autosaveDebounce) {
            clearTimeout(this._autosaveDebounce);
            this._autosaveDebounce = null;
        }
        
        if (this.quillInstance) {
            // Quill doesn't have an explicit destroy method, but we can clean up references
            this.quillInstance = null;
        }
    }
}
