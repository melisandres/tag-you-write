import { SVGManager } from './svgManager.js';

export class SearchManager {
    constructor(path) {
        if (!window.menuManager) {
            console.error('MenuManager not initialized');
            return;
        }
        this.path = path;
        this.searchNavLink = document.querySelector('.nav-link.search');
        this.searchMenu = document.querySelector('.search-menu');
        this.filterMenu = document.querySelector('.filter-menu');
        this.mainElement = document.querySelector('main');
        this.searchInput = null;
        this.menuManager = window.menuManager;
        this.dataManager = window.dataManager;

        this.initializeUI();
        this.bindEvents();
        this.syncSearchInputWithUrl();
        this.updateSearchCacheFromUrl();
    }

    initializeUI() {
        console.log('Initializing search UI');
        console.log('this.searchNavLink', this.searchNavLink);
        if (this.searchNavLink) {
            // Set the search icon in the nav
            this.searchNavLink.innerHTML = SVGManager.searchSVG;
            
            // Add search input HTML
            this.searchMenu.innerHTML = `
                <div class="search-options">
                    <input type="text" class="search-input" placeholder="Coming soon... search games...">
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
            if (this.searchInput) {
                this.searchInput.value = '';
                this.updateNavLink();
                this.updateUrlWithSearch('');
            }
        });

        // Listen for filter menu changes
        eventBus.on('filterMenuToggled', (isFilterVisible) => {
            this.handleFilterMenuToggle(isFilterVisible);
        });

        // Handle input changes with debouncing
        if (this.searchInput) {
            this.searchInput.addEventListener('input', this.debounce((e) => {
                const searchValue = e.target.value;
                this.handleSearchInput(searchValue);
                this.updateUrlWithSearch(searchValue);
            }, 500));
        }

        // Listen for popstate event to update search input and cache
        window.addEventListener('popstate', () => {
            console.log('popstate event triggered');
            this.syncSearchInputWithUrl();
            this.updateSearchCacheFromUrl();
        });
    }

    handleSearchInput(value) {
        // if there is text in the search input, the nav link should be active
        this.updateNavLink();
        
        // Store current search state
        const previousSearch = this.dataManager.getSearch();
        this.dataManager.setSearch(value);

        if (value.trim()) {
            // Only fetch new results if search term changed
            if (value !== previousSearch) {
                // Wait for search results before triggering refresh
                this.searchNodes(value);
            }
        } else {
            // Clear results and refresh once
            this.dataManager.updateSearchResults([], null, true);
            eventBus.emit('searchApplied', '');
        }
    }

    searchNodes(searchTerm) {
        const rootStoryId = this.dataManager.getCurrentViewedRootStoryId();
        console.log('Searching for:', searchTerm);
        console.log('Root Story ID:', rootStoryId);
        console.log('TRYING TO FETCH');
        
        // Return the Promise
        return fetch(`${this.path}text/searchNodes?term=${encodeURIComponent(searchTerm)}&rootStoryId=${rootStoryId}`)
            .then(response => response.json())
            .then(data => {
                console.log('Search results received:', data);
                this.dataManager.updateSearchResults(data, rootStoryId, true);
                // Trigger refresh after results are updated
                eventBus.emit('searchApplied', searchTerm);
                return data;
            })
            .catch(error => {
                console.error('Error fetching search results:', error);
                // Still emit event even if search fails
                eventBus.emit('searchApplied', searchTerm);
                return [];
            });
    }

    debounce(func, wait) {
        let timeout;
        return function(...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), wait);
        };
    }

    toggleSearchMenu() {
        this.menuManager.toggleMenu('search');
        const isVisible = this.searchMenu.classList.contains('visible');
        
        if (isVisible) {
            this.searchInput?.focus();
        }

        eventBus.emit('searchMenuToggled', isVisible);
    }

    handleFilterMenuToggle(isFilterVisible) {
        if (this.searchMenu.classList.contains('visible')) {
            this.searchMenu.style.transform = isFilterVisible ? 
                `translateY(${getComputedStyle(document.documentElement).getPropertyValue('--filters-height')})` : 'translateY(0)';
        }
    }

    updateNavLink() {
        const hasSearchText = this.searchInput && this.searchInput.value.trim().length > 0;
        this.searchNavLink.classList.toggle('has-search', hasSearchText);
        this.searchNavLink.classList.toggle('active', hasSearchText);
    }

    syncSearchInputWithUrl() {
        const params = new URLSearchParams(window.location.search);
        const searchValue = params.get('search') || '';
        console.log('Syncing search input with URL:', searchValue);
        if (this.searchInput) {
            this.searchInput.value = searchValue;
            this.updateNavLink();
        }
    }

    updateSearchCacheFromUrl() {
        const params = new URLSearchParams(window.location.search);
        const searchValue = params.get('search') || '';
        console.log('Updating search cache with:', searchValue);
        this.dataManager.setSearch(searchValue);
        eventBus.emit('refreshGames'); // Emit event to trigger data refresh
    }

    updateUrlWithSearch(search) {
        const params = new URLSearchParams(window.location.search);
        
        if (search) {
            params.set('search', search);
        } else {
            params.delete('search');
        }
        
        // Update URL without reload
        const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
        window.history.replaceState({}, '', newUrl);
    }
}