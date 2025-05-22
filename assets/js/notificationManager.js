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
        
        // Listen for SSE or polling notification updates
        eventBus.on('notificationsReceived', (notifications) => {
            console.log('Received notifications:', notifications);
            this.processNotifications(notifications);
        });

        eventBus.on('notification-clicked', (data) => {
            // Handle both old format (just ID) and new format (object with ID and linkHref)
            const notificationId = typeof data === 'object' ? data.notificationId : data;
            const linkHref = typeof data === 'object' ? data.linkHref : null;
            
            this.markNotificationAsRead(notificationId, linkHref);
        });
        
        // Listen for marking all notifications as seen
        eventBus.on('mark-all-notifications-seen', (notificationIds) => {
            this.markAllNotificationsAsSeen(notificationIds);
        });
        
        // Listen for notification deletion
        eventBus.on('notification-deleted', (notificationId) => {
            this.markNotificationAsDeleted(notificationId);
        });
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

            // Skip if this is not a notification object
            if (!notification.notification_type) {
                console.warn('Received non-notification object:', notification);
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
        
        // Get translation keys
        const titleKey = `notifications.warning_${notification.notification_type}_title`;
        const contentKey = `notifications.warning_${notification.notification_type}_text`;

        // Parameters for the content translation
        const contentParams = {
            game_title: notification.game_title,
            winning_title: notification.winning_title
        };
        
        // Get translated title and content
        const title = window.i18n ? window.i18n.translate(titleKey) : notification.notification_type;
        const message = window.i18n ? window.i18n.translate(contentKey, contentParams) : notification.notification_type;
        
        // Create a formatted message with title and content
        const formattedMessage = `<h3 data-i18n="${titleKey}">${title}</h3>
        <p data-i18n="${contentKey}" data-i18n-params='${JSON.stringify(contentParams)}'>${message}</p>`;

        const onConfirm = () => {
            this.markNotificationAsSeen(notification.id);
            this.activeNotifications.delete(notification.id);
        };
        
        const onCancel = () => {
            // Maybe with the following line, the notification will come back next time its polled for, after the user cancels. 
            this.activeNotifications.delete(notification.id);
        };
        
        // Create a custom modal with the formatted message
        this.warningManager.createWarningModal(formattedMessage, onConfirm, onCancel, 'warning.confirm_game_done', 'warning.cancel_game_done');
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
            .then(data => {
                // Emit an event to update the notification badge
                if (window.eventBus) {
                    window.eventBus.emit('notification-seen', { notificationId: notificationId });
                }
            })
            .catch(error => console.error('Error updating notification:', error));
    }

    /**
     * Mark a notification as read
     * @param {string|number} notificationId - ID of the notification
     * @param {string|null} linkHref - URL to navigate to after marking as read
     */
    markNotificationAsRead(notificationId, linkHref = null) {
        if (!notificationId) {
            console.error('Cannot mark notification as read: No notification ID provided');
            return;
        }
        
        const endpoint = `notification/markAsRead/${notificationId}`;
        const url = window.i18n.createUrl(endpoint);
        
        console.log(`Marking notification ${notificationId} as read...`);
        
        fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            credentials: 'same-origin' // Include cookies
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log(`Successfully marked notification ${notificationId} as read`);
            
            // Navigate to the link if provided
            if (linkHref) {
                window.location.href = linkHref;
            }
        })
        .catch(error => {
            console.error('Error updating notification:', error);
            // Navigate to the link even if marking as read fails
            if (linkHref) {
                window.location.href = linkHref;
            }
        });
    }

    /**
     * Mark multiple notifications as seen
     * @param {Array} notificationIds - Array of notification IDs to mark as seen
     */
    markAllNotificationsAsSeen(notificationIds) {
        if (!notificationIds || notificationIds.length === 0) {
            console.error('Cannot mark notifications as seen: No notification IDs provided');
            return;
        }
        
        console.log(`Marking ${notificationIds.length} notifications as seen...`);
        
        // Create a promise for each notification
        const promises = notificationIds.map(notificationId => {
            const endpoint = `notification/markAsSeen/${notificationId}`;
            const url = window.i18n.createUrl(endpoint);
            
            return fetch(url)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`Server responded with status: ${response.status}`);
                    }
                    return response.json();
                })
                .catch(error => {
                    console.error(`Error marking notification ${notificationId} as seen:`, error);
                    return null; // Continue with other notifications even if one fails
                });
        });
        
        // Wait for all promises to resolve
        Promise.all(promises)
            .then(results => {
                const successCount = results.filter(result => result !== null).length;
                console.log(`Successfully marked ${successCount} of ${notificationIds.length} notifications as seen`);
            })
            .catch(error => {
                console.error('Error marking notifications as seen:', error);
            });
    }

    /**
     * Mark a notification as deleted
     * @param {string|number} notificationId - ID of the notification
     */
    markNotificationAsDeleted(notificationId) {
        if (!notificationId) {
            console.error('Cannot mark notification as deleted: No notification ID provided');
            return;
        }
        
        const endpoint = `notification/delete/${notificationId}`;
        const url = window.i18n.createUrl(endpoint);
        
        console.log(`Marking notification ${notificationId} as deleted...`);
        
        fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            // Remove the notification from the local array
            this.notifications = this.notifications.filter(n => n.id !== notificationId);
            console.log(`Notification ${notificationId} marked as deleted successfully`);
        })
        .catch(error => console.error('Error deleting notification:', error));
    }
}
