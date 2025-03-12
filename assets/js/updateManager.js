import { eventBus } from './eventBus.js';
/* import { PollingManager } from './pollingManager.js'; */

export class UpdateManager {
    constructor() {
        this.preferSSE = false;

        // Listen for success/failure of SSE
        eventBus.on('sseConnected', () => this.handleSSESuccess());
        eventBus.on('sseFailed', () => this.handleSSEFailure());
    }

    // Called by main.js to ensure other managers set up their event listeners first, and ensures that the DOM is ready. (?)
    initialize() {
        console.log('UpdateManager initialized');
        //this.updateVisibleGameIds();
        window.addEventListener('beforeunload', () => this.cleanup());

        if (this.preferSSE) {
            console.log('Attempting SSE connection');
            eventBus.emit('startSSE', {
                filters: Array.from(this.currentFilters)
            });
        } else {
            console.log('Initializing polling from UpdateManager');
            eventBus.emit('initializePolling');
        }
    }

    handleSSEFailure() {
        console.log('SSE failed, falling back to polling');
        this.preferSSE = false;
        eventBus.emit('initializePolling');
    }

    handleSSESuccess() {
        console.log('SSE connected, stopping polling');
        this.preferSSE = true;
        eventBus.emit('stopPolling');
    }

    cleanup() {
        eventBus.emit('stopSSE');
        eventBus.emit('stopPolling');
    }
}
