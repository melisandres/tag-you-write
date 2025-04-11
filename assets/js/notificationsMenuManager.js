import { eventBus } from './eventBus.js';

export class NotificationsMenuManager {
    constructor() {
        this.notificationsMenuToggle = document.querySelector('.nav-link.notifications');
        this.notificationsMenu = document.querySelector('.notifications-menu');
        if (!this.notificationsMenuToggle || !this.notificationsMenu) {
            return;
        }
        this.unseenCount = 0;
        this.unseenCountElement = this.createUnseenCountElement();
        this.initEventListeners();
        this.updateNavLink();
        this.checkEmptyNotifications();
    }

    initEventListeners() {
        this.notificationsMenuToggle.addEventListener('click', () => {
            this.notificationsMenu.classList.toggle('display-none');
            this.updateNavLink();
            
            // When opening the menu, mark all notifications as seen
            if (!this.notificationsMenu.classList.contains('display-none') && this.unseenCount > 0) {
                this.markAllNotificationsAsSeen();
            }
        });

        this.notificationsMenu.addEventListener('click', (event) => {
            // Check if the clicked element is a link within a notification
            if (event.target.tagName === 'A' && event.target.closest('.notification')) {
                event.preventDefault(); // Prevent default link behavior
                
                const notificationElement = event.target.closest('.notification');
                const notificationId = notificationElement.dataset.notificationId;
                const linkHref = event.target.href; // Store the link destination
                
                // Mark as read visually immediately for better UX
                notificationElement.classList.remove('unread');
                
                // Emit the event to mark as read in the backend, passing the link URL
                eventBus.emit('notification-clicked', { 
                    notificationId: notificationId, 
                    linkHref: linkHref 
                });
            }
            
            // Check if the clicked element is a close button within a notification
            if (event.target.classList.contains('notification-delete') && event.target.closest('.notification')) {
                const notificationElement = event.target.closest('.notification');
                const notificationId = notificationElement.dataset.notificationId;
                
                // Remove the notification from the UI
                notificationElement.remove();
                
                // Emit the event to mark as deleted in the backend
                eventBus.emit('notification-deleted', notificationId);
                
                // Check if we need to update the empty notifications message
                this.checkEmptyNotifications();
            }
        });
        
        // Listen for notification-seen events
        eventBus.on('notification-seen', (data) => {
            this.markNotificationAsSeenInMenu(data.notificationId);
        });
    }


    createUnseenCountElement() {
        const countElement = document.createElement('span');
        countElement.classList.add('unseen-count');
        countElement.style.display = 'none';
        this.notificationsMenuToggle.appendChild(countElement);
        return countElement;
    }

    updateUnseenCount(count) {
        this.unseenCount = count;
        if (count > 0) {
            this.unseenCountElement.textContent = count;
            this.unseenCountElement.style.display = 'inline-block';
        } else {
            this.unseenCountElement.style.display = 'none';
        }
    }

    updateNavLink() {
        // Check if there are active filters
        const hasActiveNotificationsMenu = !this.notificationsMenu.classList.contains('display-none');
        // Use 'active' class for filter state
        this.notificationsMenuToggle.classList.toggle('active', hasActiveNotificationsMenu);
    }

        /**
     * Mark a single notification as seen in the menu UI
     * @param {string} notificationId - The ID of the notification to mark as seen
     */
    markNotificationAsSeenInMenu(notificationId) {
        // Find the notification element in the menu
        const notificationElement = this.notificationsMenu.querySelector(`.notification[data-notification-id="${notificationId}"]`);
        
        if (notificationElement) {
            // Update the notification element to reflect that it's been seen
            notificationElement.classList.remove('unseen');
            
            // Decrement the unseen count
            if (this.unseenCount > 0) {
                this.updateUnseenCount(this.unseenCount - 1);
            }
        }
    }

    markAllNotificationsAsSeen() {
        // Get all unseen notification IDs
        const unseenNotifications = Array.from(this.notificationsMenu.querySelectorAll('.notification.unseen'))
            .map(el => el.dataset.notificationId);
        
        if (unseenNotifications.length > 0) {
            // Emit event to mark all as seen
            eventBus.emit('mark-all-notifications-seen', unseenNotifications);
            
            // Update UI immediately
            this.markAllNotificationsAsSeenInMenu();
        }
    }

    /**
     * Mark all notifications as seen in the menu UI
     */
    markAllNotificationsAsSeenInMenu() {
        // Update all notification elements in the menu that have the 'unseen' class
        const unseenElements = this.notificationsMenu.querySelectorAll('.notification.unseen');
        unseenElements.forEach(element => {
            element.classList.remove('unseen');
        });
        
        // Reset the unseen count to 0
        this.updateUnseenCount(0);
    }

    /**
     * Check if there are any notifications and display a message if none exist
     */
    checkEmptyNotifications() {
        // Check if there are any notification elements
        const hasNotifications = this.notificationsMenu.querySelector('.notification') !== null;
        
        // Remove any existing "no notifications" message
        const existingNoNotifications = this.notificationsMenu.querySelector('.no-notifications-message');
        if (existingNoNotifications) {
            existingNoNotifications.remove();
        }
        
        // If there are no notifications, add the message
        if (!hasNotifications) {
            const noNotificationsElement = document.createElement('p');
            noNotificationsElement.classList.add('no-notifications-message');
            noNotificationsElement.setAttribute('data-i18n', 'notifications.no_notifications');
            noNotificationsElement.textContent = window.i18n.translate('notifications.no_notifications');
            this.notificationsMenu.appendChild(noNotificationsElement);
        }
    }

    /* TODO: handle new notifications comming in via polling */
    addNewNotification(notification) {
        console.log('addNewNotification notification is:', notification);
        const isRead = notification.read_at !== null;
        const isSeen = notification.seen_at !== null;
        const notificationElement = document.createElement('article');
        notificationElement.classList.add('notification');
        if (!isRead) notificationElement.classList.add('unread');
        if (!isSeen) notificationElement.classList.add('unseen');
        notificationElement.dataset.notificationId = notification.id;

        // Determine translation keys based on notification type
        const titleKey = `notifications.notification_${notification.notification_type}`;
        const contentKey = `notifications.notification_${notification.notification_type}_text`;
        
        // Check if required fields exist, provide fallbacks if not
        const rootTextId = notification.root_text_id || '';
        const gameTitle = notification.game_title || 'Untitled Game';
        const winningTitle = notification.winning_title || 'Unknown';
        
        // Create URL only if root_text_id exists
        const gameUrl = rootTextId ? window.i18n.createUrl('text/collab/' + rootTextId) : '#';
    
        // Create the game title link HTML
        const gameTitleLink = `<a href="${gameUrl}">${gameTitle}</a>`;
        
        // Create the i18n parameters object
        const i18nParams = {
            'game_title_link': gameTitleLink,
            'winning_title': winningTitle
        };
        
        // Format the created_at timestamp
        let formattedDate = '';
        if (notification.created_at) {
            const date = new Date(notification.created_at);
            formattedDate = date.toLocaleString();
        }
        
        // Get translated title and content directly
        const titleText = window.i18n.translate(titleKey);
        const contentText = window.i18n.translate(contentKey, i18nParams);
        
        // Create the notification element with the translated content
        notificationElement.innerHTML = `
            <button class="notification-delete" aria-label="Delete notification">&times;</button>
            <h3 data-i18n="${titleKey}">${titleText}</h3>
            <p data-i18n="${contentKey}" data-i18n-html="true">${contentText}</p>
            <time>${formattedDate}</time>
        `;
        
        // Set the data-i18n-params attribute separately to avoid escaping issues
        const paramsElement = notificationElement.querySelector(`[data-i18n="${contentKey}"]`);
        if (paramsElement) {
            paramsElement.setAttribute('data-i18n-params', JSON.stringify(i18nParams));
        }

        // Get the first child of the notifications menu
        const firstChild = this.notificationsMenu.firstChild;

        // Insert the new notification before the first child
        if (firstChild) {
            this.notificationsMenu.insertBefore(notificationElement, firstChild);
        } else {
            // If there are no children, just append it
            this.notificationsMenu.appendChild(notificationElement);
        }
        
        // Update unseen count if this is a new unseen notification
        if (!isSeen) {
            this.updateUnseenCount(this.unseenCount + 1);
        }
        
        // Check if we need to update the empty notifications message
        this.checkEmptyNotifications();
    }
}