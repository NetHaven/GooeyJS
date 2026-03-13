/**
 * Placement constants for tooltip positioning.
 * Defines 12 directional placements plus AUTO mode.
 */
export default class TooltipPlacement {

    // Primary placements
    static TOP = "top";
    static TOP_START = "top-start";
    static TOP_END = "top-end";

    static BOTTOM = "bottom";
    static BOTTOM_START = "bottom-start";
    static BOTTOM_END = "bottom-end";

    static LEFT = "left";
    static LEFT_START = "left-start";
    static LEFT_END = "left-end";

    static RIGHT = "right";
    static RIGHT_START = "right-start";
    static RIGHT_END = "right-end";

    // Automatic placement (selects best fit)
    static AUTO = "auto";

    /**
     * Map of each placement to its opposite for flip logic.
     * @type {Object<string, string>}
     */
    static OPPOSITES = {
        [TooltipPlacement.TOP]: TooltipPlacement.BOTTOM,
        [TooltipPlacement.TOP_START]: TooltipPlacement.BOTTOM_START,
        [TooltipPlacement.TOP_END]: TooltipPlacement.BOTTOM_END,
        [TooltipPlacement.BOTTOM]: TooltipPlacement.TOP,
        [TooltipPlacement.BOTTOM_START]: TooltipPlacement.TOP_START,
        [TooltipPlacement.BOTTOM_END]: TooltipPlacement.TOP_END,
        [TooltipPlacement.LEFT]: TooltipPlacement.RIGHT,
        [TooltipPlacement.LEFT_START]: TooltipPlacement.RIGHT_START,
        [TooltipPlacement.LEFT_END]: TooltipPlacement.RIGHT_END,
        [TooltipPlacement.RIGHT]: TooltipPlacement.LEFT,
        [TooltipPlacement.RIGHT_START]: TooltipPlacement.LEFT_START,
        [TooltipPlacement.RIGHT_END]: TooltipPlacement.LEFT_END
    };

    /**
     * All 12 non-auto placements for auto-placement iteration.
     * @type {string[]}
     */
    static ALL = [
        TooltipPlacement.TOP,
        TooltipPlacement.TOP_START,
        TooltipPlacement.TOP_END,
        TooltipPlacement.BOTTOM,
        TooltipPlacement.BOTTOM_START,
        TooltipPlacement.BOTTOM_END,
        TooltipPlacement.LEFT,
        TooltipPlacement.LEFT_START,
        TooltipPlacement.LEFT_END,
        TooltipPlacement.RIGHT,
        TooltipPlacement.RIGHT_START,
        TooltipPlacement.RIGHT_END
    ];
}
