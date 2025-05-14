import { eventBus } from './eventBus.js';

export class SSEManager {
    constructor() {
        this.eventSource = null;
        this.retryCount = 0;
        this.maxRetries = 5;
        this.retryDelay = 5000; // 5 seconds
        this.isConnected = false;
        this.dataManager = window.dataManager;
        this.baseUrl = this.detectBaseUrl();

        console.log('SSEManager constructor called');
        console.log('SSE: Base URL detected as:', this.baseUrl);

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
    
    /**
     * Get the base URL for SSE connections from the meta tag
     */
    detectBaseUrl() {
        const baseUrlMeta = document.querySelector('meta[name="base-url"]');
        if (baseUrlMeta && baseUrlMeta.dataset.baseUrl) {
            return `${baseUrlMeta.dataset.baseUrl}public/sse/`;
        }
        
        // Simple fallback if no meta tag (shouldn't happen in proper setup)
        console.warn('SSE: No base-url meta tag found, using default path');
        return '/public/sse/';
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
            
            // Send last event ID if we have one from a previous connection
            // Otherwise, let the server determine the appropriate starting point
            const lastEventId = this.lastEventId || null;
            
            // Build the URL with parameters
            const params = new URLSearchParams({
                lastGamesCheck: lastGamesCheck,
                filters: JSON.stringify(filters),
                search: search,
                rootStoryId: rootId,
                lastTreeCheck: lastTreeCheck
            });
            
            // Only add lastEventId if it's not null (let server handle initial value)
            // This parameter is necessary for resuming the event stream from where we left off
            if (lastEventId !== null) {
                params.append('lastEventId', lastEventId);
                console.log('SSE: Including lastEventId:', lastEventId);
            } else {
                console.log('SSE: No lastEventId, server will determine starting point');
            }
            
            // Get writer_id from session or localStorage as a fallback for session issues
            // SECURITY NOTE: The server will prioritize the session-based writer_id over this parameter
            // We include this as a redundant approach in case of cookie/session issues
            if (window.WriterID) {
                params.append('writer_id', window.WriterID);
                console.log('SSE: Including writer_id from global WriterID:', window.WriterID);
            } else {
                // Try to get writer_id from user meta tag first (already in the header)
                const userMeta = document.querySelector('meta[name="user"]');
                if (userMeta && userMeta.dataset.userId && userMeta.dataset.userId !== 'null') {
                    params.append('writer_id', userMeta.dataset.userId);
                    console.log('SSE: Including writer_id from meta tag:', userMeta.dataset.userId);
                } else {
                    // Fall back to cookie check
                    const cookies = document.cookie.split(';');
                    for (let cookie of cookies) {
                        const [name, value] = cookie.trim().split('=');
                        if (name === 'writer_id') {
                            params.append('writer_id', value);
                            console.log('SSE: Including writer_id from cookie:', value);
                            break;
                        }
                    }
                }
            }

            // Direct access to the simple SSE implementation
            const url = `${this.baseUrl}events.php?${params.toString()}`;
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

        // Keep alive event
        this.eventSource.addEventListener('keepalive', (event) => {
            try {
                const data = JSON.parse(event.data);
                console.debug('SSE: Keepalive received:', data);
            } catch (error) {
                console.debug('SSE: Keepalive received (unparsed):', event.data);
            }
        });
        
        // Timeout event
        this.eventSource.addEventListener('timeout', (event) => {
            try {
                console.log('SSE: Timeout event received, reconnecting...');
                this.disconnect();
                setTimeout(() => this.connect(), 1000); // Reconnect after 1 second
            } catch (error) {
                console.error('SSE: Error handling timeout event:', error);
            }
        });

        // Error event
        this.eventSource.addEventListener('error', (event) => {
            console.error('SSE: Error event received:', event);
            this.handleConnectionError(event);
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
     * 
     * Note: We must reconnect when parameters change because SSE connections are persistent 
     * and one-way. The server can't listen for parameter changes on an existing connection,
     * so we need to establish a new connection with updated parameters.
     * 
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