import TextElement from './TextElement.js';
import RichTextEditorEvent from '../../../events/form/text/RichTextEditorEvent.js';
import TextElementEvent from '../../../events/form/text/TextElementEvent.js';
import FormElementEvent from '../../../events/form/FormElementEvent.js';
import MouseEvent from '../../../events/MouseEvent.js';
import KeyboardEvent from '../../../events/KeyboardEvent.js';
import Template from '../../../util/Template.js';

export default class RichTextEditor extends TextElement {
    constructor() {
        super();

        Template.activate("ui-RichTextEditor", this);
        this.classList.add('ui-RichTextEditor');

        this._buttons = {};
        this._previousValue = '';

        this._handleInputBound = this._handleInput.bind(this);
        this._handleFocusBound = this._handleFocus.bind(this);
        this._handleBlurBound = this._handleBlur.bind(this);
        this._handleKeyDownBound = this._handleKeyDown.bind(this);
        this._selectionChangeBound = this._handleSelectionChange.bind(this);

        this._createLayout();
        this._registerEvents();

        if (this.hasAttribute('value')) {
            this.value = this.getAttribute('value');
        }

        this._previousValue = this.value;
        this._syncDisabledState();
        this._updateRequiredIndicator();
    }

    static get observedAttributes() {
        const superAttrs = super.observedAttributes || [];
        return Array.from(new Set([...superAttrs, 'disabled', 'value']));
    }

    connectedCallback() {
        if (super.connectedCallback) {
            super.connectedCallback();
        }
        document.addEventListener('selectionchange', this._selectionChangeBound);
        this._syncDisabledState();
        this._updateButtonStates();
    }

    disconnectedCallback() {
        if (super.disconnectedCallback) {
            super.disconnectedCallback();
        }
        document.removeEventListener('selectionchange', this._selectionChangeBound);
    }

    attributeChangedCallback(name, oldValue, newValue) {
        super.attributeChangedCallback?.(name, oldValue, newValue);

        if (name === 'disabled') {
            this._syncDisabledState();
        }

        if (name === 'value' && newValue !== oldValue && newValue !== this.value) {
            this.value = newValue ?? '';
        }
    }

    get value() {
        return this._content ? this._content.innerHTML : '';
    }

    set value(val) {
        if (!this._content) {
            return;
        }
        this._content.innerHTML = val ?? '';
        this._updateButtonStates();
    }

    get disabled() {
        return super.disabled;
    }

    set disabled(val) {
        super.disabled = val;
        this._syncDisabledState();
    }

    _createLayout() {
        this._shell = this.querySelector('div.richtexteditor-shell');

        this._toolbar = this.querySelector('div.richtexteditor-toolbar');

        let buttons = Array.from(this._toolbar.querySelectorAll("button"));
        buttons.forEach((button) => {
            const command = button.dataset.command;
            button.addEventListener(MouseEvent.CLICK, (event) => {
                event.preventDefault();
                this._execCommand(command, event);
            });
            this._buttons[command] = button;
        });

        this._content = this.querySelector('div.richtexteditor-content');

        this.textElement = this._content;
        this.formElement = this._content;
    }

    _registerEvents() {
        this.addValidEvent(TextElementEvent.INPUT);
        this.addValidEvent(TextElementEvent.CHANGE);
        this.addValidEvent(FormElementEvent.FOCUS);
        this.addValidEvent(FormElementEvent.BLUR);
        this.addValidEvent(RichTextEditorEvent.MODEL_CHANGED);
        this.addValidEvent(RichTextEditorEvent.EDITOR_ACTION);
        this.addValidEvent(RichTextEditorEvent.TEXT_CURSOR_MOVE);

        this._content.addEventListener('input', this._handleInputBound);
        this._content.addEventListener(FormElementEvent.FOCUS, this._handleFocusBound);
        this._content.addEventListener(FormElementEvent.BLUR, this._handleBlurBound);
        this._content.addEventListener(KeyboardEvent.KEY_DOWN, this._handleKeyDownBound);
    }

    _handleInput(event) {
        this._emitModelChange(event);
    }

    _handleFocus(event) {
        this._previousValue = this.value;
        this.fireEvent(FormElementEvent.FOCUS, {
            value: this.value,
            originalEvent: event
        });
    }

    _handleBlur(event) {
        this.fireEvent(FormElementEvent.BLUR, {
            value: this.value,
            originalEvent: event
        });

        if (this.value !== this._previousValue) {
            this.fireEvent(TextElementEvent.CHANGE, {
                value: this.value,
                previousValue: this._previousValue,
                originalEvent: event
            });
            this._previousValue = this.value;
        }
    }

    _handleKeyDown(event) {
        if (!event.ctrlKey && !event.metaKey) {
            return;
        }

        const key = event.key.toLowerCase();
        if (key === 'b' || key === 'i' || key === 'u') {
            event.preventDefault();
            const command = key === 'b' ? 'bold' : key === 'i' ? 'italic' : 'underline';
            this._execCommand(command, event);
        }
    }

    _handleSelectionChange() {
        const selection = document.getSelection();
        if (!selection || selection.rangeCount === 0) {
            return;
        }

        if (!this.contains(selection.anchorNode) || !this.contains(selection.focusNode)) {
            return;
        }

        this._updateButtonStates();

        this.fireEvent(RichTextEditorEvent.TEXT_CURSOR_MOVE, {
            value: this.value,
            anchorOffset: selection.anchorOffset,
            focusOffset: selection.focusOffset,
            originalEvent: selection
        });
    }

    _execCommand(command, originalEvent) {
        if (this.disabled) {
            return;
        }

        this._content.focus();

        try {
            document.execCommand(command, false, null);
        } catch (error) {
            console.warn('RICH_TEXT_COMMAND_ERROR', command, error);
        }

        this._updateButtonStates();

        this.fireEvent(RichTextEditorEvent.EDITOR_ACTION, {
            command,
            active: this._buttons[command]?.classList.contains('is-active') || false,
            originalEvent
        });

        this._emitModelChange(originalEvent);
    }

    _emitModelChange(originalEvent) {
        const payload = {
            value: this.value,
            originalEvent
        };

        this.fireEvent(TextElementEvent.INPUT, payload);
        this.fireEvent(RichTextEditorEvent.MODEL_CHANGED, payload);
    }

    _updateButtonStates() {
        Object.entries(this._buttons).forEach(([command, button]) => {
            let isActive = false;
            try {
                isActive = document.queryCommandState(command);
            } catch () {
                isActive = false;
            }
            button.classList.toggle('is-active', !!isActive);
            button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });
    }

    _syncDisabledState() {
        const disabled = this.disabled;
        if (!this._content) {
            return;
        }

        this._content.setAttribute('contenteditable', disabled ? 'false' : 'true');
        this._content.setAttribute('aria-disabled', disabled ? 'true' : 'false');

        Object.values(this._buttons).forEach((button) => {
            button.disabled = disabled;
        });
    }
}
