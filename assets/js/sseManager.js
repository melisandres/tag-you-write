import { eventBus } from './eventBus.js';

export class SSEManager {
    constructor() {
        this.eventSource = null;
        this.retryCount = 0;
        this.maxRetries = 5;
        this.retryDelay = 2000;
        this.isConnected = false;
        this.dataManager = window.dataManager;
        this.baseUrl = this.detectBaseUrl();
        this.lastEventId = this.dataManager.getLastEventId();

        console.log('SSEManager constructor called');
        console.log('SSE: Base URL detected as:', this.baseUrl);

        // Bind methods to preserve context
        this.handleParameterChange = this.handleParameterChange.bind(this);
        this.handleBeforeUnload = this.handleBeforeUnload.bind(this);
        
        // Add beforeunload listener to clean up connections
        window.addEventListener('beforeunload', this.handleBeforeUnload);
        
        // Also listen for page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                console.log('SSE: Page hidden, maintaining connection');
            } else {
                console.log('SSE: Page visible');
            }
        });

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
                // Brief delay to ensure the connection is fully closed
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            // Get all SSE parameters from DataManager
            const params = new URLSearchParams();
            const sseParams = this.dataManager.getSSEParameters();
            
            // Add all parameters to URLSearchParams
            Object.entries(sseParams).forEach(([key, value]) => {
                if (value !== null && value !== undefined) {
                    if (key === 'filters') {
                        params.append(key, JSON.stringify(value));
                    } else {
                        params.append(key, value);
                    }
                }
            });
            
            // Get writer_id from session or localStorage as a fallback for session issues
            // SECURITY NOTE: The server will prioritize the session-based writer_id over this parameter
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
            
            // Set readyState to CLOSED immediately to prevent further events
            try {
                this.eventSource.close();
            } catch (error) {
                console.warn('SSE: Error closing EventSource:', error);
            }
            
            // Remove all event listeners to prevent memory leaks
            this.eventSource.onopen = null;
            this.eventSource.onmessage = null;
            this.eventSource.onerror = null;
            
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
                
                // Update lastEventId if present in the data
                if (data.id) {
                    this.lastEventId = data.id;
                    this.dataManager.setLastEventId(data.id);
                }
                
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
            
            // Wait a moment for the connection to fully close on the server side
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Create new connection with updated parameters
            await this.connect();
            
            console.log('SSE: Connection restarted with new parameters');
        } catch (error) {
            console.error('Error updating SSE parameters:', error);
        }
    }

    /**
     * Handle page unload - ensure SSE connection is properly closed
     */
    handleBeforeUnload() {
        console.log('SSE: Page unloading, closing connection');
        this.forceDisconnect();
    }
    
    /**
     * Force disconnect without any reconnection attempts
     */
    forceDisconnect() {
        if (this.eventSource) {
            console.log('SSE: Force disconnecting');
            this.eventSource.close();
            this.eventSource = null;
            this.isConnected = false;
            this.retryCount = 0;
        }
    }
}