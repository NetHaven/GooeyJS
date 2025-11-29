import FormElementEvent from '../../../../../events/form/FormElementEvent.js';
import LineWrap from '../../LineWrap.js';
import Template from '../../../../../util/Template.js';
import TextElement from '../../TextElement.js';
import TextElementEvent from '../../../../../events/form/text/TextElementEvent.js';

export default class TextArea extends TextElement {
    constructor() {
        super();

        Template.activate("ui-TextArea", this.shadowRoot);
        this.textElement = this.shadowRoot.querySelector("textarea");
        this.formElement = this.textElement;
		this.appendChild(this.textElement);
        
        // Add valid events
        this.addValidEvent(TextElementEvent.INPUT);
        this.addValidEvent(TextElementEvent.CHANGE);
        this.addValidEvent(FormElementEvent.FOCUS);
        this.addValidEvent(FormElementEvent.BLUR);
        this.addValidEvent(TextElementEvent.SELECT);
        this.addValidEvent(TextElementEvent.INVALID);
        
        // Add documented event listeners
        this.textElement.addEventListener(TextElementEvent.INPUT, (e) => {
            this.fireEvent(TextElementEvent.INPUT, { 
                value: this.textElement.value,
                originalEvent: e
            });
        });
        
        this.textElement.addEventListener(TextElementEvent.CHANGE, (e) => {
            this.fireEvent(TextElementEvent.CHANGE, { 
                value: this.textElement.value,
                originalEvent: e
            });
        });
        
        this.textElement.addEventListener(FormElementEvent.FOCUS, (e) => {
            this.fireEvent(FormElementEvent.FOCUS, { 
                value: this.textElement.value,
                originalEvent: e
            });
        });
        
        this.textElement.addEventListener(FormElementEvent.BLUR, (e) => {
            this.fireEvent(FormElementEvent.BLUR, { 
                value: this.textElement.value,
                originalEvent: e
            });
        });
        
        this.textElement.addEventListener(TextElementEvent.SELECT, (e) => {
            this.fireEvent(TextElementEvent.SELECT, { 
                value: this.textElement.value,
                selectionStart: this.textElement.selectionStart,
                selectionEnd: this.textElement.selectionEnd,
                originalEvent: e
            });
        });
        
        this.textElement.addEventListener(TextElementEvent.INVALID, (e) => {
            this.fireEvent(TextElementEvent.INVALID, { 
                value: this.textElement.value,
                validationMessage: this.textElement.validationMessage,
                originalEvent: e
            });
        });

        if (this.hasAttribute("cols")) {
            this.cols = this.getAttribute("cols");
        }

        if (this.hasAttribute("resize")) {
            if (this.getAttribute("resize") === "false") {
                this.resize = false;
            }
            else {
                this.resize = true;
            }
        }
        else {
            this.resize = true;
        }

        if (this.hasAttribute("rows")) {
            this.rows = this.getAttribute("rows");
        }
    }

    get cols() {
        return this.getAttribute("cols");
    }

    get resize() {
        if (this.hasAttribute("resize")) {
            if (this.getAttribute("resize") === "false") {
                return false;
            }
            else {
                return true;
            }
        }
        else {
            return true;
        }
    }

    get rows() {
        return this.getAttribute("rows");
    }

    get wrap() {
        return this.getAttribute("wrap");
    }

    set cols(val) {
        if (val) {
            this.setAttribute("cols", val);
            this.textElement.setAttribute("cols", val);
        }
    }

    set resize(val) {
        if (val) {
            this.setAttribute("resize", "true");
            this.textElement.style.resize = 'both';
        }
        else {
            this.setAttribute("resize", "false");
            this.textElement.style.resize = 'none';
        }
    }

    set rows(val) {
        if (val) {
            this.setAttribute("rows", val);
            this.textElement.setAttribute("rows", val);
        }
    }

    set wrap(val) {
        switch (val) {
            case LineWrap.HARD:
            case LineWrap.OFF:
            case LineWrap.SOFT: this.setAttribute("wrap", val);
                                this.textElement.setAttribute("wrap", val);
        }
    }
}
