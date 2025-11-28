import Container from '../../../Container.js';
import LayoutType from '../../../layout/Layout/scripts/LayoutType.js';
import FormFactor from '../../../FormFactor.js';
import Template from '../../../../util/Template.js';

export default class AppPanel extends Container {
    constructor () {
        super();

        Template.activate("ui-AppPanel", this);
        this.layout = LayoutType.BORDER;
        
        // Handle formfactor attribute
        if (this.hasAttribute("formfactor")) {
            this.formfactor = this.getAttribute("formfactor");
        }
    }
    
    get formfactor() {
        return this.getAttribute("formfactor");
    }
    
    set formfactor(value) {
        // Validate the formfactor value (case-insensitive)
        const validFormFactors = [FormFactor.DESKTOP, FormFactor.MOBILE, FormFactor.TABLET];
        
        if (value && !validFormFactors.includes(value.toUpperCase())) {
            console.warn(`Invalid formfactor value: ${value}. Valid values are: ${validFormFactors.join(', ')}`);
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
