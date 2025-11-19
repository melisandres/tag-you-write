import { eventBus } from './eventBus.js';

/**
 * FiltersSwitcherManager
 * Manages the filters switcher dropdown that contains filter, search, and category options
 */
export class FiltersSwitcherManager {
    constructor() {
        this.filtersSwitchers = document.querySelectorAll('.filters-switcher');
        this.menuManager = window.menuManager;
        this.dataManager = window.dataManager;
        this.filterMenu = document.querySelector('.filter-menu');
        this.searchMenu = document.querySelector('.search-menu');
        this.searchInput = this.searchMenu ? this.searchMenu.querySelector('.search-input') : null;
        this.categoryHeader = document.getElementById('categoryHeader');
        
        if (this.filtersSwitchers.length > 0) {
            this.initFiltersSwitcher();
            this.setupActiveStateTracking();
        }
    }

    initFiltersSwitcher() {
        this.filtersSwitchers.forEach((switcher, index) => {
            const currentFiltersElement = switcher.querySelector('.current-filters');
            const filterMenuLinks = switcher.querySelectorAll('.filters-dropdown a[data-filter-menu]');
            
            // Toggle dropdown when clicking the current filters
            if (currentFiltersElement) {
                currentFiltersElement.addEventListener('click', (e) => {
                    e.stopPropagation();
                    switcher.classList.toggle('open');
                });
            }
            
            // Handle clicks on dropdown menu items
            filterMenuLinks.forEach(link => {
                const menuName = link.getAttribute('data-filter-menu');
                
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    // Toggle the respective menu via menuManager
                    if (this.menuManager && menuName) {
                        this.menuManager.toggleMenu(menuName);
                    }
                    
                    // Close the dropdown
                    switcher.classList.remove('open');
                });
            });
            
            // Handle clicks on view-all and hide-all actions
            const viewAllLink = switcher.querySelector('a[data-filter-action="view-all"]');
            const hideAllLink = switcher.querySelector('a[data-filter-action="hide-all"]');
            
            if (viewAllLink) {
                viewAllLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.showAllMenus();
                    switcher.classList.remove('open');
                });
            }
            
            if (hideAllLink) {
                hideAllLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.hideAllMenus();
                    switcher.classList.remove('open');
                });
            }
        });
        
        // Close dropdowns when clicking outside (single listener for all switchers)
        if (this.filtersSwitchers.length > 0) {
            document.addEventListener('click', (e) => {
                this.filtersSwitchers.forEach(switcher => {
                    if (!switcher.contains(e.target)) {
                        switcher.classList.remove('open');
                    }
                });
            });
        }
    }

    /**
     * Setup tracking for menu active states
     * Watches for changes to menu visibility AND applied filters/search/categories
     */
    setupActiveStateTracking() {
        // Use MutationObserver to watch for class changes on menus (for visibility tracking)
        const observer = new MutationObserver(() => {
            this.updateActiveStates();
        });

        // Observe filter and search menus for visibility changes
        if (this.filterMenu) {
            observer.observe(this.filterMenu, { attributes: true, attributeFilter: ['class'] });
        }
        if (this.searchMenu) {
            observer.observe(this.searchMenu, { attributes: true, attributeFilter: ['class'] });
        }
        if (this.categoryHeader) {
            observer.observe(this.categoryHeader, { attributes: true, attributeFilter: ['class'] });
        }

        // Listen to events that indicate filters/search/categories have changed
        eventBus.on('filterApplied', () => {
            this.updateActiveStates();
        });
        
        eventBus.on('searchApplied', () => {
            this.updateActiveStates();
        });
        
        eventBus.on('categoryChanged', () => {
            this.updateActiveStates();
        });

        // Also listen to input changes for search (in case search is typed but not yet applied)
        if (this.searchInput) {
            this.searchInput.addEventListener('input', () => {
                this.updateActiveStates();
            });
        }

        // Initial update
        this.updateActiveStates();
    }

    /**
     * Check if filters are actually applied (not at default state)
     * URL is the source of truth, not cache
     */
    hasAppliedFilters() {
        // Check URL parameters (source of truth)
        const urlParams = new URLSearchParams(window.location.search);
        const hasContributed = urlParams.get('hasContributed');
        const bookmarked = urlParams.get('bookmarked');
        const gameState = urlParams.get('gameState');
        
        // Check if any filter is not at default state
        return (hasContributed !== null && hasContributed !== 'all') || 
               (gameState !== null && gameState !== 'all') || 
               (bookmarked !== null && bookmarked !== 'all');
    }

    /**
     * Check if search is actually applied (has search term)
     * URL is the source of truth, but also check input for immediate feedback while typing
     */
    hasAppliedSearch() {
        // Try to get search input if not already cached (in case it's initialized later)
        if (!this.searchInput && this.searchMenu) {
            this.searchInput = this.searchMenu.querySelector('.search-input');
        }
        
        // Check search input value (for immediate feedback while typing)
        if (this.searchInput && this.searchInput.value.trim().length > 0) {
            return true;
        }
        
        // Check URL parameters (source of truth)
        const urlParams = new URLSearchParams(window.location.search);
        const search = urlParams.get('search');
        return search !== null && search.trim().length > 0;
    }

    /**
     * Check if category is actually applied
     * URL is the source of truth, not cache
     */
    hasAppliedCategory() {
        // Check URL parameters (source of truth)
        const urlParams = new URLSearchParams(window.location.search);
        const category = urlParams.get('category');
        return category !== null && category !== '';
    }

    /**
     * Update active states for dropdown items and filters nav-link
     * Dropdown items have two separate states:
     * - 'active' class: filters/search/categories are APPLIED (pink icon)
     * - 'visible' class: menu is currently VISIBLE (greyed background)
     * Main nav-link is active if menus are VISIBLE OR filters/search/categories are APPLIED
     */
    updateActiveStates() {
        // Check which menus are visible (for greyed background state)
        const filterVisible = this.filterMenu && this.filterMenu.classList.contains('visible');
        const searchVisible = this.searchMenu && this.searchMenu.classList.contains('visible');
        const categoryVisible = this.categoryHeader && this.categoryHeader.classList.contains('visible');

        // Check if filters/search/categories are actually applied (for pink icon state)
        const hasFilters = this.hasAppliedFilters();
        const hasSearch = this.hasAppliedSearch();
        const hasCategory = this.hasAppliedCategory();

        // Update all filters switchers
        this.filtersSwitchers.forEach(switcher => {
            const filterLink = switcher.querySelector('a[data-filter-menu="filter"]');
            const searchLink = switcher.querySelector('a[data-filter-menu="search"]');
            const categoryLink = switcher.querySelector('a[data-filter-menu="category"]');

            // Update dropdown items - two separate states:
            // 'active' = filters/search/categories are APPLIED (pink icon)
            // 'visible' = menu is currently VISIBLE (greyed background)
            if (filterLink) {
                filterLink.classList.toggle('active', hasFilters);
                filterLink.classList.toggle('visible', filterVisible);
            }
            if (searchLink) {
                searchLink.classList.toggle('active', hasSearch);
                searchLink.classList.toggle('visible', searchVisible);
            }
            if (categoryLink) {
                categoryLink.classList.toggle('active', hasCategory);
                categoryLink.classList.toggle('visible', categoryVisible);
            }

            // Update filters nav-link - active if any menu is VISIBLE OR any filters/search/categories are APPLIED
            const anyMenuVisible = filterVisible || searchVisible || categoryVisible;
            const anyFilterApplied = hasFilters || hasSearch || hasCategory;
            switcher.classList.toggle('active', anyMenuVisible || anyFilterApplied);
        });
    }

    /**
     * Show all available menus (filter, search, category)
     */
    showAllMenus() {
        if (!this.menuManager) return;
        
        // Show filter menu if it exists
        if (this.filterMenu) {
            if (!this.filterMenu.classList.contains('visible')) {
                this.menuManager.toggleMenu('filter');
            }
        }
        
        // Show search menu if it exists
        if (this.searchMenu) {
            if (!this.searchMenu.classList.contains('visible')) {
                this.menuManager.toggleMenu('search');
            }
        }
        
        // Show category header if it exists
        if (this.categoryHeader) {
            if (!this.categoryHeader.classList.contains('visible')) {
                this.menuManager.toggleMenu('category');
            }
        }
    }

    /**
     * Hide all available menus (filter, search, category)
     */
    hideAllMenus() {
        if (!this.menuManager) return;
        
        // Hide filter menu if it exists and is visible
        if (this.filterMenu && this.filterMenu.classList.contains('visible')) {
            this.menuManager.toggleMenu('filter');
        }
        
        // Hide search menu if it exists and is visible
        if (this.searchMenu && this.searchMenu.classList.contains('visible')) {
            this.menuManager.toggleMenu('search');
        }
        
        // Hide category header if it exists and is visible
        if (this.categoryHeader && this.categoryHeader.classList.contains('visible')) {
            this.menuManager.toggleMenu('category');
        }
    }
}

