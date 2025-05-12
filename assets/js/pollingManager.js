import { eventBus } from './eventBus.js';

export class PollingManager {
    constructor() {
        this.pollingTasks = new Map();
        this.defaultInterval = 10000;
        this.dataManager = window.dataManager;

        // Register default polling tasks
        this.registerDefaultTasks();

        // Event listeners
        eventBus.on('initializePolling', () => this.handleInitializePolling());
        eventBus.on('stopPolling', () => this.stopAllPolling());
    }

    registerDefaultTasks() {
        // Game list polling
        this.registerTask('gameList', {
            interval: this.defaultInterval,
            handler: async () => {
                try {
                    await this.dataManager.checkForUpdates();
                } catch (error) {
                    console.error('Game list polling error:', error);
                }
            }
        });

        // General notifications polling - separate from node updates
        this.registerTask('notifications', {
            interval: this.defaultInterval,
            handler: async () => {
                try {
                    // Only emit notification check if we have a notifications menu
                    if (document.querySelector('.notifications-menu')) {
                        eventBus.emit('checkForNotifications');
                    }
                } catch (error) {
                    console.error('Notification polling error:', error);
                }
            }
        });
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
        console.log('Game list polling initialized');
        this.startPolling();
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