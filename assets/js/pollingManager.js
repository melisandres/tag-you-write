import { eventBus } from './eventBus.js';

export class PollingManager {
    constructor(path) {
        this.path = path;
        this.pollingIntervals = new Map();
        this.timeBetweenChecks = 10000000;
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
                await this.dataManager.checkForUpdates();
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