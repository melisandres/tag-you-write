import { eventBus } from './eventBus.js';
/* import { PollingManager } from './pollingManager.js'; */

export class UpdateManager {
    constructor() {
        this.preferSSE = true; // Enable SSE by default for testing

        // Listen for success/failure of SSE
        eventBus.on('sseConnected', () => this.handleSSESuccess());
        eventBus.on('sseFailed', () => this.handleSSEFailure());
        
        console.log('UpdateManager created with SSE preference:', this.preferSSE);
    }

    // Called by main.js to ensure other managers set up their event listeners first, and ensures that the DOM is ready. (?)
    initialize() {
        console.log('UpdateManager initialized');
        window.addEventListener('beforeunload', () => this.cleanup());

        if (this.preferSSE) {
            console.log('Attempting SSE connection');
            eventBus.emit('startSSE');
        } else {
            console.log('Initializing polling from UpdateManager');
            eventBus.emit('initializePolling');
        }
    }

    handleSSEFailure(error) {
        console.error('SSE failed:', error);
        console.log('Falling back to polling');
        this.preferSSE = false;
        eventBus.emit('initializePolling');
    }

    handleSSESuccess() {
        console.log('SSE connected successfully, stopping polling');
        this.preferSSE = true;
        eventBus.emit('stopPolling');
    }

    cleanup() {
        console.log('UpdateManager cleanup - stopping SSE and polling');
        eventBus.emit('stopSSE');
        eventBus.emit('stopPolling');
    }
}
