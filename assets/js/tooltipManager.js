/**
 * TooltipManager - Handles the initialization and updating of custom tooltips
 * Note: For dynamically rendered content, tooltips should be set directly 
 * in the rendering code with both data-i18n-tooltip and data-tooltip-text attributes
 */
export class TooltipManager {
    constructor() {
        this.localization = window.i18n;
        this.init();
    }

    /**
     * Initialize tooltips within a container
     * @param {HTMLElement} container - The container to initialize tooltips in
     */
    init() {
        this.updateTooltips();
    }

    /**
     * Update tooltips within a container
     * @param {HTMLElement} container - The container to update tooltips in
     */
    updateTooltips() {
        // Delegate to the localization system's method
        if (this.localization && this.localization.updateTooltips) {
            this.localization.updateTooltips();
        }
    }
}
