export class SeenManager {
    constructor(path) {
        this.path = path;
        this.userId = sessionStorage.getItem('currentUserId');
        this.initEventListeners();
    }

    initEventListeners() {
/*         document.querySelectorAll('.writing').forEach(element => {
            element.addEventListener('click', (event) => this.markAsSeen(event));
        });

        document.querySelectorAll('.mark-as-unseen').forEach(element => {
            element.addEventListener('click', (event) => this.markAsUnseen(event));
        }); */
    }

    async markAsSeen(id) {
        const url = `${this.path}seen/markAsSeen/${id}`;
        const response = await fetch(url);
        if (!response.ok) {
            const errorText = await response.text(); // Read the response body
            console.error(`Error marking as seen: ${response.status}`, errorText);
            throw new Error(`Error marking as seen: ${response.status}`);
        }
        return await response.json();
    }

    async markAsUnseen(id) {
        const url = `${this.path}seen/markAsUnseen/${id}`;
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Error marking as unseen: ${response.status}`);
        }
        return await response.json();
    }

    /* async checkReadStatus(textId) {
        const response = await fetch(`/read/getReadStatus?text_id=${textId}`);
        const status = await response.json();
        const element = document.querySelector(`[data-text-id="${textId}"] .writing`);
        if (status.isRead) {
            element.classList.remove('unread');
        } else {
            element.classList.add('unread');
        }
    } */
}
