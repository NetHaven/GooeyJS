import Container from '../../../Container.js';
import LayoutType from '../../../layout/Layout/scripts/LayoutType.js';
import AccordionPanelEvent from '../../../../events/panel/AccordionPanelEvent.js';
import MouseEvent from '../../../../events/MouseEvent.js';
import Template from '../../../../util/Template.js';

export default class AccordionPanel extends Container {
    constructor() {
        super();

        Template.activate("ui-AccordionPanel", this.shadowRoot);

        this.classList.add("ui-AccordionPanel");
        this.layout = LayoutType.VBOX;
        
        // Track accordion state
        this._accordions = [];
        this._activeAccordion = null;
        this._initialized = false;

        // Add valid events
        this.addValidEvent(AccordionPanelEvent.ACCORDION_OPENED);
        this.addValidEvent(AccordionPanelEvent.ACCORDION_CLOSED);

        // Observer for child changes
        this._childObserver = null;
    }

    connectedCallback() {
        if (this._initialized) {
            // Already initialized - rebuild _accordions from existing DOM
            this._rebuildAccordionsFromDOM();
        } else {
            // First time - initialize from gooeyui-panel children
            this._initializeAccordions();
        }
        this._setupChildObserver();
    }
    
    disconnectedCallback() {
        // Clean up observer
        if (this._childObserver) {
            this._childObserver.disconnect();
        }
    }
    
    /**
     * Initialize accordion structure from child gooeyui-panel elements
     * Only called on first connection
     */
    _initializeAccordions() {
        // Clear existing accordions
        this._accordions = [];

        // Find all direct child gooeyui-panel elements
        const childPanels = Array.from(this.children).filter(child =>
            child.tagName.toLowerCase() === 'gooeyui-panel'
        );

        // Convert each panel to an accordion
        childPanels.forEach((panel, index) => {
            this._createAccordionFromPanel(panel, index);
        });

        // Mark as initialized after first pass
        this._initialized = true;

        // Open first accordion by default if none specified
        if (this._accordions.length > 0 && this._activeAccordion === null) {
            this._openAccordion(0);
        }
    }

    /**
     * Rebuild _accordions array from existing DOM elements after reconnect
     * Used when component is disconnected and reconnected to DOM
     */
    _rebuildAccordionsFromDOM() {
        this._accordions = [];

        // Find existing accordion-item elements
        const accordionItems = Array.from(this.children).filter(child =>
            child.classList && child.classList.contains('accordion-item')
        );

        accordionItems.forEach((accordion, index) => {
            const header = accordion.querySelector('.accordion-header');
            const content = accordion.querySelector('.accordion-content');
            const titleSpan = header?.querySelector('.accordion-title');

            if (header && content) {
                this._accordions.push({
                    element: accordion,
                    header: header,
                    content: content,
                    title: titleSpan?.textContent || `Accordion ${index + 1}`,
                    originalPanel: null
                });

                // Update data-index to match current position
                header.setAttribute('data-index', index);
            }
        });

        // Restore active accordion state from DOM
        this._activeAccordion = null;
        this._accordions.forEach((acc, index) => {
            if (acc.header.classList.contains('active')) {
                this._activeAccordion = index;
            }
        });
    }
    
    /**
     * Create accordion structure from a ui-Panel element
     */
    _createAccordionFromPanel(panel, index) {
        const title = panel.getAttribute('title') || `Accordion ${index + 1}`;
        
        // Create accordion header
        const header = document.createElement('div');
        header.className = 'accordion-header';
        header.setAttribute('data-index', index);

        // Build header content safely without innerHTML
        const arrow = document.createElement('span');
        arrow.className = 'accordion-arrow';
        arrow.textContent = '▶';

        const titleSpan = document.createElement('span');
        titleSpan.className = 'accordion-title';
        titleSpan.textContent = title;

        header.appendChild(arrow);
        header.appendChild(titleSpan);
        
        // Create accordion content wrapper
        const content = document.createElement('div');
        content.className = 'accordion-content';
        content.style.display = 'none';
        
        // Move panel content to accordion content
        while (panel.firstChild) {
            content.appendChild(panel.firstChild);
        }
        
        // Replace panel with accordion structure
        const accordion = document.createElement('div');
        accordion.className = 'accordion-item';
        accordion.appendChild(header);
        accordion.appendChild(content);
        
        // Replace the original panel in light DOM
        this.insertBefore(accordion, panel);
        panel.remove();
        
        // Store accordion data
        this._accordions.push({
            element: accordion,
            header: header,
            content: content,
            title: title,
            originalPanel: panel
        });
        
        // Add click handler
        header.addEventListener(MouseEvent.CLICK, () => {
            this._toggleAccordion(index);
        });
    }
    
    /**
     * Set up mutation observer to watch for child changes
     */
    _setupChildObserver() {
        // Clean up existing observer if any
        if (this._childObserver) {
            this._childObserver.disconnect();
        }

        this._childObserver = new MutationObserver((mutations) => {
            const addedPanels = [];
            let hasRemovals = false;

            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    // Collect newly added gooeyui-panel elements
                    mutation.addedNodes.forEach(node => {
                        if (node.tagName && node.tagName.toLowerCase() === 'gooeyui-panel') {
                            addedPanels.push(node);
                        }
                    });

                    // Check for removed accordion items
                    mutation.removedNodes.forEach(node => {
                        if (node.classList && node.classList.contains('accordion-item')) {
                            hasRemovals = true;
                        }
                    });
                }
            });

            // Handle removals by rebuilding indices
            if (hasRemovals) {
                this._rebuildAccordionsFromDOM();
                this._rebindClickHandlers();
            }

            // Only process newly added panels - append to existing accordions
            if (addedPanels.length > 0) {
                setTimeout(() => {
                    addedPanels.forEach(panel => {
                        // Only process if panel is still in the DOM and not already processed
                        if (panel.parentNode === this) {
                            const newIndex = this._accordions.length;
                            this._createAccordionFromPanel(panel, newIndex);
                        }
                    });
                }, 0);
            }
        });

        this._childObserver.observe(this, {
            childList: true,
            subtree: false
        });
    }

    /**
     * Rebind click handlers with correct indices after removal
     */
    _rebindClickHandlers() {
        this._accordions.forEach((accordion, index) => {
            // Clone header to remove old listeners
            const oldHeader = accordion.header;
            const newHeader = oldHeader.cloneNode(true);
            oldHeader.parentNode.replaceChild(newHeader, oldHeader);

            // Update reference
            accordion.header = newHeader;
            newHeader.setAttribute('data-index', index);

            // Add new click handler with correct index
            newHeader.addEventListener(MouseEvent.CLICK, () => {
                this._toggleAccordion(index);
            });
        });
    }
    
    /**
     * Toggle accordion open/closed state
     */
    _toggleAccordion(index) {
        if (index < 0 || index >= this._accordions.length) {
            return;
        }
        
        const isCurrentlyOpen = this._activeAccordion === index;
        
        if (isCurrentlyOpen) {
            this._closeAccordion(index);
        } else {
            this._openAccordion(index);
        }
    }
    
    /**
     * Open specific accordion
     */
    _openAccordion(index) {
        if (index < 0 || index >= this._accordions.length) {
            return;
        }
        
        // Close currently active accordion
        if (this._activeAccordion !== null) {
            this._closeAccordion(this._activeAccordion);
        }
        
        const accordion = this._accordions[index];
        const arrow = accordion.header.querySelector('.accordion-arrow');
        
        // Update visual state
        accordion.header.classList.add('active');
        accordion.content.style.display = 'block';
        arrow.textContent = '▼';
        
        // Set as active
        this._activeAccordion = index;
        
        // Dispatch custom event
        this.fireEvent(AccordionPanelEvent.ACCORDION_OPENED, { index, title: accordion.title });
    }
    
    /**
     * Close specific accordion
     */
    _closeAccordion(index) {
        if (index < 0 || index >= this._accordions.length) {
            return;
        }
        
        const accordion = this._accordions[index];
        const arrow = accordion.header.querySelector('.accordion-arrow');
        
        // Update visual state
        accordion.header.classList.remove('active');
        accordion.content.style.display = 'none';
        arrow.textContent = '▶';
        
        // Clear active state
        if (this._activeAccordion === index) {
            this._activeAccordion = null;
        }
        
        // Dispatch custom event
        this.fireEvent(AccordionPanelEvent.ACCORDION_CLOSED, { index, title: accordion.title });
    }
    
    /**
     * Get the currently active accordion index
     */
    get activeAccordion() {
        return this._activeAccordion;
    }
    
    /**
     * Set the active accordion by index
     */
    set activeAccordion(index) {
        this._openAccordion(index);
    }
    
    /**
     * Get accordion titles
     */
    get accordionTitles() {
        return this._accordions.map(acc => acc.title);
    }
    
    /**
     * Get number of accordions
     */
    get accordionCount() {
        return this._accordions.length;
    }
    
    /**
     * Allow only one accordion open at a time (default behavior)
     */
    get singleOpen() {
        return !this.hasAttribute('multiopen');
    }
    
    set singleOpen(value) {
        if (value) {
            this.removeAttribute('multiopen');
        } else {
            this.setAttribute('multiopen', '');
        }
    }
}