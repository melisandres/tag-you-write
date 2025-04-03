/**
 * TooltipManager - Handles the initialization and updating of custom tooltips
 */
export class TooltipManager {
    constructor() {
        this.localization = window.i18n;
        this.initTooltips();
    }

    /**
     * Initialize tooltips within a container
     * @param {HTMLElement} container - The container to initialize tooltips in
     */
    initTooltips(container = document) {
        // Handle elements with data-i18n-tooltip attribute
        this.updateTooltips(container);
    }

    /**
     * Update tooltips within a container
     * @param {HTMLElement} container - The container to update tooltips in
     */
    updateTooltips(container = document) {
        container.querySelectorAll('[data-i18n-tooltip]').forEach(element => {
            this.updateTooltipText(element);
        });
    }

    /**
     * Update tooltip text for a specific element
     * @param {HTMLElement} element - The element to update
     */
    updateTooltipText(element) {
        const key = element.getAttribute('data-i18n-tooltip');
        const tooltipText = this.localization.translate(key);
        element.setAttribute('data-tooltip-text', tooltipText);
    }
}
