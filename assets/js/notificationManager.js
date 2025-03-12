export class NotificationManager {
    constructor() {
        this.init();
    }

    init() {
        this.checkForGameEnd = this.checkForGameEnd.bind(this);
        if (this.shouldShortPoll()) {
            this.checkForGameEnd(document.querySelector('[name="game_id"]').value);
        }
    }

    checkForGameEnd(id) {
        const endpoint = `notification/getGameEnd/${id}`;
        const url = window.i18n.createUrl(endpoint);
        fetch(url)
            .then(response => response.json())
            .then(data => {
                data.forEach(notification => {
                    alert(`Game ${notification.game_id} has ended. Notification: ${notification.notification_type}`);
                    this.markNotificationAsSeen(notification.id);
                });
                setTimeout(() => this.checkForGameEnd(id), 15000); // Poll every 15 seconds
            })
            .catch(error => console.error('Error:', error));
    }

    markNotificationAsSeen(notificationId) {
        const endpoint = `notification/markAsSeen/${notificationId}`;
        const url = window.i18n.createUrl(endpoint);
        fetch(url)
            .catch(error => console.error('Error updating notification:', error));
    }

    shouldShortPoll() {
        const form = document.querySelector('form');
        let gameId, parentId, currentPage;
        if(form){
            gameId = form.querySelector('[name="game_id"]');
            parentId = form.querySelector('[name="parent_id"]');
            currentPage = form.querySelector('[name="currentPage"]');
        }


        if (!gameId || !parentId || !currentPage) return false;

        const pageValue = currentPage.value;
        const parentValue = parentId.value;

        const validPages = ['text-iterate.php', 'text-draft-edit.php', 'text-note-edit.php'];

        if (validPages.includes(pageValue) && parentValue !== '') {
            return true;
        }
        return false;
    }
}



/* export class NotificationManager {
    constructor(path){
        this.path = path;
        this.init();
    }

    init(){
        ///this.checkNotifications = this.checkNotifications.bind(this); // Ensure correct 'this' context
        //this.checkNotifications();
        //this.checkForGameEnd.bind(this);
        this.checkForGameEnd = this.checkForGameEnd.bind(this); 
        this.checkForGameEnd(20);
    }

    checkForGameEnd(id) {
        const url = `${this.path}notification/getGameEnd/${id}`;
        fetch(url)
            .then(response => response.json())
            .then(data => {
                // for now I only have one possible notification here... but it is in a fetchAll, 
                // so this works for now... and I need to consider if I will be getting more notifications befor I make any changes. 
                data.forEach(notification => {
                    alert(`Game ${notification.game_id} has ended. Notification: ${notification.notification_type}`);
                });
                setTimeout(() => this.checkForGameEnd(id), 15000); // Poll every 15 seconds
            })
            .catch(error => console.error('Error:', error));
    }

    checkNotifications(){
        // code for getting all new notifications. 
    }
} */