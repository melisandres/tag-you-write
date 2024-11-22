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

    off(event, callback) {
        if (!this.listeners[event]) return;
        this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
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
    // Update relevant UI components
});

eventBus.on('chooseWinner', ({ textId }) => {
    // Update relevant UI components
});

eventBus.on('voteToggle', ({ result }) => {
    // Update relevant UI components
});
