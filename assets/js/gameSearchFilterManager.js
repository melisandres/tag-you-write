import { eventBus } from './eventBus.js';
import { GameListRenderer } from './gameListRenderer.js';

export class GameSearchFilterManager {
    constructor(uiManager) {
        this.container = document.querySelector('.stories');
        if (!this.container) return;

        if (window.gameSearchFilterManagerInstance) {
            return window.gameSearchFilterManagerInstance;
        }
        
        this.dataManager = window.dataManager;
        this.uiManager = uiManager;
        
        this.renderer = new GameListRenderer(this.container, this.uiManager);

        // DataManager handles filtersChanged/searchApplied/refreshGames automatically
        // We only listen to DataManager's rendering events
        eventBus.on('gamesRefreshed', (games) => this.renderGames(games));

        // Get initial filters from URL parameters (URL is source of truth)
        const urlParams = new URLSearchParams(window.location.search);
        const hasContributed = urlParams.get('hasContributed');
        const bookmarked = urlParams.get('bookmarked');
        const category = urlParams.get('category');

        // Convert URL string values to backend values
        const convertedHasContributed = hasContributed === null || hasContributed === 'all' ? null :
                                       hasContributed === 'contributor' ? true :
                                       hasContributed === 'mine' ? 'mine' :
                                       null;

        const convertedBookmarked = bookmarked === null || bookmarked === 'all' ? null :
                                   bookmarked === 'bookmarked' ? true :
                                   bookmarked === 'not_bookmarked' ? false :
                                   null;

        const initialFilters = {
            hasContributed: convertedHasContributed,
            gameState: urlParams.get('gameState') || 'all',
            bookmarked: convertedBookmarked
        };

        // Only set filters if URL has filter params
        // If URL is empty, FilterManager will handle syncing cache to URL
        const urlHasFilters = hasContributed || bookmarked || urlParams.get('gameState');
        
        if (urlHasFilters) {
            // URL has filters - use URL as source of truth
            this.dataManager.setFilters(initialFilters);
            
            // Don't emit refreshGames - backend already rendered filtered games in #games-data
            // GameListRenderer will load server-rendered data via initializeFromServerData()
        }
        // If URL has no filters, FilterManager will sync cache to URL if needed
        
        // Set initial category if present in URL
        if (category) {
            console.log('🎯 GameSearchFilterManager: Setting initial category from URL:', category);
            this.dataManager.setCategory(category);
        }
        
        window.gameSearchFilterManagerInstance = this;
    }

    /**
     * Render games list - called when DataManager emits 'gamesRefreshed'
     * DataManager automatically handles filtersChanged/searchApplied events
     */
    renderGames(games) {
        this.renderer.renderGamesList(games);
    }
}