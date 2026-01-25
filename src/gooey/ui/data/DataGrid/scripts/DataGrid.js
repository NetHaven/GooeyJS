import UIComponent from '../../../UIComponent.js';
import Template from '../../../../util/Template.js';
import DataGridEvent from '../../../../events/data/DataGridEvent.js';
import DataStoreEvent from '../../../../events/data/DataStoreEvent.js';
import MouseEvent from '../../../../events/MouseEvent.js';
import KeyboardEvent from '../../../../events/KeyboardEvent.js';
import Key from '../../../../io/Key.js';
import SelectionMode from './SelectionMode.js';
import SortDirection from './SortDirection.js';

/**
 * DataGrid - A full-featured data grid component
 *
 * Features:
 * - Virtual scrolling for efficient rendering of large datasets
 * - Multiple selection modes (none, single-row, multiple-row, cell)
 * - Column sorting (click headers to toggle)
 * - Column filtering (optional filter row)
 * - Column resizing (drag column borders)
 * - Inline cell editing (double-click or F2)
 *
 * Usage:
 * <gooeyui-datagrid selectionmode="multiple-row" showfilters="true">
 *     <gooeyui-datagridcolumn field="id" header="ID" width="60"></gooeyui-datagridcolumn>
 *     <gooeyui-datagridcolumn field="name" header="Name" width="150" filterable editable></gooeyui-datagridcolumn>
 * </gooeyui-datagrid>
 */
export default class DataGrid extends UIComponent {
    constructor() {
        super();

        Template.activate("ui-DataGrid", this.shadowRoot);

        // =========== DOM References ===========
        this._container = this.shadowRoot.querySelector('.datagrid-container');
        this._headerViewport = this.shadowRoot.querySelector('.datagrid-header-viewport');
        this._headerRow = this.shadowRoot.querySelector('.datagrid-header-row');
        this._filterViewport = this.shadowRoot.querySelector('.datagrid-filter-viewport');
        this._filterRow = this.shadowRoot.querySelector('.datagrid-filter-row');
        this._bodyViewport = this.shadowRoot.querySelector('.datagrid-body-viewport');
        this._bodySpacer = this.shadowRoot.querySelector('.datagrid-body-spacer');
        this._bodyRows = this.shadowRoot.querySelector('.datagrid-body-rows');

        // =========== Column Management ===========
        this._columns = [];
        this._columnWidths = new Map();

        // =========== Data Management ===========
        this._data = [];
        this._filteredData = [];
        this._sortedData = [];

        // =========== Selection State ===========
        this._selectedRows = new Set();
        this._selectedCell = null;
        this._lastSelectedRow = null;

        // =========== Sort State ===========
        this._sortColumn = null;
        this._sortDirection = SortDirection.NONE;

        // =========== Filter State ===========
        this._filters = new Map();

        // =========== Virtual Scrolling State ===========
        this._rowHeight = 30;
        this._bufferSize = 5;
        this._visibleStartIndex = 0;
        this._visibleEndIndex = 0;
        this._scrollTop = 0;

        // =========== Resize State ===========
        this._resizing = null;

        // =========== Edit State ===========
        this._editingCell = null;
        this._editField = null;

        // =========== Store Binding State ===========
        this._storeRef = null;
        this._boundStoreHandler = null;
        this._storeWaitObserver = null;

        // =========== Event Registration ===========
        this._registerEvents();

        // =========== Event Listeners ===========
        this._setupEventListeners();

        // =========== Initial Attribute Processing ===========
        this._initializeAttributes();
    }

    /**
     * Register valid events for the Observable system
     */
    _registerEvents() {
        // Selection events
        this.addValidEvent(DataGridEvent.SELECTION_CHANGED);
        this.addValidEvent(DataGridEvent.CELL_SELECTED);
        this.addValidEvent(DataGridEvent.ROW_ACTIVATED);

        // Sort/Filter events
        this.addValidEvent(DataGridEvent.SORT_CHANGED);
        this.addValidEvent(DataGridEvent.FILTER_CHANGED);

        // Editing events
        this.addValidEvent(DataGridEvent.CELL_EDIT_START);
        this.addValidEvent(DataGridEvent.CELL_EDIT_END);
        this.addValidEvent(DataGridEvent.CELL_EDIT_CANCEL);

        // Column events
        this.addValidEvent(DataGridEvent.COLUMN_RESIZE);
        this.addValidEvent(DataGridEvent.COLUMN_ADDED);
        this.addValidEvent(DataGridEvent.COLUMN_REMOVED);

        // Data events
        this.addValidEvent(DataGridEvent.DATA_CHANGED);

        // Store events
        this.addValidEvent(DataGridEvent.STORE_BOUND);
        this.addValidEvent(DataGridEvent.STORE_UNBOUND);

        // Mouse/Keyboard events
        this.addValidEvent(MouseEvent.CLICK);
        this.addValidEvent(MouseEvent.DOUBLE_CLICK);
        this.addValidEvent(KeyboardEvent.KEY_DOWN);
    }

    /**
     * Set up internal event listeners
     */
    _setupEventListeners() {
        // Scroll handling for virtual scrolling
        this._bodyViewport.addEventListener('scroll', this._onScroll.bind(this));

        // Keyboard navigation
        this.addEventListener(KeyboardEvent.KEY_DOWN, (eventName, e) => this._onKeyDown(e));

        // Make focusable for keyboard events
        this.setAttribute('tabindex', '0');

        // Resize handlers (bound methods for cleanup)
        this._onResizeMove = this._handleResizeMove.bind(this);
        this._onResizeEnd = this._handleResizeEnd.bind(this);

        // Synchronize header scroll with body scroll
        this._bodyViewport.addEventListener('scroll', () => {
            this._headerViewport.scrollLeft = this._bodyViewport.scrollLeft;
            this._filterViewport.scrollLeft = this._bodyViewport.scrollLeft;
        });
    }

    /**
     * Initialize attributes from markup
     */
    _initializeAttributes() {
        if (this.hasAttribute('rowheight')) {
            this._rowHeight = parseInt(this.getAttribute('rowheight'), 10) || 30;
        }

        // Hide filter row by default
        this._updateFilterVisibility();
    }

    // =========== Web Component Lifecycle ===========

    connectedCallback() {
        super.connectedCallback && super.connectedCallback();

        // Set ARIA grid role and attributes
        this.setAttribute('role', 'grid');
        this._headerRow.setAttribute('role', 'row');
        this._bodyViewport.setAttribute('role', 'rowgroup');

        // Collect DataGridColumn children
        this._collectColumns();

        // Set up slot change observer for dynamic column changes
        const slot = this.shadowRoot.querySelector('slot');
        if (slot) {
            slot.addEventListener('slotchange', () => {
                this._collectColumns();
                this._renderHeaders();
                this._renderFilterRow();
                this._renderVisibleRows();
            });
        }

        // Initial render
        this._renderHeaders();
        this._renderFilterRow();
        this._updateSpacerHeight();
        this._renderVisibleRows();

        // Update aria-rowcount
        this._updateAriaRowCount();

        // Bind to store if attribute is present
        if (this.hasAttribute('store')) {
            this._bindToStore(this.getAttribute('store'));
        }
    }

    disconnectedCallback() {
        // Clean up store binding
        this._unbindFromStore();
    }

    /**
     * Update aria-rowcount attribute based on current data
     */
    _updateAriaRowCount() {
        this.setAttribute('aria-rowcount', this._sortedData.length);
    }

    attributeChangedCallback(name, oldValue, newValue) {
        super.attributeChangedCallback?.(name, oldValue, newValue);
        switch (name) {
            case 'selectionmode':
                this._onSelectionModeChanged();
                break;
            case 'rowheight':
                this._rowHeight = parseInt(newValue, 10) || 30;
                this._updateSpacerHeight();
                this._renderVisibleRows();
                break;
            case 'showfilters':
                this._updateFilterVisibility();
                break;
            case 'disabled':
                this._updateDisabledState();
                break;
            case 'store':
                if (oldValue !== newValue) {
                    this._unbindFromStore();
                    if (newValue) {
                        this._bindToStore(newValue);
                    }
                }
                break;
        }
    }

    // =========== Column Management ===========

    /**
     * Collect DataGridColumn children from the slot
     */
    _collectColumns() {
        this._columns = Array.from(this.querySelectorAll('gooeyui-datagridcolumn'));
        this._columns.forEach(col => {
            col._dataGrid = this;
        });
    }

    /**
     * Get columns array
     */
    getColumns() {
        return [...this._columns];
    }

    /**
     * Get column by field name
     */
    getColumnByField(field) {
        return this._columns.find(col => col.field === field);
    }

    /**
     * Called when a child column's attribute changes
     */
    _onColumnAttributeChanged(column, name, oldValue, newValue) {
        if (name === 'width') {
            this._updateColumnWidth(this._columns.indexOf(column), parseInt(newValue, 10));
        } else if (name === 'header' || name === 'sortable') {
            this._renderHeaders();
        } else if (name === 'filterable') {
            this._renderFilterRow();
        }
    }

    /**
     * Internal method to remove a column
     */
    _removeColumn(column) {
        const index = this._columns.indexOf(column);
        if (index !== -1) {
            this._columns.splice(index, 1);
            this._renderHeaders();
            this._renderFilterRow();
            this._renderVisibleRows();

            this.fireEvent(DataGridEvent.COLUMN_REMOVED, {
                column: column,
                field: column.field,
                index: index
            });
        }
    }

    // =========== Data Management ===========

    /**
     * Set the grid data
     */
    setData(data) {
        this._data = Array.isArray(data) ? [...data] : [];
        this._applyFiltersAndSort();

        this.fireEvent(DataGridEvent.DATA_CHANGED, {
            data: this._data,
            count: this._data.length
        });
    }

    /**
     * Get the original data array
     */
    getData() {
        return [...this._data];
    }

    /**
     * Get the currently displayed (filtered/sorted) data
     */
    getDisplayData() {
        return [...this._sortedData];
    }

    /**
     * Refresh the grid display
     */
    refresh() {
        this._applyFiltersAndSort();
    }

    /**
     * Apply filters and sorting to data
     */
    _applyFiltersAndSort() {
        // Apply filters
        this._applyFilters();

        // Apply sort
        this._applySort();

        // Update display
        this._updateSpacerHeight();
        this._renderVisibleRows();

        // Clear selection if selected rows no longer exist
        this._validateSelection();

        // ARIA: Update row count and announce changes
        this._updateAriaRowCount();
        if (this._filters.size > 0) {
            UIComponent.announce(`${this._sortedData.length} rows displayed`);
        }
    }

    // =========== Filtering ===========

    /**
     * Apply filter to a column
     */
    filter(columnOrField, filterValue) {
        const column = typeof columnOrField === 'string'
            ? this.getColumnByField(columnOrField)
            : columnOrField;

        if (!column) return;

        const field = column.field;

        if (filterValue === null || filterValue === '' || filterValue === undefined) {
            this._filters.delete(field);
        } else {
            this._filters.set(field, filterValue);
        }

        // Update filter input if visible
        this._updateFilterInput(field, filterValue || '');

        this._applyFiltersAndSort();

        this.fireEvent(DataGridEvent.FILTER_CHANGED, {
            column: column,
            field: field,
            filterValue: filterValue,
            activeFilters: Object.fromEntries(this._filters),
            filteredCount: this._filteredData.length,
            totalCount: this._data.length
        });
    }

    /**
     * Clear filter on a specific column
     */
    clearFilter(columnOrField) {
        if (columnOrField) {
            const field = typeof columnOrField === 'string'
                ? columnOrField
                : columnOrField.field;
            this._filters.delete(field);
            this._updateFilterInput(field, '');
        }
        this._applyFiltersAndSort();
    }

    /**
     * Clear all filters
     */
    clearAllFilters() {
        this._filters.clear();
        // Clear all filter inputs
        this._filterRow.querySelectorAll('.datagrid-filter-input').forEach(input => {
            input.value = '';
        });
        this._applyFiltersAndSort();
    }

    /**
     * Get current filter state
     */
    getFilterState() {
        return new Map(this._filters);
    }

    /**
     * Apply filters to data
     */
    _applyFilters() {
        if (this._filters.size === 0) {
            this._filteredData = [...this._data];
            return;
        }

        this._filteredData = this._data.filter(row => {
            for (const [field, filterValue] of this._filters) {
                const cellValue = row[field];

                // String matching (case-insensitive contains)
                if (typeof filterValue === 'string') {
                    const cellStr = String(cellValue ?? '').toLowerCase();
                    if (!cellStr.includes(filterValue.toLowerCase())) {
                        return false;
                    }
                }
                // Function filter
                else if (typeof filterValue === 'function') {
                    if (!filterValue(cellValue, row)) {
                        return false;
                    }
                }
            }
            return true;
        });
    }

    /**
     * Update a filter input value
     */
    _updateFilterInput(field, value) {
        const input = this._filterRow.querySelector(`[data-field="${field}"]`);
        if (input) {
            input.value = value;
        }
    }

    /**
     * Update filter row visibility
     */
    _updateFilterVisibility() {
        const show = this.hasAttribute('showfilters') &&
            this.getAttribute('showfilters') !== 'false';
        this._filterViewport.style.display = show ? 'block' : 'none';
    }

    // =========== Sorting ===========

    /**
     * Sort by a column
     */
    sort(columnOrField, direction = null) {
        const column = typeof columnOrField === 'string'
            ? this.getColumnByField(columnOrField)
            : columnOrField;

        if (!column || !column.sortable) return;

        // Determine direction
        if (this._sortColumn === column) {
            if (direction === null) {
                // Toggle: asc -> desc -> none -> asc
                if (this._sortDirection === SortDirection.ASCENDING) {
                    direction = SortDirection.DESCENDING;
                } else if (this._sortDirection === SortDirection.DESCENDING) {
                    direction = SortDirection.NONE;
                } else {
                    direction = SortDirection.ASCENDING;
                }
            }
        } else {
            direction = direction || SortDirection.ASCENDING;
        }

        const previousSort = {
            column: this._sortColumn,
            direction: this._sortDirection
        };

        this._sortColumn = direction === SortDirection.NONE ? null : column;
        this._sortDirection = direction;

        this._applySort();
        this._updateSortIndicators();
        this._renderVisibleRows();

        this.fireEvent(DataGridEvent.SORT_CHANGED, {
            column: column,
            field: column.field,
            direction: direction,
            previousSort: previousSort
        });
    }

    /**
     * Clear sorting
     */
    clearSort() {
        this._sortColumn = null;
        this._sortDirection = SortDirection.NONE;
        this._applySort();
        this._updateSortIndicators();
        this._renderVisibleRows();
    }

    /**
     * Get current sort state
     */
    getSortState() {
        return {
            column: this._sortColumn?.field || null,
            direction: this._sortDirection
        };
    }

    /**
     * Apply sort to filtered data
     */
    _applySort() {
        this._sortedData = [...this._filteredData];

        if (!this._sortColumn || this._sortDirection === SortDirection.NONE) {
            return;
        }

        const field = this._sortColumn.field;
        const multiplier = this._sortDirection === SortDirection.ASCENDING ? 1 : -1;

        this._sortedData.sort((a, b) => {
            const aVal = a[field];
            const bVal = b[field];

            if (aVal === bVal) return 0;
            if (aVal === null || aVal === undefined) return 1;
            if (bVal === null || bVal === undefined) return -1;

            if (typeof aVal === 'number' && typeof bVal === 'number') {
                return (aVal - bVal) * multiplier;
            }

            return String(aVal).localeCompare(String(bVal)) * multiplier;
        });
    }

    /**
     * Update sort indicator display in headers
     */
    _updateSortIndicators() {
        this._headerRow.querySelectorAll('.datagrid-column-header').forEach((header, index) => {
            const indicator = header.querySelector('.sort-indicator');
            if (!indicator) return;

            const column = this._columns[index];
            if (column === this._sortColumn) {
                header.classList.add('sorted');
                indicator.className = 'sort-indicator ' +
                    (this._sortDirection === SortDirection.ASCENDING ? 'asc' : 'desc');
                // ARIA: Update sort direction
                header.setAttribute('aria-sort',
                    this._sortDirection === SortDirection.ASCENDING ? 'ascending' : 'descending'
                );
            } else {
                header.classList.remove('sorted');
                indicator.className = 'sort-indicator';
                // ARIA: Reset to none for non-sorted columns
                if (column.sortable) {
                    header.setAttribute('aria-sort', 'none');
                }
            }
        });
    }

    // =========== Selection ===========

    /**
     * Get selection mode
     */
    get selectionMode() {
        return this.getAttribute('selectionmode') || SelectionMode.SINGLE_ROW;
    }

    /**
     * Set selection mode
     */
    set selectionMode(value) {
        this.setAttribute('selectionmode', value);
    }

    /**
     * Handle selection mode change
     */
    _onSelectionModeChanged() {
        this.clearSelection();
    }

    /**
     * Get selected row data
     */
    getSelectedRows() {
        return Array.from(this._selectedRows).map(index => this._sortedData[index]);
    }

    /**
     * Get selected row indices
     */
    getSelectedIndices() {
        return Array.from(this._selectedRows);
    }

    /**
     * Set selection by indices
     */
    setSelection(indices) {
        this._selectedRows.clear();
        indices.forEach(index => {
            if (index >= 0 && index < this._sortedData.length) {
                this._selectedRows.add(index);
            }
        });
        this._updateRowSelectionStyles();

        this.fireEvent(DataGridEvent.SELECTION_CHANGED, {
            selectedRows: this.getSelectedRows(),
            selectedIndices: this.getSelectedIndices(),
            selectionMode: this.selectionMode
        });
    }

    /**
     * Clear all selection
     */
    clearSelection() {
        this._selectedRows.clear();
        this._selectedCell = null;
        this._lastSelectedRow = null;
        this._updateRowSelectionStyles();
    }

    /**
     * Select a specific row
     */
    selectRow(index) {
        if (this.selectionMode === SelectionMode.NONE) return;

        this._selectedRows.clear();
        this._selectedRows.add(index);
        this._lastSelectedRow = index;
        this._updateRowSelectionStyles();

        this.fireEvent(DataGridEvent.SELECTION_CHANGED, {
            selectedRows: this.getSelectedRows(),
            selectedIndices: this.getSelectedIndices(),
            selectionMode: this.selectionMode
        });
    }

    /**
     * Select all rows (multiple mode only)
     */
    selectAll() {
        if (this.selectionMode !== SelectionMode.MULTIPLE_ROW) return;

        this._selectedRows.clear();
        for (let i = 0; i < this._sortedData.length; i++) {
            this._selectedRows.add(i);
        }
        this._updateRowSelectionStyles();

        this.fireEvent(DataGridEvent.SELECTION_CHANGED, {
            selectedRows: this.getSelectedRows(),
            selectedIndices: this.getSelectedIndices(),
            selectionMode: this.selectionMode
        });
    }

    /**
     * Handle row click for selection
     */
    _onRowClick(rowIndex, event) {
        if (this.selectionMode === SelectionMode.NONE) return;

        const previousSelection = new Set(this._selectedRows);

        if (this.selectionMode === SelectionMode.SINGLE_ROW) {
            this._selectedRows.clear();
            this._selectedRows.add(rowIndex);
        } else if (this.selectionMode === SelectionMode.MULTIPLE_ROW) {
            if (event.ctrlKey || event.metaKey) {
                // Toggle selection
                if (this._selectedRows.has(rowIndex)) {
                    this._selectedRows.delete(rowIndex);
                } else {
                    this._selectedRows.add(rowIndex);
                }
            } else if (event.shiftKey && this._lastSelectedRow !== null) {
                // Range selection
                const start = Math.min(this._lastSelectedRow, rowIndex);
                const end = Math.max(this._lastSelectedRow, rowIndex);
                for (let i = start; i <= end; i++) {
                    this._selectedRows.add(i);
                }
            } else {
                // Single click - replace selection
                this._selectedRows.clear();
                this._selectedRows.add(rowIndex);
            }
        } else if (this.selectionMode === SelectionMode.CELL) {
            // Cell selection is handled by _onCellClick
            return;
        }

        this._lastSelectedRow = rowIndex;
        this._updateRowSelectionStyles();

        this.fireEvent(DataGridEvent.SELECTION_CHANGED, {
            selectedRows: this.getSelectedRows(),
            selectedIndices: this.getSelectedIndices(),
            selectionMode: this.selectionMode,
            previousSelection: Array.from(previousSelection)
        });
    }

    /**
     * Handle cell click for cell selection mode
     */
    _onCellClick(rowIndex, columnIndex, event) {
        if (this.selectionMode !== SelectionMode.CELL) {
            this._onRowClick(rowIndex, event);
            return;
        }

        const previousCell = this._selectedCell;
        this._selectedCell = { row: rowIndex, column: columnIndex };

        this._updateCellSelectionStyles(previousCell);

        this.fireEvent(DataGridEvent.CELL_SELECTED, {
            row: rowIndex,
            column: columnIndex,
            data: this._sortedData[rowIndex],
            field: this._columns[columnIndex].field
        });
    }

    /**
     * Update row selection visual styles
     */
    _updateRowSelectionStyles() {
        this._bodyRows.querySelectorAll('.datagrid-row').forEach(row => {
            const index = parseInt(row.dataset.rowIndex, 10);
            if (this._selectedRows.has(index)) {
                row.classList.add('selected');
                // ARIA: Mark row as selected
                row.setAttribute('aria-selected', 'true');
            } else {
                row.classList.remove('selected');
                // ARIA: Mark row as not selected
                row.setAttribute('aria-selected', 'false');
            }
        });
    }

    /**
     * Update cell selection visual styles
     */
    _updateCellSelectionStyles(previousCell) {
        // Remove previous selection
        if (previousCell) {
            const prevRow = this._bodyRows.querySelector(`[data-row-index="${previousCell.row}"]`);
            if (prevRow) {
                const prevCell = prevRow.children[previousCell.column];
                if (prevCell) prevCell.classList.remove('selected');
            }
        }

        // Add new selection
        if (this._selectedCell) {
            const row = this._bodyRows.querySelector(`[data-row-index="${this._selectedCell.row}"]`);
            if (row) {
                const cell = row.children[this._selectedCell.column];
                if (cell) cell.classList.add('selected');
            }
        }
    }

    /**
     * Validate selection after data changes
     */
    _validateSelection() {
        const maxIndex = this._sortedData.length - 1;
        const invalidIndices = [];

        this._selectedRows.forEach(index => {
            if (index > maxIndex) {
                invalidIndices.push(index);
            }
        });

        invalidIndices.forEach(index => this._selectedRows.delete(index));

        if (this._selectedCell && this._selectedCell.row > maxIndex) {
            this._selectedCell = null;
        }
    }

    // =========== Virtual Scrolling ===========

    /**
     * Handle scroll event for virtual scrolling
     */
    _onScroll() {
        const scrollTop = this._bodyViewport.scrollTop;
        this._scrollTop = scrollTop;

        const viewportHeight = this._bodyViewport.clientHeight;
        const startIndex = Math.floor(scrollTop / this._rowHeight);
        const visibleCount = Math.ceil(viewportHeight / this._rowHeight);

        // Add buffer
        const bufferedStart = Math.max(0, startIndex - this._bufferSize);
        const bufferedEnd = Math.min(
            this._sortedData.length,
            startIndex + visibleCount + this._bufferSize
        );

        // Only re-render if range changed
        if (bufferedStart !== this._visibleStartIndex || bufferedEnd !== this._visibleEndIndex) {
            this._visibleStartIndex = bufferedStart;
            this._visibleEndIndex = bufferedEnd;
            this._renderVisibleRows();
        }
    }

    /**
     * Update spacer height for correct scroll size
     */
    _updateSpacerHeight() {
        const totalHeight = this._sortedData.length * this._rowHeight;
        this._bodySpacer.style.height = `${totalHeight}px`;
    }

    /**
     * Scroll to a specific row
     */
    scrollToRow(index) {
        if (index < 0 || index >= this._sortedData.length) return;

        const targetTop = index * this._rowHeight;
        this._bodyViewport.scrollTop = targetTop;
    }

    /**
     * Scroll to top
     */
    scrollToTop() {
        this._bodyViewport.scrollTop = 0;
    }

    /**
     * Scroll to bottom
     */
    scrollToBottom() {
        this._bodyViewport.scrollTop = this._bodySpacer.clientHeight;
    }

    // =========== Rendering ===========

    /**
     * Render column headers
     */
    _renderHeaders() {
        this._headerRow.innerHTML = '';

        this._columns.forEach((column, index) => {
            if (!column.visible) return;

            const header = document.createElement('div');
            header.className = 'datagrid-column-header';
            header.style.width = `${column.width}px`;
            header.style.minWidth = `${column.minWidth}px`;
            header.dataset.columnIndex = index;

            // ARIA: columnheader role and column index
            header.setAttribute('role', 'columnheader');
            header.setAttribute('aria-colindex', index + 1);

            // Title
            const titleSpan = document.createElement('span');
            titleSpan.className = 'column-title';
            titleSpan.textContent = column.header;
            header.appendChild(titleSpan);

            // Sort indicator
            if (column.sortable) {
                const sortIndicator = document.createElement('span');
                sortIndicator.className = 'sort-indicator';
                header.appendChild(sortIndicator);

                // ARIA: sortable columns start with aria-sort="none"
                header.setAttribute('aria-sort', 'none');

                // Click to sort
                header.addEventListener('click', (e) => {
                    if (!e.target.classList.contains('column-resize-handle')) {
                        this.sort(column);
                    }
                });
                header.style.cursor = 'pointer';
            }

            // Resize handle
            if (column.resizable) {
                const resizeHandle = document.createElement('div');
                resizeHandle.className = 'column-resize-handle';
                resizeHandle.addEventListener('mousedown', (e) => {
                    this._onResizeStart(e, column, index);
                });
                header.appendChild(resizeHandle);
            }

            this._headerRow.appendChild(header);
        });

        this._updateSortIndicators();
    }

    /**
     * Render filter row
     */
    _renderFilterRow() {
        this._filterRow.innerHTML = '';

        this._columns.forEach((column, index) => {
            if (!column.visible) return;

            const filterCell = document.createElement('div');
            filterCell.className = 'datagrid-filter-cell';
            filterCell.style.width = `${column.width}px`;
            filterCell.style.minWidth = `${column.minWidth}px`;

            if (column.filterable) {
                const input = document.createElement('input');
                input.type = 'text';
                input.className = 'datagrid-filter-input';
                input.placeholder = `Filter ${column.header}...`;
                input.dataset.field = column.field;

                // Restore existing filter value
                if (this._filters.has(column.field)) {
                    input.value = this._filters.get(column.field);
                }

                input.addEventListener('input', (e) => {
                    this.filter(column, e.target.value);
                });

                filterCell.appendChild(input);
            }

            this._filterRow.appendChild(filterCell);
        });
    }

    /**
     * Render visible rows (virtual scrolling)
     */
    _renderVisibleRows() {
        this._bodyRows.innerHTML = '';

        if (this._sortedData.length === 0 || this._columns.length === 0) {
            return;
        }

        const fragment = document.createDocumentFragment();

        for (let i = this._visibleStartIndex; i < this._visibleEndIndex; i++) {
            const rowData = this._sortedData[i];
            if (!rowData) continue;

            const row = this._createRowElement(i, rowData);
            fragment.appendChild(row);
        }

        this._bodyRows.appendChild(fragment);

        // Apply selection styles
        this._updateRowSelectionStyles();
        if (this._selectedCell) {
            this._updateCellSelectionStyles(null);
        }
    }

    /**
     * Create a row element
     */
    _createRowElement(rowIndex, rowData) {
        const row = document.createElement('div');
        row.className = 'datagrid-row';
        row.dataset.rowIndex = rowIndex;
        row.style.transform = `translateY(${rowIndex * this._rowHeight}px)`;
        row.style.height = `${this._rowHeight}px`;

        // ARIA: row role and row index (1-based)
        row.setAttribute('role', 'row');
        row.setAttribute('aria-rowindex', rowIndex + 1);

        // Click handling
        row.addEventListener('click', (e) => {
            this._onRowClick(rowIndex, e);
        });

        // Double-click for row activation
        row.addEventListener('dblclick', (e) => {
            if (this.selectionMode !== SelectionMode.CELL) {
                this.fireEvent(DataGridEvent.ROW_ACTIVATED, {
                    row: rowIndex,
                    data: rowData
                });
            }
        });

        // Create cells
        this._columns.forEach((column, colIndex) => {
            if (!column.visible) return;

            const cell = document.createElement('div');
            cell.className = 'datagrid-cell';
            cell.style.width = `${column.width}px`;
            cell.style.minWidth = `${column.minWidth}px`;
            cell.dataset.columnIndex = colIndex;

            // ARIA: gridcell role and column index (1-based)
            cell.setAttribute('role', 'gridcell');
            cell.setAttribute('aria-colindex', colIndex + 1);

            // Cell content
            const value = rowData[column.field];
            cell.textContent = value ?? '';
            cell.title = value ?? '';

            // Cell click for cell selection
            cell.addEventListener('click', (e) => {
                e.stopPropagation();
                this._onCellClick(rowIndex, colIndex, e);
            });

            // Double-click for editing
            if (column.editable || this.hasAttribute('editable')) {
                cell.addEventListener('dblclick', (e) => {
                    e.stopPropagation();
                    this._startEditing(rowIndex, colIndex);
                });
            }

            row.appendChild(cell);
        });

        return row;
    }

    // =========== Column Resizing ===========

    /**
     * Start column resize
     */
    _onResizeStart(event, column, columnIndex) {
        event.preventDefault();
        event.stopPropagation();

        this._resizing = {
            column: column,
            columnIndex: columnIndex,
            startX: event.clientX,
            startWidth: column.width
        };

        document.addEventListener('mousemove', this._onResizeMove);
        document.addEventListener('mouseup', this._onResizeEnd);

        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    }

    /**
     * Handle column resize move
     */
    _handleResizeMove(event) {
        if (!this._resizing) return;

        const deltaX = event.clientX - this._resizing.startX;
        const newWidth = Math.max(
            this._resizing.column.minWidth || 50,
            this._resizing.startWidth + deltaX
        );

        this._updateColumnWidth(this._resizing.columnIndex, newWidth);
    }

    /**
     * Handle column resize end
     */
    _handleResizeEnd() {
        if (!this._resizing) return;

        const column = this._resizing.column;
        const newWidth = column.width;

        document.removeEventListener('mousemove', this._onResizeMove);
        document.removeEventListener('mouseup', this._onResizeEnd);

        document.body.style.cursor = '';
        document.body.style.userSelect = '';

        this.fireEvent(DataGridEvent.COLUMN_RESIZE, {
            column: column,
            field: column.field,
            width: newWidth,
            columnIndex: this._resizing.columnIndex
        });

        this._resizing = null;
    }

    /**
     * Update column width
     */
    _updateColumnWidth(columnIndex, newWidth) {
        const column = this._columns[columnIndex];
        if (!column) return;

        column.width = newWidth;

        // Update header
        const headerCell = this._headerRow.children[columnIndex];
        if (headerCell) {
            headerCell.style.width = `${newWidth}px`;
        }

        // Update filter cell
        const filterCell = this._filterRow.children[columnIndex];
        if (filterCell) {
            filterCell.style.width = `${newWidth}px`;
        }

        // Update all visible row cells
        this._bodyRows.querySelectorAll('.datagrid-row').forEach(row => {
            const cell = row.children[columnIndex];
            if (cell) {
                cell.style.width = `${newWidth}px`;
            }
        });
    }

    // =========== Cell Editing ===========

    /**
     * Start editing a cell
     */
    startEditing(rowIndex, columnIndex) {
        this._startEditing(rowIndex, columnIndex);
    }

    /**
     * Internal start editing
     */
    _startEditing(rowIndex, columnIndex) {
        const column = this._columns[columnIndex];
        if (!column) return;

        // Check if editable
        if (!column.editable && !this.hasAttribute('editable')) return;

        // Cancel any existing edit
        if (this._editingCell) {
            this.cancelEdit();
        }

        const rowData = this._sortedData[rowIndex];
        if (!rowData) return;

        this._editingCell = { row: rowIndex, column: columnIndex };

        const row = this._bodyRows.querySelector(`[data-row-index="${rowIndex}"]`);
        if (!row) return;

        const cell = row.children[columnIndex];
        if (!cell) return;

        const originalValue = rowData[column.field];

        // Create edit input
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'datagrid-cell-editor';
        input.value = originalValue ?? '';

        // Store original content
        cell.dataset.originalContent = cell.textContent;
        cell.textContent = '';
        cell.classList.add('editing');
        cell.appendChild(input);

        this._editField = input;

        // Focus and select
        input.focus();
        input.select();

        // Handle keyboard
        input.addEventListener('keydown', (e) => {
            if (e.key === Key.ENTER) {
                e.preventDefault();
                this.commitEdit();
            } else if (e.key === Key.ESCAPE) {
                e.preventDefault();
                this.cancelEdit();
            } else if (e.key === Key.TAB) {
                e.preventDefault();
                this.commitEdit();
                // Move to next cell
                const nextCol = e.shiftKey ? columnIndex - 1 : columnIndex + 1;
                if (nextCol >= 0 && nextCol < this._columns.length) {
                    this._startEditing(rowIndex, nextCol);
                }
            }
        });

        // Handle blur
        input.addEventListener('blur', () => {
            // Small delay to allow click events to process first
            setTimeout(() => {
                if (this._editingCell) {
                    this.commitEdit();
                }
            }, 100);
        });

        this.fireEvent(DataGridEvent.CELL_EDIT_START, {
            row: rowIndex,
            column: columnIndex,
            field: column.field,
            value: originalValue
        });
    }

    /**
     * Commit current edit
     */
    commitEdit() {
        if (!this._editingCell || !this._editField) return;

        const { row: rowIndex, column: columnIndex } = this._editingCell;
        const column = this._columns[columnIndex];
        const rowData = this._sortedData[rowIndex];

        const oldValue = rowData[column.field];
        const newValue = this._editField.value;

        // Update data
        rowData[column.field] = newValue;

        // Also update original data if possible
        const originalIndex = this._data.indexOf(rowData);
        if (originalIndex !== -1) {
            this._data[originalIndex][column.field] = newValue;
        }

        // Clean up edit UI
        this._cleanupEdit();

        // Re-render the cell
        const row = this._bodyRows.querySelector(`[data-row-index="${rowIndex}"]`);
        if (row) {
            const cell = row.children[columnIndex];
            if (cell) {
                cell.textContent = newValue ?? '';
                cell.title = newValue ?? '';
            }
        }

        this.fireEvent(DataGridEvent.CELL_EDIT_END, {
            row: rowIndex,
            column: columnIndex,
            field: column.field,
            oldValue: oldValue,
            newValue: newValue,
            data: rowData
        });
    }

    /**
     * Cancel current edit
     */
    cancelEdit() {
        if (!this._editingCell) return;

        const { row: rowIndex, column: columnIndex } = this._editingCell;
        const column = this._columns[columnIndex];

        // Clean up edit UI and restore original content
        const row = this._bodyRows.querySelector(`[data-row-index="${rowIndex}"]`);
        if (row) {
            const cell = row.children[columnIndex];
            if (cell && cell.dataset.originalContent !== undefined) {
                cell.textContent = cell.dataset.originalContent;
                delete cell.dataset.originalContent;
            }
        }

        this._cleanupEdit();

        this.fireEvent(DataGridEvent.CELL_EDIT_CANCEL, {
            row: rowIndex,
            column: columnIndex,
            field: column.field
        });
    }

    /**
     * Clean up edit state
     */
    _cleanupEdit() {
        if (this._editingCell) {
            const row = this._bodyRows.querySelector(`[data-row-index="${this._editingCell.row}"]`);
            if (row) {
                const cell = row.children[this._editingCell.column];
                if (cell) {
                    cell.classList.remove('editing');
                    const input = cell.querySelector('.datagrid-cell-editor');
                    if (input) {
                        input.remove();
                    }
                }
            }
        }

        this._editingCell = null;
        this._editField = null;
    }

    // =========== Keyboard Navigation ===========

    /**
     * Handle keyboard events
     */
    _onKeyDown(event) {
        // If editing, let the edit field handle keyboard
        if (this._editingCell) return;

        const mode = this.selectionMode;
        if (mode === SelectionMode.NONE) return;

        switch (event.key) {
            case Key.ARROW_UP:
                event.preventDefault();
                this._moveSelection(-1);
                break;
            case Key.ARROW_DOWN:
                event.preventDefault();
                this._moveSelection(1);
                break;
            case Key.HOME:
                event.preventDefault();
                this._selectFirst();
                break;
            case Key.END:
                event.preventDefault();
                this._selectLast();
                break;
            case Key.PAGE_UP:
                event.preventDefault();
                this._moveSelection(-this._getVisibleRowCount());
                break;
            case Key.PAGE_DOWN:
                event.preventDefault();
                this._moveSelection(this._getVisibleRowCount());
                break;
            case Key.ENTER:
                event.preventDefault();
                this._activateCurrentSelection();
                break;
            case Key.F2:
                event.preventDefault();
                this._editCurrentSelection();
                break;
            case 'a':
            case 'A':
                if (event.ctrlKey || event.metaKey) {
                    event.preventDefault();
                    this.selectAll();
                }
                break;
        }
    }

    /**
     * Move selection by delta rows
     */
    _moveSelection(delta) {
        if (this._sortedData.length === 0) return;

        let currentIndex = this._lastSelectedRow ?? -1;
        let newIndex = currentIndex + delta;

        newIndex = Math.max(0, Math.min(newIndex, this._sortedData.length - 1));

        this.selectRow(newIndex);
        this.scrollToRow(newIndex);
    }

    /**
     * Select first row
     */
    _selectFirst() {
        if (this._sortedData.length === 0) return;
        this.selectRow(0);
        this.scrollToTop();
    }

    /**
     * Select last row
     */
    _selectLast() {
        if (this._sortedData.length === 0) return;
        this.selectRow(this._sortedData.length - 1);
        this.scrollToBottom();
    }

    /**
     * Get number of visible rows
     */
    _getVisibleRowCount() {
        return Math.floor(this._bodyViewport.clientHeight / this._rowHeight);
    }

    /**
     * Activate current selection (fire row activated event)
     */
    _activateCurrentSelection() {
        if (this._selectedRows.size === 0) return;

        const firstIndex = Array.from(this._selectedRows)[0];
        const rowData = this._sortedData[firstIndex];

        this.fireEvent(DataGridEvent.ROW_ACTIVATED, {
            row: firstIndex,
            data: rowData
        });
    }

    /**
     * Start editing current selection
     */
    _editCurrentSelection() {
        if (this.selectionMode === SelectionMode.CELL && this._selectedCell) {
            this._startEditing(this._selectedCell.row, this._selectedCell.column);
        } else if (this._selectedRows.size > 0) {
            const firstIndex = Array.from(this._selectedRows)[0];
            // Find first editable column
            const editableColIndex = this._columns.findIndex(col =>
                col.editable || this.hasAttribute('editable')
            );
            if (editableColIndex !== -1) {
                this._startEditing(firstIndex, editableColIndex);
            }
        }
    }

    /**
     * Update disabled state
     */
    _updateDisabledState() {
        if (this.disabled) {
            this._container.classList.add('disabled');
        } else {
            this._container.classList.remove('disabled');
        }
    }

    // =========== Store Binding ===========

    /**
     * Get the store attribute value
     * @returns {string|null} - The store id
     */
    get store() {
        return this.getAttribute('store');
    }

    /**
     * Set the store attribute value
     * @param {string|null} value - The store id
     */
    set store(value) {
        if (value) {
            this.setAttribute('store', value);
        } else {
            this.removeAttribute('store');
        }
    }

    /**
     * Get the currently bound DataStore element
     * @returns {HTMLElement|null} - The bound store element
     */
    getStoreElement() {
        return this._storeRef;
    }

    /**
     * Bind to a store by its id
     * @param {string} storeId - The id of the store element
     */
    _bindToStore(storeId) {
        if (!storeId) return;

        // Try to find the store immediately
        const store = document.getElementById(storeId);

        if (store && store.tagName.toLowerCase() === 'gooeydata-store') {
            this._connectToStore(store);
        } else {
            // Store not found yet - wait for it
            this._waitForStore(storeId);
        }
    }

    /**
     * Wait for a store element to appear in the DOM
     * @param {string} storeId - The id of the store to wait for
     */
    _waitForStore(storeId) {
        const TIMEOUT_MS = 10000; // 10 second timeout
        const startTime = Date.now();

        // Clean up any existing wait observer
        if (this._storeWaitObserver) {
            this._storeWaitObserver.disconnect();
            this._storeWaitObserver = null;
        }

        this._storeWaitObserver = new MutationObserver((mutations, observer) => {
            // Check if timeout exceeded
            if (Date.now() - startTime > TIMEOUT_MS) {
                console.warn(`DataGrid: Timeout waiting for store '${storeId}'`);
                observer.disconnect();
                this._storeWaitObserver = null;
                return;
            }

            // Try to find the store
            const store = document.getElementById(storeId);
            if (store && store.tagName.toLowerCase() === 'gooeydata-store') {
                observer.disconnect();
                this._storeWaitObserver = null;
                this._connectToStore(store);
            }
        });

        // Observe document for changes
        this._storeWaitObserver.observe(document.body, {
            childList: true,
            subtree: true
        });

        // Also set a timeout to clean up if store never appears
        setTimeout(() => {
            if (this._storeWaitObserver) {
                console.warn(`DataGrid: Timeout waiting for store '${storeId}'`);
                this._storeWaitObserver.disconnect();
                this._storeWaitObserver = null;
            }
        }, TIMEOUT_MS);
    }

    /**
     * Connect to a store element
     * @param {HTMLElement} store - The store element
     */
    _connectToStore(store) {
        this._storeRef = store;

        // Create bound handler
        this._boundStoreHandler = (eventName, data) => {
            this._onStoreDataChanged(eventName, data);
        };

        // Register as consumer
        if (typeof store.registerConsumer === 'function') {
            store.registerConsumer(this);
        }

        // Add listener for data changes
        store.addEventListener(DataStoreEvent.DATA_CHANGED, this._boundStoreHandler);
        store.addEventListener(DataStoreEvent.RESET, this._boundStoreHandler);

        // Load initial data from store
        if (typeof store.getData === 'function') {
            this.setData(store.getData());
        }

        // Fire store bound event
        this.fireEvent(DataGridEvent.STORE_BOUND, {
            store: store,
            storeId: store.id
        });
    }

    /**
     * Unbind from the current store
     */
    _unbindFromStore() {
        // Clean up wait observer
        if (this._storeWaitObserver) {
            this._storeWaitObserver.disconnect();
            this._storeWaitObserver = null;
        }

        if (!this._storeRef) return;

        const store = this._storeRef;

        // Remove listeners
        if (this._boundStoreHandler) {
            store.removeEventListener(DataStoreEvent.DATA_CHANGED, this._boundStoreHandler);
            store.removeEventListener(DataStoreEvent.RESET, this._boundStoreHandler);
            this._boundStoreHandler = null;
        }

        // Unregister as consumer
        if (typeof store.unregisterConsumer === 'function') {
            store.unregisterConsumer(this);
        }

        const storeId = store.id;
        this._storeRef = null;

        // Fire store unbound event
        this.fireEvent(DataGridEvent.STORE_UNBOUND, {
            storeId: storeId
        });
    }

    /**
     * Handle store data changes
     * @param {string} eventName - The event name
     * @param {Object} data - The event data
     */
    _onStoreDataChanged(eventName, data) {
        if (eventName === DataStoreEvent.RESET) {
            this.setData([]);
        } else if (data && data.data) {
            this.setData(data.data);
        }
    }
}
