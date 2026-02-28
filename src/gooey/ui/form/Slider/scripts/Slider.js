import FormElement from '../../FormElement.js';
import SliderEvent from '../../../../events/form/SliderEvent.js';
import FormElementEvent from '../../../../events/form/FormElementEvent.js';
import Template from '../../../../util/Template.js';

/**
 * Slider component for selecting numeric values via a visual slider
 * Extends FormElement to provide standard form functionality
 */
export default class Slider extends FormElement {
    constructor() {
        super();

        Template.activate("ui-Slider", this.shadowRoot);

        // Cache DOM references
        this._track = this.shadowRoot.querySelector('.slider-track');
        this._fill = this.shadowRoot.querySelector('.slider-fill');
        this._thumb = this.shadowRoot.querySelector('.slider-thumb');
        this._ticksContainer = this.shadowRoot.querySelector('.slider-ticks');
        this._tooltipEl = this.shadowRoot.querySelector('.slider-tooltip');

        // Internal state
        this._value = 0;
        this._min = 0;
        this._max = 100;
        this._step = 1;
        this._dragging = false;
        this._explicitlySet = false;

        // Register valid events
        this.addValidEvent(SliderEvent.CHANGE);
        this.addValidEvent(SliderEvent.INPUT);
        this.addValidEvent(SliderEvent.SLIDE_START);
        this.addValidEvent(SliderEvent.SLIDE_END);
        this.addValidEvent(FormElementEvent.FOCUS);
        this.addValidEvent(FormElementEvent.BLUR);

        // Set formElement for FormElement base class focus/validation wiring
        this.formElement = this._thumb;

        // Read initial attributes
        if (this.hasAttribute('min')) {
            this._min = Number(this.getAttribute('min'));
        }
        if (this.hasAttribute('max')) {
            this._max = Number(this.getAttribute('max'));
        }
        if (this.hasAttribute('step')) {
            const stepVal = Number(this.getAttribute('step'));
            if (stepVal > 0) this._step = stepVal;
        }
        if (this.hasAttribute('value')) {
            this._value = this._snapToStep(Number(this.getAttribute('value')));
        }
        if (this.hasAttribute('readonly')) {
            this._thumb.setAttribute('aria-readonly', 'true');
        }
        if (this.hasAttribute('orientation')) {
            this._thumb.setAttribute('aria-orientation', this.getAttribute('orientation'));
        }

        // Update required indicator now that formElement is assigned
        this._updateRequiredIndicator();
    }

    // =========== Value Property ===========

    get value() {
        return this._value;
    }

    set value(val) {
        const numValue = Number(val);
        if (isNaN(numValue)) return;

        const clamped = Math.max(this._min, Math.min(this._max, numValue));
        const snapped = this._snapToStep(clamped);
        this._value = snapped;
        this.setAttribute('value', String(this._value));
        this._updateVisuals();
        this._thumb.setAttribute('aria-valuenow', String(this._value));
    }

    // =========== Min Property ===========

    get min() {
        return this._min;
    }

    set min(val) {
        const numValue = Number(val);
        if (isNaN(numValue)) return;

        this._min = numValue;
        this.setAttribute('min', String(this._min));
        this._thumb.setAttribute('aria-valuemin', String(this._min));

        // Re-clamp value if needed
        if (this._value < this._min) {
            this.value = this._min;
        }
    }

    // =========== Max Property ===========

    get max() {
        return this._max;
    }

    set max(val) {
        const numValue = Number(val);
        if (isNaN(numValue)) return;

        this._max = numValue;
        this.setAttribute('max', String(this._max));
        this._thumb.setAttribute('aria-valuemax', String(this._max));

        // Re-clamp value if needed
        if (this._value > this._max) {
            this.value = this._max;
        }
    }

    // =========== Step Property ===========

    get step() {
        return this._step;
    }

    set step(val) {
        const numValue = Number(val);
        if (isNaN(numValue) || numValue <= 0) return;
        this._step = numValue;
        this.setAttribute('step', String(this._step));
    }

    // =========== ReadOnly Property ===========

    get readOnly() {
        return this.hasAttribute('readonly');
    }

    set readOnly(val) {
        if (val) {
            this.setAttribute('readonly', '');
            this._thumb.setAttribute('aria-readonly', 'true');
        } else {
            this.removeAttribute('readonly');
            this._thumb.removeAttribute('aria-readonly');
        }
    }

    // =========== Orientation Property ===========

    get orientation() {
        return this.getAttribute('orientation') || 'horizontal';
    }

    set orientation(val) {
        this.setAttribute('orientation', val);
        this._thumb.setAttribute('aria-orientation', val);
        this._updateVisuals();
    }

    // =========== Internal Methods ===========

    /**
     * Snap a value to the nearest step increment
     */
    _snapToStep(value) {
        const snapped = Math.round((value - this._min) / this._step) * this._step + this._min;
        return Math.max(this._min, Math.min(this._max, snapped));
    }

    /**
     * Calculate the current value as a percentage of the range
     */
    _getPercent() {
        if (this._max === this._min) return 0;
        return ((this._value - this._min) / (this._max - this._min)) * 100;
    }

    /**
     * Update visual elements to reflect current value
     */
    _updateVisuals() {
        const percent = this._getPercent();

        if (this.orientation === 'vertical') {
            this._fill.style.width = '';
            this._fill.style.height = percent + '%';
            this._thumb.style.left = '';
            this._thumb.style.bottom = percent + '%';
        } else {
            this._fill.style.height = '';
            this._fill.style.width = percent + '%';
            this._thumb.style.bottom = '';
            this._thumb.style.left = percent + '%';
        }
    }

    // =========== Lifecycle ===========

    attributeChangedCallback(name, oldValue, newValue) {
        // Guard against infinite recursion
        if (oldValue === newValue) return;

        super.attributeChangedCallback?.(name, oldValue, newValue);

        switch (name) {
            case 'value':
                this._value = this._snapToStep(Number(newValue));
                this._updateVisuals();
                this._thumb.setAttribute('aria-valuenow', String(this._value));
                break;
            case 'min':
                this._min = Number(newValue);
                this._thumb.setAttribute('aria-valuemin', String(this._min));
                if (this._value < this._min) {
                    this.value = this._min;
                }
                break;
            case 'max':
                this._max = Number(newValue);
                this._thumb.setAttribute('aria-valuemax', String(this._max));
                if (this._value > this._max) {
                    this.value = this._max;
                }
                break;
            case 'step': {
                const stepVal = Number(newValue);
                if (!isNaN(stepVal) && stepVal > 0) {
                    this._step = stepVal;
                }
                break;
            }
            case 'readonly':
                if (newValue !== null) {
                    this._thumb.setAttribute('aria-readonly', 'true');
                } else {
                    this._thumb.removeAttribute('aria-readonly');
                }
                break;
            case 'orientation':
                this._thumb.setAttribute('aria-orientation', newValue || 'horizontal');
                this._updateVisuals();
                break;
        }
    }

    connectedCallback() {
        super.connectedCallback();
        this._updateVisuals();
    }
}
