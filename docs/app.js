/**
 * GooeyJS Element Reference Application
 */

// Build the element tree with root node and subcategory support
function buildTree() {
    const treeContainer = document.getElementById('elementTree');
    const html = buildCategoryHtml(GooeyData.root, 'root');

    // Tree component uses shadow DOM with a <ul> element, no <slot>.
    // Inject raw HTML into the shadow DOM tree element for now.
    // Plan 03 will replace this with proper gooeyui-treeitem components.
    const target = treeContainer.shadowRoot
        ? treeContainer.shadowRoot.querySelector('.ui-Tree') || treeContainer
        : treeContainer;
    target.innerHTML = html;
}

// Build HTML for a category (recursive for subcategories)
function buildCategoryHtml(category, path) {
    let html = `
        <div class="tree-category" data-category="${path}">
            <div class="tree-category-header" onclick="toggleCategory('${path}')">
                <span class="tree-toggle">+</span>
                <span class="icon-folder"></span>
                ${category.name}
            </div>
            <div class="tree-items">
    `;

    // Add subcategories first (before direct elements)
    if (category.subcategories) {
        category.subcategories.forEach((subcat, subIndex) => {
            html += buildCategoryHtml(subcat, `${path}-${subIndex}`);
        });
    }

    // Add direct elements
    if (category.elements) {
        category.elements.forEach((element, elemIndex) => {
            html += `
                <div class="tree-item" onclick="selectElement('${path}', ${elemIndex})" data-path="${path}" data-elem="${elemIndex}">
                    <span class="icon-element"></span>
                    ${element.name}
                </div>
            `;
        });
    }

    html += `
            </div>
        </div>
    `;

    return html;
}

// Toggle category expand/collapse
function toggleCategory(path) {
    // Search in both light and shadow DOM of the tree
    const treeContainer = document.getElementById('elementTree');
    const searchRoot = treeContainer.shadowRoot
        ? treeContainer.shadowRoot.querySelector('.ui-Tree') || treeContainer
        : treeContainer;

    const category = searchRoot.querySelector(`.tree-category[data-category="${path}"]`);
    if (!category) return;

    const toggle = category.querySelector(':scope > .tree-category-header > .tree-toggle');

    category.classList.toggle('expanded');
    toggle.textContent = category.classList.contains('expanded') ? '-' : '+';
}

// Get element by path (e.g., "root" for root, "root-0" for first subcategory)
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

// Select an element and display its details
function selectElement(path, elemIndex) {
    // Update selection styling - search in tree shadow DOM
    const treeContainer = document.getElementById('elementTree');
    const searchRoot = treeContainer.shadowRoot
        ? treeContainer.shadowRoot.querySelector('.ui-Tree') || treeContainer
        : treeContainer;

    searchRoot.querySelectorAll('.tree-item').forEach(item => {
        item.classList.remove('selected');
    });
    const selectedItem = searchRoot.querySelector(`.tree-item[data-path="${path}"][data-elem="${elemIndex}"]`);
    if (selectedItem) {
        selectedItem.classList.add('selected');
    }

    // Get element data using path
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

    // Panel uses <slot>, so set innerHTML as light DOM content
    const detailPanel = document.getElementById('detailPanel');
    detailPanel.innerHTML = html;
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

// Expose functions on window for backward compatibility with onclick handlers.
// Plan 03 will replace these with GooeyJS Tree component event listeners.
window.buildTree = buildTree;
window.toggleCategory = toggleCategory;
window.selectElement = selectElement;
window.getElementByPath = getElementByPath;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Show welcome screen in detail panel
    const detailPanel = document.getElementById('detailPanel');
    if (detailPanel) {
        detailPanel.innerHTML = `
            <div style="text-align:center;padding:48px;color:#666">
                <h2 style="font-size:24px;color:#010082;margin-bottom:16px">GooeyJS Element Reference</h2>
                <p style="font-size:14px;line-height:1.6">Select an element from the tree on the left to view its documentation.</p>
                <p style="font-size:14px;line-height:1.6;margin-top:16px">This reference contains documentation for all GooeyJS custom elements,<br>including element-specific attributes and inherited attributes from base classes.</p>
            </div>
        `;
    }

    buildTree();

    // Expand root node by default
    toggleCategory('root');
});
