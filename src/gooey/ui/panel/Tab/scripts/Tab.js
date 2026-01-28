import Container from '../../../Container.js';
import LayoutType from '../../../layout/Layout/scripts/LayoutType.js';
import TabEvent from '../../../../events/panel/TabEvent.js';
import TabPanelEvent from '../../../../events/panel/TabPanelEvent.js';
import MouseEvent from '../../../../events/MouseEvent.js';
import Template from '../../../../util/Template.js';

export default class Tab extends Container {
    constructor() {
        super();

        Template.activate("ui-Tab", this.shadowRoot);

        this.layout = LayoutType.FLOW;
        this._active = false;
        this._tabHeader = null;
        this._tabPanel = null;

        // Add valid events
        this.addValidEvent(TabEvent.TAB_CLOSE);
    }

    connectedCallback() {
        
        // Find parent TabPanel
        this._tabPanel = this.closest('gooeyui-tabpanel');
        
        if (this._tabPanel) {
            this._tabPanel._addTab(this);
        }
        
        // Set initial visibility based on active state
        this.style.display = this._active ? 'block' : 'none';

        // Ensure tab header is updated if it exists (to handle closeable attribute)
        if (this._tabHeader) {
            this._updateTabHeader();
        }
    }

    disconnectedCallback() {
        if (this._tabPanel) {
            this._tabPanel._removeTab(this);
        }

        if (this._tabHeader) {
            this._tabHeader.remove();
        }
    }

    attributeChangedCallback(name, oldValue, newValue) {
        switch (name) {
            case 'name':
            case 'text':
                this._updateTabHeader();
                break;
            case 'active':
                this._updateActiveState();
                break;
            case 'closeable':
                this._updateTabHeader();
                break;
        }
    }

    get name() {
        return this.getAttribute('name') || 'Tab';
    }

    set name(val) {
        this.setAttribute('name', val);
    }

    get text() {
        return this.getAttribute('text') || this.name;
    }

    set text(val) {
        this.setAttribute('text', val);
    }

    get active() {
        return this.hasAttribute('active');
    }

    set active(val) {
        if (val) {
            this.setAttribute('active', '');
        } else {
            this.removeAttribute('active');
        }
    }

    get closeable() {
        return this.hasAttribute('closeable');
    }

    set closeable(val) {
        if (val) {
            this.setAttribute('closeable', '');
        } else {
            this.removeAttribute('closeable');
        }
    }

    _createTabHeader() {
        const header = document.createElement('div');
        header.className = 'tab-header';
        header.setAttribute('role', 'tab');
        header.setAttribute('tabindex', this.active ? '0' : '-1');
        header.setAttribute('aria-selected', this.active.toString());
        
        const titleSpan = document.createElement('span');
        titleSpan.className = 'tab-title';
        titleSpan.textContent = this.text;
        header.appendChild(titleSpan);
        
        if (this.closeable) {
            const closeButton = document.createElement('button');
            closeButton.className = 'tab-close-button';
            closeButton.innerHTML = ''; // Icon comes from CSS background image
            closeButton.setAttribute('aria-label', `Close ${this.name} tab`);
            closeButton.addEventListener(MouseEvent.CLICK, (e) => {
                e.stopPropagation();
                this._closeTab();
            });
            header.appendChild(closeButton);
        }
        
        header.addEventListener(MouseEvent.CLICK, () => {
            this._activateTab();
        });
        
        header.addEventListener('keydown', (e) => {
            this._handleKeyDown(e);
        });
        
        return header;
    }

    _updateTabHeader() {
        if (this._tabHeader) {
            const titleSpan = this._tabHeader.querySelector('.tab-title');
            if (titleSpan) {
                titleSpan.textContent = this.text;
            }
            
            // Update closeable state
            let closeButton = this._tabHeader.querySelector('.tab-close-button');
            if (this.closeable && !closeButton) {
                closeButton = document.createElement('button');
                closeButton.className = 'tab-close-button';
                closeButton.innerHTML = ''; // Icon comes from CSS background image
                closeButton.setAttribute('aria-label', `Close ${this.name} tab`);
                closeButton.addEventListener(MouseEvent.CLICK, (e) => {
                    e.stopPropagation();
                    this._closeTab();
                });
                this._tabHeader.appendChild(closeButton);
            } else if (!this.closeable && closeButton) {
                closeButton.remove();
            }
        }
    }

    _updateActiveState() {
        const isActive = this.active;
        this._active = isActive;
        
        // Update visibility
        this.style.display = isActive ? 'block' : 'none';
        
        // Update header appearance
        if (this._tabHeader) {
            this._tabHeader.classList.toggle('active', isActive);
            this._tabHeader.setAttribute('tabindex', isActive ? '0' : '-1');
            this._tabHeader.setAttribute('aria-selected', isActive.toString());
        }
        
        // Dispatch tab change event
        if (isActive && this._tabPanel) {
            this._tabPanel.fireEvent(TabPanelEvent.TAB_CHANGE, { tab: this, name: this.name });
        }
    }

    _activateTab() {
        if (this._tabPanel) {
            this._tabPanel._setActiveTab(this);
        }
    }

    _closeTab() {
        const proceed = this.fireEvent(TabEvent.TAB_CLOSE, {
            tab: this,
            name: this.name
        }, { cancelable: true });

        if (proceed) {
            this.remove();
        }
    }

    _handleKeyDown(event) {
        if (!this._tabPanel) return;
        
        const tabs = this._tabPanel._getAllTabs();
        const currentIndex = tabs.indexOf(this);
        
        switch (event.key) {
            case 'ArrowLeft':
                event.preventDefault();
                if (currentIndex > 0) {
                    tabs[currentIndex - 1]._activateTab();
                    tabs[currentIndex - 1]._tabHeader.focus();
                }
                break;
            case 'ArrowRight':
                event.preventDefault();
                if (currentIndex < tabs.length - 1) {
                    tabs[currentIndex + 1]._activateTab();
                    tabs[currentIndex + 1]._tabHeader.focus();
                }
                break;
            case 'Home':
                event.preventDefault();
                if (tabs.length > 0) {
                    tabs[0]._activateTab();
                    tabs[0]._tabHeader.focus();
                }
                break;
            case 'End':
                event.preventDefault();
                if (tabs.length > 0) {
                    tabs[tabs.length - 1]._activateTab();
                    tabs[tabs.length - 1]._tabHeader.focus();
                }
                break;
            case 'Delete':
                if (this.closeable) {
                    event.preventDefault();
                    this._closeTab();
                }
                break;
        }
    }

    focus() {
        if (this._tabHeader) {
            this._tabHeader.focus();
        }
    }
}