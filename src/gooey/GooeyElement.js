import Observable from './events/Observable.js';

export default class GooeyElement extends Observable {
    static get observedAttributes() {
        return ['class', 'id'];
    }

    constructor () {
        super();
    }
}