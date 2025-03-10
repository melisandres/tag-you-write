import { SVGManager } from './svgManager.js';

export class FilterManager {
    constructor() {
        if (!window.menuManager) {
            console.error('MenuManager not initialized');
            return;
        }
        if (!window.dataManager) {
            console.error('DataManager not initialized');
            return;
        }
        this.filterMenu = document.querySelector('.filter-menu');
        this.filterNavLink = document.querySelector('.nav-link.filter');
        if (!this.filterMenu || !this.filterNavLink) {
            return;
        }
        
        this.dataManager = window.dataManager;
        this.filterNavLink = document.querySelector('.nav-link.filter');
        this.filterMenu = document.querySelector('.filter-menu');
        this.storiesContainer = document.querySelector('.stories');
        const userIdMeta = document.querySelector('meta[name="user"]');
        this.currentWriterId = userIdMeta.getAttribute('data-user-id');
        
        // Initialize filters if they don't exist
        if (!this.dataManager.cache.filters) {
            this.dataManager.cache.filters = {
                hasContributed: null,  // default state
                gameState: 'all'       // default to showing all states
            };
        }

        this.initializeUI();
        this.bindEvents();
        eventBus.on('filterApplied', () => this.updateNavLink());
        eventBus.on('filtersUpdated', (filters) => this.handlefiltersUpdated(filters));
        this.menuManager = window.menuManager;

        // Listen for popstate event to handle browser navigation
        window.addEventListener('popstate', () => this.applyFiltersFromUrl());

        // Apply filters from URL on initial load
        this.applyFiltersFromUrl(true);
    }

    initializeUI() {
        if (this.filterNavLink) {
            // Set the class name for hasContributed
            const hasContributed = this.dataManager.cache.filters.hasContributed;
            const hasContributedClass = hasContributed === null ? 'all' : hasContributed === true ? 'contributor' : 'mine';
            const hasContributedText = hasContributed === null ? 'everyone\'s' : hasContributed === true ? 'contributed' : 'started';

       
            // Create the filter menu content
            this.filterMenu.innerHTML = `
                <div class="filter-options">
                    <button class="close-filter">${SVGManager.xSVG}</button>
                    ${ this.currentWriterId !== 'null' ? `
                    <button class="filter-button my-games-filter" aria-label="Filter My Games">
                        <span class="filter-icon ${hasContributedClass}">
                            ${SVGManager.myGamesSVG}
                        </span>
                        <span class="filter-text">
                            ${hasContributedText}
                        </span>
                    </button>
                    ` : ''
                    }
                    <button class="filter-button game-state-filter" aria-label="Filter Game States">
                        <span class="filter-icon ${this.dataManager.cache.filters.gameState}">
                            ${SVGManager.allGamesSVG}
                        </span>
                        <span class="filter-text">
                            ${this.getGameStateText(this.dataManager.cache.filters.gameState)}
                        </span>
                    </button>
                </div>
            `;
        }
        this.updateNavLink();
    }

    bindEvents() {
        if (!this.filterNavLink) {
            return;
        }

        // Toggle filter menu
        this.filterNavLink.addEventListener('click', () => {
            this.toggleFilterMenu();
        });
        
        // Close button
        const closeButton = this.filterMenu.querySelector('.close-filter');
        closeButton.addEventListener('click', () => this.toggleFilterMenu());

        // Contribution filter
        const filterButton = this.filterMenu.querySelector('.my-games-filter');
        if (filterButton) {
            filterButton.addEventListener('click', () => {
                const currentState = this.dataManager.cache.filters.hasContributed;
                const newState = this.getNextContributionState(currentState);
                this.dataManager.setFilters({
                    ...this.dataManager.getFilters(),
                    hasContributed: newState
                });
                this.updateFilterButton(newState);
                eventBus.emit('filterApplied');
                eventBus.emit('refreshGames');
                });
        }       

        // Game state filter
        const stateButton = this.filterMenu.querySelector('.game-state-filter');
        stateButton.addEventListener('click', () => {
            const currentState = this.dataManager.cache.filters.gameState;
            const newState = this.getNextGameState(currentState);
            this.dataManager.setFilters({
                ...this.dataManager.getFilters(),
                gameState: newState
            });
            this.updateGameStateButton(newState);
            eventBus.emit('filterApplied');
            eventBus.emit('refreshGames');
        });

        // When filters change, update URL too
        const updateUrlWithFilters = (filters) => {
            const params = new URLSearchParams(window.location.search);
            
            // Convert backend values to URL strings
            const urlHasContributed = filters.hasContributed === null ? 'all' :
                                     filters.hasContributed === true ? 'contributor' :
                                     'mine';
            
            if (filters.hasContributed !== null) {
                params.set('hasContributed', urlHasContributed);
            } else {
                params.delete('hasContributed');
            }
            
            if (filters.gameState !== 'all') {
                params.set('gameState', filters.gameState);
            } else {
                params.delete('gameState');
            }
            
            // Update URL without reload
            const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
            window.history.pushState({}, '', newUrl);
        };

        // Add to existing filter change handlers
        eventBus.on('filterApplied', () => {
            const currentFilters = this.dataManager.getFilters();
            updateUrlWithFilters(currentFilters);
        });
    }

    handleFiltersUpdated(filters) {
        this.updateFilterButton(filters.hasContributed);
        this.updateGameStateButton(filters.gameState);
        this.updateNavLink();
        eventBus.emit('filtersChanged', filters);
    }

    updateNavLink() {
        // Check if there are active filters
        const hasActiveFilters = this.dataManager.cache.filters.hasContributed !== null || 
                                this.dataManager.cache.filters.gameState !== 'all';
        // Use 'active' class for filter state
        this.filterNavLink.classList.toggle('active', hasActiveFilters);
    }

    toggleFilterMenu() {
        this.menuManager.toggleMenu('filter');
        const isVisible = this.filterMenu.classList.contains('visible');
        
        // Use 'menu-open' instead of 'active' for menu state
        this.filterNavLink.classList.toggle('menu-open', isVisible);
    }

    updateFilterButton(hasContributed) {
        const button = this.filterMenu.querySelector('.my-games-filter');
        const icon = button?.querySelector('.filter-icon');
        const text = button?.querySelector('.filter-text');
        
        // Update classes based on state
        if (icon) {
            icon.classList.remove('all', 'contributor', 'mine');
            icon.classList.add(hasContributed === null ? 'all' : 
                              hasContributed === true ? 'contributor' : 'mine');
        }
        if (text) {
            text.textContent = this.getContributionStateText(String(hasContributed));
        }
    }

    getGameStateText(state) {
        const states =  this.currentWriterId !== 'null' 
        ? {
            'all': 'open/closed/pending',
            'open': 'open',
            'closed': 'closed',
            'pending': 'pending'
        }
        :{
            'all': 'open/closed',
            'open': 'open',
            'closed': 'closed',
        };
        return states[state] || states['all'];
    }

    getNextGameState(currentState) {
        const stateOrder = this.currentWriterId !== 'null' 
            ? ['all', 'open', 'closed', 'pending']
            : ['all', 'open', 'closed'];
        const currentIndex = stateOrder.indexOf(currentState);
        const nextIndex = (currentIndex + 1) % stateOrder.length;
        return stateOrder[nextIndex];
    }

    getNextContributionState(currentState) {
        const stateOrder = [null, true, 'mine'];  // null = all, true = contributed, 'mine' = started
        const currentIndex = stateOrder.indexOf(currentState);
        const nextIndex = (currentIndex + 1) % stateOrder.length;
        return stateOrder[nextIndex];
    }

    getContributionStateText(state) {
        const states = {
            'null': 'everyone\'s',
            'true': 'contributed',
            'mine': 'started'
        };
        return states[state] || states['null'];
    }

    getPreviousGameState(currentState) {
        const stateOrder = this.currentWriterId !== 'null'
            ? ['all', 'open', 'closed', 'pending']
            : ['all', 'open', 'closed'];
        const currentIndex = stateOrder.indexOf(currentState);
        const previousIndex = (currentIndex - 1 + stateOrder.length) % stateOrder.length;
        return stateOrder[previousIndex];
    }

    updateGameStateButton(state) {
        const button = this.filterMenu.querySelector('.game-state-filter');
        const icon = button.querySelector('.filter-icon');
        const text = button.querySelector('.filter-text');
        
        // Update the text content
        text.textContent = this.getGameStateText(state);
        
        // Remove all possible state classes before adding the new one
        icon.classList.remove('all', 'open', 'closed', 'pending');
        icon.classList.add(state);
    }

    applyFiltersFromUrl(thisIsInitialLoad = false) {
        // Get URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const hasContributed = urlParams.get('hasContributed');
        const gameState = urlParams.get('gameState');

        // Create filters object
        const filters = {
            hasContributed: hasContributed === null || hasContributed === 'all' ? null :
                            hasContributed === 'contributor' ? true :
                            'mine',
            gameState: gameState || 'all'
        };

        this.dataManager.setFilters(filters);
        this.updateFilterButton(filters.hasContributed);
        this.updateGameStateButton(filters.gameState);
        this.updateNavLink();
        
        // Only emit filtersChanged - it already triggers a refresh
        if (!thisIsInitialLoad) {
            eventBus.emit('filtersChanged', filters);
        }
        //eventBus.emit('refreshGames');
    }
}
