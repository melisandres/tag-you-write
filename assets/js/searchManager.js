import { SVGManager } from './svgManager.js';

export class SearchManager {
    constructor() {
        if (!window.menuManager) {
            console.error('MenuManager not initialized');
            return;
        }
        this.searchNavLink = document.querySelector('.nav-link.search');
        this.searchMenu = document.querySelector('.search-menu');
        this.filterMenu = document.querySelector('.filter-menu');
        this.mainElement = document.querySelector('main');
        this.searchInput = null;
        this.menuManager = window.menuManager;

        this.initializeUI();
        this.bindEvents();
    }

    initializeUI() {
        if (this.searchNavLink) {
            // Set the search icon in the nav
            this.searchNavLink.innerHTML = SVGManager.searchSVG;
            
            // Add search input HTML
            this.searchMenu.innerHTML = `
                <div class="search-options">
                    <input type="text" class="search-input" placeholder="Comming soon... search games...">
                    <button class="close-search">${SVGManager.xSVG}</button>
                </div>
            `;

            this.searchInput = this.searchMenu.querySelector('.search-input');
        }
    }

    bindEvents() {
        if (!this.searchNavLink) {
            console.error('Search nav link not found');
            return;
        }

        console.log('Binding search events');
        // Toggle search menu
        this.searchNavLink.addEventListener('click', (e) => {
            console.log('Search link clicked');
            e.preventDefault(); // Prevent default link behavior
            this.toggleSearchMenu();
        });
        
        const closeButton = this.searchMenu.querySelector('.close-search');
        closeButton.addEventListener('click', () => {
            this.toggleSearchMenu();
        });

        // Listen for filter menu changes
        eventBus.on('filterMenuToggled', (isFilterVisible) => {
            this.handleFilterMenuToggle(isFilterVisible);
        });

        // Handle input changes
        if (this.searchInput) {
            this.searchInput.addEventListener('input', (e) => {
                this.handleSearchInput(e.target.value);
            });
        }
    }

    handleSearchInput(value) {
        // TODO: Implement search logic
        console.log('Search input:', value);
    }

    toggleSearchMenu() {
        console.log('Toggling SEARCH menu');  // Debug log
        this.menuManager.toggleMenu('search');  // Explicitly toggle search
        const isVisible = this.searchMenu.classList.contains('visible');
        
        // Only handle the nav link and input focus
        this.searchNavLink.classList.toggle('active', isVisible);
        if (isVisible) {
            this.searchInput?.focus();
        } else {
            if (this.searchInput) {
                this.searchInput.value = '';
            }
        }

        eventBus.emit('searchMenuToggled', isVisible);
    }

    handleFilterMenuToggle(isFilterVisible) {
        // Ensure proper stacking when filter menu changes
        if (this.searchMenu.classList.contains('visible')) {
            this.searchMenu.style.transform = isFilterVisible ? 
                `translateY(${getComputedStyle(document.documentElement).getPropertyValue('--filters-height')})` : 'translateY(0)';
        }
    }

    updateNavLink() {
        // Only update for search content, not toggle state
        const hasSearchText = this.searchInput && this.searchInput.value.trim().length > 0;
        // You might want to add a different class for when there's search text
        this.searchNavLink.classList.toggle('has-search', hasSearchText);
    }
}