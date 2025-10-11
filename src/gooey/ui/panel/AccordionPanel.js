import Container from '../Container.js';
import Layout from '../Layout.js';
import AccordionPanelEvent from '../../events/panel/AccordionPanelEvent.js';
import MouseEvent from '../../events/MouseEvent.js';

export default class AccordionPanel extends Container {
    constructor() {
        super();
        
        this.classList.add("ui-AccordionPanel");
        this.layout = Layout.VBOX;
        
        // Track accordion state
        this._accordions = [];
        this._activeAccordion = null;
        
        // Add valid events
        this.addValidEvent(AccordionPanelEvent.ACCORDION_OPENED);
        this.addValidEvent(AccordionPanelEvent.ACCORDION_CLOSED);
        
        // Observer for child changes
        this._childObserver = null;
        
        // Initialize when connected
        this.addEventListener('DOMContentLoaded', () => {
            this._initializeAccordions();
        });
    }
    
    connectedCallback() {
        // Initialize accordions when component is connected to DOM
        this._initializeAccordions();
        this._setupChildObserver();
    }
    
    disconnectedCallback() {
        // Clean up observer
        if (this._childObserver) {
            this._childObserver.disconnect();
        }
    }
    
    /**
     * Initialize accordion structure from child ui-Panel elements
     */
    _initializeAccordions() {
        // Clear existing accordions
        this._accordions = [];
        
        // Find all direct child ui-Panel elements
        const childPanels = Array.from(this.children).filter(child => 
            child.tagName.toLowerCase() === 'ui-panel'
        );
        
        // Convert each panel to an accordion
        childPanels.forEach((panel, index) => {
            this._createAccordionFromPanel(panel, index);
        });
        
        // Open first accordion by default if none specified
        if (this._accordions.length > 0 && !this._activeAccordion) {
            this._openAccordion(0);
        }
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
        header.innerHTML = `
            <span class="accordion-arrow">▶</span>
            <span class="accordion-title">${title}</span>
        `;
        
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
        
        // Replace the original panel
        this.replaceChild(accordion, panel);
        
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
        this._childObserver = new MutationObserver((mutations) => {
            let shouldReinitialize = false;
            
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    // Check if ui-Panel elements were added or removed
                    const addedPanels = Array.from(mutation.addedNodes).filter(node => 
                        node.tagName && node.tagName.toLowerCase() === 'ui-panel'
                    );
                    const removedPanels = Array.from(mutation.removedNodes).filter(node => 
                        node.tagName && node.tagName.toLowerCase() === 'ui-panel'
                    );
                    
                    if (addedPanels.length > 0 || removedPanels.length > 0) {
                        shouldReinitialize = true;
                    }
                }
            });
            
            if (shouldReinitialize) {
                // Delay to allow DOM to settle
                setTimeout(() => {
                    this._initializeAccordions();
                }, 0);
            }
        });
        
        this._childObserver.observe(this, {
            childList: true,
            subtree: false
        });
    }
    
    /**
     * Toggle accordion open/closed state
     */
    _toggleAccordion(index) {
        if (index < 0 || index >= this._accordions.length) {
            return;
        }
        
        const accordion = this._accordions[index];
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