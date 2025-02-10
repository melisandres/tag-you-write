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

    /* handle new notifications comming in via polling */
    addNewNotification(notification) {
        const notificationElement = document.createElement('article');
        notificationElement.classList.add('notification');
        notificationElement.innerHTML = `
            <h3>${notification.notification_type}</h3>
            <p>${notification.message}</p>
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
    }
}