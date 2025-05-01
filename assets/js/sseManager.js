import { eventBus } from './eventBus.js';

export class SSEManager {
    constructor() {
        this.eventSource = null;
        this.retryCount = 0;
        this.maxRetries = 5;
        this.retryDelay = 5000; // 5 seconds
        this.isConnected = false;
        this.dataManager = window.dataManager;

        console.log('SSEManager constructor called');

        // Listen for control events
        eventBus.on('startSSE', ({gameIds}) => {
            console.log('SSE: Received startSSE event with gameIds:', gameIds);
            this.connect(gameIds);
        });
        eventBus.on('stopSSE', () => {
            console.log('SSE: Received stopSSE event');
            this.disconnect();
        });

        // Listen for root story ID changes
        eventBus.on('currentViewedRootStoryIdChanged', (rootStoryId) => {
            this.updateRootStoryIdOnServer(rootStoryId);
        });
    }

    async connect(gameIds = []) {
        try {
            console.log('SSE: Attempting to connect with gameIds:', gameIds);
            
            // Close existing connection if any
            if (this.eventSource) {
                console.log('SSE: Closing existing connection');
                this.disconnect();
            }

            //TODO: consider getting some of this differently... like from the URL... if that is the source of truth

            // Get current state from DataManager
            const rootId = this.dataManager.getCurrentViewedRootStoryId();
            const lastGamesCheck = this.dataManager.cache.lastGamesCheck || 0;
            const filters = this.dataManager.cache.filters || {};
            const search = this.dataManager.cache.search || '';
            const lastTreeCheck = this.dataManager.cache.trees.get(rootId)?.timestamp || 0;

            // Build the URL with parameters
            const params = new URLSearchParams({
                lastGamesCheck: lastGamesCheck,
                filters: JSON.stringify(filters),
                search: search,
                rootStoryId: rootId,
                lastTreeCheck: lastTreeCheck,
                gameIds: gameIds.join(',')
            });

            const endpoint = `sse/stream?${params.toString()}`;
            const url = window.i18n.createUrl(endpoint);
            console.log('SSE: Connecting to URL:', url);
            
            this.eventSource = new EventSource(url);

            this.eventSource.onopen = () => {
                console.log('SSE: Connection established');
                this.retryCount = 0;
                this.isConnected = true;
                eventBus.emit('sseConnected');
            };

            this.setupEventListeners();

        } catch (error) {
            console.error('SSE: Connection error:', error);
            this.handleConnectionError(error);
        }
    }

    disconnect() {
        if (this.eventSource) {
            console.log('SSE: Disconnecting');
            this.eventSource.close();
            this.eventSource = null;
            this.isConnected = false;
        }
    }

    setupEventListeners() {
        if (!this.eventSource) {
            console.error('SSE: Cannot setup event listeners - no EventSource');
            return;
        }

        // Game update event
        this.eventSource.addEventListener('update', (event) => {
            try {
                console.log('SSE: Received update event');
                const data = JSON.parse(event.data);
                console.log('SSE: Update event data:', data);
                
                // Process modified games
                if (data.modifiedGames && data.modifiedGames.length > 0) {
                    console.log('SSE: Processing modified games:', data.modifiedGames);
                }
                
                // Process modified nodes
                if (data.modifiedNodes && data.modifiedNodes.length > 0) {
                    console.log('SSE: Processing modified nodes:', data.modifiedNodes);
                }
                
                // Process search results
                if (data.searchResults && data.searchResults.length > 0) {
                    console.log('SSE: Processing search results:', data.searchResults);
                }
                
                // Get the root ID from the first modified node if available
                const gameId = data.modifiedNodes?.[0]?.game_id;
                const rootId = this.dataManager.getGameRootId(gameId);
                console.log('SSE: Using rootId for update:', rootId);
                
                // Handle the update response
                this.dataManager.handleUpdateResponse(data, rootId);
            } catch (error) {
                console.error('SSE: Error processing update event:', error);
            }
        });

        // Notification update event
        this.eventSource.addEventListener('notificationUpdate', (event) => {
            try {
                console.log('SSE: Received notification update event');
                const notifications = JSON.parse(event.data);
                console.log('SSE: Notification update data:', notifications);
                eventBus.emit('notificationsReceived', notifications);
            } catch (error) {
                console.error('SSE: Error processing notification update:', error);
            }
        });

        // Error event
        this.eventSource.addEventListener('error', (event) => {
            console.error('SSE: Error event received:', event);
            this.handleConnectionError(event);
        });

        // Keepalive event
        this.eventSource.addEventListener('keepalive', (event) => {
            console.debug('SSE: Keepalive received:', event.data);
        });
    }

    handleConnectionError(error) {
        console.error('SSE: Connection error:', error);
        this.isConnected = false;
        
        if (this.retryCount < this.maxRetries) {
            this.retryCount++;
            console.log(`SSE: Attempting to reconnect (${this.retryCount}/${this.maxRetries})...`);
            setTimeout(() => {
                this.connect();
            }, this.retryDelay);
        } else {
            console.error('SSE: Max retry attempts reached, falling back to polling');
            eventBus.emit('sseFailed', error);
        }
    }

    /**
     * Update the root story ID on the server
     * @param {string|null} rootStoryId The ID of the root story being viewed
     */
    async updateRootStoryIdOnServer(rootStoryId) {
        if (!this.isConnected) {
            console.log('SSE not connected, skipping root story ID update');
            return;
        }

        try {
            const endpoint = window.i18n.createUrl(`sse/updateRootStoryId/${rootStoryId || 'null'}`);
            const response = await fetch(endpoint);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            console.log('Root story ID updated on server:', rootStoryId);
        } catch (error) {
            console.error('Error updating root story ID:', error);
        }
    }
}