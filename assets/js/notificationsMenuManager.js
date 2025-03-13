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
        const notificationElement = document.createElement('article');
        notificationElement.classList.add('notification');

        // Determine translation keys based on notification type
        const titleKey = `notifications.notification_${notification.notification_type}`;
        const contentKey = `notifications.notification_${notification.notification_type}_text`;
        const gameUrl = window.i18n.createUrl('text/collab/' + notification.root_text_id);
    
        notificationElement.innerHTML = `
            <h3 data-i18n="${titleKey}"></h3>
            <p data-i18n="${contentKey}"
            data-i18n-html="true"
            data-i18n-params='${JSON.stringify({
                'game_title_link': `<a href="${gameUrl}">${notification.game_title}</a>`,
                'winning_title': notification.winning_title
            })}'></p>
            <time>${notification.created_at}</time>
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
            window.i18n.updatePageTranslations(notificationElement);
        }
    }
}