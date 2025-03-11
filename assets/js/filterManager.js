import { SVGManager } from './svgManager.js';

/**
 * FilterManager handles the UI and logic for filtering stories/games in the application.
 * It manages two types of filters:
 * 1. Contribution filters (everyone's, contributed, started)
 * 2. Game state filters (all, open, closed, pending)
 */
export class FilterManager {
    /**
     * Initialize the FilterManager
     * Sets up the filter UI, binds events, and applies initial filters from URL
     */
    constructor() {
        // Check for required dependencies
        if (!window.menuManager) {
            console.error('MenuManager not initialized');
            return;
        }
        if (!window.dataManager) {
            console.error('DataManager not initialized');
            return;
        }
        
        // Get DOM elements
        this.filterMenu = document.querySelector('.filter-menu');
        this.filterNavLink = document.querySelector('.nav-link.filter');
        if (!this.filterMenu || !this.filterNavLink) {
            return;
        }
        
        // Store references to required managers and DOM elements
        this.dataManager = window.dataManager;
        this.filterNavLink = document.querySelector('.nav-link.filter');
        this.filterMenu = document.querySelector('.filter-menu');
        this.storiesContainer = document.querySelector('.stories');
        const userIdMeta = document.querySelector('meta[name="user"]');
        this.currentWriterId = userIdMeta.getAttribute('data-user-id');
        
        // Initialize filters if they don't exist in cache
        if (!this.dataManager.cache.filters) {
            this.dataManager.cache.filters = {
                hasContributed: null,  // default state (null = show all)
                gameState: 'all'       // default to showing all states
            };
        }

        // Define contribution states with display text and i18n keys
        // - null: Show stories from all writers (displayed as "everyone's")
        // - true: Show only stories the user has contributed to
        // - 'mine': Show only stories the user started
        this.contributionStates = {
            'null': { text: 'everyone\'s', key: 'all' },
            'true': { text: 'contributed', key: 'contributed' },
            'mine': { text: 'started', key: 'mine' }
        };

        // Define game states with display text and i18n keys
        // Different options based on whether user is logged in
        this.gameStates = this.currentWriterId !== 'null' 
            ? {
                'all': { text: 'open/closed/pending', key: 'all' },
                'open': { text: 'open', key: 'open' },
                'closed': { text: 'closed', key: 'closed' },
                'pending': { text: 'pending', key: 'pending' }
              }
            : {
                'all': { text: 'open/closed', key: 'all' },
                'open': { text: 'open', key: 'open' },
                'closed': { text: 'closed', key: 'closed' }
              };

        // Initialize UI and bind events
        this.initializeUI();
        this.bindEvents();
        
        // Set up event listeners
        eventBus.on('filterApplied', () => this.updateNavLink());
        eventBus.on('filtersUpdated', (filters) => this.handlefiltersUpdated(filters));
        this.menuManager = window.menuManager;

        // Listen for browser navigation events
        window.addEventListener('popstate', () => this.applyFiltersFromUrl());

        // Apply filters from URL on initial load
        this.applyFiltersFromUrl(true);
    }

    /**
     * Initialize the filter menu UI
     * Creates the filter buttons and sets their initial state
     */
    initializeUI() {
        if (this.filterNavLink) {
            // Set the class name for hasContributed
            const hasContributed = this.dataManager.cache.filters.hasContributed;
            const hasContributedClass = hasContributed === null ? 'all' : hasContributed === true ? 'contributor' : 'mine';
            
            // Create the filter menu content
            this.filterMenu.innerHTML = `
                <div class="filter-options">
                    <button class="close-filter">${SVGManager.xSVG}</button>
                    ${ this.currentWriterId !== 'null' ? `
                    <button class="filter-button my-games-filter" aria-label="Filter My Games">
                        <span class="filter-icon ${hasContributedClass}">
                            ${SVGManager.myGamesSVG}
                        </span>
                        <span class="filter-text" data-i18n="filters.contribution.${this.getContributionStateKey(hasContributed)}">
                            ${this.getContributionStateText(String(hasContributed))}
                        </span>
                    </button>
                    ` : ''
                    }
                    <button class="filter-button game-state-filter" aria-label="Filter Game States">
                        <span class="filter-icon ${this.dataManager.cache.filters.gameState}">
                            ${SVGManager.allGamesSVG}
                        </span>
                        <span class="filter-text" data-i18n="filters.gameState.${this.dataManager.cache.filters.gameState}">
                            ${this.getGameStateText(this.dataManager.cache.filters.gameState)}
                        </span>
                    </button>
                </div>
            `;
        }
        this.updateNavLink();
        
        // Apply translations to the newly created elements
        if (window.i18n) {
            window.i18n.updatePageTranslations(this.filterMenu);
        }
    }

    /**
     * Bind event listeners to filter menu elements
     */
    bindEvents() {
        if (!this.filterNavLink) {
            return;
        }

        // Toggle filter menu when nav link is clicked
        this.filterNavLink.addEventListener('click', () => {
            this.toggleFilterMenu();
        });
        
        // Close button event
        const closeButton = this.filterMenu.querySelector('.close-filter');
        closeButton.addEventListener('click', () => this.toggleFilterMenu());

        // Contribution filter button event
        const filterButton = this.filterMenu.querySelector('.my-games-filter');
        if (filterButton) {
            filterButton.addEventListener('click', () => {
                // Cycle to the next contribution state
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

        // Game state filter button event
        const stateButton = this.filterMenu.querySelector('.game-state-filter');
        stateButton.addEventListener('click', () => {
            // Cycle to the next game state
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

        // Update URL when filters change
        const updateUrlWithFilters = (filters) => {
            const params = new URLSearchParams(window.location.search);
            
            // Convert backend values to URL strings
            const urlHasContributed = filters.hasContributed === null ? 'all' :
                                     filters.hasContributed === true ? 'contributor' :
                                     'mine';
            
            // Set or remove URL parameters based on filter values
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
            
            // Update URL without reloading the page
            const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
            window.history.pushState({}, '', newUrl);
        };

        // Add event listener for filter changes
        eventBus.on('filterApplied', () => {
            const currentFilters = this.dataManager.getFilters();
            updateUrlWithFilters(currentFilters);
        });
    }

    /**
     * Handle filter updates from external sources
     * @param {Object} filters - The updated filters
     */
    handleFiltersUpdated(filters) {
        // Update UI to reflect new filter values
        this.updateFilterButton(filters.hasContributed);
        this.updateGameStateButton(filters.gameState);
        this.updateNavLink();
        eventBus.emit('filtersChanged', filters);
        
        // Apply translations after updating the UI
        if (window.i18n && this.filterMenu) {
            window.i18n.updatePageTranslations(this.filterMenu);
        }
    }

    /**
     * Update the filter nav link to show active state
     */
    updateNavLink() {
        // Check if there are active filters
        const hasActiveFilters = this.dataManager.cache.filters.hasContributed !== null || 
                                this.dataManager.cache.filters.gameState !== 'all';
        // Use 'active' class for filter state
        this.filterNavLink.classList.toggle('active', hasActiveFilters);
    }

    /**
     * Toggle the filter menu visibility
     */
    toggleFilterMenu() {
        this.menuManager.toggleMenu('filter');
        const isVisible = this.filterMenu.classList.contains('visible');
        
        // Use 'menu-open' instead of 'active' for menu state
        this.filterNavLink.classList.toggle('menu-open', isVisible);
    }

    /**
     * Update the contribution filter button UI
     * @param {null|boolean|string} hasContributed - The contribution filter state
     */
    updateFilterButton(hasContributed) {
        const button = this.filterMenu.querySelector('.my-games-filter');
        const icon = button?.querySelector('.filter-icon');
        const text = button?.querySelector('.filter-text');
        
        // Update classes based on state
        if (icon) {
            // Remove all possible state classes
            icon.classList.remove('all', 'contributor', 'mine');
            // Add the appropriate class
            icon.classList.add(hasContributed === null ? 'all' : 
                              hasContributed === true ? 'contributor' : 'mine');
        }
        if (text) {
            // Update the data-i18n attribute for localization
            const i18nKey = `filters.contribution.${this.getContributionStateKey(hasContributed)}`;
            text.setAttribute('data-i18n', i18nKey);
            text.textContent = this.getContributionStateText(String(hasContributed));
            
            // Apply translation
            if (window.i18n) {
                window.i18n.updatePageTranslations(text.parentElement);
            }
        }
    }

    /**
     * Get the display text for a game state
     * @param {string} state - The game state ('all', 'open', 'closed', 'pending')
     * @returns {string} The display text
     */
    getGameStateText(state) {
        return this.gameStates[state]?.text || this.gameStates['all'].text;
    }

    /**
     * Get the i18n key for a game state
     * @param {string} state - The game state ('all', 'open', 'closed', 'pending')
     * @returns {string} The i18n key
     */
    getGameStateKey(state) {
        return this.gameStates[state]?.key || this.gameStates['all'].key;
    }

    /**
     * Get the next game state in the cycle
     * @param {string} currentState - The current game state
     * @returns {string} The next game state
     */
    getNextGameState(currentState) {
        // Order of states depends on whether user is logged in
        const stateOrder = this.currentWriterId !== 'null' 
            ? ['all', 'open', 'closed', 'pending']
            : ['all', 'open', 'closed'];
        const currentIndex = stateOrder.indexOf(currentState);
        const nextIndex = (currentIndex + 1) % stateOrder.length;
        return stateOrder[nextIndex];
    }

    /**
     * Get the next contribution state in the cycle
     * @param {null|boolean|string} currentState - The current contribution state
     * @returns {null|boolean|string} The next contribution state
     */
    getNextContributionState(currentState) {
        const stateOrder = [null, true, 'mine'];  // null = all, true = contributed, 'mine' = started
        const currentIndex = stateOrder.indexOf(currentState);
        const nextIndex = (currentIndex + 1) % stateOrder.length;
        return stateOrder[nextIndex];
    }

    /**
     * Get the display text for a contribution state
     * @param {string} state - String representation of the contribution state ('null', 'true', 'mine')
     * @returns {string} The display text
     */
    getContributionStateText(state) {
        return this.contributionStates[state]?.text || this.contributionStates['null'].text;
    }

    /**
     * Get the i18n key for a contribution state
     * @param {null|boolean|string} state - The contribution state
     * @returns {string} The i18n key
     */
    getContributionStateKey(state) {
        return this.contributionStates[state]?.key || this.contributionStates['null'].key;
    }

    /**
     * Get the previous game state in the cycle
     * @param {string} currentState - The current game state
     * @returns {string} The previous game state
     */
    getPreviousGameState(currentState) {
        const stateOrder = this.currentWriterId !== 'null'
            ? ['all', 'open', 'closed', 'pending']
            : ['all', 'open', 'closed'];
        const currentIndex = stateOrder.indexOf(currentState);
        const previousIndex = (currentIndex - 1 + stateOrder.length) % stateOrder.length;
        return stateOrder[previousIndex];
    }

    /**
     * Update the game state filter button UI
     * @param {string} state - The game state
     */
    updateGameStateButton(state) {
        const button = this.filterMenu.querySelector('.game-state-filter');
        const icon = button.querySelector('.filter-icon');
        const text = button.querySelector('.filter-text');
        
        // Update the data-i18n attribute for localization
        text.setAttribute('data-i18n', `filters.gameState.${state}`);
        text.textContent = this.getGameStateText(state);
        
        // Remove all possible state classes before adding the new one
        icon.classList.remove('all', 'open', 'closed', 'pending');
        icon.classList.add(state);
        
        // Apply translation
        if (window.i18n) {
            window.i18n.updatePageTranslations(text.parentElement);
        }
    }

    /**
     * Apply filters from URL parameters
     * @param {boolean} thisIsInitialLoad - Whether this is the initial page load
     */
    applyFiltersFromUrl(thisIsInitialLoad = false) {
        // Get URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const hasContributed = urlParams.get('hasContributed');
        const gameState = urlParams.get('gameState');

        // Create filters object from URL parameters
        const filters = {
            // Convert URL strings to internal values
            hasContributed: hasContributed === null || hasContributed === 'all' ? null :
                            hasContributed === 'contributor' ? true :
                            'mine',
            gameState: gameState || 'all'
        };

        // Apply the filters
        this.dataManager.setFilters(filters);
        this.updateFilterButton(filters.hasContributed);
        this.updateGameStateButton(filters.gameState);
        this.updateNavLink();
        
        // Only emit filtersChanged - it already triggers a refresh
        if (!thisIsInitialLoad) {
            eventBus.emit('filtersChanged', filters);
        }
    }
}
