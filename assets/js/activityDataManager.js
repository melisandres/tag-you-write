import { eventBus } from './eventBus.js';

/**
 * Activity Data Manager
 * 
 * Manages activity data from three sources:
 * - siteActivityUpdate: Site-wide activity (single object)
 * - gameActivityUpdate: Game-specific activities (array of game objects)
 * - textActivityUpdate: Text-specific activities (array of text objects)
 * 
 * Simplified design: doesn't care about data source (SSE/polling), just processes updates
 */
export class ActivityDataManager {
    constructor() {
        console.log('🎯 ActivityDataManager: Initializing');
        
        // Singleton pattern following established conventions
        if (window.activityDataManagerInstance) {
            return window.activityDataManagerInstance;
        }
        
        // State management for different activity types
        this.activityData = {
            // Site-wide activity - single object state
            site: {
                browsing: 0,
                writing: 0,
                total: 0,
                lastUpdated: null
            },
            
            // Game activities - array of game objects
            games: {
                data: [], // Array of game activity objects
                lastUpdated: null
            },
            
            // Text activities - array of text objects  
            texts: {
                data: [], // Array of text activity objects
                lastUpdated: null
            }
        };
        
        // Bind methods to preserve context
        this.handleSiteActivityUpdate = this.handleSiteActivityUpdate.bind(this);
        this.handleGameActivityUpdate = this.handleGameActivityUpdate.bind(this);
        this.handleTextActivityUpdate = this.handleTextActivityUpdate.bind(this);
        
        // Store singleton instance
        window.activityDataManagerInstance = this;
        
        // Initialize
        this.init();
    }
    
    init() {
        console.log('🎯 ActivityDataManager: Setting up event listeners');
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Listen for the three activity update events
        eventBus.on('siteActivityUpdate', this.handleSiteActivityUpdate);
        eventBus.on('gameActivityUpdate', this.handleGameActivityUpdate);
        eventBus.on('textActivityUpdate', this.handleTextActivityUpdate);
        
        console.log('🎯 ActivityDataManager: Event listeners established');
    }
    
    /**
     * Handle site-wide activity updates
     * Site activity is always a single object that represents current state
     */
    handleSiteActivityUpdate(siteActivityData) {
        console.log('🎯 ActivityDataManager: Received site activity update:', siteActivityData);
        
        // Store previous state for comparison
        const previousState = { ...this.activityData.site };
        
        // Update site activity state
        this.activityData.site = {
            browsing: siteActivityData.browsing || 0,
            writing: siteActivityData.writing || 0,
            total: (siteActivityData.browsing || 0) + (siteActivityData.writing || 0),
            lastUpdated: Date.now() // TODO: am I receiving this from db?
        };
        
        // Check for differences
        const hasChanges = this.hasSiteActivityChanged(previousState, this.activityData.site);
        
        if (hasChanges) {
            console.log('🎯 ActivityDataManager: Site activity changed, emitting UI update event');
            // Emit event for UI components that need to update
            eventBus.emit('activityDataChanged', {
                type: 'site',
                data: this.activityData.site,
                hasChanges: true
            });
        } else {
            console.log('🎯 ActivityDataManager: Site activity unchanged, no UI update needed');
        }
    }
    
    /**
     * Handle game activity updates  
     * Following dataManager pattern - just process the data we receive
     */
    handleGameActivityUpdate(gameActivityData) {
        console.log('🎯 ActivityDataManager: Received game activity update:', gameActivityData);
        console.log('🎯 ActivityDataManager: Data type:', Array.isArray(gameActivityData) ? 'Array' : 'Object', 'Length:', Array.isArray(gameActivityData) ? gameActivityData.length : 'N/A');
        
        // Create deep copy of previous data to avoid reference issues
        const previousData = this.activityData.games.data.map(game => ({ ...game }));
        console.log('🎯 ActivityDataManager: Previous data before update:', previousData);
        
        // Process the update - handle both arrays and single objects
        this.updateGameActivities(gameActivityData);
        
        console.log('🎯 ActivityDataManager: Current data after update:', this.activityData.games.data);
        
        // Check for differences and identify which games changed
        const changedGames = this.getChangedGames(previousData, this.activityData.games.data);
        
        if (changedGames.length > 0) {
            console.log('🎯 ActivityDataManager: Game activity changed, emitting UI update event');
            console.log('🎯 ActivityDataManager: Changed games:', changedGames.map(g => g.game_id));
            
            eventBus.emit('activityDataChanged', {
                type: 'games',
                data: this.activityData.games.data,
                hasChanges: true
            });
            
            // Only emit specific events for games that actually changed
            this.emitEventsForChangedGames(changedGames);
        } else {
            console.log('🎯 ActivityDataManager: Game activity unchanged, no UI update needed');
        }
    }
    
    /**
     * Handle text activity updates
     * Following dataManager pattern - just process the data we receive
     */
    handleTextActivityUpdate(textActivityData) {
        console.log('🎯 ActivityDataManager: Received text activity update:', textActivityData);
        console.log('🎯 ActivityDataManager: Data type:', Array.isArray(textActivityData) ? 'Array' : 'Object', 'Length:', Array.isArray(textActivityData) ? textActivityData.length : 'N/A');
        
        const previousData = [...this.activityData.texts.data];
        
        // Process the update - handle both arrays and single objects
        this.updateTextActivities(textActivityData);
        
        // Check for differences
        const hasChanges = this.hasTextActivityChanged(previousData, this.activityData.texts.data);
        
        if (hasChanges) {
            console.log('🎯 ActivityDataManager: Text activity changed, emitting UI update event');
            eventBus.emit('activityDataChanged', {
                type: 'texts', 
                data: this.activityData.texts.data,
                hasChanges: true
            });
        } else {
            console.log('🎯 ActivityDataManager: Text activity unchanged, no UI update needed');
        }
    }
    
    // === EVENT EMISSION METHODS ===
    
    /**
     * Emit specific game activity events for UI components that need per-game updates
     */
    emitGameSpecificEvents(gameActivityData) {
        console.log('🎯 ActivityDataManager: Emitting game-specific events');
        
        if (Array.isArray(gameActivityData)) {
            // Handle array of games
            gameActivityData.forEach(gameData => {
                this.emitSingleGameActivityEvent(gameData);
            });
        } else if (gameActivityData && typeof gameActivityData === 'object') {
            // Handle single game object
            this.emitSingleGameActivityEvent(gameActivityData);
        }
    }

    /**
     * Emit specific game activity events from processed data
     * This ensures we emit events for all games that were actually processed
     */
    emitGameSpecificEventsFromProcessedData(processedGamesData) {
        console.log('🎯 ActivityDataManager: Emitting game-specific events from processed data');
        
        if (Array.isArray(processedGamesData)) {
            processedGamesData.forEach(gameData => {
                this.emitSingleGameActivityEvent(gameData);
            });
        }
    }

    /**
     * Emit events only for games that actually changed
     */
    emitEventsForChangedGames(changedGames) {
        console.log('🎯 ActivityDataManager: Emitting events for changed games only');
        
        changedGames.forEach(gameData => {
            console.log(`🎯 ActivityDataManager: Emitting change event for game ${gameData.game_id}`);
            this.emitSingleGameActivityEvent(gameData);
        });
    }
    
    /**
     * Emit activity event for a single game
     */
    emitSingleGameActivityEvent(gameData) {
        if (!gameData.game_id) {
            console.warn('🎯 ActivityDataManager: Cannot emit event for game without game_id:', gameData);
            return;
        }
        
        // Convert from game_id to gameId to match expected format
        const eventData = {
            gameId: gameData.game_id,  // Convert from backend format
            browsing: gameData.browsing || 0,
            writing: gameData.writing || 0,
            timestamp: gameData.timestamp
        };
        
        console.log('🎯 ActivityDataManager: Emitting gameActivityChanged for game:', eventData.gameId, eventData);
        eventBus.emit('gameActivityChanged', eventData);
    }
    
    // === UPDATE METHODS (Following dataManager pattern) ===
    
    updateGameActivities(gameActivityData) {
        console.log('🎯 ActivityDataManager: Processing game activity update');
        console.log('🎯 ActivityDataManager: Raw data structure:', gameActivityData);
        
        if (Array.isArray(gameActivityData)) {
            // Array of games - replace entire dataset (like polling)
            console.log('🎯 ActivityDataManager: Replacing game activities with', gameActivityData.length, 'games');
            this.activityData.games.data = [...gameActivityData];
        } else if (gameActivityData && typeof gameActivityData === 'object') {
            // Check if this is a wrapper object with a 'games' property
            if (gameActivityData.games) {
                console.log('🎯 ActivityDataManager: Processing wrapper object with games property');
                console.log('🎯 ActivityDataManager: Games data inside wrapper:', gameActivityData.games);
                
                if (Array.isArray(gameActivityData.games)) {
                    // Array of games inside wrapper
                    console.log('🎯 ActivityDataManager: Wrapper contains array of', gameActivityData.games.length, 'games');
                    this.activityData.games.data = [...gameActivityData.games];
                } else if (typeof gameActivityData.games === 'object') {
                    // Check if this is a keyed object format {gameId: {data}} 
                    const gameIds = Object.keys(gameActivityData.games);
                    if (gameIds.length > 0) {
                        console.log('🎯 ActivityDataManager: Wrapper contains keyed object with', gameIds.length, 'games');
                        // Process each game in the keyed object
                        gameIds.forEach(gameId => {
                            const gameData = {
                                game_id: gameId,
                                ...gameActivityData.games[gameId],
                                timestamp: gameActivityData.timestamp // Include wrapper timestamp
                            };
                            console.log('🎯 ActivityDataManager: Processing keyed game:', gameId, gameData);
                            this.updateSingleGameActivity(gameData);
                        });
                    } else {
                        console.log('🎯 ActivityDataManager: Wrapper contains single game object');
                        this.updateSingleGameActivity(gameActivityData.games);
                    }
                } else {
                    console.warn('🎯 ActivityDataManager: Invalid games property in wrapper:', gameActivityData.games);
                    return;
                }
            } else if (gameActivityData.game_id) {
                // Direct game object - update or add (like SSE incremental)
                console.log('🎯 ActivityDataManager: Processing direct game object');
                this.updateSingleGameActivity(gameActivityData);
            } else {
                console.warn('🎯 ActivityDataManager: Object missing both games property and game_id:', gameActivityData);
                return;
            }
        } else {
            console.warn('🎯 ActivityDataManager: Invalid game activity data:', gameActivityData);
            return;
        }
        
        this.activityData.games.lastUpdated = Date.now();
        console.log('🎯 ActivityDataManager: Game activities updated');
    }
    
    updateSingleGameActivity(gameUpdate) {
        if (!gameUpdate.game_id) {
            console.warn('🎯 ActivityDataManager: Game update missing game_id:', gameUpdate);
            return;
        }
        
        const existingIndex = this.activityData.games.data.findIndex(g => g.game_id === gameUpdate.game_id);
        
        if (existingIndex >= 0) {
            // Update existing game
            console.log('🎯 ActivityDataManager: Updating existing game:', gameUpdate.game_id);
            this.activityData.games.data[existingIndex] = { ...gameUpdate };
        } else {
            // Add new game
            console.log('🎯 ActivityDataManager: Adding new game:', gameUpdate.game_id);
            this.activityData.games.data.push({ ...gameUpdate });
        }
    }
    
    updateTextActivities(textActivityData) {
        console.log('🎯 ActivityDataManager: Processing text activity update');
        
        if (Array.isArray(textActivityData)) {
            // Array of texts - replace entire dataset (like polling)
            console.log('🎯 ActivityDataManager: Replacing text activities with', textActivityData.length, 'texts');
            this.activityData.texts.data = [...textActivityData];
        } else if (textActivityData && typeof textActivityData === 'object') {
            // Single text object - update or add (like SSE incremental)
            console.log('🎯 ActivityDataManager: Processing single text update');
            this.updateSingleTextActivity(textActivityData);
        } else {
            console.warn('🎯 ActivityDataManager: Invalid text activity data:', textActivityData);
            return;
        }
        
        this.activityData.texts.lastUpdated = Date.now();
        console.log('🎯 ActivityDataManager: Text activities updated');
    }
    
    updateSingleTextActivity(textUpdate) {
        if (!textUpdate.text_id) {
            console.warn('🎯 ActivityDataManager: Text update missing text_id:', textUpdate);
            return;
        }
        
        const existingIndex = this.activityData.texts.data.findIndex(t => t.text_id === textUpdate.text_id);
        
        if (existingIndex >= 0) {
            // Update existing text
            console.log('🎯 ActivityDataManager: Updating existing text:', textUpdate.text_id);
            this.activityData.texts.data[existingIndex] = { ...textUpdate };
        } else {
            // Add new text
            console.log('🎯 ActivityDataManager: Adding new text:', textUpdate.text_id);
            this.activityData.texts.data.push({ ...textUpdate });
        }
    }
    
    // === CHANGE DETECTION METHODS ===
    
    hasSiteActivityChanged(previous, current) {
        return previous.browsing !== current.browsing || 
               previous.writing !== current.writing ||
               previous.total !== current.total;
    }
    
    hasGameActivityChanged(previousData, currentData) {
        console.log('🎯 ActivityDataManager: Checking for game activity changes...');
        console.log('🎯 ActivityDataManager: Previous length:', previousData.length, 'Current length:', currentData.length);
        
        if (previousData.length !== currentData.length) {
            console.log('🎯 ActivityDataManager: Length difference detected');
            return true;
        }
        
        // Create lookup maps for efficient comparison
        const previousMap = new Map(previousData.map(g => [g.game_id, g]));
        const currentMap = new Map(currentData.map(g => [g.game_id, g]));
        
        console.log('🎯 ActivityDataManager: Previous games:', Array.from(previousMap.keys()));
        console.log('🎯 ActivityDataManager: Current games:', Array.from(currentMap.keys()));
        
        // Check if game IDs are different
        if (previousMap.size !== currentMap.size) {
            console.log('🎯 ActivityDataManager: Map size difference detected');
            return true;
        }
        
        // Check if any game IDs are different
        for (let gameId of currentMap.keys()) {
            if (!previousMap.has(gameId)) {
                console.log(`🎯 ActivityDataManager: New game ID detected: ${gameId}`);
                return true;
            }
        }
        
        // Now check if activity values have changed for existing games
        for (let [gameId, currentGame] of currentMap) {
            const previousGame = previousMap.get(gameId);
            if (!previousGame) {
                console.log(`🎯 ActivityDataManager: Previous game missing: ${gameId}`);
                return true; // New game
            }
            
            console.log(`🎯 ActivityDataManager: Comparing game ${gameId}:`, 
                `previous(b:${previousGame.browsing}, w:${previousGame.writing})`,
                `current(b:${currentGame.browsing}, w:${currentGame.writing})`);
            
            // Check if the actual activity values have changed
            if (previousGame.browsing !== currentGame.browsing || 
                previousGame.writing !== currentGame.writing) {
                console.log(`🎯 ActivityDataManager: Game ${gameId} activity changed:`, 
                    `browsing ${previousGame.browsing}→${currentGame.browsing},`,
                    `writing ${previousGame.writing}→${currentGame.writing}`);
                return true;
            }
        }
        
        console.log('🎯 ActivityDataManager: No changes detected in activity values');
        return false;
    }

    /**
     * Get list of games that have actually changed
     * Returns array of current game data for games that changed
     */
    getChangedGames(previousData, currentData) {
        console.log('🎯 ActivityDataManager: Identifying changed games...');
        
        const changedGames = [];
        
        // Create lookup maps for efficient comparison
        const previousMap = new Map(previousData.map(g => [g.game_id, g]));
        const currentMap = new Map(currentData.map(g => [g.game_id, g]));
        
        // Check for new games or games with changed activity values
        for (let [gameId, currentGame] of currentMap) {
            const previousGame = previousMap.get(gameId);
            
            if (!previousGame) {
                // New game
                console.log(`🎯 ActivityDataManager: New game detected: ${gameId}`);
                changedGames.push(currentGame);
            } else {
                // Check if activity values changed
                if (previousGame.browsing !== currentGame.browsing || 
                    previousGame.writing !== currentGame.writing) {
                    console.log(`🎯 ActivityDataManager: Game ${gameId} activity changed:`, 
                        `browsing ${previousGame.browsing}→${currentGame.browsing},`,
                        `writing ${previousGame.writing}→${currentGame.writing}`);
                    changedGames.push(currentGame);
                }
            }
        }
        
        console.log(`🎯 ActivityDataManager: Found ${changedGames.length} changed games`);
        return changedGames;
    }
    
    hasTextActivityChanged(previousData, currentData) {
        if (previousData.length !== currentData.length) {
            return true;
        }
        
        // Create lookup maps for efficient comparison
        const previousMap = new Map(previousData.map(t => [t.text_id, t]));
        const currentMap = new Map(currentData.map(t => [t.text_id, t]));
        
        // Check if text IDs are different
        if (previousMap.size !== currentMap.size) {
            return true;
        }
        
        // Check if any text IDs are different
        for (let textId of currentMap.keys()) {
            if (!previousMap.has(textId)) {
                return true;
            }
        }
        
        // Now check if activity values have changed for existing texts
        for (let [textId, currentText] of currentMap) {
            const previousText = previousMap.get(textId);
            if (!previousText) {
                return true; // New text
            }
            
            // Check if the actual activity values have changed
            if (previousText.browsing !== currentText.browsing || 
                previousText.writing !== currentText.writing) {
                console.log(`🎯 ActivityDataManager: Text ${textId} activity changed:`, 
                    `browsing ${previousText.browsing}→${currentText.browsing},`,
                    `writing ${previousText.writing}→${currentText.writing}`);
                return true;
            }
        }
        
        return false;
    }
    
    // === PUBLIC API METHODS ===
    
    /**
     * Get current activity data
     */
    getActivityData() {
        return {
            site: { ...this.activityData.site },
            games: { 
                data: [...this.activityData.games.data],
                lastUpdated: this.activityData.games.lastUpdated
            },
            texts: {
                data: [...this.activityData.texts.data], 
                lastUpdated: this.activityData.texts.lastUpdated
            }
        };
    }
    
    /**
     * Get site activity only
     */
    getSiteActivity() {
        return { ...this.activityData.site };
    }
    
    /**
     * Get game activities only
     */
    getGameActivities() {
        return [...this.activityData.games.data];
    }
    
    /**
     * Get text activities only  
     */
    getTextActivities() {
        return [...this.activityData.texts.data];
    }
    
    /**
     * Get activity data for a specific game
     * @param {string} gameId - The game ID to look for
     * @returns {object|null} Activity data for the game or null if not found
     */
    getGameActivity(gameId) {
        const gameActivity = this.activityData.games.data.find(g => g.game_id === gameId);
        if (gameActivity) {
            return {
                browsing: gameActivity.browsing || 0,
                writing: gameActivity.writing || 0,
                timestamp: gameActivity.timestamp
            };
        }
        return null;
    }
} 