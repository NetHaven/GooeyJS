import Container from '../../../Container.js';
import DragEvent from '../../../../events/DragEvent.js';
import MouseEvent from '../../../../events/MouseEvent.js';
import SplitPanelEvent from '../../../../events/panel/SplitPanelEvent.js';

export default class SplitPanel extends Container {
    constructor() {
        super();
        
        this.classList.add("ui-SplitPanel");
        
        // Default attributes
        this._dividerSize = 5;
        
        // Add valid events
        this.addValidEvent(SplitPanelEvent.DIVIDER_LOCATION_CHANGED);
        this._orientation = 'horizontal';
        this._dividerLocation = 50; // percentage
        this._minimumLocation = 10; // percentage
        this._maximumLocation = 90; // percentage
        
        // Initialize from attributes
        if (this.hasAttribute("dividerSize")) {
            this._dividerSize = parseInt(this.getAttribute("dividerSize"));
        }
        
        if (this.hasAttribute("orientation")) {
            this._orientation = this.getAttribute("orientation");
        }
        
        if (this.hasAttribute("dividerlocation")) {
            this._dividerLocation = parseFloat(this.getAttribute("dividerlocation"));
        }
        
        if (this.hasAttribute("minimumlocation")) {
            this._minimumLocation = parseFloat(this.getAttribute("minimumlocation"));
        }
        
        if (this.hasAttribute("maximumlocation")) {
            this._maximumLocation = parseFloat(this.getAttribute("maximumlocation"));
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
        
        // Append internal structure
        this.appendChild(this._firstPane);
        this.appendChild(this._divider);
        this.appendChild(this._secondPane);
    }
    
    _setupEventListeners() {
        // Mouse events for dragging
        this._divider.addEventListener(MouseEvent.MOUSE_DOWN, this._onMouseDown.bind(this));
        document.addEventListener(MouseEvent.MOUSE_MOVE, this._onMouseMove.bind(this));
        document.addEventListener(MouseEvent.MOUSE_UP, this._onMouseUp.bind(this));
        
        // Prevent text selection during drag
        this._divider.addEventListener('selectstart', (e) => e.preventDefault());
        this._divider.addEventListener(DragEvent.START, (e) => e.preventDefault());
    }
    
    _onMouseDown(e) {
        e.preventDefault();
        this._isDragging = true;
        this._dragStartPos = this._orientation === 'horizontal' ? e.clientX : e.clientY;
        this._dragStartLocation = this._dividerLocation;
        
        // Add dragging class for styling
        this.classList.add('splitpanel-dragging');
        document.body.style.cursor = this._orientation === 'horizontal' ? 'col-resize' : 'row-resize';
        document.body.style.userSelect = 'none';
    }
    
    _onMouseMove(e) {
        if (!this._isDragging) return;
        
        e.preventDefault();
        
        const currentPos = this._orientation === 'horizontal' ? e.clientX : e.clientY;
        const deltaPos = currentPos - this._dragStartPos;
        
        // Calculate container size
        const containerSize = this._orientation === 'horizontal' ? 
            this.clientWidth : this.clientHeight;
        
        // Convert pixel delta to percentage
        const deltaPercent = (deltaPos / containerSize) * 100;
        
        // Calculate new location
        let newLocation = this._dragStartLocation + deltaPercent;
        
        // Clamp to minimum and maximum
        newLocation = Math.max(this._minimumLocation, Math.min(this._maximumLocation, newLocation));
        
        // Update divider location
        this.dividerLocation = newLocation;
    }
    
    _onMouseUp() {
        if (!this._isDragging) return;
        
        this._isDragging = false;
        
        // Remove dragging styles
        this.classList.remove('splitpanel-dragging');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        
        // Dispatch change event
        this.fireEvent(SplitPanelEvent.DIVIDER_LOCATION_CHANGED, { location: this._dividerLocation });
    }
    
    _updateLayout() {
        if (!this._firstPane || !this._divider || !this._secondPane) return;
        
        const dividerSizePx = `${this._dividerSize}px`;
        const firstSize = `${this._dividerLocation}%`;
        const secondSize = `${100 - this._dividerLocation}%`;
        
        if (this._orientation === 'horizontal') {
            // Horizontal split (left/right)
            this.style.display = 'flex';
            this.style.flexDirection = 'row';
            
            this._firstPane.style.width = `calc(${firstSize} - ${dividerSizePx}/2)`;
            this._firstPane.style.height = '100%';
            this._firstPane.style.minWidth = '0';
            this._firstPane.style.overflow = 'hidden';
            
            this._divider.style.width = dividerSizePx;
            this._divider.style.height = '100%';
            this._divider.style.flexShrink = '0';
            
            this._secondPane.style.width = `calc(${secondSize} - ${dividerSizePx}/2)`;
            this._secondPane.style.height = '100%';
            this._secondPane.style.minWidth = '0';
            this._secondPane.style.overflow = 'hidden';
        } else {
            // Vertical split (top/bottom)
            this.style.display = 'flex';
            this.style.flexDirection = 'column';
            
            this._firstPane.style.height = `calc(${firstSize} - ${dividerSizePx}/2)`;
            this._firstPane.style.width = '100%';
            this._firstPane.style.minHeight = '0';
            this._firstPane.style.overflow = 'hidden';
            
            this._divider.style.height = dividerSizePx;
            this._divider.style.width = '100%';
            this._divider.style.flexShrink = '0';
            
            this._secondPane.style.height = `calc(${secondSize} - ${dividerSizePx}/2)`;
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
        return this._dividerLocation;
    }
    
    set dividerLocation(val) {
        const numVal = parseFloat(val);
        if (!isNaN(numVal)) {
            this._dividerLocation = Math.max(this._minimumLocation, 
                Math.min(this._maximumLocation, numVal));
            this.setAttribute("dividerlocation", this._dividerLocation);
            this._updateLayout();
        }
    }
    
    get minimumLocation() {
        return this._minimumLocation;
    }
    
    set minimumLocation(val) {
        const numVal = parseFloat(val);
        if (!isNaN(numVal)) {
            this._minimumLocation = numVal;
            this.setAttribute("minimumlocation", val);
            // Ensure current location respects new minimum
            if (this._dividerLocation < this._minimumLocation) {
                this.dividerLocation = this._minimumLocation;
            }
        }
    }
    
    get maximumLocation() {
        return this._maximumLocation;
    }
    
    set maximumLocation(val) {
        const numVal = parseFloat(val);
        if (!isNaN(numVal)) {
            this._maximumLocation = numVal;
            this.setAttribute("maximumlocation", val);
            // Ensure current location respects new maximum
            if (this._dividerLocation > this._maximumLocation) {
                this.dividerLocation = this._maximumLocation;
            }
        }
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