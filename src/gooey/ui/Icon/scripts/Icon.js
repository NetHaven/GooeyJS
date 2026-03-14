import UIComponent from '../../UIComponent.js';
import Template from '../../../util/Template.js';
import IconEvent from '../../../events/IconEvent.js';
import IconType from './IconType.js';
import URLSanitizer from '../../../util/URLSanitizer.js';

/**
 * Icon component supporting bitmap (img) and CSS class rendering modes.
 *
 * Bitmap mode (default): renders an <img> element with the provided src.
 * CSS mode: renders a <span> with the specified CSS class applied.
 *
 * Fires icon-load on successful bitmap load and icon-error on failure.
 */
export default class Icon extends UIComponent {
    constructor() {
        super();

        Template.activate("ui-Icon", this.shadowRoot);

        this._imgElement = this.shadowRoot.querySelector(".icon-bitmap");
        this._cssElement = this.shadowRoot.querySelector(".icon-css");
        this._currentClassName = null;

        this.addValidEvent(IconEvent.LOAD);
        this.addValidEvent(IconEvent.ERROR);

        this._imgElement.addEventListener("load", () => {
            this.fireEvent(IconEvent.LOAD, { src: this._imgElement.src });
        });

        this._imgElement.addEventListener("error", () => {
            this.fireEvent(IconEvent.ERROR, { src: this._imgElement.src });
        });
    }

    connectedCallback() {
        super.connectedCallback?.();

        if (this.hasAttribute("type")) {
            // CSS handles visual toggle via :host([type]) selectors
            // Just ensure attribute is set
        }

        if (this.hasAttribute("src")) {
            const rawSrc = this.getAttribute("src");
            const safeVal = URLSanitizer.validateAssetURL(rawSrc, { allowCrossOrigin: true });
            if (safeVal) {
                this._imgElement.src = safeVal;
            }
        }

        if (this.hasAttribute("classname")) {
            const cls = this.getAttribute("classname");
            if (cls) {
                this._cssElement.classList.add(cls);
                this._currentClassName = cls;
            }
        }

        if (this.hasAttribute("width")) {
            this.style.width = this.getAttribute("width");
        }

        if (this.hasAttribute("height")) {
            this.style.height = this.getAttribute("height");
        }

        if (this.hasAttribute("alt")) {
            this._imgElement.alt = this.getAttribute("alt");
        }
    }

    // =========== Getters / Setters ===========

    get type() {
        return this.getAttribute("type") || IconType.BITMAP;
    }

    set type(val) {
        this.setAttribute("type", val);
    }

    get src() {
        return this.getAttribute("src");
    }

    set src(val) {
        const safeVal = URLSanitizer.validateAssetURL(val, { allowCrossOrigin: true });
        if (safeVal) {
            this._imgElement.src = safeVal;
            this.setAttribute("src", val);
        } else {
            this._imgElement.removeAttribute("src");
            this.removeAttribute("src");
        }
    }

    get classname() {
        return this.getAttribute("classname");
    }

    set classname(val) {
        if (this._currentClassName) {
            this._cssElement.classList.remove(this._currentClassName);
        }
        if (val) {
            this._cssElement.classList.add(val);
            this._currentClassName = val;
            this.setAttribute("classname", val);
        } else {
            this._currentClassName = null;
            this.removeAttribute("classname");
        }
    }

    get width() {
        return this.getAttribute("width");
    }

    set width(val) {
        this.setAttribute("width", val);
        this.style.width = val;
    }

    get height() {
        return this.getAttribute("height");
    }

    set height(val) {
        this.setAttribute("height", val);
        this.style.height = val;
    }

    get alt() {
        return this.getAttribute("alt");
    }

    set alt(val) {
        this.setAttribute("alt", val);
        this._imgElement.alt = val;
    }

    // =========== Attribute Changed Callback ===========

    attributeChangedCallback(name, oldValue, newValue) {
        // Guard against infinite recursion: setters call setAttribute which re-triggers this callback
        if (oldValue === newValue) return;

        super.attributeChangedCallback?.(name, oldValue, newValue);

        switch (name) {
            case 'type':
                this.type = newValue;
                break;
            case 'src':
                this.src = newValue;
                break;
            case 'classname':
                this.classname = newValue;
                break;
            case 'width':
                this.width = newValue;
                break;
            case 'height':
                this.height = newValue;
                break;
            case 'alt':
                this.alt = newValue;
                break;
        }
    }
}
