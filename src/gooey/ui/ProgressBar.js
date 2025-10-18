import Component from './Component.js';
import Template from '../util/Template.js';

export default class ProgressBar extends Component {
    static get observedAttributes() {
        return ['value', 'max', 'indeterminate', 'visible'];
    }

    constructor() {
        super();
        this._value = 0;
        this._max = 100;
        this._indeterminate = false;
        
        Template.activate("ui-ProgressBar", this);
        this.render();
    }

    connectedCallback() {
        this.render();
    }

    render() {
        const progressBar = this.querySelector('.progress-bar');
        const progressFill = this.querySelector('.progress-fill');
        const progressText = this.querySelector('.progress-text');

        if (!progressBar || !progressFill || !progressText) return;

        if (this._indeterminate) {
            progressBar.classList.add('indeterminate');
            progressText.textContent = '';
        } else {
            progressBar.classList.remove('indeterminate');
            const percentage = Math.round((this._value / this._max) * 100);
            progressFill.style.width = `${percentage}%`;
            progressText.textContent = `${percentage}%`;
        }
    }

    attributeChangedCallback(name, oldValue, newValue) {
        switch (name) {
            case 'value':
                this._value = parseFloat(newValue) || 0;
                this.render();
                break;
            case 'max':
                this._max = parseFloat(newValue) || 100;
                this.render();
                break;
            case 'indeterminate':
                this._indeterminate = newValue !== null && newValue !== 'false';
                this.render();
                break;
        }
    }

    get value() {
        return this._value;
    }

    set value(val) {
        this._value = parseFloat(val) || 0;
        this.setAttribute('value', this._value);
    }

    get max() {
        return this._max;
    }

    set max(val) {
        this._max = parseFloat(val) || 100;
        this.setAttribute('max', this._max);
    }

    get indeterminate() {
        return this._indeterminate;
    }

    set indeterminate(val) {
        this._indeterminate = Boolean(val);
        if (this._indeterminate) {
            this.setAttribute('indeterminate', '');
        } else {
            this.removeAttribute('indeterminate');
        }
    }

    setValue(value) {
        this.value = value;
    }

    setIndeterminate(indeterminate) {
        this.indeterminate = indeterminate;
    }
}
