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
        eventBus.on('startSSE', () => {
            console.log('SSE: Received startSSE event');
            this.connect();
        });
        eventBus.on('stopSSE', () => {
            console.log('SSE: Received stopSSE event');
            this.disconnect();
        });

        // Listen for parameter changes
        eventBus.on('sseParametersChanged', (param) => {
            console.log('SSE: Parameter changed:', param);
            this.handleParameterChange(param);
        });
    }

    async connect() {
        try {
            console.log('SSE: Attempting to connect');
            
            // Close existing connection if any
            if (this.eventSource) {
                console.log('SSE: Closing existing connection');
                this.disconnect();
            }

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
                lastTreeCheck: lastTreeCheck
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
                
                // Get the root ID from the first modified node if available
                const gameId = data.modifiedNodes?.[0]?.game_id;
                const rootId = this.dataManager.getCurrentViewedRootStoryId();
                console.log('SSE: game ID from update:', gameId, 'Current root ID:', rootId);
                
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
                console.log('SSE: Raw event data:', event.data);
                
                const notifications = JSON.parse(event.data);
                console.log('SSE: Parsed notification data:', notifications);
                console.log('SSE: Number of notifications:', Array.isArray(notifications) ? notifications.length : 'not an array');
                
                if (Array.isArray(notifications) && notifications.length > 0) {
                    eventBus.emit('notificationsReceived', notifications);
                } else {
                    console.warn('SSE: Empty or invalid notifications array received');
                }
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
     * Handle changes to SSE parameters by restarting the connection
     * @param {Object} param The parameter that changed
     * @param {string} param.type The type of parameter ('rootStoryId', 'filters', 'search')
     * @param {any} param.value The new value
     */
    async handleParameterChange(param) {
        if (!this.isConnected) {
            console.log('SSE not connected, skipping parameter update');
            return;
        }

        try {
            console.log('SSE: Restarting connection due to parameter change:', param.type);
            
            // Disconnect current connection
            this.disconnect();
            
            // Create new connection with updated parameters
            await this.connect();
            
            console.log('SSE: Connection restarted with new parameters');
        } catch (error) {
            console.error('Error updating SSE parameters:', error);
        }
    }
}