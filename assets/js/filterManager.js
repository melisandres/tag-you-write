import { SVGManager } from './svgManager.js';

export class FilterManager {
    constructor() {
        if (!window.dataManager) {
            console.error('DataManager not initialized');
            return;
        }
        
        this.dataManager = window.dataManager;
        this.filterNavLink = document.querySelector('.nav-link.filter');
        this.filterMenu = document.querySelector('.filter-menu');
        this.storiesContainer = document.querySelector('.stories');
        
        // Initialize filters if they don't exist
        if (!this.dataManager.cache.filters) {
            this.dataManager.cache.filters = {
                hasContributed: null,  // default state
                gameState: 'all'       // default to showing all states
            };
        }

        this.initializeUI();
        this.bindEvents();
    }

    initializeUI() {
        if (this.filterNavLink) {
            // Set the filter icon in the nav
            this.filterNavLink.innerHTML = SVGManager.filterSVG;
            
            // Create the filter menu content
            this.filterMenu.innerHTML = `
                <div class="filter-options">
                    <button class="close-filter">${SVGManager.xSVG}</button>
                    <button class="filter-button my-games-filter" aria-label="Filter My Games">
                        <span class="filter-icon ${this.dataManager.cache.filters.gameState}">
                            ${SVGManager.myGamesSVG}
                        </span>
                        <span class="filter-text">
                            ${this.dataManager.cache.filters.hasContributed ? 'contributed' : 'everyone\'s'}
                        </span>
                    </button>
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
    }

    bindEvents() {
        if (!this.filterNavLink) return;

        // Toggle filter menu
        this.filterNavLink.addEventListener('click', () => this.toggleFilterMenu());
        
        // Close button
        const closeButton = this.filterMenu.querySelector('.close-filter');
        closeButton.addEventListener('click', () => this.toggleFilterMenu());

        // Contribution filter
        const filterButton = this.filterMenu.querySelector('.my-games-filter');
        filterButton.addEventListener('click', () => {
            const currentState = this.dataManager.cache.filters.hasContributed;
            const newState = this.getNextContributionState(currentState);
            this.dataManager.setFilter('hasContributed', newState);
            this.updateFilterButton(newState);
            eventBus.emit('filterApplied');
            eventBus.emit('refreshGames');
        });

        // Game state filter
        const stateButton = this.filterMenu.querySelector('.game-state-filter');
        stateButton.addEventListener('click', () => {
            const currentState = this.dataManager.cache.filters.gameState;
            const newState = this.getNextGameState(currentState);
            this.dataManager.setFilter('gameState', newState);
            this.updateGameStateButton(newState);
            eventBus.emit('filterApplied');
            eventBus.emit('refreshGames');
        });
    }

    toggleFilterMenu() {
        const isVisible = this.filterMenu.classList.contains('visible');
        this.filterMenu.classList.toggle('visible');
        
        // Toggle class on main element instead of directly setting margin
        const mainElement = document.querySelector('main');
        if (mainElement) {
            mainElement.classList.toggle('with-filters', !isVisible);
        }
    }

    updateFilterButton(hasContributed) {
        const button = this.filterMenu.querySelector('.my-games-filter');
        const icon = button.querySelector('.filter-icon');
        const text = button.querySelector('.filter-text');
        
        // Update classes based on state
        icon.classList.remove('all', 'contributor', 'mine');
        icon.classList.add(hasContributed === null ? 'all' : 
                          hasContributed === true ? 'contributor' : 'mine');
        
        text.textContent = this.getContributionStateText(String(hasContributed));
    }

    getGameStateText(state) {
        const states = {
            'all': 'open/closed/pending',
            'open': 'open',
            'closed': 'closed',
            'pending': 'pending'
        };
        return states[state] || states['all'];
    }

    getNextGameState(currentState) {
        const stateOrder = ['all', 'open', 'closed', 'pending'];
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
        const stateOrder = ['all', 'open', 'closed', 'pending'];
        const currentIndex = stateOrder.indexOf(currentState);
        const previousIndex = (currentIndex - 1 + stateOrder.length) % stateOrder.length;
        return stateOrder[previousIndex];
    }

    updateGameStateButton(state) {
        const button = this.filterMenu.querySelector('.game-state-filter');
        const icon = button.querySelector('.filter-icon');
        const text = button.querySelector('.filter-text');
        text.textContent = this.getGameStateText(state);
        icon.classList.remove(this.getPreviousGameState(state));
        icon.classList.add(state);
    }
}
