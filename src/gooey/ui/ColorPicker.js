import Component from './Component.js';
import ColorPickerEvent from '../events/ColorPickerEvent.js';
import KeyboardEvent from '../events/KeyboardEvent.js';
import MouseEvent from '../events/MouseEvent.js';

export default class ColorPicker extends Component {
    constructor() {
        super();
        
        this.classList.add("ui-ColorPicker");
        
        // Create the color picker structure
        this._createColorPickerStructure();
        
        this.addValidEvent(KeyboardEvent.KEY_DOWN);
        this.addValidEvent(ColorPickerEvent.CHANGE);
        this.addValidEvent(ColorPickerEvent.OPEN);
        this.addValidEvent(ColorPickerEvent.CLOSE);

        // Set up event handlers
        this._setupEventHandlers();
        
        // Initialize state
        this._isOpen = false;
        this._currentColor = '#000000';
        this._updatingAttribute = false;
        
        // Initialize attributes
        if (this.hasAttribute('value')) {
            this.value = this.getAttribute('value');
        }
        
        if (this.hasAttribute('disabled')) {
            this.disabled = this.getAttribute('disabled') === 'true';
        }
    }
    
    /**
     * Create the color picker HTML structure
     */
    _createColorPickerStructure() {
        // Create main container
        this._container = document.createElement('div');
        this._container.className = 'colorpicker-container';
        
        // Create color display button
        this._colorButton = document.createElement('button');
        this._colorButton.type = 'button';
        this._colorButton.className = 'colorpicker-button';
        this._colorButton.setAttribute('aria-label', 'Choose color');
        
        // Create color display area
        this._colorDisplay = document.createElement('div');
        this._colorDisplay.className = 'colorpicker-display';
        this._colorDisplay.style.backgroundColor = this._currentColor;
        
        // Create dropdown arrow
        this._arrow = document.createElement('span');
        this._arrow.className = 'colorpicker-arrow';
        this._arrow.textContent = '▼';
        
        // Assemble button
        this._colorButton.appendChild(this._colorDisplay);
        this._colorButton.appendChild(this._arrow);
        
        // Create dropdown panel
        this._dropdownPanel = document.createElement('div');
        this._dropdownPanel.className = 'colorpicker-dropdown';
        this._dropdownPanel.style.display = 'none';
        
        // Create color palette
        this._createColorPalette();
        
        // Create custom color input section
        this._createCustomColorSection();
        
        // Assemble the structure
        this._container.appendChild(this._colorButton);
        this._container.appendChild(this._dropdownPanel);
        this.appendChild(this._container);
    }
    
    /**
     * Create the color palette grid
     */
    _createColorPalette() {
        const paletteContainer = document.createElement('div');
        paletteContainer.className = 'colorpicker-palette';
        
        // Define standard color palette
        const colors = [
            '#000000', '#333333', '#666666', '#999999', '#cccccc', '#ffffff',
            '#ff0000', '#ff6600', '#ffcc00', '#ffff00', '#ccff00', '#66ff00',
            '#00ff00', '#00ff66', '#00ffcc', '#00ffff', '#00ccff', '#0066ff',
            '#0000ff', '#6600ff', '#cc00ff', '#ff00ff', '#ff00cc', '#ff0066',
            '#800000', '#804000', '#808000', '#408000', '#008000', '#008040',
            '#008080', '#004080', '#000080', '#400080', '#800080', '#800040'
        ];
        
        colors.forEach(color => {
            const colorSwatch = document.createElement('button');
            colorSwatch.type = 'button';
            colorSwatch.className = 'colorpicker-swatch';
            colorSwatch.style.backgroundColor = color;
            colorSwatch.setAttribute('data-color', color);
            colorSwatch.setAttribute('aria-label', `Select color ${color}`);
            colorSwatch.title = color;
            
            colorSwatch.addEventListener(MouseEvent.CLICK, (e) => {
                e.stopPropagation();
                this._selectColor(color);
            });
            
            paletteContainer.appendChild(colorSwatch);
        });
        
        this._dropdownPanel.appendChild(paletteContainer);
    }
    
    /**
     * Create custom color input section
     */
    _createCustomColorSection() {
        const customSection = document.createElement('div');
        customSection.className = 'colorpicker-custom';
        
        // Create label
        const label = document.createElement('label');
        label.textContent = 'Custom:';
        label.className = 'colorpicker-custom-label';
        
        // Create hex input
        this._hexInput = document.createElement('input');
        this._hexInput.type = 'text';
        this._hexInput.className = 'colorpicker-hex-input';
        this._hexInput.placeholder = '#000000';
        this._hexInput.maxLength = 7;
        this._hexInput.value = this._currentColor;
        
        // Create native color input (fallback)
        this._nativeInput = document.createElement('input');
        this._nativeInput.type = 'color';
        this._nativeInput.className = 'colorpicker-native-input';
        this._nativeInput.value = this._currentColor;
        
        label.appendChild(this._hexInput);
        customSection.appendChild(label);
        customSection.appendChild(this._nativeInput);
        
        this._dropdownPanel.appendChild(customSection);
    }
    
    /**
     * Set up event handlers
     */
    _setupEventHandlers() {
        // Color button click
        this._colorButton.addEventListener(MouseEvent.CLICK, (e) => {
            e.preventDefault();
            e.stopPropagation();
            this._toggleDropdown();
        });
        
        // Hex input change
        this._hexInput.addEventListener('input', (e) => {
            const value = e.target.value;
            if (this._isValidHexColor(value)) {
                this._selectColor(value);
            }
        });
        
        this._hexInput.addEventListener(KeyboardEvent.KEY_DOWN, (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const value = e.target.value;
                if (this._isValidHexColor(value)) {
                    this._selectColor(value);
                    this._closeDropdown();
                }
            } else if (e.key === 'Escape') {
                e.preventDefault();
                this._closeDropdown();
            }
        });
        
        // Native color input change
        this._nativeInput.addEventListener('input', (e) => {
            this._selectColor(e.target.value);
        });
        
        // Close dropdown when clicking outside
        document.addEventListener(MouseEvent.CLICK, (e) => {
            if (!this.contains(e.target)) {
                this._closeDropdown();
            }
        });
        
        // Keyboard navigation
        this.addEventListener(KeyboardEvent.KEY_DOWN, (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this._toggleDropdown();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                this._closeDropdown();
            }
        });
    }
    
    /**
     * Validate hex color format
     */
    _isValidHexColor(color) {
        return /^#[0-9A-F]{6}$/i.test(color);
    }
    
    /**
     * Select a color
     */
    _selectColor(color) {
        const normalizedColor = color.toUpperCase();
        
        if (this._currentColor !== normalizedColor) {
            this._currentColor = normalizedColor;
            this._updateDisplay();
            
            // Dispatch change event
            this.fireEvent(ColorPickerEvent.CHANGE, { color: normalizedColor });
        }
    }
    
    /**
     * Update the visual display
     */
    _updateDisplay() {
        this._colorDisplay.style.backgroundColor = this._currentColor;
        this._hexInput.value = this._currentColor;
        this._nativeInput.value = this._currentColor;
        this.setAttribute('value', this._currentColor);
    }
    
    /**
     * Toggle dropdown visibility
     */
    _toggleDropdown() {
        if (this._isOpen) {
            this._closeDropdown();
        } else {
            this._openDropdown();
        }
    }
    
    /**
     * Open dropdown
     */
    _openDropdown() {
        if (this.disabled || this._isOpen) return;
        
        this._isOpen = true;
        this._dropdownPanel.style.display = 'block';
        this._arrow.textContent = '▲';
        this.classList.add('colorpicker-open');
        
        // Position the dropdown properly
        this._positionDropdown();
        
        // Focus hex input for keyboard users
        setTimeout(() => {
            this._hexInput.focus();
            this._hexInput.select();
        }, 0);
        
        // Dispatch open event
        this.fireEvent(ColorPickerEvent.OPEN, { 
            colorPicker: this,
            isOpen: true 
        });
    }
    
    /**
     * Close dropdown
     */
    _closeDropdown() {
        if (!this._isOpen) return;
        
        this._isOpen = false;
        this._dropdownPanel.style.display = 'none';
        this._arrow.textContent = '▼';
        this.classList.remove('colorpicker-open');
        
        // Reset positioning styles
        this._dropdownPanel.style.position = '';
        this._dropdownPanel.style.top = '';
        this._dropdownPanel.style.left = '';
        this._dropdownPanel.style.bottom = '';
        this._dropdownPanel.style.right = '';
        
        // Dispatch close event
        this.fireEvent(ColorPickerEvent.CLOSE, { 
            colorPicker: this,
            isOpen: false 
        });
    }
    
    /**
     * Position the dropdown relative to the button
     */
    _positionDropdown() {
        try {
            // Get button dimensions and position
            const buttonRect = this._colorButton.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            const viewportWidth = window.innerWidth;
            
            // Get dropdown dimensions (temporarily show to measure)
            const dropdownRect = this._dropdownPanel.getBoundingClientRect();
            const dropdownHeight = dropdownRect.height || 200; // fallback
            const dropdownWidth = dropdownRect.width || 200; // fallback
            
            // Calculate available space below and above
            const spaceBelow = viewportHeight - buttonRect.bottom;
            const spaceAbove = buttonRect.top;
            
            // Determine if dropdown should appear above or below
            const shouldShowAbove = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;
            
            // Position the dropdown
            this._dropdownPanel.style.position = 'fixed';
            this._dropdownPanel.style.zIndex = '10000';
            
            if (shouldShowAbove) {
                // Show above the button
                this._dropdownPanel.style.bottom = (viewportHeight - buttonRect.top) + 'px';
                this._dropdownPanel.style.top = 'auto';
            } else {
                // Show below the button (default)
                this._dropdownPanel.style.top = buttonRect.bottom + 'px';
                this._dropdownPanel.style.bottom = 'auto';
            }
            
            // Position horizontally - align with left edge of button but keep in viewport
            let leftPosition = buttonRect.left;
            
            // Ensure dropdown doesn't go off right edge of viewport
            if (leftPosition + dropdownWidth > viewportWidth) {
                leftPosition = viewportWidth - dropdownWidth - 10; // 10px padding from edge
            }
            
            // Ensure dropdown doesn't go off left edge of viewport
            if (leftPosition < 0) {
                leftPosition = 10; // 10px padding from edge
            }
            
            this._dropdownPanel.style.left = leftPosition + 'px';
            this._dropdownPanel.style.right = 'auto';
            
        } catch (error) {
            const logger = window.RetroUILoggers?.ui || console;
            logger.error('COLORPICKER_POSITION_ERROR', 'Error positioning color picker dropdown', { error: error.message });
            // Fallback to CSS positioning
            this._dropdownPanel.style.position = 'absolute';
            this._dropdownPanel.style.top = '100%';
            this._dropdownPanel.style.left = '0';
        }
    }
    
    /**
     * Properties and getters/setters
     */
    get value() {
        return this._currentColor;
    }
    
    set value(val) {
        if (val && this._isValidHexColor(val)) {
            this._selectColor(val);
        }
    }
    
    get disabled() {
        return this.hasAttribute('disabled');
    }
    
    set disabled(val) {
        if (this._updatingAttribute) return;
        
        this._updatingAttribute = true;
        if (val) {
            this.setAttribute('disabled', '');
            this._colorButton.disabled = true;
            this._hexInput.disabled = true;
            this._nativeInput.disabled = true;
            this._closeDropdown();
        } else {
            this.removeAttribute('disabled');
            this._colorButton.disabled = false;
            this._hexInput.disabled = false;
            this._nativeInput.disabled = false;
        }
        this._updatingAttribute = false;
    }
    
    get isOpen() {
        return this._isOpen;
    }
    
    // Focus the color button
    focus() {
        this._colorButton.focus();
    }
    
    // Method to set color from RGB values
    setRGB(r, g, b) {
        const hex = '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
        this.value = hex;
    }
    
    // Method to get RGB values
    getRGB() {
        const hex = this._currentColor.substring(1);
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        return { r, g, b };
    }
    
    static get observedAttributes() {
        return ['value', 'disabled'];
    }
    
    attributeChangedCallback(name, oldValue, newValue) {
        if (this._updatingAttribute) return;
        
        switch (name) {
            case 'value':
                this.value = newValue;
                break;
            case 'disabled':
                this.disabled = newValue !== null;
                break;
        }
    }
}