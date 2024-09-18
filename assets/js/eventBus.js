class EventBus {
    constructor() {
        this.listeners = {};
    }

    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    }

    emit(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(callback => callback(data));
        }
    }
}

export const eventBus = new EventBus();

// Example listeners
eventBus.on('instaPublish', ({ textId, textStatus }) => {
    // I currently have these listeners in the modalUpdateManager, shelfUpdateManager, and the treeUpdateManager.
});

eventBus.on('instaDelete', ({ textId }) => {
    console.log(`Text ${textId} has been insta-deleted`);
    // Update relevant UI components
});

eventBus.on('chooseWinner', ({ textId }) => {
    console.log(`Text ${textId} has been chosen as the winner`);
    // Update relevant UI components
});

// Example of how to emit these events (to be used in other parts of your application)
// eventBus.emit('instaPublish', { textId: 123 });
// eventBus.emit('instaDelete', { textId: 456 });
// eventBus.emit('chooseWinner', { textId: 789 });