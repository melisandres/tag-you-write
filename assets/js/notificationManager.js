import { eventBus } from './eventBus.js';

export class NotificationManager {
    constructor() {
        this.warningManager = window.warningManager;
        this.activeNotifications = new Set(); // Track active notifications
        this.notifications = [];
        this.lastCheck = null;
        this.init();
    }

    init() {
        console.log('NotificationManager initialized');
        
        // Listen for notification events from PollingManager
        eventBus.on('checkForNotifications', () => {
            this.fetchNotifications();
        });
    }

    async fetchNotifications() {
        if (!document.querySelector('.notifications-menu')){
            console.error('Notifications menu not found');
            return;
        }
        
        try {
            // Set lastCheck to 5 seconds before the current time to ensure we don't miss any notifications
            const currentTime = Date.now();
            
            const endpoint = window.i18n.createUrl(`/notification/getNewNotifications${this.lastCheck ? "/" + this.lastCheck : ''}`);
            const response = await fetch(endpoint);
            
            if (!response.ok) {
                console.error('Error fetching notifications:', response.status, response.statusText);
                return; // Don't update lastCheck if there was an error
            }
            
            const newNotifications = await response.json();
            
            if (newNotifications && newNotifications.length > 0) {
                // Process the new notifications
                this.processNotifications(newNotifications);
                // Only update lastCheck after successfully processing notifications
                this.lastCheck = currentTime;
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
            // Don't update lastCheck if there was an error
        }
    }
    

    /**
     * Process a batch of notifications
     * @param {Array} notifications - Array of notification objects
     */
    processNotifications(notifications) {
        if (!Array.isArray(notifications)) {
            console.error('Expected array of notifications but got:', typeof notifications);
            return;
        }
        
        // Check if we're on a game page and get the current game ID
        const gameIdElement = document.querySelector('[name="game_id"]');
        const currentGameId = gameIdElement?.value;
        const isOnGamePage = this.isOnGameEditingPage();
        
        // Process each notification
        notifications.forEach(notification => {
            // Skip if we already have this notification
            if (this.notifications.some(n => n.id === notification.id)) {
                return;
            }

            this.notifications.push(notification);

            // set the notification as not critical
            let isCritical = false;

            // Check if this is a game end notification for the current game
            if (isOnGamePage && 
                currentGameId && 
                notification.game_id === currentGameId && 
                notification.seen_at === null &&
                this.isGameEndNotification(notification)) {
                // set the notification as critical
                isCritical = true;
            }
            
            // send the notification
            this.displayNotification(notification, isCritical);
        });
    }

    /**
     * Check if we're on a game editing page
     * @returns {boolean} - Whether we're on a game editing page
     */
    isOnGameEditingPage() {
        const form = document.querySelector('form');
        if (!form) return false;
        
        const parentId = form.querySelector('[name="parent_id"]');
        const currentPage = form.querySelector('[name="currentPage"]');
        
        if (!parentId || !currentPage) return false;
        
        const pageValue = currentPage.value;
        const parentValue = parentId.value;
        const validPages = ['text-iterate.php', 'text-draft-edit.php', 'text-note-edit.php', 'text-create.php'];
        
        return validPages.includes(pageValue) && parentValue !== '';
    }

    /**
     * Check if a notification is a game end notification
     * @param {Object} notification - Notification object
     * @returns {boolean} - Whether it's a game end notification
     */
    isGameEndNotification(notification) {
        const gameEndTypes = ['game_closed', 'game_won'];
        return gameEndTypes.includes(notification.notification_type);
    }

    /**
     * Display a single notification
     * @param {Object} notification - Notification object
     * @param {boolean} isCritical - Whether this is a critical notification
     */
    displayNotification(notification, isCritical = false) {
        // Skip if we already have an active modal for this notification
        if (this.activeNotifications.has(notification.id)) {
            return;
        }
        
        // Check if this notification should be displayed as a modal
        if (isCritical || this.shouldShowAsModal(notification)) {
            this.showAsModal(notification);
        }
        
        this.addToNotificationsMenu(notification);
    }

    /**
     * Determine if a notification should be shown as a modal
     * @param {Object} notification - Notification object
     * @returns {boolean} - Whether to show as modal
     */
    shouldShowAsModal(notification) {
        // Define which notification types should be displayed as warning modals
        const criticalTypes = ['game_closed', 'game_won'];
        
        // Check if the notification type is in the critical list
        const isCriticalType = criticalTypes.includes(notification.notification_type);
        
        // If it's not a critical type, it's not critical
        if (!isCriticalType) {
            return false;
        }
        
        // Check if we're on a game page
        const gameIdElement = document.querySelector('[name="game_id"]');
        if (!gameIdElement || !gameIdElement.value) {
            // Not on a game page, so not critical
            return false;
        }
        
        // Check if the notification is for the current game
        const currentGameId = gameIdElement.value;
        const notificationGameId = notification.game_id;
        
        // Only critical if it's for the current game
        return currentGameId === notificationGameId;
    }

    /**
     * Show a notification as a modal
     * @param {Object} notification - Notification object
     */
    showAsModal(notification) {
        if (!this.warningManager) {
            console.error('WarningManager not available');
            return;
        }
        
        // Add to active notifications
        this.activeNotifications.add(notification.id);
        
        // Create message based on notification type
        let message = '';
        
        // Get translation keys
        const titleKey = `notifications.notification_${notification.notification_type}`;
        const contentKey = `notifications.notification_${notification.notification_type}_text`;
        
        // Get translated title and content
        const title = window.i18n ? window.i18n.translate(titleKey) : notification.notification_type;
        
        // Create content with placeholders
        let content = '';
        if (notification.game_title) {
            content += `Game: ${notification.game_title}\n`;
        }
        
        if (notification.winning_title) {
            content += `Winning text: ${notification.winning_title}\n`;
        }
        
        // Combine title and content
        message = `${title}\n\n${content}`;
        
        const onClose = () => {
            this.markNotificationAsSeen(notification.id);
            this.activeNotifications.delete(notification.id);
        };
        
        this.warningManager.createWarningModal(message, onClose, onClose);
    }

    /**
     * Add a notification to the notifications menu
     * @param {Object} notification - Notification object
     */
    addToNotificationsMenu(notification) {
        if (window.notificationsMenuManager) {
            window.notificationsMenuManager.addNewNotification(notification);
            //this.markNotificationAsSeen(notification.id);
        } else {
            console.error('NotificationsMenuManager not available');
        }
    }

    /**
     * Mark a notification as seen
     * @param {string|number} notificationId - ID of the notification
     */
    markNotificationAsSeen(notificationId) {
        const endpoint = `notification/markAsSeen/${notificationId}`;
        const url = window.i18n.createUrl(endpoint);
        
        fetch(url)
            .then(response => response.json())
            .catch(error => console.error('Error updating notification:', error));
    }
}
