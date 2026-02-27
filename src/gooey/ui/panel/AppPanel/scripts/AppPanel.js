import Container from '../../../Container.js';
import LayoutType from '../../../layout/Layout/scripts/LayoutType.js';
import FormFactor from '../../../FormFactor.js';
import Template from '../../../../util/Template.js';
import Logger from '../../../../logging/Logger.js';

export default class AppPanel extends Container {
    constructor () {
        super();

        Template.activate("ui-AppPanel", this.shadowRoot);
    }

    connectedCallback() {
        super.connectedCallback?.();
        if (!this._appPanelInit) {
            this._appPanelInit = true;
            if (!this.hasAttribute("layout")) {
                this.layout = LayoutType.BORDER;
            }
            if (this.hasAttribute("formfactor")) {
                this.formfactor = this.getAttribute("formfactor");
            }
        }
    }
    
    get formfactor() {
        return this.getAttribute("formfactor");
    }
    
    set formfactor(value) {
        // Validate the formfactor value (case-insensitive)
        const validFormFactors = [FormFactor.DESKTOP, FormFactor.MOBILE, FormFactor.TABLET];
        
        if (value && !validFormFactors.includes(value.toUpperCase())) {
            Logger.warn({ code: "APPPANEL_INVALID_FORMFACTOR", value, validValues: validFormFactors }, "Invalid formfactor value: %s. Valid values are: %s", value, validFormFactors.join(", "));
            return;
        }
        
        if (value) {
            // Store normalized value (uppercase)
            const normalizedValue = value.toUpperCase();
            this.setAttribute("formfactor", normalizedValue);
            // Add CSS class for styling hooks
            this.classList.add(`formfactor-${normalizedValue.toLowerCase()}`);
        } else {
            this.removeAttribute("formfactor");
            // Remove all formfactor classes
            validFormFactors.forEach(ff => {
                this.classList.remove(`formfactor-${ff.toLowerCase()}`);
            });
        }
    }
}
