import { eventBus } from './eventBus.js';

export class CategoryHeaderManager {
    constructor() {
        this.categoryHeader = document.getElementById('categoryHeader');
        this.menuManager = window.menuManager; // Assuming MenuManager is global
        
        // No mapping needed - we'll construct the translation key directly
        
        this.initializeFromURL();
        this.setupEventListeners();
    }
    
    /**
     * Setup event listeners for category changes
     */
    setupEventListeners() {
        // Listen for category changes from DataManager
        eventBus.on('categoryChanged', (category) => {
            this.updateCategoryHeader(category);
        });
        
        // Listen for game list updates to update the count
        eventBus.on('gamesListUpdated', (games) => this.updateGameCount(games.length));
        eventBus.on('gamesAdded', (games) => this.updateGameCountFromAddition(games));
        eventBus.on('gamesRemoved', (gameIds) => this.updateGameCountFromRemoval(gameIds));
        
        // Listen for URL changes (if using history API)
        window.addEventListener('popstate', () => {
            this.initializeFromURL();
        });

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
                // Broad category like "myGames" -> "category-header.myGames."
                translationKey = `category-header.${category}.`;
            } else {
                // Subcategory like "myGames.urgent" -> "category-header.myGames.urgent"
                translationKey = `category-header.${categoryParts[0]}.${categoryParts[1]}`;
            }
            
            this.showCategoryHeader(translationKey);
        } else {
            this.hideCategoryHeader();
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
        this.menuManager.setCategoryHeaderVisible(true);
    }
    
    /**
     * Hide the category header
     */
    hideCategoryHeader() {
        if (!this.categoryHeader) return;
        
        // Hide the header
        this.categoryHeader.classList.remove('visible');
        
        // Update menu positions and category header state
        this.menuManager.setCategoryHeaderVisible(false);
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
}
