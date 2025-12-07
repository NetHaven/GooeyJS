/**
 * GooeyJS Element Reference Application
 */

// Build the element tree with root node and subcategory support
function buildTree() {
    const treeContainer = document.getElementById('elementTree');
    let html = buildCategoryHtml(GooeyData.root, 'root');
    treeContainer.innerHTML = html;
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
    const category = document.querySelector(`.tree-category[data-category="${path}"]`);
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
    // Update selection styling
    document.querySelectorAll('.tree-item').forEach(item => {
        item.classList.remove('selected');
    });
    document.querySelector(`.tree-item[data-path="${path}"][data-elem="${elemIndex}"]`).classList.add('selected');

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

    document.getElementById('elementDetails').innerHTML = html;
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

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    buildTree();

    // Expand root node by default
    toggleCategory('root');
});
