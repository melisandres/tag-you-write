/**
 * ResponsiveNavManager - Assigns priority attributes to navigation items
 * CSS handles responsive behavior based on these attributes
 */
export class ResponsiveNavManager {
    constructor() {
        this.priorities = {
            'dashboard': 1,  // Always visible on small screens (if applicable)
            'filters': 2,   // Always visible on small screens (if applicable) - Filters switcher (consolidates filter, search, category)
            'notifications': 3,  // Always visible on small screens
            // Note: search, filter, and category no longer exist as separate nav links - they're inside the filters dropdown
            'browse': 4,
            'tutorial': 5,
            'language': 6,
            'newGame': 7,
            'contact': 8,
            'logout': 9,
            'home': 10
        };
        this.init();
    }

    /**
     * Initialize the responsive nav manager
     */
    init() {
        this.assignPriorities();
        // CSS will handle responsive behavior - no JavaScript resize events needed
    }

    /**
     * Assign priority attributes to nav items
     */
    assignPriorities() {
        // Add priority classes to main nav items
        const mainNavItems = document.querySelectorAll('nav .nav-link');
        mainNavItems.forEach(item => {
            const itemType = this.getItemType(item);
            const priority = this.priorities[itemType] || 999;
            item.setAttribute('data-priority-nav', priority);
        });
        
        // Add priority classes to overflow menu items
        const overflowItems = document.querySelectorAll('.overflow-menu .nav-link');
        overflowItems.forEach(item => {
            const itemType = this.getItemType(item);
            const priority = this.priorities[itemType] || 999;
            item.setAttribute('data-priority-overflow', priority);
        });
    }

    /**
     * Get item type from various possible attributes
     * @param {Element} item - The nav item element
     * @returns {string} - The item type
     */
    getItemType(item) {
        // Check for data-item attribute first
        if (item.dataset.item) {
            return item.dataset.item;
        }
        
        // Check for class names that might indicate item type
        if (item.classList.contains('filters-switcher')) return 'filters';
        if (item.classList.contains('category')) return 'category';
        if (item.classList.contains('home')) return 'home';
        if (item.classList.contains('dashboard-nav')) return 'dashboard';
        if (item.classList.contains('texts') || item.classList.contains('browse')) return 'browse';
        if (item.classList.contains('search')) return 'search';
        if (item.classList.contains('filter')) return 'filter';
        if (item.classList.contains('tutorial-switcher')) return 'tutorial';
        if (item.classList.contains('language-switcher')) return 'language';
        if (item.classList.contains('notifications')) return 'notifications';
        if (item.classList.contains('newGame')) return 'newGame';
        if (item.classList.contains('contact')) return 'contact';
        if (item.classList.contains('writers') && item.href && item.href.includes('logout')) return 'logout';
        
        return 'unknown';
    }

    // CSS will handle all responsive behavior based on data-priority attributes

    /**
     * Update priorities dynamically (for future smart prioritization)
     * @param {Object} newPriorities - New priority object
     */
    updatePriorities(newPriorities) {
        this.priorities = { ...this.priorities, ...newPriorities };
        this.assignPriorities();
        // CSS will handle responsive behavior automatically
    }

    /**
     * Get current priority for an item type
     * @param {string} itemType - The item type
     * @returns {number} - The current priority
     */
    getPriority(itemType) {
        return this.priorities[itemType] || 999;
    }
}
