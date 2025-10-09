export class GamesModifiedHandler {
    constructor() {
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // Listen for game updates
        eventBus.on('gameModified', this.handleGameModified.bind(this));
        eventBus.on('gameAdded', this.handleGameAdded.bind(this));
        eventBus.on('gamesRemoved', this.handleGamesRemoved.bind(this));
    }
    
    handleGameAdded(game) {
        console.log('gameAdded event received:', game);
        // Emit event for adding a new game to the UI
        eventBus.emit('gameAddedToRender', game);
    }

    handleGameModified(eventData) {
        console.log('gameModified event received:', eventData);
        
        const { newGame, oldGame } = eventData;
        
        if (!newGame || !oldGame) {
            console.error('Invalid gameModified event data:', eventData);
            return;
        }
        
        // Check for specific changes and emit appropriate events
        if (String(newGame.openForChanges) !== String(oldGame.openForChanges)) {
            console.log(`Game ${newGame.game_id} status changed from ${oldGame.openForChanges} to ${newGame.openForChanges}`);
            
            eventBus.emit('gameStatusChanged', newGame);
        }
        
        // Check if any of the count properties have changed OR if the unseen count is greater than 0... because oldGame... the dataManager is not getting updated as the user "sees" texts... so that's it. 
        if (newGame.text_count !== oldGame.text_count || 
            newGame.seen_count !== oldGame.seen_count || 
            newGame.unseen_count !== oldGame.unseen_count ||
            newGame.unseen_count > 0) {
            console.log(`Game ${newGame.game_id} counts changed:`, {
                old: {
                    text_count: oldGame.text_count,
                    seen_count: oldGame.seen_count,
                    unseen_count: oldGame.unseen_count
                },
                new: {
                    text_count: newGame.text_count,
                    seen_count: newGame.seen_count,
                    unseen_count: newGame.unseen_count
                }
            });
            eventBus.emit('gameCountsChanged', newGame);
        }
        
        if (newGame.title !== oldGame.title) {
            console.log(`Game ${newGame.game_id} title changed from "${oldGame.title}" to "${newGame.title}"`);
            eventBus.emit('gameTitleChanged', newGame);
        }
        
        if (String(newGame.hasContributed) !== String(oldGame.hasContributed)) {
            console.log(`Game ${newGame.game_id} contribution status changed from ${oldGame.hasContributed} to ${newGame.hasContributed}`);
            eventBus.emit('gameContributionChanged', newGame);
        }
    }

    handleGamesRemoved(gameIds) {
        console.log('GamesModifiedHandler: gamesRemoved event received:', gameIds);
        
        if (!Array.isArray(gameIds) || gameIds.length === 0) {
            console.warn('GamesModifiedHandler: No game IDs provided for removal');
            return;
        }
        
        // Emit specific removal event for UI handling
        eventBus.emit('gamesRemovedFromView', gameIds);
    }


}
