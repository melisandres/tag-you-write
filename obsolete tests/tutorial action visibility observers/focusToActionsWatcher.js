/**
 * FocusToActionsWatcher
 * 
 * Watches for when tutorial field(s) become invisible while action buttons are visible.
 * The tutorial system determines which field(s) to watch based on the current substep.
 * 
 * Triggers callback when:
 * - None of the watched fields are visible (all scrolled out of view)
 * - Actions area is visible
 */
export class FocusToActionsWatcher {
    constructor({
        onDisengage,
        fieldSelectors,  // Array of CSS selectors for fields to watch
        actionsSelector  // CSS selector for actions/buttons area
    }) {
        this.onDisengage = onDisengage;
        this.actionsElement = document.querySelector(actionsSelector);
        this.actionsVisible = false;

        // Store field elements and their visibility state
        this.fieldElements = [];
        this.fieldVisibility = new Map(); // Map of element -> isVisible

        // Single observer for all fields
        this.fieldObserver = new IntersectionObserver(
            this.handleFieldIntersection.bind(this),
            { threshold: 0 }
        );

        // Observer for actions area
        this.actionsObserver = new IntersectionObserver(
            this.handleActionsIntersection.bind(this),
            { threshold: 0 }
        );

        // Start observing the actions area
        if (this.actionsElement) {
            this.actionsObserver.observe(this.actionsElement);
        }

        // Start observing the specified fields
        this.startWatchingFields(fieldSelectors);
    }

    /**
     * Find and start observing field elements based on selectors
     */
    startWatchingFields(selectors) {
        // Clear any existing observations
        this.stopWatchingFields();

        if (!selectors || selectors.length === 0) return;

        selectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                this.fieldElements.push(element);
                this.fieldVisibility.set(element, true); // Assume visible initially
                this.fieldObserver.observe(element);
            });
        });
    }

    /**
     * Stop observing all fields
     */
    stopWatchingFields() {
        this.fieldElements.forEach(element => {
            this.fieldObserver.unobserve(element);
        });
        this.fieldElements = [];
        this.fieldVisibility.clear();
    }

    /**
     * Check if any of the watched fields are currently visible
     */
    areAnyFieldsVisible() {
        return Array.from(this.fieldVisibility.values()).some(visible => visible === true);
    }

    /**
     * Handle intersection changes for field elements
     */
    handleFieldIntersection(entries) {
        let shouldCheck = false;

        for (const entry of entries) {
            // Update visibility state for this field
            this.fieldVisibility.set(entry.target, entry.isIntersecting);
            shouldCheck = true;
        }

        // Only check if we got updates and actions are visible
        if (shouldCheck && this.actionsVisible) {
            this.checkDisengageCondition();
        }
    }

    /**
     * Handle intersection changes for actions area
     */
    handleActionsIntersection(entries) {
        for (const entry of entries) {
            if (entry.target === this.actionsElement) {
                this.actionsVisible = entry.isIntersecting;
                
                // Check condition when actions visibility changes
                if (this.actionsVisible) {
                    this.checkDisengageCondition();
                }
            }
        }
    }

    /**
     * Check if disengage condition is met and trigger callback
     */
    checkDisengageCondition() {
        // Trigger if: actions are visible AND none of the fields are visible
        if (this.actionsVisible && !this.areAnyFieldsVisible() && this.fieldElements.length > 0) {
            this.onDisengage(this.fieldElements);
        }
    }

    /**
     * Update which fields to watch (useful when tutorial substep changes)
     */
    updateFields(selectors) {
        this.startWatchingFields(selectors);
    }

    /**
     * Clean up observers when no longer needed
     */
    destroy() {
        this.stopWatchingFields();
        
        if (this.actionsElement) {
            this.actionsObserver.unobserve(this.actionsElement);
        }
        
        this.fieldObserver.disconnect();
        this.actionsObserver.disconnect();
    }
}
