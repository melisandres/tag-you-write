import { eventBus } from './eventBus.js';
import { GameListRenderer } from './gameListRenderer.js';

export class GameListManager {
    constructor(path, uiManager) {
        // TODO: If you want to poll for updates while on the form page, you'll have to stop checking for a the stories container... and adjust the logic. 
        this.container = document.querySelector('.stories');
        if (!this.container) return;

        if (window.gameListManagerInstance) {
            return window.gameListManagerInstance;
        }
        
        this.path = path;
        this.dataManager = window.dataManager;
        this.pollingIntervalId = null;
        this.pollingDuration = 30000;
        
        this.uiManager = uiManager;
        // Make sure uiManager has required methods
        if (!this.uiManager || typeof this.uiManager.createShowcaseContainer !== 'function') {
            console.error('UIManager missing required methods');
            return;
        }
        this.renderer = new GameListRenderer(this.container, path, this.uiManager);

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

        window.gameListManagerInstance = this;

        // No need to trigger immediate refresh since page was just rendered
    }

    startUpdateChecker() {
        console.log('Starting update checker...');  // Debug log
        
        if (this.pollingIntervalId) {
            console.log('Stopping existing update checker...');  // Debug log
            this.stopUpdateChecker();
        }
        
        this.pollingIntervalId = setInterval(async () => {
            console.log('Polling for updates...');  // Debug log
            try {
                const hasUpdates = await this.dataManager.checkForUpdates();
                console.log('Update check result:', hasUpdates);  // Debug log
                
                if (hasUpdates) {
                    const modifiedGames = this.dataManager.getRecentlyModifiedGames();
                    console.log('Modified games:', modifiedGames);  // Debug log
                    eventBus.emit('gamesModified', modifiedGames);
                }
            } catch (error) {
                console.error('Polling error:', error);
            }
        }, this.pollingDuration);
        
        console.log('Update checker started with interval:', this.pollingDuration);  // Debug log
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