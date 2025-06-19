import { eventBus } from './eventBus.js';

export class BookmarkManager {
    constructor() {
        this.init();
    }

    init() {
        // Use event delegation on the parent elements (same pattern as VoteManager)
        const dataStories = document.querySelector('[data-stories]');
        const oneStory = document.querySelector('[data-one-story]');

        if (dataStories) {
            dataStories.addEventListener('click', this.handleBookmarkButtonClick.bind(this));
        }
        
        if (oneStory) {
            oneStory.addEventListener('click', this.handleBookmarkButtonClick.bind(this));
        }
    }

    async handleBookmarkButtonClick(event) {
        const button = event.target.closest('[data-bookmark-story]');
        if (button) {
            const textId = button.getAttribute('data-text-id');
            try {
                const result = await this.bookmarkToggle(textId);
                
                // Update the bookmark button visual state
                if (result.bookmarked) {
                    button.classList.add('bookmarked');
                } else {
                    button.classList.remove('bookmarked');
                }
                
                // Emit event for any other UI components that need to know
                eventBus.emit('bookmarkToggle', {
                    textId: textId,
                    bookmarked: result.bookmarked
                });
                
            } catch (error) {
                console.error('Error toggling bookmark:', error);
            }
        }
    }

    async bookmarkToggle(textId) {
        const endpoint = `bookmark/bookmarkToggle/${textId}`;
        const url = window.i18n.createUrl(endpoint);
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Error toggling bookmark: ${response.status}`);
        }

        return await response.json();
    }
} 