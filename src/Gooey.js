import Application from './ui/Application.js';

export default class Gooey {
    constructor() {
        customElements.define("ui-application", Application);
    }
}

window.addEventListener('load', function() { new Gooey();}());
