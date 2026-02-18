import ToastPosition from './ToastPosition.js';

/**
 * ToastContainer - Static singleton utility that manages position-specific
 * container divs on document.body for toast notification stacking.
 *
 * Follows the ComponentRegistry pattern: static class with static Maps,
 * no instantiation, no Observable inheritance. Each of the six ToastPosition
 * values maps to at most one fixed-position container div (singleton per position).
 *
 * Also manages a single shared ARIA live region for screen reader announcements.
 *
 * Usage:
 *   const container = ToastContainer.getContainer(ToastPosition.TOP_RIGHT);
 *   container.appendChild(toastElement);
 *   ToastContainer.announce("File saved successfully");
 */
export default class ToastContainer {

    /** @type {Map<string, HTMLDivElement>} Position string -> container div */
    static #containers = new Map();

    /** @type {HTMLDivElement|null} Shared ARIA live region element */
    static #liveRegion = null;

    /** @type {Set<string>} Valid position values for O(1) lookup */
    static #VALID_POSITIONS = new Set([
        ToastPosition.TOP_LEFT, ToastPosition.TOP_CENTER, ToastPosition.TOP_RIGHT,
        ToastPosition.BOTTOM_LEFT, ToastPosition.BOTTOM_CENTER, ToastPosition.BOTTOM_RIGHT
    ]);

    /** @type {number} Maximum simultaneously visible toasts */
    static #maxVisible = 5;

    /** @type {Set<HTMLElement>} Currently visible toast instances */
    static #activeToasts = new Set();

    /** @type {Array<HTMLElement>} FIFO queue of toasts waiting to be shown */
    static #queue = [];

    /** @type {boolean} Whether duplicate prevention is enabled */
    static #preventDuplicates = true;

    /** @type {number} Duplicate suppression window in milliseconds */
    static #duplicateWindow = 500;

    /** @type {Map<string, number>} Duplicate tracking: "message|type" -> timestamp */
    static #recentToasts = new Map();

    /**
     * Get or create a position-specific container div on document.body.
     * Returns the same div for repeated calls with the same position (singleton).
     * @param {string} position - One of ToastPosition values (e.g., "top-right")
     * @returns {HTMLDivElement} The fixed-position container div for that position
     * @throws {Error} If position is not a valid ToastPosition value
     */
    static getContainer(position) {
        if (!ToastContainer.#VALID_POSITIONS.has(position)) {
            throw new Error(`ToastContainer: invalid position '${position}'`);
        }

        if (ToastContainer.#containers.has(position)) {
            return ToastContainer.#containers.get(position);
        }

        const container = ToastContainer.#createContainer(position);
        ToastContainer.#containers.set(position, container);
        document.body.appendChild(container);

        ToastContainer.#ensureLiveRegion();

        return container;
    }

    /**
     * Announce a message to screen readers via the ARIA live region.
     * Uses the clear-then-set pattern with a 100ms delay to ensure
     * assistive technologies detect the content change.
     * @param {string} message - The message text to announce
     * @param {string} [priority='polite'] - 'polite' or 'assertive'
     */
    static announce(message, priority = 'polite') {
        ToastContainer.#ensureLiveRegion();

        const region = ToastContainer.#liveRegion;
        region.setAttribute('aria-live', priority);

        region.textContent = '';
        setTimeout(() => {
            region.textContent = message;
        }, 100);
    }

    /**
     * Remove all containers and the ARIA live region from document.body.
     * Clears internal state. Primarily for testing and full application teardown.
     */
    static destroy() {
        // Clear queue and tracking state
        ToastContainer.#activeToasts.clear();
        ToastContainer.#queue.length = 0;
        ToastContainer.#recentToasts.clear();

        for (const [position, container] of ToastContainer.#containers) {
            if (container.parentNode) {
                container.parentNode.removeChild(container);
            }
        }
        ToastContainer.#containers.clear();

        if (ToastContainer.#liveRegion && ToastContainer.#liveRegion.parentNode) {
            ToastContainer.#liveRegion.parentNode.removeChild(ToastContainer.#liveRegion);
            ToastContainer.#liveRegion = null;
        }
    }

    // ========================================
    // Queue Management API
    // ========================================

    /**
     * Set the maximum number of simultaneously visible toasts.
     * Toasts beyond this limit are queued and shown as visible ones hide.
     * @param {number} max - Maximum visible toasts (must be >= 1)
     */
    static setMaxVisible(max) {
        ToastContainer.#maxVisible = Math.max(1, max);
    }

    /**
     * Get the current maximum visible toast limit.
     * @returns {number}
     */
    static getMaxVisible() {
        return ToastContainer.#maxVisible;
    }

    /**
     * Request permission to show a toast. If under the max visible limit,
     * the toast is registered as active and allowed to show. If at the limit,
     * the toast is queued for later display (FIFO).
     *
     * Called by Toast.show() before positioning.
     *
     * @param {HTMLElement} toast - The toast instance requesting to show
     * @returns {boolean} true if the toast can show now; false if queued
     */
    static _requestShow(toast) {
        if (ToastContainer.#activeToasts.size < ToastContainer.#maxVisible) {
            ToastContainer.#activeToasts.add(toast);
            return true;
        }
        ToastContainer.#queue.push(toast);
        return false;
    }

    /**
     * Notify that a toast has hidden. Removes it from the active set and
     * dequeues the next waiting toast if any (FIFO order).
     *
     * Dequeued toasts are added to the active set here and shown via
     * _performShow() directly, bypassing duplicate/queue re-checks.
     *
     * Called by Toast after hide event fires and before DOM removal.
     *
     * @param {HTMLElement} toast - The toast instance that just hid
     */
    static _notifyHide(toast) {
        ToastContainer.#activeToasts.delete(toast);
        if (ToastContainer.#queue.length > 0) {
            const next = ToastContainer.#queue.shift();
            ToastContainer.#activeToasts.add(next);
            next._performShow();
        }
    }

    // ========================================
    // Duplicate Prevention API
    // ========================================

    /**
     * Enable or disable duplicate toast prevention.
     * When enabled, toasts with the same message+type within the duplicate
     * window are suppressed.
     * @param {boolean} enabled
     */
    static setPreventDuplicates(enabled) {
        ToastContainer.#preventDuplicates = !!enabled;
    }

    /**
     * Set the duplicate suppression window in milliseconds.
     * Toasts with the same message+type within this window are suppressed.
     * @param {number} ms - Window in milliseconds (must be >= 0)
     */
    static setDuplicateWindow(ms) {
        ToastContainer.#duplicateWindow = Math.max(0, ms);
    }

    /**
     * Check whether a toast with the given message and type is a duplicate
     * of one recently shown. Uses a time-window approach: if the same
     * message+type key was shown within the duplicate window, returns true.
     *
     * Also records the current toast for future duplicate checks.
     * Stale entries are cleaned lazily during this check.
     *
     * @param {string} message - The toast message
     * @param {string} type - The toast type
     * @returns {boolean} true if this is a duplicate that should be suppressed
     */
    static _isDuplicate(message, type) {
        if (!ToastContainer.#preventDuplicates) return false;

        const key = `${message}|${type}`;
        const lastShown = ToastContainer.#recentToasts.get(key);
        const now = Date.now();

        if (lastShown && (now - lastShown) < ToastContainer.#duplicateWindow) {
            return true;
        }

        ToastContainer.#recentToasts.set(key, now);
        return false;
    }

    // ========================================
    // Bulk Operations
    // ========================================

    /**
     * Remove all visible and queued toasts immediately.
     * Calls hide() on each active toast (which triggers animation and cleanup).
     * Clears the queue, active set, and duplicate tracking.
     */
    static clear() {
        // Hide all visible toasts (triggers cleanup via hide())
        for (const toast of ToastContainer.#activeToasts) {
            toast.hide();
        }
        ToastContainer.#activeToasts.clear();

        // Clear queued toasts (never shown, no cleanup needed)
        ToastContainer.#queue.length = 0;

        // Clear duplicate tracking
        ToastContainer.#recentToasts.clear();
    }

    /**
     * Create a container div with fixed positioning, flexbox layout, and gap spacing.
     * @param {string} position - Validated ToastPosition value
     * @returns {HTMLDivElement} The configured container element
     */
    static #createContainer(position) {
        const container = document.createElement('div');
        container.className = `gooey-toast-container gooey-toast-${position}`;
        container.style.position = 'fixed';
        container.style.zIndex = '1700';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '8px';
        container.style.pointerEvents = 'none';

        ToastContainer.#applyPositionStyles(container, position);

        return container;
    }

    /**
     * Apply position-specific CSS styles (top/bottom/left/right offsets,
     * flex-direction override for bottom positions, alignment).
     * @param {HTMLDivElement} container - The container element to style
     * @param {string} position - Validated ToastPosition value
     */
    static #applyPositionStyles(container, position) {
        const padding = '16px';

        switch (position) {
            case 'top-left':
                container.style.top = padding;
                container.style.left = padding;
                container.style.alignItems = 'flex-start';
                break;
            case 'top-center':
                container.style.top = padding;
                container.style.left = '50%';
                container.style.transform = 'translateX(-50%)';
                container.style.alignItems = 'center';
                break;
            case 'top-right':
                container.style.top = padding;
                container.style.right = padding;
                container.style.alignItems = 'flex-end';
                break;
            case 'bottom-left':
                container.style.bottom = padding;
                container.style.left = padding;
                container.style.flexDirection = 'column-reverse';
                container.style.alignItems = 'flex-start';
                break;
            case 'bottom-center':
                container.style.bottom = padding;
                container.style.left = '50%';
                container.style.transform = 'translateX(-50%)';
                container.style.flexDirection = 'column-reverse';
                container.style.alignItems = 'center';
                break;
            case 'bottom-right':
                container.style.bottom = padding;
                container.style.right = padding;
                container.style.flexDirection = 'column-reverse';
                container.style.alignItems = 'flex-end';
                break;
        }
    }

    /**
     * Ensure the shared ARIA live region exists on document.body.
     * Creates it once; subsequent calls are no-ops.
     */
    static #ensureLiveRegion() {
        if (ToastContainer.#liveRegion) return;

        const region = document.createElement('div');
        region.id = 'gooey-toast-live-region';
        region.setAttribute('role', 'status');
        region.setAttribute('aria-live', 'polite');
        region.setAttribute('aria-atomic', 'true');
        region.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;';

        document.body.appendChild(region);
        ToastContainer.#liveRegion = region;
    }
}
