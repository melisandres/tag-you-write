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
                const notificationElement = event.target.closest('.notification');
                const notificationId = notificationElement.dataset.notificationId;
                // Mark as read visually immediately for better UX
                notificationElement.classList.remove('unread');
                // Emit the event to mark as read in the backend
                eventBus.emit('notification-clicked', notificationId);
            }
        });
    }

    updateNavLink() {
        // Check if there are active filters
        const hasActiveNotificationsMenu = !this.notificationsMenu.classList.contains('display-none');
        // Use 'active' class for filter state
        this.notificationsMenuToggle.classList.toggle('active', hasActiveNotificationsMenu);
    }

    markAllNotificationsAsSeen() {
        // Get all unseen notification IDs
        const unseenNotifications = Array.from(this.notificationsMenu.querySelectorAll('.notification.unseen'))
            .map(el => el.dataset.notificationId);
        
        if (unseenNotifications.length > 0) {
            // Emit event to mark all as seen
            eventBus.emit('mark-all-notifications-seen', unseenNotifications);
            
            // Update UI immediately
            this.notificationsMenu.querySelectorAll('.notification.unseen').forEach(el => {
                el.classList.remove('unseen');
            });
            
            // Reset unseen count
            this.updateUnseenCount(0);
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
        
        // Properly encode the JSON string to handle special characters
        const i18nParamsJson = encodeURIComponent(JSON.stringify(i18nParams));
        
        // Format the created_at timestamp
        let formattedDate = '';
        if (notification.created_at) {
            const date = new Date(notification.created_at);
            formattedDate = date.toLocaleString();
        }
    
        notificationElement.innerHTML = `
            <h3 data-i18n="${titleKey}"></h3>
            <p data-i18n="${contentKey}"
            data-i18n-html="true"
            data-i18n-params="${i18nParamsJson}"></p>
            <time>${formattedDate}</time>
        `;

        // Get the first child of the notifications menu
        const firstChild = this.notificationsMenu.firstChild;

        // Insert the new notification before the first child
        if (firstChild) {
            this.notificationsMenu.insertBefore(notificationElement, firstChild);
        } else {
            // If there are no children, just append it
            this.notificationsMenu.appendChild(notificationElement);
        }

        // Apply translations to the new notification element
        if (window.i18n && typeof window.i18n.updatePageTranslations === 'function') {
            // Decode the parameters before applying translations
            const paramsElement = notificationElement.querySelector('[data-i18n-params]');
            if (paramsElement) {
                const encodedParams = paramsElement.getAttribute('data-i18n-params');
                paramsElement.setAttribute('data-i18n-params', decodeURIComponent(encodedParams));
            }
            
            window.i18n.updatePageTranslations(notificationElement);
        }
        
        // Update unseen count if this is a new unseen notification
        if (!isSeen) {
            this.updateUnseenCount(this.unseenCount + 1);
        }
    }
}