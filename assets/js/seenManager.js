export class SeenManager {
    constructor(path) {
        this.path = path;
/*         this.userId = sessionStorage.getItem('currentUserId');
        console.log("I can get session storage here? ?", this.userId); */
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
        try {
            const response = await fetch(url);
    
            // Check if the response status is 401 before attempting to parse the JSON
            if (response.status === 401) {
                console.info('User not logged in. Skipping mark as seen.');
                return; // Exit gracefully
            }
    
            // Attempt to parse the JSON response
            const data = await response.json();
    
            if (!response.ok) {
                console.error(`Error marking as seen: ${response.status}`, data);
                throw new Error(`Error marking as seen: ${response.status} - ${data.error}`);
            }
    
            return data;
        } catch (error) {
            console.error('Uncaught error:', error.message);
            throw error; // Re-throw the error for further handling if needed
        }
    }
    
    

    async markAsUnseen(id) {
        const url = `${this.path}seen/markAsUnseen/${id}`;
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Error marking as unseen: ${response.status}`);
        }
        return await response.json();
    }

    updateReadStatus(id) {
        const element = document.querySelector(`[data-story-id="${id}"]`);
        const gameDrawer = element.closest(".story");
        const unreadSVGDiv = gameDrawer.querySelector(".unreads");

        // update the drawer clicked on locally, as the user browses 
        if (element && element.classList.contains('unread')) {
            element.classList.remove('unread');
        }

        // update the top drawer locally, as the user browses 
        const unreads = gameDrawer.querySelectorAll(".unread");
        if(unreads.length == 0){
            if(unreadSVGDiv){
                unreadSVGDiv.innerHTML = "";
            }
        }
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
