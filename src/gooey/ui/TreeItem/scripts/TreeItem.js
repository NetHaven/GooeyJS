import UIComponent from '../../UIComponent.js';
import TreeItemEvent from '../../../events/TreeItemEvent.js';
import MouseEvent from '../../../events/MouseEvent.js';
import DragEvent from '../../../events/DragEvent.js';
import KeyboardEvent from '../../../events/KeyboardEvent.js';
import Key from '../../../io/Key.js';
import Template from '../../../util/Template.js';

export default class TreeItem extends UIComponent {
    constructor() {
        super();

        // Store any existing child gooeyui-treeitem elements before adding template
        const existingChildren = Array.from(this.querySelectorAll(':scope > gooeyui-treeitem'));

        Template.activate("ui-TreeItem", this.shadowRoot);

        this._expanded = false;
        this._hasChildren = false;

        this._contentElement = this.shadowRoot.querySelector('.ui-TreeItem-content');
        this._expanderElement = this.shadowRoot.querySelector('.ui-TreeItem-expander');
        this._iconElement = this.shadowRoot.querySelector('.ui-TreeItem-icon');
        this._textElement = this.shadowRoot.querySelector('.ui-TreeItem-text');
        this._childrenElement = this.shadowRoot.querySelector('.ui-TreeItem-children');

        // Validate that essential elements were found
        if (!this._contentElement || !this._childrenElement) {
            console.error('TREEITEM_INIT_FAILED', 'TreeItem initialization failed - missing essential DOM elements', {
                contentElement: !!this._contentElement,
                childrenElement: !!this._childrenElement,
                innerHTML: this.innerHTML
            });
        }

        // ARIA: Set treeitem role and make focusable
        this.setAttribute('role', 'treeitem');
        this._contentElement.setAttribute('tabindex', '0');

        // Move any existing child tree items to the proper container
        existingChildren.forEach(child => {
            this.addChild(child);
        });

        // Add valid events
        this.addValidEvent(TreeItemEvent.TREE_ITEM_EXPAND);
        this.addValidEvent(TreeItemEvent.TREE_ITEM_COLLAPSE);
        this.addValidEvent(TreeItemEvent.TREE_ITEM_EDIT);
        this.addValidEvent(MouseEvent.CLICK);
        this.addValidEvent(MouseEvent.DOUBLE_CLICK);
        this.addValidEvent(DragEvent.START);
        this.addValidEvent(DragEvent.END);
        this.addValidEvent(TreeItemEvent.TREE_ITEM_REORDER);

        this._setupEventListeners();
        this._updateAttributes();

        // Initialize drag state
        this._dragState = {
            isDragging: false,
            draggedOver: false,
            dropPosition: null // 'before', 'after', 'inside'
        };
    }

    connectedCallback() {
        // Handle any child tree items that were added after construction
        const orphanedChildren = Array.from(this.querySelectorAll(':scope > gooeyui-treeitem:not(.ui-TreeItem-children gooeyui-treeitem)'));
        orphanedChildren.forEach(child => {
            this.addChild(child);
        });

        // ARIA: Compute and set the tree level
        this._computeAriaLevel();
    }

    /**
     * Compute the aria-level based on nesting depth
     */
    _computeAriaLevel() {
        let level = 1;
        let parent = this.parentElement;
        while (parent) {
            if (parent.tagName === 'GOOEYUI-TREEITEM') {
                level++;
            }
            parent = parent.parentElement;
        }
        this.setAttribute('aria-level', level);
    }

    attributeChangedCallback(name) {
        if (name === 'text') {
            this._updateText();
        } else if (name === 'icon') {
            this._updateIcon();
        } else if (name === 'expanded') {
            this._updateExpanded();
        } else if (name === 'draggable') {
            this._updateDraggable();
        } else if (name === 'droptree') {
            // No immediate action needed - validation happens during drag operations
        } else if (name === 'editable') {
            // No immediate action needed - editable state is checked when edit() is called
        }
    }
    
    get text() {
        return this.getAttribute('text') || '';
    }
    
    set text(value) {
        this.setAttribute('text', value);
    }
    
    get icon() {
        return this.getAttribute('icon') || '';
    }
    
    set icon(value) {
        this.setAttribute('icon', value);
    }
    
    get expanded() {
        return this.hasAttribute('expanded');
    }
    
    set expanded(value) {
        if (value) {
            this.setAttribute('expanded', '');
        } else {
            this.removeAttribute('expanded');
        }
    }
    
    get draggable() {
        return this.hasAttribute('draggable');
    }
    
    set draggable(value) {
        if (value) {
            this.setAttribute('draggable', '');
        } else {
            this.removeAttribute('draggable');
        }
    }
    
    get dropTree() {
        return this.getAttribute('droptree');
    }
    
    set dropTree(value) {
        if (value) {
            this.setAttribute('droptree', value);
        } else {
            this.removeAttribute('droptree');
        }
    }
    
    get editable() {
        const value = this.getAttribute('editable');
        return value !== null && value !== 'false';
    }
    
    set editable(value) {
        if (value && value !== 'false') {
            this.setAttribute('editable', 'true');
        } else {
            this.removeAttribute('editable');
        }
    }
    
    get hasChildren() {
        return this._hasChildren;
    }
    
    addChild(treeItem) {
        if (!this._childrenElement) {
            console.error('TREEITEM_ADD_CHILD_FAILED', 'Cannot add child - _childrenElement not found');
            return;
        }
        this._childrenElement.appendChild(treeItem);
        this._hasChildren = true;
        this._updateExpanderVisibility();
    }
    
    removeChild(treeItem) {
        if (!this._childrenElement) {
            console.error('TREEITEM_REMOVE_CHILD_FAILED', 'Cannot remove child - _childrenElement not found');
            return;
        }
        this._childrenElement.removeChild(treeItem);
        this._hasChildren = this._childrenElement.children.length > 0;
        this._updateExpanderVisibility();
    }
    
    toggle() {
        this.expanded = !this.expanded;
    }
    
    edit() {
        // Check if editing is allowed
        if (!this.editable) {
            return;
        }
        
        // Check if already in edit mode
        if (this._isEditing) {
            return;
        }
        
        // Store the original text
        const originalText = this.text;
        
        // Create a text field
        const textField = document.createElement('input');
        textField.type = 'text';
        textField.value = originalText;
        textField.className = 'ui-TreeItem-editor';
        
        // Style the text field to match the tree item
        textField.style.border = '1px solid #ccc';
        textField.style.padding = '1px 4px';
        textField.style.font = 'inherit';
        textField.style.fontSize = 'inherit';
        textField.style.width = '100%';
        textField.style.boxSizing = 'border-box';
        
        // Set editing state
        this._isEditing = true;
        this._originalText = originalText;
        
        // Replace the text span with the text field
        const textSpan = this._textElement;
        const parent = textSpan.parentElement;
        parent.replaceChild(textField, textSpan);
        
        // Select all text in the field
        textField.select();
        textField.focus();
        
        // Handle Enter key to commit changes
        const handleKeyDown = (e) => {
            if (e.key === Key.ENTER) {
                e.preventDefault();
                this._commitEdit(textField);
            } else if (e.key === Key.ESCAPE) {
                e.preventDefault();
                this._cancelEdit(textField);
            }
        };
        
        // Handle blur to commit changes
        const handleBlur = () => {
            this._commitEdit(textField);
        };
        
        // Add event listeners
        textField.addEventListener('keydown', handleKeyDown);
        textField.addEventListener('blur', handleBlur);
        
        // Store references for cleanup
        this._editField = textField;
        this._editHandlers = {
            keydown: handleKeyDown,
            blur: handleBlur
        };
    }
    
    _commitEdit(textField) {
        if (!this._isEditing) {
            return;
        }
        
        const newText = textField.value.trim();
        const originalText = this._originalText;
        
        // Clean up editing state
        this._cleanupEdit(textField);
        
        // Update the text if it changed
        if (newText !== originalText && newText !== '') {
            this.text = newText;
            
            // Fire custom edit event
            this.fireEvent(TreeItemEvent.TREE_ITEM_EDIT, {
                treeItem: this,
                oldText: originalText,
                newText: newText
            });
        }
    }
    
    _cancelEdit(textField) {
        if (!this._isEditing) {
            return;
        }
        
        // Clean up editing state without changing text
        this._cleanupEdit(textField);
    }
    
    _cleanupEdit(textField) {
        // Remove event listeners
        if (this._editHandlers) {
            textField.removeEventListener('keydown', this._editHandlers.keydown);
            textField.removeEventListener('blur', this._editHandlers.blur);
        }
        
        // Replace the text field with the original text span
        const parent = textField.parentElement;
        parent.replaceChild(this._textElement, textField);
        
        // Reset editing state
        this._isEditing = false;
        this._originalText = null;
        this._editField = null;
        this._editHandlers = null;
    }
    
    _setupEventListeners() {
        this._contentElement.addEventListener(MouseEvent.CLICK, () => {
            if (this._hasChildren) {
                this.toggle();
            }
            this.fireEvent(MouseEvent.CLICK, { treeItem: this });
        });

        // Add double-click event
        this._contentElement.addEventListener(MouseEvent.DOUBLE_CLICK, () => {
            this.fireEvent(MouseEvent.DOUBLE_CLICK, { treeItem: this });
        });

        this._expanderElement.addEventListener(MouseEvent.CLICK, (e) => {
            e.stopPropagation();
            if (this._hasChildren) {
                this.toggle();
            }
        });

        // ARIA: Keyboard navigation for tree items
        this._contentElement.addEventListener(KeyboardEvent.KEY_DOWN, (event) => {
            this._handleKeyDown(event);
        });
    }

    /**
     * Handle keyboard navigation for accessibility
     */
    _handleKeyDown(event) {
        switch (event.key) {
            case Key.ARROW_RIGHT:
                event.preventDefault();
                if (this._hasChildren) {
                    if (!this.expanded) {
                        // Expand the item
                        this.expanded = true;
                    } else {
                        // Move focus to first child
                        this._focusFirstChild();
                    }
                }
                break;

            case Key.ARROW_LEFT:
                event.preventDefault();
                if (this._hasChildren && this.expanded) {
                    // Collapse the item
                    this.expanded = false;
                } else {
                    // Move focus to parent
                    this._focusParent();
                }
                break;

            case Key.ARROW_DOWN:
                event.preventDefault();
                this._focusNext();
                break;

            case Key.ARROW_UP:
                event.preventDefault();
                this._focusPrevious();
                break;

            case Key.ENTER:
            case Key.SPACE:
                event.preventDefault();
                if (this._hasChildren) {
                    this.toggle();
                }
                this.fireEvent(MouseEvent.CLICK, { treeItem: this });
                break;

            case Key.HOME:
                event.preventDefault();
                this._focusFirst();
                break;

            case Key.END:
                event.preventDefault();
                this._focusLast();
                break;
        }
    }

    /**
     * Focus the first child tree item
     */
    _focusFirstChild() {
        const firstChild = this._childrenElement?.querySelector('gooeyui-treeitem');
        if (firstChild) {
            firstChild._contentElement?.focus();
        }
    }

    /**
     * Focus the parent tree item
     */
    _focusParent() {
        let parent = this.parentElement;
        while (parent) {
            if (parent.tagName === 'GOOEYUI-TREEITEM') {
                parent._contentElement?.focus();
                return;
            }
            parent = parent.parentElement;
        }
    }

    /**
     * Focus the next visible tree item
     */
    _focusNext() {
        // If expanded and has children, go to first child
        if (this.expanded && this._hasChildren) {
            this._focusFirstChild();
            return;
        }

        // Otherwise find next sibling or parent's next sibling
        let current = this;
        while (current) {
            const nextSibling = current.nextElementSibling;
            if (nextSibling && nextSibling.tagName === 'GOOEYUI-TREEITEM') {
                nextSibling._contentElement?.focus();
                return;
            }
            // Move up to parent and try its sibling
            let parent = current.parentElement;
            while (parent && parent.tagName !== 'GOOEYUI-TREEITEM') {
                parent = parent.parentElement;
            }
            current = parent;
        }
    }

    /**
     * Focus the previous visible tree item
     */
    _focusPrevious() {
        const prevSibling = this.previousElementSibling;
        if (prevSibling && prevSibling.tagName === 'GOOEYUI-TREEITEM') {
            // Go to last visible descendant of previous sibling
            let target = prevSibling;
            while (target.expanded && target._hasChildren) {
                const lastChild = target._childrenElement?.querySelector('gooeyui-treeitem:last-child');
                if (lastChild) {
                    target = lastChild;
                } else {
                    break;
                }
            }
            target._contentElement?.focus();
            return;
        }

        // Otherwise go to parent
        this._focusParent();
    }

    /**
     * Focus the first tree item in the tree
     */
    _focusFirst() {
        // Find the root tree container and its first item
        let root = this;
        while (root.parentElement) {
            if (root.parentElement.tagName === 'GOOEYUI-TREEITEM') {
                root = root.parentElement;
            } else {
                break;
            }
        }
        // Now root is at the top level, find the first sibling
        let first = root;
        while (first.previousElementSibling && first.previousElementSibling.tagName === 'GOOEYUI-TREEITEM') {
            first = first.previousElementSibling;
        }
        first._contentElement?.focus();
    }

    /**
     * Focus the last visible tree item in the tree
     */
    _focusLast() {
        // Find the root tree container
        let root = this;
        while (root.parentElement) {
            if (root.parentElement.tagName === 'GOOEYUI-TREEITEM') {
                root = root.parentElement;
            } else {
                break;
            }
        }
        // Find the last sibling at root level
        let last = root;
        while (last.nextElementSibling && last.nextElementSibling.tagName === 'GOOEYUI-TREEITEM') {
            last = last.nextElementSibling;
        }
        // Go to last visible descendant
        while (last.expanded && last._hasChildren) {
            const lastChild = last._childrenElement?.querySelector('gooeyui-treeitem:last-child');
            if (lastChild) {
                last = lastChild;
            } else {
                break;
            }
        }
        last._contentElement?.focus();
    }
    
    _updateAttributes() {
        this._updateText();
        this._updateIcon();
        this._updateExpanded();
        this._updateExpanderVisibility();
        this._updateDraggable();
    }
    
    _updateText() {
        this._textElement.textContent = this.text;
    }
    
    _updateIcon() {
        if (this.icon) {
            this._iconElement.src = this.icon;
            this._iconElement.style.display = 'inline-block';
        } else {
            this._iconElement.style.display = 'none';
        }
    }
    
    _updateExpanded() {
        const wasExpanded = this._expanded;
        this._expanded = this.expanded;

        // ARIA: Update expanded state (only set if item has children)
        if (this._hasChildren) {
            this.setAttribute('aria-expanded', this._expanded.toString());
        } else {
            this.removeAttribute('aria-expanded');
        }

        if (this._expanded) {
            if (this._expanderElement) this._expanderElement.classList.add('expanded');
            if (this._childrenElement) this._childrenElement.classList.add('expanded');
            this.classList.add('expanded');

            // Dispatch expand event if state changed
            if (!wasExpanded) {
                this.fireEvent(TreeItemEvent.TREE_ITEM_EXPAND, { treeItem: this });
            }
        } else {
            if (this._expanderElement) this._expanderElement.classList.remove('expanded');
            if (this._childrenElement) this._childrenElement.classList.remove('expanded');
            this.classList.remove('expanded');

            // Dispatch collapse event if state changed
            if (wasExpanded) {
                this.fireEvent(TreeItemEvent.TREE_ITEM_COLLAPSE, { treeItem: this });
            }
        }
    }
    
    _updateExpanderVisibility() {
        if (this._expanderElement) {
            if (this._hasChildren) {
                this._expanderElement.style.visibility = 'visible';
                // ARIA: Set expanded state when item gains children
                this.setAttribute('aria-expanded', this._expanded.toString());
            } else {
                this._expanderElement.style.visibility = 'hidden';
                // ARIA: Remove expanded state when item has no children
                this.removeAttribute('aria-expanded');
            }
        }
    }
    
    _updateDraggable() {
        if (this.draggable) {
            this._enableDragAndDrop();
        } else {
            this._disableDragAndDrop();
        }
    }
    
    _enableDragAndDrop() {
        // Make the content element draggable
        this._contentElement.setAttribute('draggable', 'true');
        this._contentElement.style.cursor = 'grab';
        
        // Store event handlers for cleanup
        this._dragHandlers = {
            dragStart: this._onDragStart.bind(this),
            dragEnd: this._onDragEnd.bind(this),
            dragOver: this._onDragOver.bind(this),
            dragEnter: this._onDragEnter.bind(this),
            dragLeave: this._onDragLeave.bind(this),
            drop: this._onDrop.bind(this)
        };
        
        // Add drag event listeners
        this._contentElement.addEventListener('dragstart', this._dragHandlers.dragStart);
        this._contentElement.addEventListener('dragend', this._dragHandlers.dragEnd);
        this._contentElement.addEventListener('dragover', this._dragHandlers.dragOver);
        this._contentElement.addEventListener('dragenter', this._dragHandlers.dragEnter);
        this._contentElement.addEventListener('dragleave', this._dragHandlers.dragLeave);
        this._contentElement.addEventListener('drop', this._dragHandlers.drop);
    }
    
    _disableDragAndDrop() {
        if (this._contentElement) {
            this._contentElement.removeAttribute('draggable');
            this._contentElement.style.cursor = '';
            
            // Remove event listeners if they exist
            if (this._dragHandlers) {
                this._contentElement.removeEventListener('dragstart', this._dragHandlers.dragStart);
                this._contentElement.removeEventListener('dragend', this._dragHandlers.dragEnd);
                this._contentElement.removeEventListener('dragover', this._dragHandlers.dragOver);
                this._contentElement.removeEventListener('dragenter', this._dragHandlers.dragEnter);
                this._contentElement.removeEventListener('dragleave', this._dragHandlers.dragLeave);
                this._contentElement.removeEventListener('drop', this._dragHandlers.drop);
                
                this._dragHandlers = null;
            }
        }
    }
    
    _onDragStart(event) {
        this._dragState.isDragging = true;
        
        // Set drag data
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', this.text);
        event.dataTransfer.setData('application/x-treeitem', JSON.stringify({
            id: this.id || null,
            text: this.text,
            icon: this.icon
        }));
        
        // Visual feedback
        this._contentElement.style.opacity = '0.5';
        this._contentElement.style.cursor = 'grabbing';
        
        // Store reference to dragged item globally
        TreeItem._draggedItem = this;
        
        // Dispatch custom event
        this.fireEvent(DragEvent.START, { 
            treeItem: this,
            originalEvent: event
        });
    }
    
    _onDragEnd(event) {
        this._dragState.isDragging = false;
        
        // Reset visual feedback
        this._contentElement.style.opacity = '';
        this._contentElement.style.cursor = 'grab';
        
        // Clear global reference
        TreeItem._draggedItem = null;
        
        // Remove all drop indicators
        this._clearDropIndicators();
        
        // Dispatch custom event
        this.fireEvent(DragEvent.END, { 
            treeItem: this,
            originalEvent: event
        });
    }
    
    _onDragEnter(event) {
        if (this._isDragValid(event)) {
            this._dragState.draggedOver = true;
            event.preventDefault();
        }
    }
    
    _onDragLeave(event) {
        // Check if we're actually leaving the element
        if (!this._contentElement.contains(event.relatedTarget)) {
            this._dragState.draggedOver = false;
            this._clearDropIndicators();
        }
    }
    
    _onDragOver(event) {
        const draggedItem = TreeItem._draggedItem;
        if (!draggedItem || draggedItem === this || this._isDescendantOf(draggedItem)) {
            return;
        }
        
        event.preventDefault();
        
        // Check dropTree validation
        const validationInfo = this._getDropTreeValidationInfo(draggedItem);
        
        if (!validationInfo.isValid) {
            // Show "not allowed" cursor and invalid indicator
            event.dataTransfer.dropEffect = 'none';
            this._dragState.dropPosition = 'invalid';
            this._updateDropIndicators('invalid');
            return;
        }
        
        // Valid drop target
        event.dataTransfer.dropEffect = 'move';
        
        // Determine drop position based on mouse position
        const rect = this._contentElement.getBoundingClientRect();
        const y = event.clientY - rect.top;
        const height = rect.height;
        
        let dropPosition;
        if (y < height * 0.25) {
            dropPosition = 'before';
        } else if (y > height * 0.75) {
            dropPosition = 'after';
        } else {
            dropPosition = 'inside';
        }
        
        this._dragState.dropPosition = dropPosition;
        this._updateDropIndicators(dropPosition);
    }
    
    _onDrop(event) {
        const draggedItem = TreeItem._draggedItem;
        if (!draggedItem || draggedItem === this || this._isDescendantOf(draggedItem)) {
            return;
        }
        
        event.preventDefault();
        
        // Final validation check
        const validationInfo = this._getDropTreeValidationInfo(draggedItem);
        if (!validationInfo.isValid) {
            console.warn('TREEITEM_DROP_BLOCKED', 'Drop operation blocked', { reason: validationInfo.message });
            // Clear drag state
            this._dragState.draggedOver = false;
            this._dragState.dropPosition = null;
            this._clearDropIndicators();
            return;
        }
        
        // Proceed with valid drop
        const dropEvent = new CustomEvent(TreeItemEvent.TREE_ITEM_DROP, {
            bubbles: true,
            cancelable: true,
            detail: {
                draggedItem: draggedItem,
                targetItem: this,
                dropPosition: this._dragState.dropPosition,
                dropTreeRestriction: draggedItem.dropTree,
                originalEvent: event
            }
        });
        
        this.dispatchEvent(dropEvent);
        
        // If not prevented, perform the default drop behavior
        if (!dropEvent.defaultPrevented) {
            this._performDrop(draggedItem, this._dragState.dropPosition);
        }
        
        // Clear drag state
        this._dragState.draggedOver = false;
        this._dragState.dropPosition = null;
        this._clearDropIndicators();
    }
    
    _isDragValid() {
        // Don't allow dropping on self or if no item is being dragged
        const draggedItem = TreeItem._draggedItem;
        if (!draggedItem || draggedItem === this || this._isDescendantOf(draggedItem)) {
            return false;
        }
        
        // Check dropTree restriction with drop position context
        return this._isValidDropTarget(draggedItem, this._dragState.dropPosition);
    }
    
    _isDescendantOf(potentialAncestor) {
        let parent = this.parentElement;
        while (parent) {
            if (parent === potentialAncestor) {
                return true;
            }
            parent = parent.parentElement;
        }
        return false;
    }
    
    _updateDropIndicators(dropPosition) {
        // Clear existing indicators
        this._clearDropIndicators();
        
        const draggedItem = TreeItem._draggedItem;
        if (!draggedItem) return;
        
        // Check if this is a valid drop target
        const validationInfo = this._getDropTreeValidationInfo(draggedItem);
        
        if (!validationInfo.isValid) {
            // Show invalid drop indicator
            this._contentElement.classList.add('drop-invalid');
            // Optionally show tooltip or message
            if (validationInfo.message) {
                this._contentElement.title = validationInfo.message;
            }
        } else {
            // Clear any error message
            this._contentElement.title = '';
            
            // Add appropriate valid drop indicator class
            switch (dropPosition) {
                case 'before':
                    this._contentElement.classList.add('drop-before');
                    break;
                case 'after':
                    this._contentElement.classList.add('drop-after');
                    break;
                case 'inside':
                    this._contentElement.classList.add('drop-inside');
                    break;
            }
        }
    }
    
    _clearDropIndicators() {
        this._contentElement.classList.remove('drop-before', 'drop-after', 'drop-inside', 'drop-invalid');
        this._contentElement.title = '';
    }
    
    _performDrop(draggedItem, dropPosition) {
        const draggedParent = draggedItem.parentElement;
        
        try {
            switch (dropPosition) {
                case 'before':
                    this.parentElement.insertBefore(draggedItem, this);
                    break;
                case 'after':
                    if (this.nextSibling) {
                        this.parentElement.insertBefore(draggedItem, this.nextSibling);
                    } else {
                        this.parentElement.appendChild(draggedItem);
                    }
                    break;
                case 'inside':
                    this.addChild(draggedItem);
                    // Expand this item to show the new child
                    this.expanded = true;
                    break;
            }
            
            // Update parent's child state if it no longer has children
            if (draggedParent && draggedParent !== this.parentElement && draggedParent.removeChild) {
                // Safely check if draggedParent has _childrenElement before accessing it
                if (draggedParent._childrenElement) {
                    draggedParent._hasChildren = draggedParent._childrenElement.children.length > 0;
                    draggedParent._updateExpanderVisibility();
                } else {
                    console.warn('TREEITEM_DRAG_PARENT_MISSING_CHILDREN', 'TreeItem drag parent missing _childrenElement - parent may not be properly initialized');
                }
            }
            
            // Dispatch reorder event
            this.fireEvent(TreeItemEvent.TREE_ITEM_REORDER, {
                movedItem: draggedItem,
                newParent: dropPosition === 'inside' ? this : this.parentElement,
                dropPosition: dropPosition
            });
            
        } catch (error) {
            console.error('TREEITEM_DROP_ERROR', 'Error performing tree item drop', { error: error.message });
        }
    }
    
    _isValidDropTarget(draggedItem, dropPosition = null) {
        // If the dragged item doesn't have a dropTree restriction, it can drop anywhere
        let dropTreeSelector = draggedItem.dropTree;
        if (!dropTreeSelector) {
            return true;
        }
        
        // Find the drop tree root elements by class or ID
        let dropTreeRoots = [];
        
        if (dropTreeSelector.startsWith('.')) {
            // Class-based selector - find all elements with this class
            const className = dropTreeSelector.substring(1);
            dropTreeRoots = Array.from(document.querySelectorAll(`.${className}`));
        } else {
            // ID-based selector (legacy support)
            let dropTreeId = dropTreeSelector;
            if (dropTreeId.startsWith('#')) {
                dropTreeId = dropTreeId.substring(1);
            }
            const dropTreeRoot = document.getElementById(dropTreeId);
            if (dropTreeRoot) {
                dropTreeRoots = [dropTreeRoot];
            }
        }
        
        if (dropTreeRoots.length === 0) {
            console.warn('TREEITEM_DROP_TREE_NOT_FOUND', `Drop tree with selector '${dropTreeSelector}' not found`);
            return false;
        }
        
        // Check if this element is a valid drop target for any of the drop tree roots
        for (const dropTreeRoot of dropTreeRoots) {
            // The drop target must either be:
            // 1. The exact dropTree root element itself (for adding to container), OR
            // 2. A direct sibling within the same container (for reordering only)
            if (this === dropTreeRoot) {
                // Direct drop on the container is always valid
                return true;
            }
            
            // Check if this is a sibling item for reordering
            // Both items must be direct children of the same dropTree root
            if (this.parentElement && this.parentElement.classList && 
                this.parentElement.classList.contains('ui-TreeItem-children')) {
                // Check if the children container belongs to the dropTree root
                if (this.parentElement.parentElement === dropTreeRoot) {
                    // This is a sibling, but only allow 'before' and 'after' drops
                    // Prevent 'inside' drops which would create nesting
                    if (dropPosition === 'inside') {
                        return false; // No nesting allowed between siblings
                    }
                    return true; // Allow 'before' and 'after' for reordering
                }
            }
        }
        
        return false;
    }
    
    _isWithinSubtree(rootElement) {
        // Check if this tree item is within the subtree rooted at rootElement
        let current = this;
        while (current) {
            if (current === rootElement) {
                return true;
            }
            
            // Move up the tree structure
            // First try to find the parent TreeItem
            let parent = current.parentElement;
            while (parent && parent.tagName !== 'UI-TREEITEM') {
                parent = parent.parentElement;
            }
            current = parent;
        }
        return false;
    }
    
    _getDropTreeValidationInfo(draggedItem) {
        let dropTreeSelector = draggedItem.dropTree;
        if (!dropTreeSelector) {
            return {
                hasRestriction: false,
                isValid: true,
                message: null
            };
        }
        
        // Find the drop tree root elements by class or ID
        let dropTreeRoots = [];
        
        if (dropTreeSelector.startsWith('.')) {
            // Class-based selector - find all elements with this class
            const className = dropTreeSelector.substring(1);
            dropTreeRoots = Array.from(document.querySelectorAll(`.${className}`));
        } else {
            // ID-based selector (legacy support)
            let dropTreeId = dropTreeSelector;
            if (dropTreeId.startsWith('#')) {
                dropTreeId = dropTreeId.substring(1);
            }
            const dropTreeRoot = document.getElementById(dropTreeId);
            if (dropTreeRoot) {
                dropTreeRoots = [dropTreeRoot];
            }
        }
        
        if (dropTreeRoots.length === 0) {
            return {
                hasRestriction: true,
                isValid: false,
                message: `Drop tree '${dropTreeSelector}' not found`
            };
        }
        
        // Check if this element is within any of the valid subtrees
        for (const dropTreeRoot of dropTreeRoots) {
            if (this._isWithinSubtree(dropTreeRoot)) {
                return {
                    hasRestriction: true,
                    isValid: true,
                    message: null
                };
            }
        }
        
        // Not within any valid subtree
        const rootNames = dropTreeRoots.map(root => root.text || root.id || root.className).join(', ');
        return {
            hasRestriction: true,
            isValid: false,
            message: `Can only drop within subtrees: ${rootNames}`
        };
    }
    
    // Static method to get the currently dragged item
    static getDraggedItem() {
        return TreeItem._draggedItem || null;
    }
}
