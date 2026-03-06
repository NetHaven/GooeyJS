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
