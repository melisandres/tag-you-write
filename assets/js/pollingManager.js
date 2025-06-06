import { eventBus } from './eventBus.js';

export class PollingManager {
    constructor() {
        this.pollingTasks = new Map();
        this.defaultInterval = 5000;
        this.dataManager = window.dataManager;
        this.errorRetryCount = 0;
        this.maxErrorRetries = 5;

        // Register default polling tasks
        this.registerDefaultTasks();

        // Event listeners
        eventBus.on('initializePolling', () => this.handleInitializePolling());
        eventBus.on('stopPolling', () => this.stopAllPolling());
    }

    registerDefaultTasks() {
        // Combined unified polling task for all updates
        this.registerTask('allUpdates', {
            interval: this.defaultInterval,
            handler: async () => {
                try {
                    await this.fetchUpdates();
                    // Reset error count on success
                    this.errorRetryCount = 0;
                } catch (error) {
                    console.error('Updates polling error:', error);
                }
            }
        });
    }

    // Fetch all updates using the combined endpoint
    async fetchUpdates() {
        try {
            const endpoint = 'event/getUpdates';
            const urlString = window.i18n.createUrl(endpoint);
            const url = new URL(urlString, window.location.origin);
            
            // Get parameters from DataManager (same as SSE)
            const params = this.dataManager.getSSEParameters();
            
            // Build URL with parameters
            Object.keys(params).forEach(key => {
                if (params[key] !== null && params[key] !== undefined) {
                    if (typeof params[key] === 'object') {
                        url.searchParams.append(key, JSON.stringify(params[key]));
                    } else {
                        url.searchParams.append(key, params[key]);
                    }
                }
            });

            console.log('Polling: Fetching updates from:', url.toString());
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                credentials: 'same-origin' // Include cookies for session
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const updates = await response.json();
            console.log('Polling: Received updates:', updates);
            
            // Process the updates
            this.processUpdates(updates);
            
            return true;
        } catch (error) {
            this.handlePollingError();
            console.error('Error fetching updates:', error);
            return false;
        }
    }

    // Handle polling errors with exponential backoff
    handlePollingError() {
        this.errorRetryCount++;
        
        if (this.errorRetryCount > this.maxErrorRetries) {
            console.warn(`Polling has failed ${this.errorRetryCount} times, pausing polling for 1 minute`);
            
            // Pause polling for a minute
            this.stopAllPolling();
            
            // Try again after a minute
            setTimeout(() => {
                console.log('Resuming polling after error pause');
                this.errorRetryCount = 0;
                this.startPolling('allUpdates');
            }, 60000); // 1 minute
        }
    }

    // Process updates similar to how SSEManager does
    processUpdates(updates) {
        // Session-based tracking handles lastEventId automatically on the server
        // No need to update it on the frontend
        
        // Process notifications
        if (updates.notifications && updates.notifications.length > 0) {
            console.log('Polling: Processing notifications:', updates.notifications);
            eventBus.emit('notificationsReceived', updates.notifications);
        }
        
        // Process site-wide activity data
        if (updates.siteWideActivity) {
            console.log('Polling: Processing site-wide activity:', updates.siteWideActivity);
            eventBus.emit('siteActivityUpdate', updates.siteWideActivity);
        }
        
        // Process game activity data
        if (updates.gameActivity) {
            console.log('Polling: Processing game activity:', updates.gameActivity);
            eventBus.emit('gameActivityUpdate', updates.gameActivity);
        }
        
        // Process text activity data
        if (updates.textActivity) {
            console.log('Polling: Processing text activity:', updates.textActivity);
            eventBus.emit('textActivityUpdate', updates.textActivity);
        }
        
        // Process game/text updates
        const rootId = this.dataManager.getCurrentViewedRootStoryId();
        this.dataManager.handleUpdateResponse(updates, rootId);
    }

    // Register a new polling task
    registerTask(taskId, config) {
        if (this.pollingTasks.has(taskId)) {
            this.stopPolling(taskId);
        }

        const interval = config.interval || this.defaultInterval;
        const handler = config.handler || (() => {});
        const errorHandler = config.errorHandler || ((error) => console.error(`Polling error for ${taskId}:`, error));
        
        const task = {
            interval,
            handler,
            errorHandler,
            active: true,
            lastPollTime: 0
        };
        
        this.pollingTasks.set(taskId, task);
        this.startPolling(taskId);
        
        return taskId;
    }

    handleInitializePolling() {
        console.log('Polling initialized');
        this.startPolling('allUpdates');
    }

    // Start polling for a specific task
    startPolling(taskId) {
        const task = this.pollingTasks.get(taskId);
        if (!task) return;
        
        task.active = true;
        this.executePollingTask(taskId);
    }

    stopPolling(taskId) {
        const task = this.pollingTasks.get(taskId);
        if (task) {
            console.log(`Stopping polling for ${taskId}`);
            task.active = false;
        }
    }

    // Stop all polling tasks
    stopAllPolling() {
        for (const taskId of this.pollingTasks.keys()) {
            this.stopPolling(taskId);
        }
    }

    // Get status of a polling task
    getTaskStatus(taskId) {
        const task = this.pollingTasks.get(taskId);
        if (!task) return null;
        
        return {
            active: task.active,
            lastPollTime: task.lastPollTime,
            interval: task.interval
        };
    }

    // Execute a single polling task
    async executePollingTask(taskId) {
        const task = this.pollingTasks.get(taskId);
        if (!task || !task.active) return;
        
        try {
            await task.handler();
            task.lastPollTime = Date.now();
        } catch (error) {
            task.errorHandler(error);
        } finally {
            // Schedule next poll if still active
            if (task.active) {
                setTimeout(() => this.executePollingTask(taskId), task.interval);
            }
        }
    }
}