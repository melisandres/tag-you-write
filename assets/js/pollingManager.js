import { eventBus } from './eventBus.js';

export class PollingManager {
    constructor(path) {
        this.path = path;
        this.pollingIntervals = new Map();
        this.timeBetweenChecks = 10000;
        this.dataManager = window.dataManager;

        // Event listeners
        eventBus.on('initializePolling', () => this.handleInitializePolling());
        eventBus.on('stopPolling', () => this.stopPolling());
    }

    handleInitializePolling() {
        console.log('Game list polling initialized');
        this.startPolling();
    }

    startPolling() {
        if (this.pollingIntervals.has('games')) {
            console.log('Stopping existing game list polling');
            this.stopPolling();
        }

        console.log('Starting new polling interval');
        const intervalId = setInterval(async () => {
            try {
                console.log('Checking for updates...');
                const hasUpdates = await this.dataManager.checkForUpdates();
                if (hasUpdates) {
                    const modifiedGames = this.dataManager.getRecentlyModifiedGames();
                    console.log('Modified games found:', modifiedGames);
                }
            } catch (error) {
                console.error('Polling error:', error);
            }
        }, this.timeBetweenChecks);

        this.pollingIntervals.set('games', intervalId);
    }

    stopPolling() {
        const intervalId = this.pollingIntervals.get('games');
        if (intervalId) {
            console.log('Stopping polling');
            clearInterval(intervalId);
            this.pollingIntervals.delete('games');
        }
    }
}