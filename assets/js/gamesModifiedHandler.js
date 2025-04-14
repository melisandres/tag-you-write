export class GamesModifiedHandler {
    constructor() {
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // New event handlers
        eventBus.on('gameModified', this.handleGameModified.bind(this));
        eventBus.on('gameAdded', this.handleGameAdded.bind(this));
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
        if (newGame.status !== oldGame.status) {
            console.log(`Game ${newGame.game_id} status changed from ${oldGame.status} to ${newGame.status}`);
            eventBus.emit('gameStatusChanged', newGame);
        }
        
        if (newGame.counts !== oldGame.counts) {
            console.log(`Game ${newGame.game_id} counts changed:`, {
                old: oldGame.counts,
                new: newGame.counts
            });
            eventBus.emit('gameCountsChanged', newGame);
        }
        
        if (newGame.title !== oldGame.title) {
            console.log(`Game ${newGame.game_id} title changed from "${oldGame.title}" to "${newGame.title}"`);
            eventBus.emit('gameTitleChanged', newGame);
        }
        
        if (newGame.is_contribution !== oldGame.is_contribution) {
            console.log(`Game ${newGame.game_id} contribution status changed from ${oldGame.is_contribution} to ${newGame.is_contribution}`);
            eventBus.emit('gameContributionChanged', newGame);
        }
        
        // Always emit gameModifiedToRender to update the UI
        eventBus.emit('gameModifiedToRender', newGame);
    }
}
