import Event from "../../Event.js";

/**
 * Event constants for text-based form components (TextField, TextArea, RichTextEditor)
 * Contains common events shared by all text elements
 */
export default class TextElementEvent extends Event {
    // Common events for all text elements
    static INPUT = "input";
    static CHANGE = "change";
    static INVALID = "invalid";
    
    // TextArea-specific events
    static SELECT = "select";

    constructor() {
        super();
    }
}