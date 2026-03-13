import TooltipPlacement from './TooltipPlacement.js';
import TooltipTrigger from './TooltipTrigger.js';
import TooltipEvent from '../../events/tooltip/TooltipEvent.js';

/**
 * Singleton positioning engine and trigger manager for tooltips.
 * Computes tooltip coordinates relative to a reference element,
 * handling viewport collision with flip, shift, and arrow clamping.
 * Manages trigger bindings, show/hide lifecycle, and delay timers.
 */
const TooltipManager = {

    /**
     * Track active auto-update cleanups per tooltip element.
     * @type {WeakMap<Element, Function>}
     */
    _activeCleanups: new WeakMap(),

    /**
     * Maps reference elements to binding objects.
     * Each binding: { reference, tooltip, triggers, listeners, showTimer, hideTimer, state }
     * @type {WeakMap<Element, Object>}
     */
    _bindings: new WeakMap(),

    // ========================================
    // Trigger Binding API
    // ========================================

    /**
     * Create a binding between a reference element and a tooltip.
     * Reads trigger config from the tooltip element attributes and attaches
     * the appropriate event listeners.
     *
     * @param {Element} reference - The reference element that triggers the tooltip
     * @param {Element} tooltip - The tooltip element
     */
    bind(reference, tooltip) {
        // Unbind any existing binding first
        if (this._bindings.has(reference)) {
            this.unbind(reference);
        }

        const triggers = TooltipTrigger.parse(tooltip.getAttribute('trigger'));

        const binding = {
            reference,
            tooltip,
            triggers,
            listeners: new Map(),
            showTimer: null,
            hideTimer: null,
            state: 'hidden'
        };

        this._bindings.set(reference, binding);
        this._attachTriggerListeners(reference, tooltip, triggers);
    },

    /**
     * Remove all listeners and timers for a reference element binding.
     *
     * @param {Element} reference - The reference element to unbind
     */
    unbind(reference) {
        const binding = this._bindings.get(reference);
        if (!binding) return;

        // Clear pending timers
        if (binding.showTimer !== null) {
            clearTimeout(binding.showTimer);
            binding.showTimer = null;
        }
        if (binding.hideTimer !== null) {
            clearTimeout(binding.hideTimer);
            binding.hideTimer = null;
        }

        // Detach all trigger listeners
        this._detachTriggerListeners(reference, binding.triggers);

        this._bindings.delete(reference);
    },

    // ========================================
    // Trigger Listener Management
    // ========================================

    /**
     * Attach event listeners for each trigger type in the triggers array.
     *
     * @param {Element} reference - The reference element
     * @param {Element} tooltip - The tooltip element
     * @param {string[]} triggers - Array of trigger type constants
     * @private
     */
    _attachTriggerListeners(reference, tooltip, triggers) {
        const binding = this._bindings.get(reference);
        if (!binding) return;

        for (const trigger of triggers) {
            switch (trigger) {
                case TooltipTrigger.HOVER:
                    this._attachHover(reference, tooltip, binding);
                    break;
                case TooltipTrigger.FOCUS:
                    this._attachFocus(reference, tooltip, binding);
                    break;
                case TooltipTrigger.CLICK:
                    this._attachClick(reference, tooltip, binding);
                    break;
                case TooltipTrigger.MANUAL:
                    // Manual attaches no listeners -- API-only control
                    break;
            }
        }
    },

    /**
     * Attach hover (mouseenter/mouseleave) listeners to a reference element.
     *
     * @param {Element} reference - The reference element
     * @param {Element} tooltip - The tooltip element
     * @param {Object} binding - The binding object
     * @private
     */
    _attachHover(reference, tooltip, binding) {
        const enterHandler = () => this._scheduleShow(reference, tooltip);
        const leaveHandler = () => this._scheduleHide(reference, tooltip);

        reference.addEventListener('mouseenter', enterHandler);
        reference.addEventListener('mouseleave', leaveHandler);

        binding.listeners.set('hover', { enterHandler, leaveHandler });
    },

    /**
     * Attach focus (focusin/focusout) listeners to a reference element.
     *
     * @param {Element} reference - The reference element
     * @param {Element} tooltip - The tooltip element
     * @param {Object} binding - The binding object
     * @private
     */
    _attachFocus(reference, tooltip, binding) {
        const focusInHandler = () => this._scheduleShow(reference, tooltip);
        const focusOutHandler = () => this._scheduleHide(reference, tooltip);

        reference.addEventListener('focusin', focusInHandler);
        reference.addEventListener('focusout', focusOutHandler);

        binding.listeners.set('focus', { focusInHandler, focusOutHandler });
    },

    /**
     * Attach click trigger listeners to a reference element.
     * Click toggles tooltip visibility. Enter and Space keys also toggle.
     *
     * @param {Element} reference - The reference element
     * @param {Element} tooltip - The tooltip element
     * @param {Object} binding - The binding object
     * @private
     */
    _attachClick(reference, tooltip, binding) {
        const clickHandler = (e) => {
            if (binding.state === 'visible') {
                this._scheduleHide(reference, tooltip);
            } else {
                this._scheduleShow(reference, tooltip);
            }
        };

        const keydownHandler = (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (binding.state === 'visible') {
                    this._scheduleHide(reference, tooltip);
                } else {
                    this._scheduleShow(reference, tooltip);
                }
            }
        };

        reference.addEventListener('click', clickHandler);
        reference.addEventListener('keydown', keydownHandler);

        binding.listeners.set('click', { clickHandler, keydownHandler });
    },

    /**
     * Attach document-level dismissal listeners for a click-triggered tooltip.
     * Called when tooltip becomes visible and trigger includes 'click'.
     * Adds pointerdown (click-outside) and keydown (Escape) on document.
     *
     * @param {Element} reference - The reference element
     * @param {Element} tooltip - The tooltip element
     * @param {Object} binding - The binding object
     * @private
     */
    _attachClickDismissal(reference, tooltip, binding) {
        if (!binding._dismissalListeners) {
            binding._dismissalListeners = new Map();
        }

        // Remove any existing dismissal listeners first
        this._detachClickDismissal(binding);

        const pointerdownHandler = (e) => {
            // Skip if click is on the reference (the reference click handler handles toggling)
            if (reference.contains(e.target)) return;
            // Skip if click is on the tooltip itself
            if (tooltip.contains(e.target)) return;
            // Click is outside both -- hide immediately
            this._doHide(reference, tooltip);
        };

        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                this._doHide(reference, tooltip);
            }
        };

        // Delay adding pointerdown listener by one tick to avoid the opening click
        // from immediately triggering click-outside dismissal
        setTimeout(() => {
            // Guard: tooltip may have been hidden before the timeout fires
            if (binding.state !== 'visible') return;
            document.addEventListener('pointerdown', pointerdownHandler);
            binding._dismissalListeners.set('pointerdown', pointerdownHandler);
        }, 0);

        document.addEventListener('keydown', escapeHandler);
        binding._dismissalListeners.set('keydown', escapeHandler);
    },

    /**
     * Remove document-level dismissal listeners for a click-triggered tooltip.
     * Called when tooltip hides.
     *
     * @param {Object} binding - The binding object
     * @private
     */
    _detachClickDismissal(binding) {
        if (!binding._dismissalListeners) return;

        const pointerdownHandler = binding._dismissalListeners.get('pointerdown');
        if (pointerdownHandler) {
            document.removeEventListener('pointerdown', pointerdownHandler);
            binding._dismissalListeners.delete('pointerdown');
        }

        const escapeHandler = binding._dismissalListeners.get('keydown');
        if (escapeHandler) {
            document.removeEventListener('keydown', escapeHandler);
            binding._dismissalListeners.delete('keydown');
        }
    },

    /**
     * Detach all trigger listeners from a reference element.
     *
     * @param {Element} reference - The reference element
     * @param {string[]} triggers - Array of trigger type constants
     * @private
     */
    _detachTriggerListeners(reference, triggers) {
        const binding = this._bindings.get(reference);
        if (!binding) return;

        for (const trigger of triggers) {
            const handlers = binding.listeners.get(trigger);
            if (!handlers) continue;

            switch (trigger) {
                case TooltipTrigger.HOVER:
                    reference.removeEventListener('mouseenter', handlers.enterHandler);
                    reference.removeEventListener('mouseleave', handlers.leaveHandler);
                    break;
                case TooltipTrigger.FOCUS:
                    reference.removeEventListener('focusin', handlers.focusInHandler);
                    reference.removeEventListener('focusout', handlers.focusOutHandler);
                    break;
                case TooltipTrigger.CLICK:
                    reference.removeEventListener('click', handlers.clickHandler);
                    reference.removeEventListener('keydown', handlers.keydownHandler);
                    this._detachClickDismissal(binding);
                    break;
            }

            binding.listeners.delete(trigger);
        }
    },

    // ========================================
    // Show/Hide Scheduling
    // ========================================

    /**
     * Schedule showing a tooltip with optional delay.
     * Cancels any pending hide timer. Fires TRIGGER event on the tooltip.
     *
     * @param {Element} reference - The reference element
     * @param {Element} tooltip - The tooltip element
     */
    _scheduleShow(reference, tooltip) {
        const binding = this._bindings.get(reference);
        if (!binding) return;

        // Cancel any pending hide
        if (binding.hideTimer !== null) {
            clearTimeout(binding.hideTimer);
            binding.hideTimer = null;
        }

        // Already visible or in the process of showing
        if (binding.state === 'visible' || binding.state === 'showing') return;

        // Fire TRIGGER event
        tooltip.fireEvent(TooltipEvent.TRIGGER, { triggerType: binding.triggers[0] });

        const showDelay = parseInt(tooltip.getAttribute('showDelay')) || 200;

        if (showDelay > 0) {
            binding.state = 'showing';
            binding.showTimer = setTimeout(() => {
                binding.showTimer = null;
                this._doShow(reference, tooltip);
            }, showDelay);
        } else {
            this._doShow(reference, tooltip);
        }
    },

    /**
     * Schedule hiding a tooltip with optional delay.
     * Cancels any pending show timer. Fires UNTRIGGER event on the tooltip.
     *
     * @param {Element} reference - The reference element
     * @param {Element} tooltip - The tooltip element
     */
    _scheduleHide(reference, tooltip) {
        const binding = this._bindings.get(reference);
        if (!binding) return;

        // Cancel any pending show
        if (binding.showTimer !== null) {
            clearTimeout(binding.showTimer);
            binding.showTimer = null;
        }

        // Already hidden or in the process of hiding
        if (binding.state === 'hidden' || binding.state === 'hiding') return;

        // Fire UNTRIGGER event
        tooltip.fireEvent(TooltipEvent.UNTRIGGER, {});

        const hideDelay = parseInt(tooltip.getAttribute('hideDelay')) || 0;

        if (hideDelay > 0) {
            binding.state = 'hiding';
            binding.hideTimer = setTimeout(() => {
                binding.hideTimer = null;
                this._doHide(reference, tooltip);
            }, hideDelay);
        } else {
            this._doHide(reference, tooltip);
        }
    },

    // ========================================
    // Show/Hide Lifecycle
    // ========================================

    /**
     * Perform the actual show operation.
     * Fires BEFORE_SHOW (cancelable), makes tooltip visible, positions it,
     * starts auto-update, and fires SHOW then SHOWN.
     *
     * @param {Element} reference - The reference element
     * @param {Element} tooltip - The tooltip element
     */
    _doShow(reference, tooltip) {
        const binding = this._bindings.get(reference);

        // Fire cancelable BEFORE_SHOW
        const allowed = tooltip.fireEvent(TooltipEvent.BEFORE_SHOW, {}, { cancelable: true });
        if (!allowed) {
            if (binding) binding.state = 'hidden';
            return;
        }

        // Make tooltip visible with fixed positioning
        tooltip.style.display = 'block';
        tooltip.style.position = 'fixed';

        // Get position options from tooltip
        const options = tooltip._getPositionOptions ? tooltip._getPositionOptions() : {};

        // Compute and apply position
        const result = this.computePosition(reference, tooltip, options);
        this.applyPosition(tooltip, result);

        // Start auto-update for scroll/resize tracking
        this.startAutoUpdate(reference, tooltip, options, (updateResult) => {
            this.applyPosition(tooltip, updateResult);
        });

        // Fire SHOW with placement info
        tooltip.fireEvent(TooltipEvent.SHOW, { placement: result.placement });

        // Fire SHOWN immediately (animation deferred to Phase 97)
        tooltip.fireEvent(TooltipEvent.SHOWN, {});

        if (binding) {
            binding.state = 'visible';

            // Attach click-outside and Escape dismissal for click-triggered tooltips
            if (binding.triggers.includes(TooltipTrigger.CLICK)) {
                this._attachClickDismissal(binding.reference, tooltip, binding);
            }
        }
    },

    /**
     * Perform the actual hide operation.
     * Fires BEFORE_HIDE (cancelable), hides tooltip, stops auto-update,
     * and fires HIDE then HIDDEN.
     *
     * @param {Element} reference - The reference element
     * @param {Element} tooltip - The tooltip element
     */
    _doHide(reference, tooltip) {
        const binding = this._bindings.get(reference);

        // Fire cancelable BEFORE_HIDE
        const allowed = tooltip.fireEvent(TooltipEvent.BEFORE_HIDE, {}, { cancelable: true });
        if (!allowed) {
            if (binding) binding.state = 'visible';
            return;
        }

        // Hide tooltip
        tooltip.style.display = 'none';

        // Stop auto-update
        this.stopAutoUpdate(tooltip);

        // Fire HIDE then HIDDEN immediately (animation deferred to Phase 97)
        tooltip.fireEvent(TooltipEvent.HIDE, {});
        tooltip.fireEvent(TooltipEvent.HIDDEN, {});

        if (binding) {
            // Detach click dismissal listeners if present
            this._detachClickDismissal(binding);
            binding.state = 'hidden';
        }
    },

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
     * Attaches scroll, resize, and ResizeObserver listeners to keep the tooltip
     * aligned with its reference element. Optionally uses a RAF loop for sticky mode.
     *
     * @param {Element} reference - Reference element
     * @param {Element} tooltip - Tooltip element
     * @param {Object} options - Positioning options
     * @param {Function} callback - Called with position result on each update
     * @returns {Function} Cleanup function to stop auto-updating
     */
    startAutoUpdate(reference, tooltip, options, callback) {
        // Stop any existing auto-update for this tooltip
        if (this._activeCleanups.has(tooltip)) {
            const existingCleanup = this._activeCleanups.get(tooltip);
            existingCleanup();
        }

        const update = () => {
            const result = this.computePosition(reference, tooltip, options);
            callback(result);
        };

        // --- Scroll listeners on all scrollable ancestors ---
        const scrollableAncestors = this._getScrollableAncestors(reference);
        const scrollHandler = () => update();

        for (const ancestor of scrollableAncestors) {
            ancestor.addEventListener('scroll', scrollHandler, { passive: true });
        }

        // --- Window resize listener ---
        const resizeHandler = () => update();
        window.addEventListener('resize', resizeHandler, { passive: true });

        // --- ResizeObserver on reference element ---
        let resizeObserver = null;
        if (typeof ResizeObserver !== 'undefined') {
            resizeObserver = new ResizeObserver(() => update());
            resizeObserver.observe(reference);
        }

        // --- Sticky RAF loop ---
        let rafId = null;
        let lastRect = null;

        if (options && options.sticky) {
            const stickyLoop = () => {
                const currentRect = reference.getBoundingClientRect();

                if (lastRect === null ||
                    currentRect.x !== lastRect.x ||
                    currentRect.y !== lastRect.y ||
                    currentRect.width !== lastRect.width ||
                    currentRect.height !== lastRect.height) {
                    lastRect = currentRect;
                    update();
                }

                rafId = requestAnimationFrame(stickyLoop);
            };

            rafId = requestAnimationFrame(stickyLoop);
        }

        // --- Cleanup function ---
        const cleanup = () => {
            // Remove scroll listeners
            for (const ancestor of scrollableAncestors) {
                ancestor.removeEventListener('scroll', scrollHandler);
            }

            // Remove window resize listener
            window.removeEventListener('resize', resizeHandler);

            // Disconnect ResizeObserver
            if (resizeObserver) {
                resizeObserver.disconnect();
                resizeObserver = null;
            }

            // Cancel RAF loop
            if (rafId !== null) {
                cancelAnimationFrame(rafId);
                rafId = null;
            }

            // Remove from active cleanups
            this._activeCleanups.delete(tooltip);
        };

        this._activeCleanups.set(tooltip, cleanup);
        return cleanup;
    },

    /**
     * Stop auto-updating a tooltip by looking up its cleanup function.
     *
     * @param {Element} tooltip - The tooltip element to stop auto-updating
     */
    stopAutoUpdate(tooltip) {
        const cleanup = this._activeCleanups.get(tooltip);
        if (typeof cleanup === 'function') {
            cleanup();
        }
    },

    /**
     * Apply a computePosition result to a tooltip element's DOM.
     * Sets position styles, data-placement attribute, and arrow offsets.
     *
     * @param {Element} tooltip - The tooltip element
     * @param {{ x: number, y: number, placement: string, arrowX: number|null, arrowY: number|null }} result - Position result from computePosition
     */
    applyPosition(tooltip, result) {
        tooltip.style.left = result.x + 'px';
        tooltip.style.top = result.y + 'px';

        // Set data-placement on the wrapper element for CSS arrow positioning
        const wrapper = tooltip.shadowRoot
            ? tooltip.shadowRoot.querySelector('.tooltip-wrapper')
            : tooltip.querySelector('.tooltip-wrapper');

        if (wrapper) {
            wrapper.dataset.placement = result.placement;
        }

        // Position the arrow element
        const arrowEl = tooltip.shadowRoot
            ? tooltip.shadowRoot.querySelector('.tooltip-arrow')
            : tooltip.querySelector('.tooltip-arrow');

        if (arrowEl) {
            if (result.arrowX !== null) {
                arrowEl.style.left = result.arrowX + 'px';
            } else {
                arrowEl.style.left = '';
            }

            if (result.arrowY !== null) {
                arrowEl.style.top = result.arrowY + 'px';
            } else {
                arrowEl.style.top = '';
            }
        }
    },

    /**
     * Get all scrollable ancestor elements of a given element.
     * An element is scrollable if its computed overflow is auto, scroll, or overlay,
     * and its scroll dimensions exceed client dimensions.
     *
     * @param {Element} element - The element to walk up from
     * @returns {Element[]} Array of scrollable ancestor elements (does not include window)
     * @private
     */
    _getScrollableAncestors(element) {
        const ancestors = [];
        let current = element.parentElement;

        while (current) {
            const style = getComputedStyle(current);
            const overflowY = style.overflowY;
            const overflowX = style.overflowX;

            const isScrollableY = (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') &&
                current.scrollHeight > current.clientHeight;
            const isScrollableX = (overflowX === 'auto' || overflowX === 'scroll' || overflowX === 'overlay') &&
                current.scrollWidth > current.clientWidth;

            if (isScrollableY || isScrollableX) {
                ancestors.push(current);
            }

            current = current.parentElement;
        }

        return ancestors;
    }
};

export default TooltipManager;
