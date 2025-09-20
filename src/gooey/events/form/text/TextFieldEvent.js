import TextElementEvent from './TextElementEvent.js';

/**
 * Event constants for TextField component
 * Extends TextElementEvent with TextField-specific events
 */
export default class TextFieldEvent extends TextElementEvent {
    // TextField-specific events
    static ENTER_PRESSED = "enterPressed";

    constructor() {
        super();
    }
}