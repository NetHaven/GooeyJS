import Observable from '../events/Observable.js';

export default class GooeyElement extends Observable {
    static get observedAttributes() {
        return ['class', 'id'];
    }

    constructor () {
        super();
    }

    get class() {
        return this.getAttribute("class");
    }

    get id() {
        return this.getAttribute("id");
    }

    set class(val) {
        this.setAttribute("class", val);
    }

    set id(val) {
        this.setAttribute("id", val);
    }
}