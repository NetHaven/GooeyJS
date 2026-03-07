/**
 * GooeyJS Element Reference Application
 *
 * Uses GooeyJS Tree/TreeItem components for navigation.
 * All interaction is via DOM APIs and GooeyJS Observable events.
 */

// SplitPanel moves children into shadow DOM, so document.getElementById won't find them.
// Cache references after components are defined and SplitPanel has constructed its panes.
let detailPanel = null;
let elementTree = null;
let contentCSS = '';

async function initRefs() {
    const splitPanel = document.querySelector('gooeyui-splitpanel#mainSplit');
    const firstPane = splitPanel.getFirstPane();
    const secondPane = splitPanel.getSecondPane();
    elementTree = firstPane.querySelector('#elementTree');
    detailPanel = secondPane.querySelector('#detailPanel');

    // Fetch content styles once — needed because detail panel content lives
    // inside SplitPanel's shadow DOM where global CSS can't reach
    const resp = await fetch('theme/content.css');
    if (resp.ok) {
        contentCSS = await resp.text();
    }
}

// Show welcome screen in the detail panel
function showWelcomeScreen() {
    if (detailPanel) {
        detailPanel.innerHTML = `
            <div style="text-align:center;padding:48px;color:#666">
                <h2 style="font-size:24px;color:#010082;margin-bottom:16px">GooeyJS Element Reference</h2>
                <p style="font-size:14px;line-height:1.6">Select an element from the tree on the left to view its documentation.</p>
                <p style="font-size:14px;line-height:1.6;margin-top:16px">This reference contains documentation for all GooeyJS custom elements,<br>including element-specific attributes and inherited attributes from base classes.</p>
            </div>
        `;
    }
}

// Build gooeyui-treeitem elements from GooeyData and add to the tree
// Called after customElements.whenDefined resolves for tree/treeitem
function buildTree() {
    const rootItem = buildCategoryItem(GooeyData.root, 'root');
    elementTree.addItem(rootItem);

    // Auto-expand root node
    rootItem.setAttribute('expanded', '');
}

// Recursively build a category tree item with subcategories and element leaves
function buildCategoryItem(category, path) {
    const item = document.createElement('gooeyui-treeitem');
    item.setAttribute('text', category.name);
    // data-folder attribute triggers CSS-only folder icon via theme override
    item.dataset.folder = '';
    item.dataset.path = path;
    item.dataset.type = 'category';

    // Add subcategories first
    if (category.subcategories) {
        category.subcategories.forEach((subcat, i) => {
            const subItem = buildCategoryItem(subcat, `${path}-${i}`);
            item.addChild(subItem);
        });
    }

    // Add element entries (leaf nodes, no icon attribute => element icon via CSS)
    if (category.elements) {
        category.elements.forEach((element, i) => {
            const elemItem = document.createElement('gooeyui-treeitem');
            elemItem.setAttribute('text', element.name);
            elemItem.dataset.path = path;
            elemItem.dataset.elemIndex = i;
            elemItem.dataset.type = 'element';
            item.addChild(elemItem);
        });
    }

    return item;
}

// Wire Tree selection-changed event to show element details
function setupTreeEvents() {
    const tree = elementTree;

    // Observable listener signature: (eventName, eventObject)
    tree.addEventListener('selection-changed', (_eventName, data) => {
        const selectedItem = data?.selectedItem;
        if (!selectedItem || selectedItem.dataset.type !== 'element') return;

        const path = selectedItem.dataset.path;
        const elemIndex = parseInt(selectedItem.dataset.elemIndex, 10);
        showElementDetails(path, elemIndex);
    });
}

// Get element data by path (e.g., "root" for root, "root-0" for first subcategory)
function getElementByPath(path, elemIndex) {
    const parts = path.split('-');

    // Start at root
    let container = GooeyData.root;

    // Navigate through subcategories (skip 'root' prefix)
    for (let i = 1; i < parts.length; i++) {
        container = container.subcategories[parseInt(parts[i])];
    }

    return container.elements[elemIndex];
}

// Map attribute data to DataGrid row format
function mapAttributeData(attrs) {
    return attrs.map(attr => {
        let type = attr.type;
        if (attr.type === 'ENUM' && attr.values) {
            type = 'ENUM: ' + attr.values.join(', ');
        }
        return {
            name: attr.name,
            description: attr.description,
            type: type,
            required: attr.required ? 'Yes' : 'No'
        };
    });
}

// Create a DataGrid with four attribute columns and populate with data
function createAttributeGrid(data, cssClass) {
    const datagrid = document.createElement('gooeyui-datagrid');
    datagrid.setAttribute('selectionmode', 'none');
    datagrid.setAttribute('width', '100%');

    // Calculate height: header(40) + rows(30 each), capped at 400px
    const calcHeight = Math.min(data.length * 30 + 40, 400);
    datagrid.setAttribute('height', calcHeight + 'px');

    if (cssClass) {
        datagrid.classList.add(cssClass);
    }

    // Create columns
    const columns = [
        { field: 'name', header: 'Name', width: '20%' },
        { field: 'description', header: 'Description', width: '40%' },
        { field: 'type', header: 'Type', width: '25%' },
        { field: 'required', header: 'Required', width: '15%' }
    ];

    columns.forEach(col => {
        const column = document.createElement('gooeyui-datagridcolumn');
        column.setAttribute('field', col.field);
        column.setAttribute('header', col.header);
        column.setAttribute('width', col.width);
        datagrid.appendChild(column);
    });

    // Set data directly — store binding uses document.getElementById which
    // cannot reach elements inside SplitPanel's shadow DOM
    requestAnimationFrame(() => {
        datagrid.setData(data);
    });

    return datagrid;
}

// Display element details in the detail panel
function showElementDetails(path, elemIndex) {
    const element = getElementByPath(path, elemIndex);

    // Build header HTML (static content rendered via innerHTML)
    let headerHTML = `
        <div class="element-name">${element.name}</div>
        <div class="element-tagname">&lt;${element.tagName}&gt;</div>
        <div class="element-description">${element.description}</div>
    `;

    // Build attributes header
    headerHTML += '<div class="attributes-header">Attributes</div>';

    if (!element.attributes || element.attributes.length === 0) {
        headerHTML += '<div class="no-attributes">This element has no specific attributes beyond the inherited attributes shown below.</div>';
    }

    // Set static HTML first
    detailPanel.innerHTML = '<style>' + contentCSS + '</style>' + headerHTML;

    // Append own attributes DataGrid if present
    if (element.attributes && element.attributes.length > 0) {
        const data = mapAttributeData(element.attributes);
        const grid = createAttributeGrid(data);
        detailPanel.appendChild(grid);
    }

    // Build inherited attributes section
    if (element.inherits && element.inherits.length > 0) {
        const inheritedSection = document.createElement('div');
        inheritedSection.className = 'inherited-section';
        inheritedSection.innerHTML = '<div class="inherited-header">Inherited Attributes</div>';

        element.inherits.forEach(source => {
            const inheritedAttrs = GooeyData.inheritedAttributes[source];
            if (inheritedAttrs && inheritedAttrs.length > 0) {
                const sourceLabel = document.createElement('div');
                sourceLabel.className = 'inherited-source';
                sourceLabel.textContent = 'From ' + source;
                inheritedSection.appendChild(sourceLabel);

                const data = mapAttributeData(inheritedAttrs);
                const grid = createAttributeGrid(data, 'inherited');
                inheritedSection.appendChild(grid);
            }
        });

        detailPanel.appendChild(inheritedSection);
    }

    // Build examples section
    if (element.examples && element.examples.length > 0) {
        const examplesSection = document.createElement('div');
        examplesSection.className = 'examples-section';
        examplesSection.innerHTML = '<div class="examples-header">Examples</div>';

        element.examples.forEach(example => {
            const block = document.createElement('div');
            block.className = 'example-block';
            block.innerHTML = `
                <div class="example-title">${example.title}</div>
                <div class="example-description">${example.description}</div>
            `;

            const codeblock = document.createElement('gooeyui-codeblock');
            codeblock.setAttribute('language', 'html');
            codeblock.setAttribute('syntaxhighlight', '');
            codeblock.setAttribute('linenumbers', 'false');
            codeblock.setAttribute('copybutton', 'false');
            codeblock.textContent = example.code;

            block.appendChild(codeblock);
            examplesSection.appendChild(block);
        });

        detailPanel.appendChild(examplesSection);
    }
}

// Initialize — wait for GooeyJS components to be defined before interacting
document.addEventListener('DOMContentLoaded', () => {
    // Wait for shell components to be defined before any DOM interaction.
    // SplitPanel moves children into shadow DOM, so refs must be resolved
    // via its API after construction, not via document.getElementById.
    Promise.all([
        customElements.whenDefined('gooeyui-splitpanel'),
        customElements.whenDefined('gooeyui-panel'),
        customElements.whenDefined('gooeyui-tree'),
        customElements.whenDefined('gooeyui-treeitem'),
        customElements.whenDefined('gooeyui-datagrid'),
        customElements.whenDefined('gooeyui-codeblock'),
        customElements.whenDefined('gooeydata-store')
    ]).then(async () => {
        await initRefs();
        showWelcomeScreen();
        buildTree();
        setupTreeEvents();
    });
});
