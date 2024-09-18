export class PollingManager {
    constructor() {
        this.pollingInterval = null;
        this.listeners = new Map();
        this.currentGameId = null;
        this.lastUpdateTimestamp = Date.now();
    }

    setCurrentGame(gameId) {
        this.currentGameId = gameId;
        this.lastUpdateTimestamp = Date.now();
    }

    addListener(key, callback) {
        this.listeners.set(key, callback);
    }

    removeListener(key) {
        this.listeners.delete(key);
    }

    startPolling(interval = 5000) {
        if (this.pollingInterval) this.stopPolling();
        this.pollingInterval = setInterval(() => this.pollForUpdates(), interval);
    }

    stopPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
    }

    async pollForUpdates() {
        if (!this.currentGameId) return;

        try {
            const response = await fetch(`/api/updates?gameId=${this.currentGameId}&since=${this.lastUpdateTimestamp}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const updates = await response.json();

            if (updates.length > 0) {
                this.processUpdates(updates);
                this.lastUpdateTimestamp = Date.now();
            }
        } catch (error) {
            console.error('Error polling for updates:', error);
        }
    }

    processUpdates(updates) {
        for (const [key, callback] of this.listeners) {
            callback(updates);
        }
    }
}