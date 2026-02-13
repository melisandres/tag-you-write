import { eventBus } from './eventBus.js';

/**
 * DropdownCoordinator - Coordinates main navigation dropdowns via eventBus
 * Ensures only one dropdown is open at a time by closing others when one opens
 * 
 * Architecture: Uses eventBus for loose coupling - managers emit events, coordinator listens
 */
export class DropdownCoordinator {
    constructor() {
        this.init();
    }

    /**
     * Initialize the dropdown coordinator
     * Listens for dropdown opening events and closes others
     */
    init() {
        // Listen for any dropdown opening event
        eventBus.on('dropdownOpening', (data) => {
            const { element } = data;
            this.closeAllMainNavDropdowns(element);
        });
    }

    /**
     * Close all main navigation dropdowns
     * This prevents dropdowns from stacking on top of each other
     * 
     * @param {Element} excludeElement - Optional element to exclude from closing (the one being opened)
     */
    closeAllMainNavDropdowns(excludeElement = null) {
        // Close filters switcher dropdowns
        const filtersSwitchers = document.querySelectorAll('.filters-switcher');
        filtersSwitchers.forEach(switcher => {
            if (switcher !== excludeElement) {
                switcher.classList.remove('open');
            }
        });

        // Close language switcher dropdowns
        const languageSwitchers = document.querySelectorAll('.language-switcher');
        languageSwitchers.forEach(switcher => {
            if (switcher !== excludeElement) {
                switcher.classList.remove('open');
            }
        });

        // Close tutorial switcher dropdowns
        const tutorialSwitchers = document.querySelectorAll('.tutorial-switcher');
        tutorialSwitchers.forEach(switcher => {
            if (switcher !== excludeElement) {
                switcher.classList.remove('open');
            }
        });

        // Close dev mode toggle dropdowns
        const devModeToggles = document.querySelectorAll('.dev-mode-toggle');
        devModeToggles.forEach(toggle => {
            if (toggle !== excludeElement) {
                toggle.classList.remove('open');
            }
        });

        // Close places switcher dropdowns
        const placesSwitchers = document.querySelectorAll('.places-switcher');
        placesSwitchers.forEach(switcher => {
            if (switcher !== excludeElement) {
                switcher.classList.remove('open');
            }
        });

        // Close me switcher dropdowns
        const meSwitchers = document.querySelectorAll('.me-switcher');
        meSwitchers.forEach(switcher => {
            if (switcher !== excludeElement) {
                switcher.classList.remove('open');
            }
        });
    }
}

