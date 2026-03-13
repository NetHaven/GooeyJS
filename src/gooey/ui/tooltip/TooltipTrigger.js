/**
 * Trigger mode constants for tooltip activation.
 * Defines how a tooltip responds to user interaction.
 */
export default class TooltipTrigger {

    static HOVER = "hover";
    static FOCUS = "focus";
    static CLICK = "click";
    static MANUAL = "manual";

    /**
     * All valid trigger types.
     * @type {string[]}
     */
    static ALL = [
        TooltipTrigger.HOVER,
        TooltipTrigger.FOCUS,
        TooltipTrigger.CLICK,
        TooltipTrigger.MANUAL
    ];

    /**
     * Parse a space-separated trigger string into an array of valid trigger types.
     * Returns [HOVER, FOCUS] as the default for null/empty input.
     *
     * @param {string|null} str - Space-separated trigger string (e.g. "hover focus")
     * @returns {string[]} Array of valid trigger constants
     */
    static parse(str) {
        if (!str || typeof str !== 'string' || str.trim() === '') {
            return [TooltipTrigger.HOVER, TooltipTrigger.FOCUS];
        }

        const tokens = str.split(/\s+/).map(t => t.toLowerCase());
        const valid = tokens.filter(t => TooltipTrigger.ALL.includes(t));

        return valid.length > 0 ? valid : [TooltipTrigger.HOVER, TooltipTrigger.FOCUS];
    }
}
