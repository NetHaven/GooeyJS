import FormElement from './FormElement.js';
import SpinnerEvent from '../../events/form/SpinnerEvent.js';
import MouseEvent from '../../events/MouseEvent.js';
import FormElementEvent from '../../events/form/FormElementEvent.js';
import Template from '../../util/Template.js';

/**
 * Spinner component for numeric input with increment/decrement buttons
 * Extends FormElement to provide standard form functionality
 */
export default class Spinner extends FormElement {
    static get observedAttributes() {
        return [...super.observedAttributes];
    }

    constructor() {
        super();

        Template.activate("ui-Spinner", this);
        this._value = 0;
        this._min = Number.MIN_SAFE_INTEGER;
        this._max = Number.MAX_SAFE_INTEGER;
        this._step = 1;
        
        // Add valid events
        this.addValidEvent(SpinnerEvent.VALUE_CHANGE);
        this.addValidEvent(SpinnerEvent.INPUT);
        this.addValidEvent(SpinnerEvent.CHANGE);
        this.addValidEvent(FormElementEvent.FOCUS);
        this.addValidEvent(FormElementEvent.BLUR);
    }

    /**
     * Get the current numeric value
     * @returns {number} Current value
     */
    get value() {
        return this._value;
    }

    /**
     * Set the numeric value
     * @param {number} value New value
     */
    set value(value) {
        const numValue = Number(value);
        if (!isNaN(numValue)) {
            this._value = Math.max(this._min, Math.min(this._max, numValue));
            this.updateDisplay();
            this.fireEvent(SpinnerEvent.VALUE_CHANGE, { value: this._value });
        }
    }

    /**
     * Get minimum value
     * @returns {number} Minimum value
     */
    get min() {
        return this._min;
    }

    /**
     * Set minimum value
     * @param {number} min Minimum value
     */
    set min(min) {
        this._min = Number(min);
        if (this._value < this._min) {
            this.value = this._min;
        }
    }

    /**
     * Get maximum value
     * @returns {number} Maximum value
     */
    get max() {
        return this._max;
    }

    /**
     * Set maximum value
     * @param {number} max Maximum value
     */
    set max(max) {
        this._max = Number(max);
        if (this._value > this._max) {
            this.value = this._max;
        }
    }

    /**
     * Get step value
     * @returns {number} Step value
     */
    get step() {
        return this._step;
    }

    /**
     * Set step value
     * @param {number} step Step value
     */
    set step(step) {
        this._step = Number(step) || 1;
    }

    /**
     * Increment the value by step amount
     */
    increment() {
        this.value = this._value + this._step;
    }

    /**
     * Decrement the value by step amount
     */
    decrement() {
        this.value = this._value - this._step;
    }

    /**
     * Update the display to show current value
     */
    updateDisplay() {
        const input = this.querySelector('input');
        if (input) {
            input.value = this._value;
        }
    }

    /**
     * Initialize the component
     */
    connectedCallback() {
        super.connectedCallback();
        this.setupEventListeners();
        this.updateDisplay();
    }

    /**
     * Set up event listeners for input and buttons
     */
    setupEventListeners() {
        const input = this.querySelector('input');
        const incrementBtn = this.querySelector('.increment-btn');
        const decrementBtn = this.querySelector('.decrement-btn');

        if (input) {
            input.addEventListener('input', (e) => {
                this.value = e.target.value;
                
                // Dispatch custom input event
                this.fireEvent(SpinnerEvent.INPUT, { 
                    value: this._value,
                    originalEvent: e
                });
            });
            
            input.addEventListener('change', (e) => {
                // Dispatch custom change event
                this.fireEvent(SpinnerEvent.CHANGE, { 
                    value: this._value,
                    originalEvent: e
                });
            });
            
            input.addEventListener('focus', (e) => {
                // Dispatch custom focus event
                this.fireEvent(FormElementEvent.FOCUS, { 
                    value: this._value,
                    originalEvent: e
                });
            });
            
            input.addEventListener('blur', (e) => {
                // Dispatch custom blur event
                this.fireEvent(FormElementEvent.BLUR, { 
                    value: this._value,
                    originalEvent: e
                });
            });

            input.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    this.increment();
                } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    this.decrement();
                }
            });
        }

        if (incrementBtn) {
            incrementBtn.addEventListener(MouseEvent.CLICK, () => {
                this.increment();
            });
        }

        if (decrementBtn) {
            decrementBtn.addEventListener(MouseEvent.CLICK, () => {
                this.decrement();
            });
        }
    }
}
