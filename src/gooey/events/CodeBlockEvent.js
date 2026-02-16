import Event from "./Event.js";

/**
 * Event constants for CodeBlock component
 * Fired when code is copied to clipboard
 */
export default class CodeBlockEvent extends Event {
    static COPY = "copy";
    static HIGHLIGHT_ERROR = "highlight-error";

    constructor() {
        super();
    }
}
