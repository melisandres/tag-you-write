import { eventBus } from './eventBus.js';
import { GameListRenderer } from './gameListRenderer.js';

export class GameListManager {
    constructor(path, uiManager) {
        this.container = document.querySelector('.stories');
        if (!this.container) return;

        if (window.gameListManagerInstance) {
            return window.gameListManagerInstance;
        }
        
        this.path = path;
        this.dataManager = window.dataManager;
        this.uiManager = uiManager;
        
        this.renderer = new GameListRenderer(this.container, path, this.uiManager);

        // Event listeners
        eventBus.on('gamesModified', (games) => this.handleGameUpdates(games));
        eventBus.on('refreshGames', () => this.refreshGamesList());
        eventBus.on('filtersChanged', (filters) => this.handleFiltersChanged(filters));
        eventBus.on('searchApplied', (searchValue) => this.handleSearchApplied(searchValue));

        // Get initial filters from URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const hasContributed = urlParams.get('hasContributed');

        // Convert URL string values to backend values
        const convertedHasContributed = hasContributed === 'all' ? null :
                                       hasContributed === 'contributor' ? true :
                                       hasContributed === 'mine' ? 'mine' :
                                       null;

        const initialFilters = {
            hasContributed: convertedHasContributed,
            gameState: urlParams.get('gameState') || 'all'
        };

        // Set initial filters
        this.dataManager.setFilters(initialFilters);
        
        window.gameListManagerInstance = this;
    }

    handleGameUpdates(games) {
/*         games.forEach(game => {
            eventBus.emit('updateGame', game);
        }); */
        /* this.dataManager.updateGamesData(games, false);  */
        console.log('GAMES LIST MANAGER WAS SUPPOSED TO CALL UPDATE GAMES DATA here... but it becomes circular... does this break anything?', games);
    }

    handleFiltersChanged(filters) {
        console.log('handleFiltersChanged called from:', new Error().stack);
        this.dataManager.setFilters(filters);
        this.refreshGamesList();
    }

    handleSearchApplied(searchValue) {
        this.refreshGamesList();
    }

    async refreshGamesList() {
        console.log('refreshGamesList called from:', new Error().stack);
        try {
            const filters = this.dataManager.getFilters();
            const search = this.dataManager.getSearch();
            console.log("REFRESHING THE GAME LIST");
            const response = await fetch(`${this.path}game/getGames`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ filters, search })
            });

            if (!response.ok) throw new Error('Failed to fetch games');
            
            const games = await response.json();
            this.dataManager.updateGamesData(games, true);
            this.renderer.renderGamesList(games);
            
        } catch (error) {
            console.error('Error refreshing games list:', error);
        }
    }
}