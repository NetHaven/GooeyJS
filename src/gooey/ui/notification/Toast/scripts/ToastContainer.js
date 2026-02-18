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
