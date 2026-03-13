import TooltipPlacement from './TooltipPlacement.js';

/**
 * Singleton positioning engine for tooltips.
 * Computes tooltip coordinates relative to a reference element,
 * handling viewport collision with flip, shift, and arrow clamping.
 */
const TooltipManager = {

    /**
     * Track active auto-update cleanups per tooltip element.
     * @type {WeakMap<Element, Function>}
     */
    _activeCleanups: new WeakMap(),

    /**
     * Compute the position of a tooltip relative to a reference element.
     *
     * @param {Element|{getBoundingClientRect: Function}} reference - Reference element or virtual reference
     * @param {Element} tooltip - The tooltip element to position
     * @param {Object} [options={}] - Positioning options
     * @param {string} [options.placement="top"] - Desired placement from TooltipPlacement
     * @param {string} [options.offset="0,8"] - "skidding,distance" offset values
     * @param {boolean} [options.flipOnOverflow=true] - Flip to opposite side on overflow
     * @param {boolean} [options.shiftOnOverflow=true] - Shift along cross-axis on overflow
     * @param {boolean} [options.arrow=true] - Compute arrow position
     * @param {Element|null} [options.viewport=null] - Viewport element (null = window)
     * @param {number} [options.arrowPadding=4] - Min distance from arrow to tooltip edge
     * @returns {{ x: number, y: number, placement: string, arrowX: number|null, arrowY: number|null }}
     */
    computePosition(reference, tooltip, options = {}) {
        const {
            placement = TooltipPlacement.TOP,
            offset = "0,8",
            flipOnOverflow = true,
            shiftOnOverflow = true,
            arrow = true,
            viewport = null,
            arrowPadding = 4
        } = options;

        // 1. Get reference rect
        const refRect = reference.getBoundingClientRect();

        // 2. Measure tooltip dimensions
        const tipWidth = tooltip.offsetWidth || tooltip.getBoundingClientRect().width;
        const tipHeight = tooltip.offsetHeight || tooltip.getBoundingClientRect().height;

        // 3. Parse offset
        const [skidding, distance] = this._parseOffset(offset);

        // 4. Get boundary rect
        const boundary = this._getBoundary(viewport);

        // 5. Handle auto placement
        let resolvedPlacement = placement;
        if (placement === TooltipPlacement.AUTO) {
            resolvedPlacement = this._resolveAutoPlacement(refRect, tipWidth, tipHeight, skidding, distance, boundary);
        }

        // 6. Compute base position
        let { x, y } = this._computeBasePosition(refRect, tipWidth, tipHeight, resolvedPlacement, skidding, distance);

        // 7. Flip if needed
        if (flipOnOverflow) {
            const flipped = this._flip(x, y, resolvedPlacement, refRect, tipWidth, tipHeight, boundary, skidding, distance);
            x = flipped.x;
            y = flipped.y;
            resolvedPlacement = flipped.placement;
        }

        // 8. Shift if needed
        if (shiftOnOverflow) {
            const shifted = this._shift(x, y, resolvedPlacement, tipWidth, tipHeight, boundary);
            x = shifted.x;
            y = shifted.y;
        }

        // 9. Compute arrow position
        let arrowX = null;
        let arrowY = null;
        if (arrow) {
            const arrowResult = this._computeArrow(x, y, resolvedPlacement, refRect, tipWidth, tipHeight, arrowPadding);
            arrowX = arrowResult.arrowX;
            arrowY = arrowResult.arrowY;
        }

        // 10. Return result
        return { x, y, placement: resolvedPlacement, arrowX, arrowY };
    },

    /**
     * Compute the base (x, y) position for a given placement.
     *
     * @param {DOMRect} refRect - Reference element bounding rect
     * @param {number} tipWidth - Tooltip width
     * @param {number} tipHeight - Tooltip height
     * @param {string} placement - Target placement
     * @param {number} skidding - Skidding offset (along placement axis)
     * @param {number} distance - Distance offset (away from reference)
     * @returns {{ x: number, y: number }}
     * @private
     */
    _computeBasePosition(refRect, tipWidth, tipHeight, placement, skidding, distance) {
        let x = 0;
        let y = 0;

        switch (placement) {
            // Top placements
            case TooltipPlacement.TOP:
                x = refRect.left + refRect.width / 2 - tipWidth / 2 + skidding;
                y = refRect.top - tipHeight - distance;
                break;
            case TooltipPlacement.TOP_START:
                x = refRect.left + skidding;
                y = refRect.top - tipHeight - distance;
                break;
            case TooltipPlacement.TOP_END:
                x = refRect.right - tipWidth + skidding;
                y = refRect.top - tipHeight - distance;
                break;

            // Bottom placements
            case TooltipPlacement.BOTTOM:
                x = refRect.left + refRect.width / 2 - tipWidth / 2 + skidding;
                y = refRect.bottom + distance;
                break;
            case TooltipPlacement.BOTTOM_START:
                x = refRect.left + skidding;
                y = refRect.bottom + distance;
                break;
            case TooltipPlacement.BOTTOM_END:
                x = refRect.right - tipWidth + skidding;
                y = refRect.bottom + distance;
                break;

            // Left placements
            case TooltipPlacement.LEFT:
                x = refRect.left - tipWidth - distance;
                y = refRect.top + refRect.height / 2 - tipHeight / 2 + skidding;
                break;
            case TooltipPlacement.LEFT_START:
                x = refRect.left - tipWidth - distance;
                y = refRect.top + skidding;
                break;
            case TooltipPlacement.LEFT_END:
                x = refRect.left - tipWidth - distance;
                y = refRect.bottom - tipHeight + skidding;
                break;

            // Right placements
            case TooltipPlacement.RIGHT:
                x = refRect.right + distance;
                y = refRect.top + refRect.height / 2 - tipHeight / 2 + skidding;
                break;
            case TooltipPlacement.RIGHT_START:
                x = refRect.right + distance;
                y = refRect.top + skidding;
                break;
            case TooltipPlacement.RIGHT_END:
                x = refRect.right + distance;
                y = refRect.bottom - tipHeight + skidding;
                break;
        }

        return { x, y };
    },

    /**
     * Resolve auto placement by testing all 12 placements and selecting the one
     * with the least total viewport overflow.
     *
     * @param {DOMRect} refRect - Reference element bounding rect
     * @param {number} tipWidth - Tooltip width
     * @param {number} tipHeight - Tooltip height
     * @param {number} skidding - Skidding offset
     * @param {number} distance - Distance offset
     * @param {{ top: number, left: number, right: number, bottom: number }} boundary - Viewport boundary
     * @returns {string} Best placement
     * @private
     */
    _resolveAutoPlacement(refRect, tipWidth, tipHeight, skidding, distance, boundary) {
        let bestPlacement = TooltipPlacement.TOP;
        let leastOverflow = Infinity;

        for (const candidate of TooltipPlacement.ALL) {
            const { x, y } = this._computeBasePosition(refRect, tipWidth, tipHeight, candidate, skidding, distance);
            const overflow = this._computeTotalOverflow(x, y, tipWidth, tipHeight, boundary);

            if (overflow < leastOverflow) {
                leastOverflow = overflow;
                bestPlacement = candidate;
            }

            // Perfect fit, no need to check further
            if (overflow === 0) break;
        }

        return bestPlacement;
    },

    /**
     * Compute the total overflow of a positioned tooltip against a boundary.
     *
     * @param {number} x - Tooltip x position
     * @param {number} y - Tooltip y position
     * @param {number} tipWidth - Tooltip width
     * @param {number} tipHeight - Tooltip height
     * @param {{ top: number, left: number, right: number, bottom: number }} boundary - Viewport boundary
     * @returns {number} Sum of overflow on all four sides (0 = no overflow)
     * @private
     */
    _computeTotalOverflow(x, y, tipWidth, tipHeight, boundary) {
        const overflowTop = Math.max(0, boundary.top - y);
        const overflowBottom = Math.max(0, (y + tipHeight) - boundary.bottom);
        const overflowLeft = Math.max(0, boundary.left - x);
        const overflowRight = Math.max(0, (x + tipWidth) - boundary.right);
        return overflowTop + overflowBottom + overflowLeft + overflowRight;
    },

    /**
     * Flip the tooltip to a different placement when it overflows the boundary.
     * Tries opposite placement first, then adjacent placements on the other axis.
     *
     * @param {number} x - Current x position
     * @param {number} y - Current y position
     * @param {string} placement - Current placement
     * @param {DOMRect} refRect - Reference element bounding rect
     * @param {number} tipWidth - Tooltip width
     * @param {number} tipHeight - Tooltip height
     * @param {{ top: number, left: number, right: number, bottom: number }} boundary - Viewport boundary
     * @param {number} skidding - Skidding offset
     * @param {number} distance - Distance offset
     * @returns {{ x: number, y: number, placement: string }}
     * @private
     */
    _flip(x, y, placement, refRect, tipWidth, tipHeight, boundary, skidding, distance) {
        const currentOverflow = this._computeTotalOverflow(x, y, tipWidth, tipHeight, boundary);

        // No overflow, no flip needed
        if (currentOverflow === 0) {
            return { x, y, placement };
        }

        // Build candidate list: opposite first, then adjacent axis placements
        const candidates = [];

        // 1. Try opposite placement
        const opposite = TooltipPlacement.OPPOSITES[placement];
        if (opposite) {
            candidates.push(opposite);
        }

        // 2. Try adjacent axis placements
        const primaryAxis = this._getPrimaryAxis(placement);
        const adjacentPlacements = primaryAxis === 'x'
            ? [TooltipPlacement.TOP, TooltipPlacement.BOTTOM]
            : [TooltipPlacement.LEFT, TooltipPlacement.RIGHT];

        for (const adj of adjacentPlacements) {
            if (adj !== placement && adj !== opposite) {
                candidates.push(adj);
            }
        }

        // Evaluate all candidates
        let bestX = x;
        let bestY = y;
        let bestPlacement = placement;
        let bestOverflow = currentOverflow;

        for (const candidate of candidates) {
            const pos = this._computeBasePosition(refRect, tipWidth, tipHeight, candidate, skidding, distance);
            const overflow = this._computeTotalOverflow(pos.x, pos.y, tipWidth, tipHeight, boundary);

            if (overflow < bestOverflow) {
                bestOverflow = overflow;
                bestX = pos.x;
                bestY = pos.y;
                bestPlacement = candidate;
            }

            if (overflow === 0) break;
        }

        return { x: bestX, y: bestY, placement: bestPlacement };
    },

    /**
     * Shift the tooltip along the cross-axis to keep it within the boundary.
     *
     * @param {number} x - Current x position
     * @param {number} y - Current y position
     * @param {string} placement - Current placement
     * @param {number} tipWidth - Tooltip width
     * @param {number} tipHeight - Tooltip height
     * @param {{ top: number, left: number, right: number, bottom: number }} boundary - Viewport boundary
     * @returns {{ x: number, y: number }}
     * @private
     */
    _shift(x, y, placement, tipWidth, tipHeight, boundary) {
        const primaryAxis = this._getPrimaryAxis(placement);

        if (primaryAxis === 'y') {
            // Top/bottom placements: clamp x (cross-axis)
            x = Math.max(boundary.left, Math.min(x, boundary.right - tipWidth));
        } else {
            // Left/right placements: clamp y (cross-axis)
            y = Math.max(boundary.top, Math.min(y, boundary.bottom - tipHeight));
        }

        return { x, y };
    },

    /**
     * Compute arrow position relative to the tooltip, clamped to arrowPadding.
     *
     * @param {number} x - Tooltip x position
     * @param {number} y - Tooltip y position
     * @param {string} placement - Current placement
     * @param {DOMRect} refRect - Reference element bounding rect
     * @param {number} tipWidth - Tooltip width
     * @param {number} tipHeight - Tooltip height
     * @param {number} arrowPadding - Min distance from arrow to tooltip edge
     * @returns {{ arrowX: number|null, arrowY: number|null }}
     * @private
     */
    _computeArrow(x, y, placement, refRect, tipWidth, tipHeight, arrowPadding) {
        const primaryAxis = this._getPrimaryAxis(placement);

        if (primaryAxis === 'y') {
            // Top/bottom: arrow along x-axis
            const refCenterX = refRect.left + refRect.width / 2;
            const arrowX = Math.max(arrowPadding, Math.min(refCenterX - x, tipWidth - arrowPadding));
            return { arrowX, arrowY: null };
        } else {
            // Left/right: arrow along y-axis
            const refCenterY = refRect.top + refRect.height / 2;
            const arrowY = Math.max(arrowPadding, Math.min(refCenterY - y, tipHeight - arrowPadding));
            return { arrowX: null, arrowY };
        }
    },

    /**
     * Get the primary axis for a placement.
     *
     * @param {string} placement - Placement string
     * @returns {'x'|'y'} 'y' for top/bottom, 'x' for left/right
     * @private
     */
    _getPrimaryAxis(placement) {
        if (placement.startsWith('top') || placement.startsWith('bottom')) {
            return 'y';
        }
        return 'x';
    },

    /**
     * Get the viewport boundary rect.
     *
     * @param {Element|null} viewport - Viewport element, or null for window
     * @returns {{ top: number, left: number, right: number, bottom: number }}
     * @private
     */
    _getBoundary(viewport) {
        if (viewport && typeof viewport.getBoundingClientRect === 'function') {
            return viewport.getBoundingClientRect();
        }
        return {
            top: 0,
            left: 0,
            right: window.innerWidth,
            bottom: window.innerHeight
        };
    },

    /**
     * Parse an offset string into [skidding, distance].
     *
     * @param {string} offsetStr - Comma-separated offset values "skidding,distance"
     * @returns {[number, number]} [skidding, distance]
     * @private
     */
    _parseOffset(offsetStr) {
        if (typeof offsetStr !== 'string') {
            return [0, 8];
        }

        const parts = offsetStr.split(',');
        const skidding = parseFloat(parts[0]);
        const distance = parts.length > 1 ? parseFloat(parts[1]) : 8;

        return [
            isNaN(skidding) ? 0 : skidding,
            isNaN(distance) ? 8 : distance
        ];
    },

    /**
     * Start auto-updating tooltip position.
     * Stub for Plan 02 -- returns a no-op cleanup function.
     *
     * @param {Element} reference - Reference element
     * @param {Element} tooltip - Tooltip element
     * @param {Object} options - Positioning options
     * @param {Function} callback - Called with position result on each update
     * @returns {Function} Cleanup function to stop auto-updating
     */
    startAutoUpdate(reference, tooltip, options, callback) {
        const cleanup = () => {};
        this._activeCleanups.set(tooltip, cleanup);
        return cleanup;
    },

    /**
     * Stop auto-updating by calling the cleanup function.
     *
     * @param {Function} cleanupFn - Cleanup function returned by startAutoUpdate
     */
    stopAutoUpdate(cleanupFn) {
        if (typeof cleanupFn === 'function') {
            cleanupFn();
        }
    }
};

export default TooltipManager;
