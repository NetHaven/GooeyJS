import UIComponent from '../../UIComponent.js';
import Template from '../../../util/Template.js';

/**
 * Badge component for displaying status indicators, counts, or labels.
 * Can be used standalone or as an overlay on other elements via slot.
 *
 * Content precedence: dot > value > text
 * - If dot is true, no content is shown (just the dot indicator)
 * - If value is set, it takes precedence over text
 * - Text is shown only if neither dot nor value is set
 *
 * @fires UIComponentEvent.SHOW - When badge becomes visible
 * @fires UIComponentEvent.HIDE - When badge becomes hidden
 */
export default class Badge extends UIComponent {

    // DOM element references
    _container = null;
    _badge = null;
    _iconElement = null;
    _contentElement = null;

    // Internal state
    _value = null;
    _max = 99;
    _text = null;

    constructor() {
        super();

        Template.activate("ui-Badge", this.shadowRoot);

        // Cache DOM references
        this._container = this.shadowRoot.querySelector(".badge-container");
        this._badge = this.shadowRoot.querySelector(".badge");
        this._iconElement = this.shadowRoot.querySelector(".badge-icon");
        this._contentElement = this.shadowRoot.querySelector(".badge-content");

        // Initialize attributes in correct order
        this._initializeAttributes();
    }

    /**
     * Initialize component state from DOM attributes.
     * Order matters: max must be parsed before value for correct overflow rendering.
     * @private
     */
    _initializeAttributes() {
        // Parse max first so value overflow works correctly on first paint
        if (this.hasAttribute("max")) {
            this._max = this._parseNumber(this.getAttribute("max"), 99);
        }

        // Parse value (takes precedence over text)
        if (this.hasAttribute("value")) {
            this._value = this._parseNumber(this.getAttribute("value"), null);
        }

        // Parse text
        if (this.hasAttribute("text")) {
            this._text = this.getAttribute("text");
        }

        // Parse icon
        if (this.hasAttribute("icon")) {
            this._applyIcon(this.getAttribute("icon"));
        }

        // Parse label for accessibility
        if (this.hasAttribute("label")) {
            this._applyLabel(this.getAttribute("label"));
        }

        // Apply initial content based on precedence
        this._renderContent();

        // Apply dot mode (highest precedence, applied last to override content)
        if (this._parseBoolean(this.getAttribute("dot"))) {
            this._applyDot(true);
        }
    }

    /**
     * Parse a numeric value, returning fallback for NaN or null
     * @private
     * @param {string|null} val - The value to parse
     * @param {number|null} fallback - Fallback if parsing fails
     * @returns {number|null}
     */
    _parseNumber(val, fallback) {
        if (val === null || val === undefined || val === "") {
            return fallback;
        }
        const parsed = parseInt(val, 10);
        return Number.isNaN(parsed) ? fallback : parsed;
    }

    /**
     * Parse a boolean attribute value consistently.
     * Handles "false" string, null, and empty string cases.
     * @private
     * @param {string|null} val - The attribute value
     * @returns {boolean}
     */
    _parseBoolean(val) {
        if (val === null || val === undefined) {
            return false;
        }
        // Empty string means attribute is present (boolean true in HTML)
        if (val === "") {
            return true;
        }
        // Explicitly handle "false" string
        return val.toLowerCase() !== "false";
    }

    /**
     * Handle attribute changes
     */
    attributeChangedCallback(name, oldValue, newValue) {
        super.attributeChangedCallback?.(name, oldValue, newValue);
        if (oldValue === newValue) return;

        switch (name) {
            case "text":
                this._text = newValue;
                this._renderContent();
                break;
            case "value":
                this._value = this._parseNumber(newValue, null);
                this._renderContent();
                break;
            case "max":
                this._max = this._parseNumber(newValue, 99);
                this._renderContent();
                break;
            case "icon":
                this._applyIcon(newValue);
                break;
            case "label":
                this._applyLabel(newValue);
                break;
            case "dot":
                this._applyDot(this._parseBoolean(newValue));
                break;
            case "position":
                // Position handled via CSS attribute selectors
                break;
            case "pulse":
                // Pulse handled via CSS attribute selectors
                break;
        }
    }

    // ========================================
    // Public Properties
    // ========================================

    /**
     * Text content of the badge (lowest precedence after value)
     * @type {string}
     */
    get text() {
        return this._text;
    }

    set text(val) {
        this._text = val;
        if (val !== null && val !== undefined) {
            this.setAttribute("text", val);
        } else {
            this.removeAttribute("text");
        }
        this._renderContent();
    }

    /**
     * Numeric value displayed in the badge (takes precedence over text)
     * @type {number|null}
     */
    get value() {
        return this._value;
    }

    set value(val) {
        this._value = this._parseNumber(val, null);
        if (this._value !== null) {
            this.setAttribute("value", this._value);
        } else {
            this.removeAttribute("value");
        }
        this._renderContent();
    }

    /**
     * Maximum value before showing overflow (e.g., "99+").
     * Set to 0 to always show exact value.
     * @type {number}
     */
    get max() {
        return this._max;
    }

    set max(val) {
        this._max = this._parseNumber(val, 99);
        this.setAttribute("max", this._max);
        this._renderContent();
    }

    /**
     * Icon URL
     * @type {string}
     */
    get icon() {
        return this.getAttribute("icon");
    }

    set icon(val) {
        if (val) {
            this.setAttribute("icon", val);
        } else {
            this.removeAttribute("icon");
        }
        this._applyIcon(val);
    }

    /**
     * Accessible label (maps to aria-label)
     * @type {string}
     */
    get label() {
        return this.getAttribute("label");
    }

    set label(val) {
        if (val) {
            this.setAttribute("label", val);
        } else {
            this.removeAttribute("label");
        }
        this._applyLabel(val);
    }

    /**
     * Visual variant
     * @type {string}
     */
    get variant() {
        return this.getAttribute("variant") || "default";
    }

    set variant(val) {
        if (val) {
            this.setAttribute("variant", val);
        } else {
            this.removeAttribute("variant");
        }
    }

    /**
     * Size of the badge
     * @type {string}
     */
    get size() {
        return this.getAttribute("size") || "medium";
    }

    set size(val) {
        if (val) {
            this.setAttribute("size", val);
        } else {
            this.removeAttribute("size");
        }
    }

    /**
     * Use pill shape
     * @type {boolean}
     */
    get pill() {
        return this.hasAttribute("pill");
    }

    set pill(val) {
        if (val) {
            this.setAttribute("pill", "");
        } else {
            this.removeAttribute("pill");
        }
    }

    /**
     * Display as dot indicator (highest precedence)
     * @type {boolean}
     */
    get dot() {
        return this._parseBoolean(this.getAttribute("dot"));
    }

    set dot(val) {
        if (val) {
            this.setAttribute("dot", "");
        } else {
            this.removeAttribute("dot");
        }
        this._applyDot(Boolean(val));
    }

    /**
     * Use outline style
     * @type {boolean}
     */
    get outline() {
        return this.hasAttribute("outline");
    }

    set outline(val) {
        if (val) {
            this.setAttribute("outline", "");
        } else {
            this.removeAttribute("outline");
        }
    }

    /**
     * Enable pulse animation
     * @type {boolean}
     */
    get pulse() {
        return this.hasAttribute("pulse");
    }

    set pulse(val) {
        if (val) {
            this.setAttribute("pulse", "");
        } else {
            this.removeAttribute("pulse");
        }
    }

    /**
     * Position when used as overlay
     * @type {string}
     */
    get position() {
        return this.getAttribute("position");
    }

    set position(val) {
        if (val) {
            this.setAttribute("position", val);
        } else {
            this.removeAttribute("position");
        }
    }

    // ========================================
    // Private Methods
    // ========================================

    /**
     * Render content based on precedence: dot > value > text
     * @private
     */
    _renderContent() {
        if (!this._contentElement) return;

        // If in dot mode, content is hidden via CSS, but we still clear it
        if (this.dot) {
            this._contentElement.textContent = "";
            return;
        }

        // Value takes precedence over text
        if (this._value !== null) {
            if (this._max > 0 && this._value > this._max) {
                this._contentElement.textContent = `${this._max}+`;
            } else {
                this._contentElement.textContent = this._value.toString();
            }
        } else if (this._text !== null) {
            this._contentElement.textContent = this._text;
        } else {
            this._contentElement.textContent = "";
        }

        // Update has-content class for icon spacing
        this._updateContentClass();
    }

    /**
     * Update class based on whether content is present
     * @private
     */
    _updateContentClass() {
        const hasContent = this._contentElement && this._contentElement.textContent.length > 0;
        if (this._badge) {
            this._badge.classList.toggle("has-content", hasContent);
        }
    }

    /**
     * Apply icon source
     * @private
     */
    _applyIcon(val) {
        const slottedIcon = this.querySelector('[slot="icon"]');
        if (slottedIcon) {
            if (this._iconElement) {
                this._iconElement.style.display = 'none';
            }
        } else if (this._iconElement) {
            if (val) {
                this._iconElement.src = val;
                this._iconElement.style.display = '';
            } else {
                this._iconElement.removeAttribute("src");
                this._iconElement.style.display = 'none';
            }
        }
    }

    /**
     * Apply accessible label
     * @private
     */
    _applyLabel(val) {
        if (this._badge) {
            if (val) {
                this._badge.setAttribute("aria-label", val);
                this._badge.removeAttribute("aria-hidden");
            } else {
                this._badge.removeAttribute("aria-label");
                // In dot mode without label, hide from screen readers
                if (this.dot) {
                    this._badge.setAttribute("aria-hidden", "true");
                }
            }
        }
    }

    /**
     * Apply dot mode
     * @private
     */
    _applyDot(isDot) {
        // Content visibility is handled via CSS [dot] attribute selector
        // Update aria-hidden for accessibility
        if (this._badge) {
            if (isDot && !this.label) {
                this._badge.setAttribute("aria-hidden", "true");
            } else {
                this._badge.removeAttribute("aria-hidden");
            }
        }
        // Re-render content (will be hidden by CSS if dot)
        this._renderContent();
    }

    // ========================================
    // Public Methods
    // ========================================

    /**
     * Increment the numeric value
     * @param {number} [amount=1] - Amount to increment
     */
    increment(amount = 1) {
        if (this._value === null) {
            this._value = 0;
        }
        this.value = this._value + amount;
    }

    /**
     * Decrement the numeric value
     * @param {number} [amount=1] - Amount to decrement
     */
    decrement(amount = 1) {
        if (this._value === null) {
            this._value = 0;
        }
        this.value = Math.max(0, this._value - amount);
    }

    /**
     * Clear the badge content (value and text)
     */
    clear() {
        this._value = null;
        this._text = null;
        this.removeAttribute("value");
        this.removeAttribute("text");
        this._renderContent();
    }
}
