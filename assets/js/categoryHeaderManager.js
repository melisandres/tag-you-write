import { eventBus } from './eventBus.js';
import { SVGManager } from './svgManager.js';

export class CategoryHeaderManager {
    constructor() {
        this.categoryHeader = document.getElementById('categoryHeader');
        // Category link is now in the filters dropdown, not a standalone nav link
        this.categoryNavLink = document.querySelector('a[data-filter-menu="category"]');
        this.menuManager = window.menuManager; // Assuming MenuManager is global
        this.dataManager = window.dataManager;
        this.searchMenu = document.querySelector('.search-menu');
        this.searchInput = this.searchMenu ? this.searchMenu.querySelector('.search-input') : null;
        
        // No mapping needed - we'll construct the translation key directly
        
        this.initializeCloseButton();
        this.initializeFilterIcons();
        this.initializeFromURL();
        this.setupEventListeners();
        // Note: bindNavLink() is no longer needed - FiltersSwitcherManager handles clicks
        // Set initial nav link state
        this.updateNavLink();
        // Update filter icons on initial load (with a small delay to ensure dataManager is ready)
        // Also check URL directly in case filters were loaded from URL
        setTimeout(() => {
            this.updateFilterIcons();
        }, 100);
    }
    
    /**
     * Initialize the close button for the category header
     */
    initializeCloseButton() {
        if (!this.categoryHeader) return;
        
        const headerActions = this.categoryHeader.querySelector('.header-actions');
        if (!headerActions) return;
        
        // Check if close button already exists
        if (headerActions.querySelector('.close-category-menu')) return;
        
        // Create close button
        const closeButton = document.createElement('button');
        closeButton.className = 'close-category-menu';
        closeButton.setAttribute('aria-label', 'Close category menu');
        closeButton.innerHTML = SVGManager.xSVG;
        
        // Bind click event
        closeButton.addEventListener('click', () => {
            this.closeCategoryHeader();
        });
        
        headerActions.appendChild(closeButton);
    }
    
    /**
     * Close the category header (keeps category active)
     */
    closeCategoryHeader() {
        // Just close the header, don't clear the category
        this.hideCategoryHeader();
    }
    
    /**
     * Toggle the category header visibility
     * Note: Click handling is done by FiltersSwitcherManager, this is just a helper method
     */
    toggleCategoryHeader() {
        if (this.menuManager) {
            // Toggle via MenuManager
            this.menuManager.toggleMenu('category');
            // Note: updateNavLink is called separately based on category selection, not visibility
        }
    }
    
    /**
     * Update the category nav link to show active state
     * Active = category is selected (not just header visible)
     */
    updateNavLink(isVisible = null) {
        if (!this.categoryNavLink) return;
        
        // Check if a category is currently selected (from URL or DataManager)
        const urlParams = new URLSearchParams(window.location.search);
        const category = urlParams.get('category');
        const hasCategory = category !== null && category !== '';
        
        // Use 'active' class when a category is selected (like filter's active state)
        this.categoryNavLink.classList.toggle('active', hasCategory);
    }
    
    /**
     * Setup event listeners for category changes
     */
    setupEventListeners() {
        // Listen for category changes from DataManager
        eventBus.on('categoryChanged', (category) => {
            this.updateCategoryHeader(category);
            this.updateNavLink(); // Update nav link active state when category changes
        });
        
        // Listen for filter changes to update icons
        eventBus.on('filterApplied', () => {
            this.updateFilterIcons();
        });
        
        // Listen for search changes to update icons
        eventBus.on('searchApplied', () => {
            this.updateFilterIcons();
        });
        
        // Listen to search input changes for immediate feedback
        // Note: search input might not exist yet, so we'll set it up when available
        this.setupSearchInputListener();
        
        // Also listen for search menu toggling in case input becomes available
        eventBus.on('searchMenuToggled', () => {
            this.setupSearchInputListener();
            this.updateFilterIcons();
        });
        
        // Listen for game list updates to update the count
        eventBus.on('gamesListUpdated', (games) => this.updateGameCount(games.length));
        eventBus.on('gamesAdded', (games) => this.updateGameCountFromAddition(games));
        eventBus.on('gamesRemoved', (gameIds) => this.updateGameCountFromRemoval(gameIds));
        
        // Listen for URL changes (if using history API)
        window.addEventListener('popstate', () => {
            this.initializeFromURL();
            this.updateFilterIcons();
        });
        
        // Also listen for when filters might be loaded from URL (FilterManager initialization)
        // Use a small delay to catch filters loaded from URL on page load
        setTimeout(() => {
            this.updateFilterIcons();
        }, 200);

    }
    
    /**
     * Initialize from URL parameters
     */
    initializeFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const category = urlParams.get('category');
        
        this.updateCategoryHeader(category);
    }
    
    /**
     * Update the category header display
     */
    updateCategoryHeader(category) {
        if (!this.categoryHeader) return;
        
        if (category) {
            const categoryParts = category.split('.');
            let translationKey;
            
            if (categoryParts.length === 1) {
                // Broad category like "myStories" -> "category-header.myStories."
                translationKey = `category-header.${category}.`;
            } else {
                // Subcategory like "myStories.urgent" -> "category-header.myStories.urgent"
                translationKey = `category-header.${categoryParts[0]}.${categoryParts[1]}`;
            }
            
            this.showCategoryHeader(translationKey);
        } else {
            // Show "All stories" when no category is selected
            this.showCategoryHeader('category-header.all');
        }
    }
    
    /**
     * Show the category header with the given translation key
     */
    showCategoryHeader(translationKey) {
        if (!this.categoryHeader) return;
        
        // Update the display text using localization
        const categoryName = this.categoryHeader.querySelector('.category-name');
        if (categoryName) {
            // Set the data-i18n attribute for localization
            categoryName.setAttribute('data-i18n', translationKey);
            
            // Use the localization system to translate
            if (window.i18n) {
                categoryName.textContent = window.i18n.translate(translationKey);
            } else {
                // Fallback if i18n is not available
                categoryName.textContent = translationKey;
            }
        }
        
        // Show the header
        this.categoryHeader.classList.add('visible');
        
        // Update menu positions and category header state
        if (this.menuManager) {
        this.menuManager.setCategoryHeaderVisible(true);
        }
        
        // Update nav link active state (based on category selection)
        this.updateNavLink();
    }
    
    /**
     * Hide the category header
     */
    hideCategoryHeader() {
        if (!this.categoryHeader) return;
        
        // Hide the header
        this.categoryHeader.classList.remove('visible');
        
        // Update menu positions and category header state
        if (this.menuManager) {
        this.menuManager.setCategoryHeaderVisible(false);
        }
        
        // Update nav link active state (based on category selection)
        this.updateNavLink();
    }
    
    /**
     * Get the current category from the header
     */
    getCurrentCategory() {
        if (!this.categoryHeader || !this.categoryHeader.classList.contains('visible')) {
            return null;
        }
        
        const categoryName = this.categoryHeader.querySelector('.category-name');
        return categoryName ? categoryName.textContent : null;
    }
    
    
    /**
     * Update game count in the header
     */
    updateGameCount(count) {
        if (!this.categoryHeader) return;
        
        const gameCount = this.categoryHeader.querySelector('.game-count');
        if (gameCount) {
            gameCount.textContent = `(${count})`;
        }
    }
    
    /**
     * Update game count when games are added
     */
    updateGameCountFromAddition(games) {
        if (!this.categoryHeader) return;
        
        const gameCount = this.categoryHeader.querySelector('.game-count');
        if (gameCount) {
            const currentCount = parseInt(gameCount.textContent.match(/\d+/)?.[0] || '0');
            const newCount = currentCount + (Array.isArray(games) ? games.length : 1);
            gameCount.textContent = `(${newCount})`;
        }
    }
    
    /**
     * Update game count when games are removed
     */
    updateGameCountFromRemoval(gameIds) {
        if (!this.categoryHeader) return;
        
        const gameCount = this.categoryHeader.querySelector('.game-count');
        if (gameCount) {
            const currentCount = parseInt(gameCount.textContent.match(/\d+/)?.[0] || '0');
            const newCount = Math.max(0, currentCount - (Array.isArray(gameIds) ? gameIds.length : 1));
            gameCount.textContent = `(${newCount})`;
        }
    }
    
    /**
     * Initialize filter icons container next to game count
     */
    initializeFilterIcons() {
        if (!this.categoryHeader) return;
        
        const gameCount = this.categoryHeader.querySelector('.game-count');
        if (!gameCount) return;
        
        // Check if icons container already exists
        let iconsContainer = this.categoryHeader.querySelector('.filter-status-icons');
        if (!iconsContainer) {
            iconsContainer = document.createElement('span');
            iconsContainer.className = 'filter-status-icons';
            // Insert after game-count
            gameCount.parentNode.insertBefore(iconsContainer, gameCount.nextSibling);
        }
    }
    
    /**
     * Check if filters are actually applied (not just menu visible)
     */
    hasAppliedFilters() {
        if (!this.dataManager) return false;
        
        const filters = this.dataManager.getFilters();
        if (!filters) return false;
        
        // Check if any filter is not at default state
        return filters.hasContributed !== null || 
               filters.gameState !== 'all' || 
               filters.bookmarked !== null;
    }
    
    /**
     * Setup search input listener (may be called multiple times if input becomes available later)
     */
    setupSearchInputListener() {
        // Try to get search input if not already cached
        if (!this.searchInput && this.searchMenu) {
            this.searchInput = this.searchMenu.querySelector('.search-input');
        }
        
        // Add input listener if input exists and doesn't already have one
        if (this.searchInput && !this.searchInput.hasAttribute('data-filter-icons-listener')) {
            this.searchInput.setAttribute('data-filter-icons-listener', 'true');
            this.searchInput.addEventListener('input', () => {
                this.updateFilterIcons();
            });
        }
    }
    
    /**
     * Check if search is actually applied (has search term)
     */
    hasAppliedSearch() {
        // Try to get search input if not already cached
        if (!this.searchInput && this.searchMenu) {
            this.searchInput = this.searchMenu.querySelector('.search-input');
        }
        
        // Check search input value (for immediate feedback while typing)
        if (this.searchInput && this.searchInput.value.trim().length > 0) {
            return true;
        }
        
        // Also check dataManager cache (for actual applied state)
        if (this.dataManager) {
            const search = this.dataManager.getSearch();
            return search && search.trim().length > 0;
        }
        
        return false;
    }
    
    /**
     * Update filter/search icons in category header
     */
    updateFilterIcons() {
        if (!this.categoryHeader) return;
        
        const iconsContainer = this.categoryHeader.querySelector('.filter-status-icons');
        if (!iconsContainer) {
            this.initializeFilterIcons();
            return;
        }
        
        const hasFilters = this.hasAppliedFilters();
        const hasSearch = this.hasAppliedSearch();
        
        // Clear existing icons
        iconsContainer.innerHTML = '';
        
        // Add filter icon if filters are active
        if (hasFilters) {
            const filterIcon = document.createElement('span');
            filterIcon.className = 'filter-status-icon filter-icon';
            filterIcon.innerHTML = SVGManager.filterSVG;
            filterIcon.setAttribute('aria-label', 'Active filters - click to open filter menu');
            filterIcon.setAttribute('title', 'Open filter menu');
            filterIcon.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.menuManager) {
                    this.menuManager.toggleMenu('filter');
                }
            });
            iconsContainer.appendChild(filterIcon);
        }
        
        // Add search icon if search is active
        if (hasSearch) {
            const searchIcon = document.createElement('span');
            searchIcon.className = 'filter-status-icon search-icon';
            searchIcon.innerHTML = SVGManager.searchSVG;
            searchIcon.setAttribute('aria-label', 'Active search - click to open search menu');
            searchIcon.setAttribute('title', 'Open search menu');
            searchIcon.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.menuManager) {
                    this.menuManager.toggleMenu('search');
                }
            });
            iconsContainer.appendChild(searchIcon);
        }
    }
}
