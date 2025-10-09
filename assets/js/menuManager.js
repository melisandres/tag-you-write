export class MenuManager {
    constructor() {
        this.menuContainer = document.querySelector('.menu-container');
        this.searchMenu = document.querySelector('.search-menu');
        this.filterMenu = document.querySelector('.filter-menu');
        
        if (!this.menuContainer || !this.searchMenu || !this.filterMenu) {
            console.warn('MenuManager: Required elements not found');
            return;
        }
    }

    toggleMenu(menuName) {
        if (menuName === 'search') {
            this.toggleSearchMenu();
        } else if (menuName === 'filter') {
            this.toggleFilterMenu();
        } else {
            console.error('Unknown menu:', menuName);
        }
    }
    
    toggleSearchMenu() {
        const isVisible = this.searchMenu.classList.contains('visible');
        if (isVisible) {
            this.closeSearchMenu();
        } else {
            this.openSearchMenu();
        }
    }
    
    toggleFilterMenu() {
        const isVisible = this.filterMenu.classList.contains('visible');
        if (isVisible) {
            this.closeFilterMenu();
        } else {
            this.openFilterMenu();
        }
    }

    openSearchMenu() {
        this.searchMenu.classList.add('visible');
        this.updateMenuState();
    }
    
    closeSearchMenu() {
        this.searchMenu.classList.remove('visible');
        this.updateMenuState();
    }
    
    openFilterMenu() {
        this.filterMenu.classList.add('visible');
        this.updateMenuState();
    }
    
    closeFilterMenu() {
        this.filterMenu.classList.remove('visible');
        this.updateMenuState();
    }

    updateMenuState() {
        const searchVisible = this.searchMenu.classList.contains('visible');
        const filterVisible = this.filterMenu.classList.contains('visible');
        
        // Remove all state classes
        this.menuContainer.classList.remove('search-only', 'filter-only', 'both-visible');
        
        // Apply appropriate state class
        if (searchVisible && filterVisible) {
            this.menuContainer.classList.add('both-visible');
        } else if (searchVisible) {
            this.menuContainer.classList.add('search-only');
        } else if (filterVisible) {
            this.menuContainer.classList.add('filter-only');
        }
        
        // Update main content margin
        this.updateMainContentMargin();
    }
    
    setCategoryHeaderVisible(visible) {
        if (visible) {
            this.menuContainer.classList.add('with-categories');
        } else {
            this.menuContainer.classList.remove('with-categories');
        }
        this.updateMainContentMargin();
    }
    
    updateMainContentMargin() {
        const mainElement = document.querySelector('main');
        if (!mainElement) return;
        
        // Calculate total height based on visible menus
        const searchVisible = this.searchMenu.classList.contains('visible');
        const filterVisible = this.filterMenu.classList.contains('visible');
        const categoryVisible = this.menuContainer.classList.contains('with-categories');

        // Remove all margin classes
        mainElement.classList.remove('with-filters', 'with-search', 'with-filters-and-search', 'with-categories');

        // Add category modifier if needed
        if (categoryVisible) {
            mainElement.classList.add('with-categories');
        }

        // Add appropriate margin class
        if (searchVisible && filterVisible) {
            mainElement.classList.add('with-filters-and-search');
        } else if (searchVisible) {
            mainElement.classList.add('with-search');
        } else if (filterVisible) {
            mainElement.classList.add('with-filters');
        }
    }
}