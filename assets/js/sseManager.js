import { eventBus } from './eventBus.js';

export class SSEManager {
    constructor(path) {
        this.path = path;
        this.eventSource = null;
        this.retryCount = 0;
        this.maxRetries = 5;

        // Listen for control events
        eventBus.on('startSSE', ({path, gameIds}) => this.connect(gameIds));
        eventBus.on('stopSSE', () => this.disconnect());
    }

    async connect(gameIds = []) {
        try {
            // Close existing connection if any
            if (this.eventSource) {
                this.eventSource.close();
            }

            // Build the URL with parameters
            const params = new URLSearchParams({
                lastCheck: Date.now(),
                gameIds: gameIds.join(',')
            });

            this.eventSource = new EventSource(
                `${this.path}sse/stream?${params.toString()}`
            );

            this.eventSource.onopen = () => {
                console.log('SSE Connection established');
                this.retryCount = 0;
                eventBus.emit('sseConnected');
            };

            this.setupEventListeners();

        } catch (error) {
            console.error('SSE connection error:', error);
            eventBus.emit('sseFailed', error);
        }
    }

    disconnect() {
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
        }
    }

    setupEventListeners() {
        this.eventSource.addEventListener('gameUpdate', (event) => {
            try {
                const modifiedGames = JSON.parse(event.data);
                eventBus.emit('gamesModified', modifiedGames);
            } catch (error) {
                console.error('Error parsing game update:', error);
            }
        });

        this.eventSource.onerror = (error) => {
            console.error('SSE error:', error);
            this.disconnect();
            eventBus.emit('sseFailed', error);
        };
    }
}