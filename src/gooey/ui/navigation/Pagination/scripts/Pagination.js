import UIComponent from '../../../UIComponent.js';
import Template from '../../../../util/Template.js';
import PaginationEvent from '../../../../events/navigation/PaginationEvent.js';
import NavigatorFormat from './NavigatorFormat.js';

export default class Pagination extends UIComponent {

    constructor() {
        super();
        Template.activate("ui-Pagination", this.shadowRoot);

        // Cache DOM references
        this._container = this.shadowRoot.querySelector(".pagination-container");
        this._controls = this.shadowRoot.querySelector(".pagination-controls");
        this._navigator = this.shadowRoot.querySelector(".pagination-navigator");
        this._sizeChanger = this.shadowRoot.querySelector(".pagination-size-changer");
        this._sizeSelect = this.shadowRoot.querySelector(".pagination-size-select");
        this._goInput = this.shadowRoot.querySelector(".pagination-go-input");
        this._goButton = this.shadowRoot.querySelector(".pagination-go-button");
        this._goContainer = this.shadowRoot.querySelector(".pagination-go");

        // Internal state
        this._store = null;
        this._datagrid = null;
        this._storeListeners = [];
        this._gridListeners = [];
        this._navigatorFormatter = null;
        this._pageLabelFormatter = null;
    }

    // =========================================================================
    // Attribute Getters/Setters — Core Paging State
    // =========================================================================

    get totalrecords() { return parseInt(this.getAttribute("totalrecords")) || 0; }
    set totalrecords(val) { this.setAttribute("totalrecords", val); }

    get pagesize() { return parseInt(this.getAttribute("pagesize")) || 10; }
    set pagesize(val) { this.setAttribute("pagesize", val); }

    get currentpage() { return parseInt(this.getAttribute("currentpage")) || 1; }
    set currentpage(val) { this.setAttribute("currentpage", val); }

    get pagerange() {
        const val = parseInt(this.getAttribute("pagerange"));
        return isNaN(val) ? 2 : val;
    }
    set pagerange(val) { this.setAttribute("pagerange", val); }

    get marginpages() {
        const val = parseInt(this.getAttribute("marginpages"));
        return isNaN(val) ? 1 : val;
    }
    set marginpages(val) { this.setAttribute("marginpages", val); }

    // =========================================================================
    // Attribute Getters/Setters — Boolean (default TRUE)
    // =========================================================================

    get showprevious() { return this.getAttribute("showprevious") !== "false"; }
    set showprevious(val) { this.setAttribute("showprevious", val); }

    get shownext() { return this.getAttribute("shownext") !== "false"; }
    set shownext(val) { this.setAttribute("shownext", val); }

    get showpagenumbers() { return this.getAttribute("showpagenumbers") !== "false"; }
    set showpagenumbers(val) { this.setAttribute("showpagenumbers", val); }

    // =========================================================================
    // Attribute Getters/Setters — Boolean (default FALSE)
    // =========================================================================

    get showfirst() { return this.getAttribute("showfirst") === "true"; }
    set showfirst(val) { this.setAttribute("showfirst", val); }

    get showlast() { return this.getAttribute("showlast") === "true"; }
    set showlast(val) { this.setAttribute("showlast", val); }

    get showsizechanger() { return this.getAttribute("showsizechanger") === "true"; }
    set showsizechanger(val) { this.setAttribute("showsizechanger", val); }

    get shownavigator() { return this.getAttribute("shownavigator") === "true"; }
    set shownavigator(val) { this.setAttribute("shownavigator", val); }

    get showgoinput() { return this.getAttribute("showgoinput") === "true"; }
    set showgoinput(val) { this.setAttribute("showgoinput", val); }

    get showgobutton() { return this.getAttribute("showgobutton") === "true"; }
    set showgobutton(val) { this.setAttribute("showgobutton", val); }

    get hideonlyone() { return this.getAttribute("hideonlyone") === "true"; }
    set hideonlyone(val) { this.setAttribute("hideonlyone", val); }

    get autohideprevious() { return this.getAttribute("autohideprevious") === "true"; }
    set autohideprevious(val) { this.setAttribute("autohideprevious", val); }

    get autohidenext() { return this.getAttribute("autohidenext") === "true"; }
    set autohidenext(val) { this.setAttribute("autohidenext", val); }

    get hidefirstonellipsis() { return this.getAttribute("hidefirstonellipsis") === "true"; }
    set hidefirstonellipsis(val) { this.setAttribute("hidefirstonellipsis", val); }

    get hidelastonellipsis() { return this.getAttribute("hidelastonellipsis") === "true"; }
    set hidelastonellipsis(val) { this.setAttribute("hidelastonellipsis", val); }

    // =========================================================================
    // Attribute Getters/Setters — String
    // =========================================================================

    get previoustext() { return this.getAttribute("previoustext") || "Prev"; }
    set previoustext(val) { this.setAttribute("previoustext", val); }

    get nexttext() { return this.getAttribute("nexttext") || "Next"; }
    set nexttext(val) { this.setAttribute("nexttext", val); }

    get firsttext() { return this.getAttribute("firsttext") || "First"; }
    set firsttext(val) { this.setAttribute("firsttext", val); }

    get lasttext() { return this.getAttribute("lasttext") || "Last"; }
    set lasttext(val) { this.setAttribute("lasttext", val); }

    get ellipsistext() { return this.getAttribute("ellipsistext") || "..."; }
    set ellipsistext(val) { this.setAttribute("ellipsistext", val); }

    get gobuttontext() { return this.getAttribute("gobuttontext") || "Go"; }
    set gobuttontext(val) { this.setAttribute("gobuttontext", val); }

    get sizechangeroptions() { return this.getAttribute("sizechangeroptions") || "10,20,50,100"; }
    set sizechangeroptions(val) { this.setAttribute("sizechangeroptions", val); }

    get pagelabelformat() { return this.getAttribute("pagelabelformat") || null; }
    set pagelabelformat(val) { this.setAttribute("pagelabelformat", val); }

    // =========================================================================
    // Attribute Getters/Setters — ENUM
    // =========================================================================

    get navigatorformat() { return this.getAttribute("navigatorformat") || "RANGE"; }
    set navigatorformat(val) { this.setAttribute("navigatorformat", val); }

    get size() { return this.getAttribute("size") || "DEFAULT"; }
    set size(val) { this.setAttribute("size", val); }

    get halign() { return this.getAttribute("halign") || "LEFT"; }
    set halign(val) { this.setAttribute("halign", val); }

    // =========================================================================
    // Computed Properties (read-only)
    // =========================================================================

    get totalPages() {
        if (this.totalrecords === 0) return 0;
        return Math.ceil(this.totalrecords / this.pagesize);
    }

    get isFirstPage() { return this.currentpage === 1; }

    get isLastPage() { return this.currentpage === this.totalPages; }

    get rangeStart() {
        return this.totalrecords === 0 ? 0 : (this.currentpage - 1) * this.pagesize + 1;
    }

    get rangeEnd() {
        return Math.min(this.currentpage * this.pagesize, this.totalrecords);
    }

    get currentPageData() { return null; }

    // =========================================================================
    // Formatter API
    // =========================================================================

    setNavigatorFormatter(fn) {
        this._navigatorFormatter = fn;
        this._render();
    }

    setPageLabelFormatter(fn) {
        this._pageLabelFormatter = fn;
        this._render();
    }

    // =========================================================================
    // Public API — Navigation (stubs for Plan 03)
    // =========================================================================

    refresh() { this._render(); }

    reset() { this.currentpage = 1; }

    // =========================================================================
    // attributeChangedCallback
    // =========================================================================

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return;
        super.attributeChangedCallback?.(name, oldValue, newValue);

        switch (name) {
            case "totalrecords":
            case "pagesize":
            case "pagerange":
            case "marginpages":
            case "showprevious":
            case "shownext":
            case "showfirst":
            case "showlast":
            case "showpagenumbers":
            case "showsizechanger":
            case "shownavigator":
            case "showgoinput":
            case "showgobutton":
            case "hideonlyone":
            case "autohideprevious":
            case "autohidenext":
            case "hidefirstonellipsis":
            case "hidelastonellipsis":
            case "previoustext":
            case "nexttext":
            case "firsttext":
            case "lasttext":
            case "ellipsistext":
            case "gobuttontext":
            case "navigatorformat":
            case "sizechangeroptions":
            case "pagelabelformat":
            case "size":
            case "halign":
                this._render();
                break;
            case "currentpage":
                this._onCurrentPageChanged(parseInt(oldValue), parseInt(newValue));
                break;
            case "store":
                this.bindStore(newValue);
                break;
            case "datagrid":
                this.bindDataGrid(newValue);
                break;
        }
    }

    // =========================================================================
    // Lifecycle
    // =========================================================================

    connectedCallback() {
        super.connectedCallback?.();

        // Register events
        this.addValidEvent(PaginationEvent.PAGE_CHANGE);
        this.addValidEvent(PaginationEvent.BEFORE_PAGE_CHANGE);
        this.addValidEvent(PaginationEvent.PAGE_SIZE_CHANGE);
        this.addValidEvent(PaginationEvent.PAGE_DATA_CHANGE);
        this.addValidEvent(PaginationEvent.PAGE_ACTIVE);
        this.addValidEvent(PaginationEvent.FIRST_PAGE);
        this.addValidEvent(PaginationEvent.LAST_PAGE);
        this.addValidEvent(PaginationEvent.STORE_BOUND);
        this.addValidEvent(PaginationEvent.STORE_UNBOUND);
        this.addValidEvent(PaginationEvent.DATAGRID_BOUND);
        this.addValidEvent(PaginationEvent.DATAGRID_UNBOUND);

        // Initialize from attributes
        this._initFromAttributes();

        // Attach internal event listeners
        this._attachListeners();

        // Bind to store/datagrid if attributes present
        if (this.hasAttribute("store")) {
            this.bindStore(this.getAttribute("store"));
        }
        if (this.hasAttribute("datagrid")) {
            this.bindDataGrid(this.getAttribute("datagrid"));
        }

        // Initial render
        this._render();
    }

    // =========================================================================
    // Initialization
    // =========================================================================

    _initFromAttributes() {
        // Clamp currentpage to valid range
        const tp = this.totalPages;
        if (tp > 0) {
            const cp = this.currentpage;
            if (cp < 1) {
                this.currentpage = 1;
            } else if (cp > tp) {
                this.currentpage = tp;
            }
        }
    }

    // =========================================================================
    // Page List Algorithm
    // =========================================================================

    _buildPageList() {
        const currentPage = this.currentpage;
        const totalPages = this.totalPages;
        const pageRange = this.pagerange;
        const marginPages = this.marginpages;

        if (totalPages === 0) return [];

        // If pageRange === 0, show all pages (no compression)
        if (pageRange === 0) {
            const pages = [];
            for (let i = 1; i <= totalPages; i++) {
                pages.push({ type: "page", page: i });
            }
            return pages;
        }

        // Compute inner window
        const innerStart = Math.max(1, currentPage - pageRange);
        const innerEnd = Math.min(totalPages, currentPage + pageRange);

        // Compute margins
        const leftMarginEnd = Math.min(marginPages, totalPages);
        const rightMarginStart = Math.max(1, totalPages - marginPages + 1);

        const result = [];
        const seen = new Set();

        // a. Add left margin pages
        const leftPages = [];
        for (let i = 1; i <= leftMarginEnd; i++) {
            leftPages.push(i);
        }

        // b. Check gap between left margin end and inner window start
        const hasLeftGap = leftMarginEnd < innerStart - 1;
        const leftGapIsOne = leftMarginEnd === innerStart - 2;

        // Determine which left margin pages to add
        for (let i = 0; i < leftPages.length; i++) {
            const page = leftPages[i];
            // If hidefirstonellipsis and there IS a left ellipsis, omit last left-margin page
            if (this.hidefirstonellipsis && hasLeftGap && !leftGapIsOne && i === leftPages.length - 1) {
                continue;
            }
            if (!seen.has(page)) {
                result.push({ type: "page", page });
                seen.add(page);
            }
        }

        // Insert left ellipsis or bridge page
        if (hasLeftGap) {
            if (leftGapIsOne) {
                // Gap is exactly 1 page — show that page instead of ellipsis
                const bridgePage = leftMarginEnd + 1;
                if (!seen.has(bridgePage)) {
                    result.push({ type: "page", page: bridgePage });
                    seen.add(bridgePage);
                }
            } else {
                result.push({ type: "ellipsis" });
            }
        }

        // c. Add inner window pages
        for (let i = innerStart; i <= innerEnd; i++) {
            if (!seen.has(i)) {
                result.push({ type: "page", page: i });
                seen.add(i);
            }
        }

        // d. Check gap between inner window end and right margin start
        const hasRightGap = innerEnd < rightMarginStart - 1;
        const rightGapIsOne = innerEnd === rightMarginStart - 2;

        if (hasRightGap) {
            if (rightGapIsOne) {
                // Gap is exactly 1 page — show that page instead of ellipsis
                const bridgePage = innerEnd + 1;
                if (!seen.has(bridgePage)) {
                    result.push({ type: "page", page: bridgePage });
                    seen.add(bridgePage);
                }
            } else {
                result.push({ type: "ellipsis" });
            }
        }

        // e. Add right margin pages
        const rightPages = [];
        for (let i = rightMarginStart; i <= totalPages; i++) {
            rightPages.push(i);
        }

        for (let i = 0; i < rightPages.length; i++) {
            const page = rightPages[i];
            // If hidelastonellipsis and there IS a right ellipsis, omit first right-margin page
            if (this.hidelastonellipsis && hasRightGap && !rightGapIsOne && i === 0) {
                continue;
            }
            if (!seen.has(page)) {
                result.push({ type: "page", page: page });
                seen.add(page);
            }
        }

        return result;
    }

    // =========================================================================
    // Rendering
    // =========================================================================

    _render() {
        // Guard: don't render before DOM is ready
        if (!this._container) return;

        const totalPages = this.totalPages;
        const currentPage = this.currentpage;

        // Hide entire bar if hideonlyone and totalPages <= 1
        if (this.hideonlyone && totalPages <= 1) {
            this._container.style.display = "none";
            return;
        }
        this._container.style.display = "";

        // Remove existing dynamic page buttons and ellipsis elements
        const dynamicItems = this._controls.querySelectorAll(".pagination-page, .pagination-ellipsis");
        dynamicItems.forEach(item => item.remove());

        // First button
        const firstLi = this._controls.querySelector(".pagination-first");
        if (firstLi) {
            firstLi.style.display = this.showfirst ? "" : "none";
            const firstBtn = firstLi.querySelector("button");
            if (firstBtn) {
                firstBtn.textContent = this.firsttext;
                if (this.isFirstPage) {
                    firstLi.classList.add("disabled");
                    firstBtn.disabled = true;
                } else {
                    firstLi.classList.remove("disabled");
                    firstBtn.disabled = false;
                }
            }
        }

        // Previous button
        const prevLi = this._controls.querySelector(".pagination-previous");
        if (prevLi) {
            const prevBtn = prevLi.querySelector("button");
            if (this.showprevious) {
                if (this.autohideprevious && this.isFirstPage) {
                    prevLi.style.display = "none";
                } else {
                    prevLi.style.display = "";
                    if (prevBtn) {
                        if (this.isFirstPage) {
                            prevLi.classList.add("disabled");
                            prevBtn.disabled = true;
                        } else {
                            prevLi.classList.remove("disabled");
                            prevBtn.disabled = false;
                        }
                    }
                }
            } else {
                prevLi.style.display = "none";
            }
            if (prevBtn) {
                prevBtn.textContent = this.previoustext;
            }
        }

        // Next button
        const nextLi = this._controls.querySelector(".pagination-next");
        if (nextLi) {
            const nextBtn = nextLi.querySelector("button");
            if (this.shownext) {
                if (this.autohidenext && this.isLastPage) {
                    nextLi.style.display = "none";
                } else {
                    nextLi.style.display = "";
                    if (nextBtn) {
                        if (this.isLastPage) {
                            nextLi.classList.add("disabled");
                            nextBtn.disabled = true;
                        } else {
                            nextLi.classList.remove("disabled");
                            nextBtn.disabled = false;
                        }
                    }
                }
            } else {
                nextLi.style.display = "none";
            }
            if (nextBtn) {
                nextBtn.textContent = this.nexttext;
            }
        }

        // Last button
        const lastLi = this._controls.querySelector(".pagination-last");
        if (lastLi) {
            lastLi.style.display = this.showlast ? "" : "none";
            const lastBtn = lastLi.querySelector("button");
            if (lastBtn) {
                lastBtn.textContent = this.lasttext;
                if (this.isLastPage) {
                    lastLi.classList.add("disabled");
                    lastBtn.disabled = true;
                } else {
                    lastLi.classList.remove("disabled");
                    lastBtn.disabled = false;
                }
            }
        }

        // Page number buttons
        if (this.showpagenumbers) {
            const pageList = this._buildPageList();
            const nextRef = this._controls.querySelector(".pagination-next");

            for (const entry of pageList) {
                if (entry.type === "page") {
                    const li = document.createElement("li");
                    li.className = "pagination-item pagination-page";

                    const btn = document.createElement("button");
                    btn.type = "button";

                    // Determine label
                    let label;
                    if (this._pageLabelFormatter) {
                        label = this._pageLabelFormatter({ page: entry.page });
                    } else if (this.pagelabelformat) {
                        label = this.pagelabelformat.replace("{page}", entry.page);
                    } else {
                        label = String(entry.page);
                    }
                    btn.textContent = label;
                    btn.setAttribute("aria-label", `Page ${entry.page}`);

                    if (entry.page === currentPage) {
                        li.classList.add("active");
                        btn.setAttribute("aria-current", "page");
                    }

                    li.appendChild(btn);
                    this._controls.insertBefore(li, nextRef);
                } else if (entry.type === "ellipsis") {
                    const li = document.createElement("li");
                    li.className = "pagination-item pagination-ellipsis";
                    li.setAttribute("aria-hidden", "true");

                    const span = document.createElement("span");
                    span.textContent = this.ellipsistext;

                    li.appendChild(span);
                    this._controls.insertBefore(li, nextRef);
                }
            }
        }

        // Size changer
        if (this._sizeChanger) {
            this._sizeChanger.style.display = this.showsizechanger ? "" : "none";
            if (this.showsizechanger && this._sizeSelect) {
                // Populate options
                this._sizeSelect.innerHTML = "";
                const options = this.sizechangeroptions.split(",").map(s => s.trim()).filter(Boolean);
                const currentSize = this.pagesize;
                for (const optVal of options) {
                    const option = document.createElement("option");
                    option.value = optVal;
                    option.textContent = optVal;
                    if (parseInt(optVal) === currentSize) {
                        option.selected = true;
                    }
                    this._sizeSelect.appendChild(option);
                }
            }
        }

        // Go input / Go button
        if (this._goContainer) {
            this._goContainer.style.display = this.showgoinput ? "" : "none";
        }
        if (this._goButton) {
            this._goButton.style.display = this.showgobutton ? "" : "none";
            this._goButton.textContent = this.gobuttontext;
        }
        if (this._goInput && totalPages > 0) {
            this._goInput.max = totalPages;
        }

        // Navigator
        this._renderNavigator();
    }

    _renderNavigator() {
        if (!this._navigator) return;

        if (!this.shownavigator) {
            this._navigator.style.display = "none";
            return;
        }
        this._navigator.style.display = "";

        const data = {
            currentPage: this.currentpage,
            totalPages: this.totalPages,
            totalRecords: this.totalrecords,
            rangeStart: this.rangeStart,
            rangeEnd: this.rangeEnd,
            pageSize: this.pagesize
        };

        let text;
        if (this._navigatorFormatter) {
            text = this._navigatorFormatter(data);
        } else {
            const format = this.navigatorformat.toUpperCase();
            switch (format) {
                case NavigatorFormat.PAGES:
                    text = `Page ${data.currentPage} of ${data.totalPages}`;
                    break;
                case NavigatorFormat.ITEMS:
                    if (data.totalRecords === 0) {
                        text = "Showing 0 of 0 items";
                    } else {
                        text = `Showing ${data.rangeEnd - data.rangeStart + 1} of ${data.totalRecords} items`;
                    }
                    break;
                case NavigatorFormat.RANGE:
                default:
                    text = `${data.rangeStart}-${data.rangeEnd} of ${data.totalRecords}`;
                    break;
            }
        }

        this._navigator.textContent = text;
    }

    // =========================================================================
    // Stub Methods (filled in Plan 03 / Phase 66)
    // =========================================================================

    _attachListeners() {}

    _onCurrentPageChanged(oldPage, newPage) {
        this._render();
    }

    bindStore(storeId) {}
    unbindStore() {}
    bindDataGrid(gridId) {}
    unbindDataGrid() {}
}
