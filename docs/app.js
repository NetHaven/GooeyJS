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

// Display element details in the detail panel
function showElementDetails(path, elemIndex) {
    const element = getElementByPath(path, elemIndex);

    // Build details HTML
    let html = `
        <div class="element-name">${element.name}</div>
        <div class="element-tagname">&lt;${element.tagName}&gt;</div>
        <div class="element-description">${element.description}</div>
    `;

    if (element.attributes && element.attributes.length > 0) {
        html += `
            <div class="attributes-header">Attributes</div>
            <table class="attributes-table">
                <thead>
                    <tr>
                        <th style="width: 20%">Name</th>
                        <th style="width: 40%">Description</th>
                        <th style="width: 25%">Type</th>
                        <th style="width: 15%">Required</th>
                    </tr>
                </thead>
                <tbody>
        `;

        element.attributes.forEach(attr => {
            let typeHtml = `<span class="attr-type">${attr.type}</span>`;
            if (attr.type === 'ENUM' && attr.values) {
                typeHtml = `<span class="attr-type attr-type-enum">ENUM</span>
                    <div class="attr-values">Values: ${attr.values.join(', ')}</div>`;
            }

            html += `
                <tr>
                    <td><span class="attr-name">${attr.name}</span></td>
                    <td>${attr.description}</td>
                    <td>${typeHtml}</td>
                    <td class="${attr.required ? 'attr-required' : 'attr-optional'}">${attr.required ? 'Yes' : 'No'}</td>
                </tr>
            `;
        });

        html += `
                </tbody>
            </table>
        `;
    } else {
        html += `
            <div class="attributes-header">Attributes</div>
            <div class="no-attributes">This element has no specific attributes beyond the inherited attributes shown below.</div>
        `;
    }

    // Build inherited attributes section
    if (element.inherits && element.inherits.length > 0) {
        html += `
            <div class="inherited-section">
                <div class="inherited-header">Inherited Attributes</div>
        `;

        element.inherits.forEach(source => {
            const inheritedAttrs = GooeyData.inheritedAttributes[source];
            if (inheritedAttrs && inheritedAttrs.length > 0) {
                html += `
                    <div class="inherited-source">From ${source}</div>
                    <table class="inherited-table">
                        <thead>
                            <tr>
                                <th style="width: 20%">Name</th>
                                <th style="width: 40%">Description</th>
                                <th style="width: 25%">Type</th>
                                <th style="width: 15%">Required</th>
                            </tr>
                        </thead>
                        <tbody>
                `;

                inheritedAttrs.forEach(attr => {
                    let typeHtml = `<span class="attr-type">${attr.type}</span>`;
                    if (attr.type === 'ENUM' && attr.values) {
                        typeHtml = `<span class="attr-type attr-type-enum">ENUM</span>
                            <div class="attr-values">Values: ${attr.values.join(', ')}</div>`;
                    }

                    html += `
                        <tr>
                            <td><span class="attr-name">${attr.name}</span></td>
                            <td>${attr.description}</td>
                            <td>${typeHtml}</td>
                            <td class="${attr.required ? 'attr-required' : 'attr-optional'}">${attr.required ? 'Yes' : 'No'}</td>
                        </tr>
                    `;
                });

                html += `
                        </tbody>
                    </table>
                `;
            }
        });

        html += `</div>`;
    }

    // Build examples section
    if (element.examples && element.examples.length > 0) {
        html += `
            <div class="examples-section">
                <div class="examples-header">Examples</div>
        `;

        element.examples.forEach(example => {
            html += `
                <div class="example-block">
                    <div class="example-title">${example.title}</div>
                    <div class="example-description">${example.description}</div>
                    <div class="example-code">${formatCode(example.code)}</div>
                </div>
            `;
        });

        html += `</div>`;
    }

    detailPanel.innerHTML = `<style>${contentCSS}</style>` + html;
}

// Format code with syntax highlighting
function formatCode(code) {
    // Escape HTML entities first
    let formatted = code
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    // Use placeholders to avoid regex conflicts when inserting span tags
    const TAG_OPEN = '\u0000T\u0001';
    const ATTR_OPEN = '\u0000A\u0001';
    const VALUE_OPEN = '\u0000V\u0001';
    const COMMENT_OPEN = '\u0000C\u0001';
    const SPAN_CLOSE = '\u0000X\u0001';

    // Match HTML comments
    formatted = formatted.replace(/(&lt;!--[\s\S]*?--&gt;)/g, COMMENT_OPEN + '$1' + SPAN_CLOSE);

    // Match attribute values (in quotes)
    formatted = formatted.replace(/="([^"]*)"/g, '="' + VALUE_OPEN + '$1' + SPAN_CLOSE + '"');

    // Match attribute names (word before =)
    formatted = formatted.replace(/\s([a-zA-Z-]+)=/g, ' ' + ATTR_OPEN + '$1' + SPAN_CLOSE + '=');

    // Match tag names
    formatted = formatted.replace(/(&lt;\/?)([\w-]+)/g, '$1' + TAG_OPEN + '$2' + SPAN_CLOSE);

    // Replace placeholders with actual span tags
    formatted = formatted
        .replace(/\u0000T\u0001/g, '<span class="tag">')
        .replace(/\u0000A\u0001/g, '<span class="attr">')
        .replace(/\u0000V\u0001/g, '<span class="value">')
        .replace(/\u0000C\u0001/g, '<span class="comment">')
        .replace(/\u0000X\u0001/g, '</span>');

    return formatted;
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
        customElements.whenDefined('gooeydata-store')
    ]).then(async () => {
        await initRefs();
        showWelcomeScreen();
        buildTree();
        setupTreeEvents();
    });
});
