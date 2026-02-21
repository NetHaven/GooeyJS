import Container from '../../../Container.js';
import DragEvent from '../../../../events/DragEvent.js';
import MouseEvent from '../../../../events/MouseEvent.js';
import SplitPanelEvent from '../../../../events/panel/SplitPanelEvent.js';
import Template from '../../../../util/Template.js';

export default class SplitPanel extends Container {
    constructor() {
        super();

        Template.activate("ui-SplitPanel", this.shadowRoot);

        this.classList.add("ui-SplitPanel");

        // Default attributes
        this._dividerSize = 5;

        // Add valid events
        this.addValidEvent(SplitPanelEvent.DIVIDER_LOCATION_CHANGED);
        this._orientation = 'horizontal';

        // Location values store both numeric value and unit type
        // { value: number, isPercent: boolean }
        this._dividerLocation = { value: 50, isPercent: true };
        this._minimumLocation = { value: 10, isPercent: true };
        this._maximumLocation = { value: 90, isPercent: true };

        // Initialize from attributes
        if (this.hasAttribute("dividerSize")) {
            this._dividerSize = parseInt(this.getAttribute("dividerSize"));
        }

        if (this.hasAttribute("orientation")) {
            this._orientation = this.getAttribute("orientation");
        }

        if (this.hasAttribute("dividerlocation")) {
            this._dividerLocation = this._parseLocationValue(this.getAttribute("dividerlocation"));
        }

        if (this.hasAttribute("minimumlocation")) {
            this._minimumLocation = this._parseLocationValue(this.getAttribute("minimumlocation"));
        }

        if (this.hasAttribute("maximumlocation")) {
            this._maximumLocation = this._parseLocationValue(this.getAttribute("maximumlocation"));
        }

        // Initialize drag state
        this._isDragging = false;
        this._dragStartPos = 0;
        this._dragStartLocation = 0;

        // Create internal structure
        this._createInternalStructure();

        // Setup event listeners
        this._setupEventListeners();

        // Apply initial layout
        this._updateLayout();
    }

    /**
     * Parse a location value string into value and unit type.
     * Numbers without '%' are interpreted as pixels.
     * Numbers with '%' are interpreted as percentages.
     * @param {string|number} val - The value to parse
     * @returns {{ value: number, isPercent: boolean }}
     */
    _parseLocationValue(val) {
        const strVal = String(val).trim();
        if (strVal.endsWith('%')) {
            return { value: parseFloat(strVal), isPercent: true };
        }
        return { value: parseFloat(strVal), isPercent: false };
    }

    /**
     * Convert a location object to pixels based on container size.
     * @param {{ value: number, isPercent: boolean }} location
     * @param {number} containerSize
     * @returns {number} Value in pixels
     */
    _locationToPixels(location, containerSize) {
        if (location.isPercent) {
            return (location.value / 100) * containerSize;
        }
        return location.value;
    }

    /**
     * Format a location value for CSS.
     * @param {{ value: number, isPercent: boolean }} location
     * @returns {string} CSS value (e.g., "50%" or "100px")
     */
    _formatLocationCSS(location) {
        return location.isPercent ? `${location.value}%` : `${location.value}px`;
    }

    /**
     * Format a location value for attribute storage.
     * @param {{ value: number, isPercent: boolean }} location
     * @returns {string} Attribute value (e.g., "50%" or "100")
     */
    _formatLocationAttr(location) {
        return location.isPercent ? `${location.value}%` : `${location.value}`;
    }

    _createInternalStructure() {
        // Create container elements
        this._firstPane = document.createElement('div');
        this._firstPane.className = 'splitpanel-pane splitpanel-first-pane';

        this._divider = document.createElement('div');
        this._divider.className = 'splitpanel-divider';
        this._divider.style.cursor = this._orientation === 'horizontal' ? 'col-resize' : 'row-resize';

        this._secondPane = document.createElement('div');
        this._secondPane.className = 'splitpanel-pane splitpanel-second-pane';

        // Move existing children to first pane, or use slot-based approach
        const children = Array.from(this.children);
        if (children.length >= 1) {
            this._firstPane.appendChild(children[0]);
        }
        if (children.length >= 2) {
            this._secondPane.appendChild(children[1]);
        }

        // Append internal structure to shadow root
        this.shadowRoot.appendChild(this._firstPane);
        this.shadowRoot.appendChild(this._divider);
        this.shadowRoot.appendChild(this._secondPane);
    }

    _setupEventListeners() {
        // Mouse down on divider starts drag - bind handlers once for reuse
        this._divider.addEventListener(MouseEvent.MOUSE_DOWN, this._onMouseDown.bind(this));
        this._boundMouseMoveHandler = this._onMouseMove.bind(this);
        this._boundMouseUpHandler = this._onMouseUp.bind(this);

        // Prevent text selection during drag
        this._divider.addEventListener('selectstart', (e) => e.preventDefault());
        this._divider.addEventListener(DragEvent.START, (e) => e.preventDefault());
    }

    disconnectedCallback() {
        // Clean up document listeners if removed while dragging
        if (this._isDragging) {
            document.removeEventListener(MouseEvent.MOUSE_MOVE, this._boundMouseMoveHandler);
            document.removeEventListener(MouseEvent.MOUSE_UP, this._boundMouseUpHandler);
        }

        // Call parent cleanup (model unbinding, etc.)
        super.disconnectedCallback?.();
    }

    _onMouseDown(e) {
        e.preventDefault();
        this._isDragging = true;
        this._dragStartPos = this._orientation === 'horizontal' ? e.clientX : e.clientY;

        // Store the starting pixel position for drag calculations
        const containerSize = this._orientation === 'horizontal' ? this.clientWidth : this.clientHeight;
        this._dragStartLocationPx = this._locationToPixels(this._dividerLocation, containerSize);
        this._dragContainerSize = containerSize;

        // Attach document listeners only during drag
        document.addEventListener(MouseEvent.MOUSE_MOVE, this._boundMouseMoveHandler);
        document.addEventListener(MouseEvent.MOUSE_UP, this._boundMouseUpHandler);

        // Add dragging class for styling
        this.classList.add('splitpanel-dragging');
        document.body.style.cursor = this._orientation === 'horizontal' ? 'col-resize' : 'row-resize';
        document.body.style.userSelect = 'none';
    }

    _onMouseMove(e) {
        e.preventDefault();

        const currentPos = this._orientation === 'horizontal' ? e.clientX : e.clientY;
        const deltaPos = currentPos - this._dragStartPos;

        // Use container size from drag start to avoid jumps during resize
        const containerSize = this._dragContainerSize;

        // Calculate new position in pixels
        let newLocationPx = this._dragStartLocationPx + deltaPos;

        // Get min/max in pixels for clamping
        const minPx = this._locationToPixels(this._minimumLocation, containerSize);
        const maxPx = this._locationToPixels(this._maximumLocation, containerSize);

        // Clamp to minimum and maximum
        newLocationPx = Math.max(minPx, Math.min(maxPx, newLocationPx));

        // Update divider location, preserving the original unit type
        if (this._dividerLocation.isPercent) {
            // Convert back to percentage
            const newPercent = (newLocationPx / containerSize) * 100;
            this._setDividerLocationInternal({ value: newPercent, isPercent: true });
        } else {
            // Keep as pixels
            this._setDividerLocationInternal({ value: newLocationPx, isPercent: false });
        }
    }

    /**
     * Internal method to set divider location without validation (used during drag)
     */
    _setDividerLocationInternal(location) {
        this._dividerLocation = location;
        this.setAttribute("dividerlocation", this._formatLocationAttr(location));
        this._updateLayout();
    }

    _onMouseUp() {
        if (!this._isDragging) return;

        this._isDragging = false;

        // Remove document listeners - only needed during drag
        document.removeEventListener(MouseEvent.MOUSE_MOVE, this._boundMouseMoveHandler);
        document.removeEventListener(MouseEvent.MOUSE_UP, this._boundMouseUpHandler);

        // Remove dragging styles
        this.classList.remove('splitpanel-dragging');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';

        // Dispatch change event with the location value
        this.fireEvent(SplitPanelEvent.DIVIDER_LOCATION_CHANGED, {
            location: this._dividerLocation.value,
            isPercent: this._dividerLocation.isPercent
        });
    }

    _updateLayout() {
        if (!this._firstPane || !this._divider || !this._secondPane) return;

        const dividerSizePx = `${this._dividerSize}px`;
        const firstSize = this._formatLocationCSS(this._dividerLocation);

        if (this._orientation === 'horizontal') {
            // Horizontal split (left/right)
            this.style.display = 'flex';
            this.style.flexDirection = 'row';

            if (this._dividerLocation.isPercent) {
                // Percentage-based sizing
                this._firstPane.style.width = `calc(${firstSize} - ${dividerSizePx}/2)`;
                this._secondPane.style.width = `calc(${100 - this._dividerLocation.value}% - ${dividerSizePx}/2)`;
            } else {
                // Pixel-based sizing
                this._firstPane.style.width = `calc(${firstSize} - ${dividerSizePx}/2)`;
                this._secondPane.style.width = `calc(100% - ${firstSize} - ${dividerSizePx}/2)`;
            }
            this._firstPane.style.height = '100%';
            this._firstPane.style.minWidth = '0';
            this._firstPane.style.overflow = 'hidden';

            this._divider.style.width = dividerSizePx;
            this._divider.style.height = '100%';
            this._divider.style.flexShrink = '0';

            this._secondPane.style.height = '100%';
            this._secondPane.style.minWidth = '0';
            this._secondPane.style.overflow = 'hidden';
        } else {
            // Vertical split (top/bottom)
            this.style.display = 'flex';
            this.style.flexDirection = 'column';

            if (this._dividerLocation.isPercent) {
                // Percentage-based sizing
                this._firstPane.style.height = `calc(${firstSize} - ${dividerSizePx}/2)`;
                this._secondPane.style.height = `calc(${100 - this._dividerLocation.value}% - ${dividerSizePx}/2)`;
            } else {
                // Pixel-based sizing
                this._firstPane.style.height = `calc(${firstSize} - ${dividerSizePx}/2)`;
                this._secondPane.style.height = `calc(100% - ${firstSize} - ${dividerSizePx}/2)`;
            }
            this._firstPane.style.width = '100%';
            this._firstPane.style.minHeight = '0';
            this._firstPane.style.overflow = 'hidden';

            this._divider.style.height = dividerSizePx;
            this._divider.style.width = '100%';
            this._divider.style.flexShrink = '0';

            this._secondPane.style.width = '100%';
            this._secondPane.style.minHeight = '0';
            this._secondPane.style.overflow = 'hidden';
        }

        // Update cursor
        this._divider.style.cursor = this._orientation === 'horizontal' ? 'col-resize' : 'row-resize';
    }

    // Getters and setters for attributes
    get dividerSize() {
        return this._dividerSize;
    }

    set dividerSize(val) {
        this._dividerSize = parseInt(val);
        this.setAttribute("dividerSize", val);
        this._updateLayout();
    }

    get orientation() {
        return this._orientation;
    }

    set orientation(val) {
        if (val === 'horizontal' || val === 'vertical') {
            this._orientation = val;
            this.setAttribute("orientation", val);
            this._updateLayout();
        }
    }

    get dividerLocation() {
        return this._dividerLocation.value;
    }

    set dividerLocation(val) {
        const location = this._parseLocationValue(val);
        if (!isNaN(location.value)) {
            // Clamp the value based on min/max (convert to pixels for comparison)
            const containerSize = this._orientation === 'horizontal' ?
                this.clientWidth : this.clientHeight;

            // Only clamp if we have a valid container size
            if (containerSize > 0) {
                const locationPx = this._locationToPixels(location, containerSize);
                const minPx = this._locationToPixels(this._minimumLocation, containerSize);
                const maxPx = this._locationToPixels(this._maximumLocation, containerSize);

                const clampedPx = Math.max(minPx, Math.min(maxPx, locationPx));

                // Convert back to original unit if clamping occurred
                if (clampedPx !== locationPx) {
                    if (location.isPercent) {
                        location.value = (clampedPx / containerSize) * 100;
                    } else {
                        location.value = clampedPx;
                    }
                }
            }

            this._dividerLocation = location;
            this.setAttribute("dividerlocation", this._formatLocationAttr(location));
            this._updateLayout();
        }
    }

    get minimumLocation() {
        return this._minimumLocation.value;
    }

    set minimumLocation(val) {
        const location = this._parseLocationValue(val);
        if (!isNaN(location.value)) {
            this._minimumLocation = location;
            this.setAttribute("minimumlocation", this._formatLocationAttr(location));

            // Ensure current location respects new minimum
            const containerSize = this._orientation === 'horizontal' ?
                this.clientWidth : this.clientHeight;
            if (containerSize > 0) {
                const currentPx = this._locationToPixels(this._dividerLocation, containerSize);
                const minPx = this._locationToPixels(this._minimumLocation, containerSize);
                if (currentPx < minPx) {
                    this.dividerLocation = this._formatLocationAttr(this._dividerLocation);
                }
            }
        }
    }

    get maximumLocation() {
        return this._maximumLocation.value;
    }

    set maximumLocation(val) {
        const location = this._parseLocationValue(val);
        if (!isNaN(location.value)) {
            this._maximumLocation = location;
            this.setAttribute("maximumlocation", this._formatLocationAttr(location));

            // Ensure current location respects new maximum
            const containerSize = this._orientation === 'horizontal' ?
                this.clientWidth : this.clientHeight;
            if (containerSize > 0) {
                const currentPx = this._locationToPixels(this._dividerLocation, containerSize);
                const maxPx = this._locationToPixels(this._maximumLocation, containerSize);
                if (currentPx > maxPx) {
                    this.dividerLocation = this._formatLocationAttr(this._dividerLocation);
                }
            }
        }
    }

    /**
     * Check if the divider location is specified in percentages.
     * @returns {boolean}
     */
    get dividerLocationIsPercent() {
        return this._dividerLocation.isPercent;
    }

    /**
     * Check if the minimum location is specified in percentages.
     * @returns {boolean}
     */
    get minimumLocationIsPercent() {
        return this._minimumLocation.isPercent;
    }

    /**
     * Check if the maximum location is specified in percentages.
     * @returns {boolean}
     */
    get maximumLocationIsPercent() {
        return this._maximumLocation.isPercent;
    }

    // Method to add content to panes
    setFirstPane(element) {
        this._firstPane.innerHTML = '';
        this._firstPane.appendChild(element);
    }

    setSecondPane(element) {
        this._secondPane.innerHTML = '';
        this._secondPane.appendChild(element);
    }

    getFirstPane() {
        return this._firstPane;
    }

    getSecondPane() {
        return this._secondPane;
    }
}
