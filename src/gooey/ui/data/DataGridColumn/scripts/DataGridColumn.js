import UIComponent from '../../../UIComponent.js';
import DataGridColumnEvent from '../../../../events/data/DataGridColumnEvent.js';

/**
 * DataGridColumn - Column definition component for DataGrid
 *
 * This component defines a column's properties and behavior within a DataGrid.
 * It does not render visible content itself, but provides configuration
 * that the parent DataGrid uses to render column headers and cells.
 */
export default class DataGridColumn extends UIComponent {
    constructor() {
        super();

        // Reference to parent DataGrid (set when added to grid)
        this._dataGrid = null;

        // Add valid events
        this.addValidEvent(DataGridColumnEvent.HEADER_CLICK);
        this.addValidEvent(DataGridColumnEvent.RESIZE_START);
        this.addValidEvent(DataGridColumnEvent.RESIZE_END);

        // Initialize attributes from markup
        this._initializeAttributes();
    }

    /**
     * Initialize attributes from markup
     */
    _initializeAttributes() {
        // Width defaults
        if (!this.hasAttribute('width')) {
            this.setAttribute('width', '100');
        }
        if (!this.hasAttribute('minwidth')) {
            this.setAttribute('minwidth', '50');
        }
    }

    connectedCallback() {
        super.connectedCallback && super.connectedCallback();

        // Find parent DataGrid and register this column
        const parent = this.parentElement;
        if (parent && parent.tagName.toLowerCase() === 'gooeyui-datagrid') {
            this._dataGrid = parent;
            // Notify parent of new column (parent will handle in its own connectedCallback)
        }
    }

    disconnectedCallback() {
        // Notify parent DataGrid that this column was removed
        if (this._dataGrid && this._dataGrid._removeColumn) {
            this._dataGrid._removeColumn(this);
        }
        this._dataGrid = null;
    }

    attributeChangedCallback(name, oldValue, newValue) {
        // Notify parent DataGrid of attribute changes
        if (this._dataGrid && this._dataGrid._onColumnAttributeChanged) {
            this._dataGrid._onColumnAttributeChanged(this, name, oldValue, newValue);
        }
    }

    // =========== Property Getters/Setters ===========

    /**
     * The data field name this column displays
     */
    get field() {
        return this.getAttribute('field') || '';
    }

    set field(value) {
        this.setAttribute('field', value);
    }

    /**
     * The column header text
     */
    get header() {
        return this.getAttribute('header') || this.field;
    }

    set header(value) {
        this.setAttribute('header', value);
    }

    /**
     * Column width in pixels
     */
    get width() {
        return parseInt(this.getAttribute('width'), 10) || 100;
    }

    set width(value) {
        this.setAttribute('width', String(value));
    }

    /**
     * Minimum column width in pixels
     */
    get minWidth() {
        return parseInt(this.getAttribute('minwidth'), 10) || 50;
    }

    set minWidth(value) {
        this.setAttribute('minwidth', String(value));
    }

    /**
     * Whether this column is sortable
     */
    get sortable() {
        const value = this.getAttribute('sortable');
        // Default to true unless explicitly set to false
        return value !== 'false';
    }

    set sortable(value) {
        this.setAttribute('sortable', value ? 'true' : 'false');
    }

    /**
     * Whether this column shows a filter input
     */
    get filterable() {
        return this.hasAttribute('filterable') && this.getAttribute('filterable') !== 'false';
    }

    set filterable(value) {
        if (value) {
            this.setAttribute('filterable', 'true');
        } else {
            this.removeAttribute('filterable');
        }
    }

    /**
     * Whether cells in this column are editable
     */
    get editable() {
        return this.hasAttribute('editable') && this.getAttribute('editable') !== 'false';
    }

    set editable(value) {
        if (value) {
            this.setAttribute('editable', 'true');
        } else {
            this.removeAttribute('editable');
        }
    }

    /**
     * Whether this column can be resized
     */
    get resizable() {
        const value = this.getAttribute('resizable');
        // Default to true unless explicitly set to false
        return value !== 'false';
    }

    set resizable(value) {
        this.setAttribute('resizable', value ? 'true' : 'false');
    }

    /**
     * Reference to the parent DataGrid
     */
    get dataGrid() {
        return this._dataGrid;
    }
}
