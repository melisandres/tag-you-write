import { DataManager } from './dataManager.js';

export class SeenManager {
    constructor(path) {
        this.path = path;
/*      this.userId = sessionStorage.getItem('currentUserId');
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
        const dataManager = DataManager.getInstance();
    
        // If not logged in, only update local cache
        if (!dataManager.isUserLoggedIn()) {
            dataManager.updateNode(id, { text_seen: "1" });
            return;
        }

        const url = `${this.path}seen/markAsSeen/${id}`;
        try {
            const response = await fetch(url);
    
            // Check if the response status is 401 before attempting to parse the JSON
            if (response.status === 401) {
                console.info('User not logged in. Skipping mark as seen.');
                return;
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

    // Update the read status of a story in the UI and in the dataManager
    updateReadStatus(id) {
        console.log("updating read status", id);
        // Try to find the shelf heart first
        let element = document.querySelector(`[data-story-id="${id}"]`)?.querySelector('.shelf-heart');
        
        // If shelf heart is not found, look for the tree heart or star
        if (!element) {
            element = document.querySelector(`path[data-id="${id}"].unread`);
        }
        
        // You need to update the story node AND the top level game element
        let topLevelElement = document.querySelector('#showcase').closest('.story');

        // Update the element clicked on locally, as the user browses 
        if (element && element.classList.contains('unread')) {
            element.classList.remove('unread');
            element.classList.add('read');
            this.updateTopLevelUnseenCount(topLevelElement);
            // Update the dataManager
            const dataManager = DataManager.getInstance();
            console.log("updating node in dataManager", id);
            dataManager.updateNode(id, { text_seen: "1" });
        }
        // No need to update D3 circle separately, as we're now using the same element for both shelf and tree
    }

    updateTopLevelUnseenCount(element) {
        const unreads = document.querySelector('#showcase').querySelectorAll(".unread:not(.legend-item .unread)");
        
        if (unreads.length <= 0) {
            const unreadsElement = element.querySelector('.unreads');
            if (unreadsElement) {
                unreadsElement.classList.remove('unreads');
            }
        }
        
        const unseenCount = parseInt(element.getAttribute('data-unseen-count') || '0');
        const seenCount = parseInt(element.getAttribute('data-seen-count') || '0');
        
        element.setAttribute('data-unseen-count', Math.max(0, unseenCount - 1));
        element.setAttribute('data-seen-count', seenCount + 1);
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
