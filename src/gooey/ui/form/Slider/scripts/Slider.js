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

        // Bind interaction handlers
        this._boundMouseDown = this._onMouseDown.bind(this);
        this._boundMouseMove = this._onMouseMove.bind(this);
        this._boundMouseUp = this._onMouseUp.bind(this);
        this._boundTouchStart = this._onTouchStart.bind(this);
        this._boundTouchMove = this._onTouchMove.bind(this);
        this._boundTouchEnd = this._onTouchEnd.bind(this);
        this._boundTrackClick = this._onTrackClick.bind(this);
        this._boundKeyDown = this._onKeyDown.bind(this);
        this._boundFocus = this._onFocus.bind(this);
        this._boundBlur = this._onBlur.bind(this);
        this._boundThumbEnter = this._onThumbEnter.bind(this);
        this._boundThumbLeave = this._onThumbLeave.bind(this);

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

    // =========== ShowTicks Property ===========

    get showTicks() {
        return this.hasAttribute('showticks');
    }

    set showTicks(val) {
        if (val) {
            this.setAttribute('showticks', '');
        } else {
            this.removeAttribute('showticks');
        }
        this._renderTicks();
    }

    // =========== TickInterval Property ===========

    get tickInterval() {
        return this.hasAttribute('tickinterval') ? Number(this.getAttribute('tickinterval')) : null;
    }

    set tickInterval(val) {
        if (val !== null && val !== undefined) {
            this.setAttribute('tickinterval', String(val));
        } else {
            this.removeAttribute('tickinterval');
        }
        this._renderTicks();
    }

    // =========== ShowValue Property ===========

    get showValue() {
        return this.hasAttribute('showvalue');
    }

    set showValue(val) {
        if (val) {
            this.setAttribute('showvalue', '');
        } else {
            this.removeAttribute('showvalue');
        }
        this._renderTicks();
    }

    // =========== ShowTooltip Property ===========

    get showTooltip() {
        return this.hasAttribute('showtooltip');
    }

    set showTooltip(val) {
        if (val) {
            this.setAttribute('showtooltip', '');
        } else {
            this.removeAttribute('showtooltip');
        }
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

    /**
     * Format a value to match step precision
     */
    _formatValue(value) {
        const stepStr = String(this._step);
        const dotIndex = stepStr.indexOf('.');
        if (dotIndex >= 0) {
            const decimals = stepStr.length - dotIndex - 1;
            return value.toFixed(decimals);
        }
        return String(Math.round(value));
    }

    /**
     * Render tick marks and optional value labels
     */
    _renderTicks() {
        // Clear existing ticks
        this._ticksContainer.innerHTML = '';

        const isVertical = this.orientation === 'vertical';

        // If showValue is true but showTicks is false, show endpoint labels only
        if (this.showValue && !this.showTicks) {
            this._ticksContainer.style.display = '';

            const minLabel = document.createElement('span');
            minLabel.className = 'slider-tick-label slider-endpoint-label';
            minLabel.textContent = this._formatValue(this._min);
            if (isVertical) {
                minLabel.style.position = 'absolute';
                minLabel.style.bottom = '0';
            } else {
                minLabel.style.position = 'absolute';
                minLabel.style.left = '0';
            }
            this._ticksContainer.appendChild(minLabel);

            const maxLabel = document.createElement('span');
            maxLabel.className = 'slider-tick-label slider-endpoint-label';
            maxLabel.textContent = this._formatValue(this._max);
            if (isVertical) {
                maxLabel.style.position = 'absolute';
                maxLabel.style.top = '0';
            } else {
                maxLabel.style.position = 'absolute';
                maxLabel.style.right = '0';
            }
            this._ticksContainer.appendChild(maxLabel);
            return;
        }

        if (!this.showTicks) {
            this._ticksContainer.style.display = 'none';
            return;
        }

        this._ticksContainer.style.display = '';

        const interval = this.tickInterval !== null ? this.tickInterval : this._step;
        if (interval <= 0) return;

        const range = this._max - this._min;
        if (range <= 0) return;

        for (let val = this._min; val <= this._max; val += interval) {
            const percent = ((val - this._min) / range) * 100;

            const tick = document.createElement('div');
            tick.className = 'slider-tick';

            if (isVertical) {
                tick.style.bottom = percent + '%';
            } else {
                tick.style.left = percent + '%';
            }

            this._ticksContainer.appendChild(tick);

            if (this.showValue) {
                const label = document.createElement('span');
                label.className = 'slider-tick-label';
                label.textContent = this._formatValue(val);

                if (isVertical) {
                    label.style.bottom = percent + '%';
                } else {
                    label.style.left = percent + '%';
                }

                this._ticksContainer.appendChild(label);
            }
        }

        // Ensure the max value tick is present (floating point may skip it)
        const lastPercent = 100;
        const lastTick = this._ticksContainer.querySelector('.slider-tick:last-of-type');
        if (!lastTick || Math.abs(parseFloat(lastTick.style.left || lastTick.style.bottom || '0') - lastPercent) > 0.5) {
            const tick = document.createElement('div');
            tick.className = 'slider-tick';
            if (isVertical) {
                tick.style.bottom = '100%';
            } else {
                tick.style.left = '100%';
            }
            this._ticksContainer.appendChild(tick);

            if (this.showValue) {
                const label = document.createElement('span');
                label.className = 'slider-tick-label';
                label.textContent = this._formatValue(this._max);
                if (isVertical) {
                    label.style.bottom = '100%';
                } else {
                    label.style.left = '100%';
                }
                this._ticksContainer.appendChild(label);
            }
        }
    }

    /**
     * Show the value tooltip near the thumb
     */
    _showTooltip() {
        if (!this.showTooltip) return;

        this._tooltipEl.textContent = this._formatValue(this._value);
        this._tooltipEl.style.display = 'block';
        this._tooltipEl.classList.add('visible');
        this._updateTooltipPosition();
    }

    /**
     * Hide the value tooltip
     */
    _hideTooltip() {
        this._tooltipEl.classList.remove('visible');
        // Use timeout to allow CSS transition to complete
        setTimeout(() => {
            if (!this._tooltipEl.classList.contains('visible')) {
                this._tooltipEl.style.display = 'none';
            }
        }, 150);
    }

    /**
     * Update the tooltip position to follow the thumb
     */
    _updateTooltipPosition() {
        if (!this.showTooltip || this._tooltipEl.style.display === 'none') return;

        const percent = this._getPercent();
        this._tooltipEl.textContent = this._formatValue(this._value);

        if (this.orientation === 'vertical') {
            this._tooltipEl.style.bottom = percent + '%';
            this._tooltipEl.style.left = '';
            this._tooltipEl.style.right = '100%';
            this._tooltipEl.style.top = '';
            this._tooltipEl.style.transform = 'translate(-8px, 50%)';
        } else {
            this._tooltipEl.style.left = percent + '%';
            this._tooltipEl.style.bottom = '100%';
            this._tooltipEl.style.right = '';
            this._tooltipEl.style.top = '';
            this._tooltipEl.style.transform = 'translate(-50%, -8px)';
        }
    }

    // =========== Mouse Interaction ===========

    /**
     * Handle mousedown on the thumb - start dragging
     */
    _onMouseDown(e) {
        if (this.disabled || this.readOnly) return;
        e.preventDefault();

        this._dragging = true;
        this._thumb.classList.add('active');
        document.addEventListener('mousemove', this._boundMouseMove);
        document.addEventListener('mouseup', this._boundMouseUp);

        this._showTooltip();
        this.fireEvent(SliderEvent.SLIDE_START, { value: this._value });
    }

    /**
     * Handle mousemove during drag - update value continuously
     */
    _onMouseMove(e) {
        if (!this._dragging) return;

        const newValue = this._valueFromPosition(e.clientX, e.clientY);
        if (newValue !== this._value) {
            this._value = newValue;
            this._updateVisuals();
            this._thumb.setAttribute('aria-valuenow', String(this._value));
            this._updateTooltipPosition();
            this.fireEvent(SliderEvent.INPUT, { value: this._value });
        }
    }

    /**
     * Handle mouseup - end dragging
     */
    _onMouseUp(e) {
        if (!this._dragging) return;

        this._dragging = false;
        this._thumb.classList.remove('active');
        document.removeEventListener('mousemove', this._boundMouseMove);
        document.removeEventListener('mouseup', this._boundMouseUp);

        this._hideTooltip();
        this.setAttribute('value', String(this._value));
        this._explicitlySet = true;
        this.fireEvent(SliderEvent.CHANGE, { value: this._value });
        this.fireEvent(SliderEvent.SLIDE_END, { value: this._value });
    }

    // =========== Touch Interaction ===========

    /**
     * Handle touchstart on the thumb - start touch drag
     */
    _onTouchStart(e) {
        if (this.disabled || this.readOnly) return;
        e.preventDefault();

        this._dragging = true;
        this._thumb.classList.add('active');
        document.addEventListener('touchmove', this._boundTouchMove, { passive: false });
        document.addEventListener('touchend', this._boundTouchEnd);

        this._showTooltip();
        this.fireEvent(SliderEvent.SLIDE_START, { value: this._value });
    }

    /**
     * Handle touchmove during drag - update value continuously
     */
    _onTouchMove(e) {
        if (!this._dragging) return;
        e.preventDefault();

        const touch = e.touches[0];
        const newValue = this._valueFromPosition(touch.clientX, touch.clientY);
        if (newValue !== this._value) {
            this._value = newValue;
            this._updateVisuals();
            this._thumb.setAttribute('aria-valuenow', String(this._value));
            this._updateTooltipPosition();
            this.fireEvent(SliderEvent.INPUT, { value: this._value });
        }
    }

    /**
     * Handle touchend - end touch drag
     */
    _onTouchEnd(e) {
        if (!this._dragging) return;

        this._dragging = false;
        this._thumb.classList.remove('active');
        document.removeEventListener('touchmove', this._boundTouchMove);
        document.removeEventListener('touchend', this._boundTouchEnd);

        this._hideTooltip();
        this.setAttribute('value', String(this._value));
        this._explicitlySet = true;
        this.fireEvent(SliderEvent.CHANGE, { value: this._value });
        this.fireEvent(SliderEvent.SLIDE_END, { value: this._value });
    }

    // =========== Track Click ===========

    /**
     * Handle click on the track - jump to clicked position
     */
    _onTrackClick(e) {
        if (this.disabled || this.readOnly) return;
        // If the click target is the thumb, let thumb handle it
        if (e.target === this._thumb) return;

        const newValue = this._valueFromPosition(e.clientX, e.clientY);
        this.fireEvent(SliderEvent.SLIDE_START, { value: this._value });

        this._value = newValue;
        this._updateVisuals();
        this._thumb.setAttribute('aria-valuenow', String(this._value));
        this.setAttribute('value', String(this._value));
        this._explicitlySet = true;

        this.fireEvent(SliderEvent.CHANGE, { value: this._value });
        this.fireEvent(SliderEvent.SLIDE_END, { value: this._value });
    }

    // =========== Keyboard Interaction ===========

    /**
     * Handle keyboard navigation on the thumb
     */
    _onKeyDown(e) {
        if (this.disabled || this.readOnly) return;

        let newValue = this._value;
        let handled = false;

        switch (e.key) {
            case 'ArrowRight':
            case 'ArrowUp':
                newValue = this._value + this._step;
                handled = true;
                break;
            case 'ArrowLeft':
            case 'ArrowDown':
                newValue = this._value - this._step;
                handled = true;
                break;
            case 'PageUp':
                newValue = this._value + (10 * this._step);
                handled = true;
                break;
            case 'PageDown':
                newValue = this._value - (10 * this._step);
                handled = true;
                break;
            case 'Home':
                newValue = this._min;
                handled = true;
                break;
            case 'End':
                newValue = this._max;
                handled = true;
                break;
        }

        if (handled) {
            e.preventDefault();
            this.value = newValue;
            this._explicitlySet = true;
            this.fireEvent(SliderEvent.CHANGE, { value: this._value });
        }
    }

    // =========== Focus/Blur ===========

    /**
     * Handle focus on the thumb
     */
    _onFocus(e) {
        this.fireEvent(FormElementEvent.FOCUS, { value: this._value, originalEvent: e });
    }

    /**
     * Handle blur on the thumb
     */
    _onBlur(e) {
        this.fireEvent(FormElementEvent.BLUR, { value: this._value, originalEvent: e });
    }

    /**
     * Handle mouseenter on the thumb - show tooltip
     */
    _onThumbEnter() {
        this._showTooltip();
    }

    /**
     * Handle mouseleave on the thumb - hide tooltip if not dragging
     */
    _onThumbLeave() {
        if (!this._dragging) {
            this._hideTooltip();
        }
    }

    // =========== Validation ===========

    /**
     * Validate the slider for required field support
     * Returns false if required and user has never explicitly set a value
     */
    validate() {
        if (this.required && !this._explicitlySet) {
            return false;
        }
        return true;
    }

    // =========== Position Calculation ===========

    /**
     * Calculate a snapped value from a client position
     */
    _valueFromPosition(clientX, clientY) {
        const rect = this._track.getBoundingClientRect();
        let percent;

        if (this.orientation === 'vertical') {
            percent = Math.max(0, Math.min(1, (rect.bottom - clientY) / rect.height));
        } else {
            percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        }

        return this._snapToStep(this._min + percent * (this._max - this._min));
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
                this._renderTicks();
                break;
            case 'max':
                this._max = Number(newValue);
                this._thumb.setAttribute('aria-valuemax', String(this._max));
                if (this._value > this._max) {
                    this.value = this._max;
                }
                this._renderTicks();
                break;
            case 'step': {
                const stepVal = Number(newValue);
                if (!isNaN(stepVal) && stepVal > 0) {
                    this._step = stepVal;
                }
                this._renderTicks();
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
                this._renderTicks();
                break;
            case 'showticks':
            case 'tickinterval':
            case 'showvalue':
                this._renderTicks();
                break;
        }
    }

    connectedCallback() {
        super.connectedCallback();
        this._updateVisuals();

        // Attach interaction listeners
        this._thumb.addEventListener('mousedown', this._boundMouseDown);
        this._thumb.addEventListener('touchstart', this._boundTouchStart, { passive: false });
        this._thumb.addEventListener('keydown', this._boundKeyDown);
        this._thumb.addEventListener('focus', this._boundFocus);
        this._thumb.addEventListener('blur', this._boundBlur);
        this.shadowRoot.querySelector('.slider-container').addEventListener('click', this._boundTrackClick);
        this._thumb.addEventListener('mouseenter', this._boundThumbEnter);
        this._thumb.addEventListener('mouseleave', this._boundThumbLeave);

        // Render ticks if needed
        this._renderTicks();
    }

    disconnectedCallback() {
        // Remove thumb listeners
        this._thumb.removeEventListener('mousedown', this._boundMouseDown);
        this._thumb.removeEventListener('touchstart', this._boundTouchStart);
        this._thumb.removeEventListener('keydown', this._boundKeyDown);
        this._thumb.removeEventListener('focus', this._boundFocus);
        this._thumb.removeEventListener('blur', this._boundBlur);
        this.shadowRoot.querySelector('.slider-container').removeEventListener('click', this._boundTrackClick);
        this._thumb.removeEventListener('mouseenter', this._boundThumbEnter);
        this._thumb.removeEventListener('mouseleave', this._boundThumbLeave);

        // Clean up document listeners if dragging
        if (this._dragging) {
            document.removeEventListener('mousemove', this._boundMouseMove);
            document.removeEventListener('mouseup', this._boundMouseUp);
            document.removeEventListener('touchmove', this._boundTouchMove);
            document.removeEventListener('touchend', this._boundTouchEnd);
            this._dragging = false;
        }
    }
}
