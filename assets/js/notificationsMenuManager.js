export class NotificationsMenuManager {
    constructor() {
        this.notificationsMenuToggle = document.querySelector('.nav-link.notifications');
        this.notificationsMenu = document.querySelector('.notifications-menu');
        if (!this.notificationsMenuToggle || !this.notificationsMenu) {
            return;
        }
        this.initEventListeners();
        this.updateNavLink();
    }

    initEventListeners() {
        this.notificationsMenuToggle.addEventListener('click', () => {
            this.notificationsMenu.classList.toggle('display-none');
            this.updateNavLink();
        });
    }

    updateNavLink() {
        // Check if there are active filters
        const hasActiveNotificationsMenu = !this.notificationsMenu.classList.contains('display-none');
        // Use 'active' class for filter state
        this.notificationsMenuToggle.classList.toggle('active', hasActiveNotificationsMenu);
    }

    /* TODO: handle new notifications comming in via polling */
    addNewNotification(notification) {
        console.log('addNewNotification notification is:', notification);
        const notificationElement = document.createElement('article');
        notificationElement.classList.add('notification');

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
    }
}