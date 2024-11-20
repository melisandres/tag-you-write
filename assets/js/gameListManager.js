import { eventBus } from './eventBus.js';
import { GameListRenderer } from './gameListRenderer.js';

export class GameListManager {
    constructor(container, path, uiManager) {
        if (!container) {
            console.log('No games container found, skipping GameListManager initialization');
            return;
        }
        
        this.path = path;
        this.dataManager = window.dataManager;
        this.pollingIntervalId = null;
        this.pollingDuration = 30000;
        
        this.renderer = new GameListRenderer(container, path, uiManager);

        // Listen for control events
        eventBus.on('startPolling', () => this.startUpdateChecker());
        eventBus.on('stopPolling', () => this.stopUpdateChecker());
        eventBus.on('gamesModified', (games) => this.handleGameUpdates(games));
        eventBus.on('refreshGames', () => this.refreshGamesList());

        // Initialize with default polling if needed
        this.startUpdateChecker();

        // Get initial filters from URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const initialFilters = {
            hasContributed: urlParams.get('hasContributed'),
            gameState: urlParams.get('gameState') || 'all'
        };

        // Set filters in DataManager
        this.dataManager.setFilters(initialFilters);

        // No need to trigger immediate refresh since page was just rendered
    }

    startUpdateChecker() {
        if (this.pollingIntervalId) this.stopUpdateChecker();
        
        this.pollingIntervalId = setInterval(async () => {
            const hasUpdates = await this.dataManager.checkForUpdates();
            if (hasUpdates) {
                const modifiedGames = this.dataManager.getRecentlyModifiedGames();
                eventBus.emit('gamesModified', modifiedGames);
            }
        }, this.pollingDuration);
    }

    stopUpdateChecker() {
        if (this.pollingIntervalId) {
            clearInterval(this.pollingIntervalId);
            this.pollingIntervalId = null;
        }
    }

    handleGameUpdates(games) {
        games.forEach(game => {
            eventBus.emit('updateGame', game);
        });
    }

    async refreshGamesList() {
        try {
            const filters = this.dataManager.getFilters();
            
            // Use existing endpoint with filters
            const response = await fetch(`${this.path}game/getGames`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ filters })
            });

            if (!response.ok) throw new Error('Failed to fetch games');
            
            const games = await response.json();
            
            // Update cache with new games
            this.dataManager.cache.games.clear();
            games.forEach(game => {
                this.dataManager.cache.games.set(game.game_id, {
                    data: game,
                    timestamp: Date.now()
                });
            });

            // Trigger re-render
            this.renderer.renderGamesList(games);
            
        } catch (error) {
            console.error('Error refreshing games list:', error);
        }
    }
}