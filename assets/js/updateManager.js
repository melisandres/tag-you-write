import { SSEManager } from './sseManager.js';
import { PollingManager } from './pollingManager.js';
import { eventBus } from './eventBus.js';

export class UpdateManager {
    constructor(path) {
        this.preferSSE = false;
        this.path = path;
        this.currentGameIds = new Set();
        this.sseManager = new SSEManager(path);

        // Listen for success/failure of SSE
        eventBus.on('sseConnected', () => this.handleSSESuccess());
        eventBus.on('sseFailed', () => this.handleSSEFailure());
    }

    // Called by main.js to ensure other managers set up their event listeners first, and ensures that the DOM is ready. (?)
    initialize() {
        this.updateVisibleGameIds();
        window.addEventListener('beforeunload', () => this.cleanup());

        if (this.preferSSE) {
            // Signal to start SSE
            eventBus.emit('startSSE', {
                path: this.path,
                gameIds: Array.from(this.currentGameIds)
            });
        } else {
            this.initializePolling();
        }
    }

    handleSSESuccess() {
        // Stop polling when SSE connects
        eventBus.emit('stopPolling');
        console.log('SSE connected, polling stopped');
    }

    handleSSEFailure() {
        console.log('SSE failed, falling back to polling');
        this.preferSSE = false;
        this.initializePolling();
    }

    initializePolling() {
        if (this.currentGameIds.size > 0) {
            eventBus.emit('startPolling', {
                gameIds: Array.from(this.currentGameIds)
            });
        }
    }

    updateVisibleGameIds() {
        const visibleGameIds = Array.from(
            document.querySelectorAll('[data-game-id]')
        ).map(el => el.dataset.gameId);
        
        this.currentGameIds = new Set(visibleGameIds);
        return visibleGameIds;
    }

    cleanup() {
        eventBus.emit('stopSSE');
        eventBus.emit('stopPolling');
    }
}
