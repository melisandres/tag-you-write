export class GameUpdateHandler {
    constructor() {
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        eventBus.on('gamesModified', this.handleGamesModified.bind(this));
    }

    handleGamesModified(modifiedGames) {
        modifiedGames.forEach(game => {
            // Update game list
            eventBus.emit('updateGame', game);
            
            // Update tree if visible
            if (document.querySelector('#showcase[data-showcase="tree"]')) {
                eventBus.emit('updateTreeGame', game);
            }
            
            // Update shelf if visible
            if (document.querySelector('#showcase[data-showcase="shelf"]')) {
                eventBus.emit('updateShelfGame', game);
            }
            
            // Update modal if visible
            if (document.querySelector('[data-tree-modal="visible"]')) {
                eventBus.emit('updateModalGame', game);
            }
        });
    }
}
