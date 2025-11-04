export class ShowcaseManager {
    constructor() {
        this.bindEvents();
        
        // Listen for popstate event to handle browser navigation
        window.addEventListener('popstate', () => this.handleUrlChange());

        // Apply filters from URL on initial load
        this.handleUrlChange();
    }

    bindEvents() {
        // Listen for showcase changes
        eventBus.on('showcaseChanged', (rootStoryId) => {
            console.log('showcaseChanged event:', rootStoryId);
            this.updateShowcaseParams(rootStoryId);
        });

        // Listen for showcase type changes (tree/shelf)
        eventBus.on('showcaseTypeChanged', ({ type, rootStoryId }) => {
            console.log('showcaseTypeChanged event:', { type, rootStoryId });
            this.updateShowcaseParams(rootStoryId, type);
        });
        
        // Listen for game list updates (after filters/category/search changes)
        // Scroll to showcase if it's open
        eventBus.on('gamesListUpdated', () => {
            this.scrollToShowcaseIfOpen();
        });
        
        // Also listen for gamesRefreshed as a backup
        eventBus.on('gamesRefreshed', () => {
            this.scrollToShowcaseIfOpen();
        });
    }
    
    /**
     * Scroll to showcase if it's currently open
     * Called after game list is refreshed (filter/category/search changes)
     */
    scrollToShowcaseIfOpen() {
        const params = this.getShowcaseParams();
        if (params.rootStoryId) {
            // Small delay to ensure DOM is fully updated
            setTimeout(() => {
                this.scrollToStoryElement(params.rootStoryId);
            }, 100);
        }
    }

    handleUrlChange() {
        const params = new URLSearchParams(window.location.search);
        const showcaseType = params.get('showcase');
        const rootStoryId = params.get('rootStoryId');

        if (rootStoryId) {
            eventBus.emit('createShowcaseContainer', { rootStoryId, showcaseType });
            
            // Scroll to the story element when opening a showcase
            this.scrollToStoryElement(rootStoryId);
        }

        const modalTextId = params.get('modalTextId');
        if (modalTextId) {
            eventBus.emit('showStoryInModal', modalTextId);
        }
    }

    updateShowcaseParams(rootStoryId, type = null) {
        const urlParams = new URLSearchParams(window.location.search);
        
        // Preserve all existing params (like category, filters, etc.)
        // Only modify showcase-related params
        if (!rootStoryId) {
            // Remove showcase params if showcase is closed
            urlParams.delete('showcase');
            urlParams.delete('rootStoryId');
        } else {
            // Update showcase params
            if (type) {
                urlParams.set('showcase', type);
            } else {
                // First try to get the type from localStorage
                const savedState = JSON.parse(localStorage.getItem('pageState')) || {};
                const savedType = savedState.showcase?.type;
                
                // Then try URL, then DOM, then default to shelf
                const existingType = urlParams.get('showcase');
                const showcaseWrapper = document.querySelector('#showcase-wrapper');
                const currentType = type || savedType || existingType || showcaseWrapper?.dataset.showcase || 'shelf';
                
                console.log('Setting showcase type:', currentType, 
                    'from:', { type, savedType, existingType, domType: showcaseWrapper?.dataset.showcase });
                
                urlParams.set('showcase', currentType);
            }
            urlParams.set('rootStoryId', rootStoryId);
        }

        // Update URL without pushing to history
        // urlParams.toString() preserves all existing params (category, filters, etc.)
        const newUrl = `${window.location.pathname}${urlParams.toString() ? '?' + urlParams.toString() : ''}`;
        window.history.replaceState({}, '', newUrl);
    }

    getShowcaseParams() {
        const urlParams = new URLSearchParams(window.location.search);
        return {
            type: urlParams.get('showcase'),
            rootStoryId: urlParams.get('rootStoryId')
        };
    }

    /**
     * Scroll to a specific story element by its text ID
     * @param {string} textId - The text ID of the story to scroll to
     */
    scrollToStoryElement(textId) {
        const storyElement = document.querySelector(`[data-text-id="${textId}"]`);
        
        if (storyElement) {
            console.log(`ShowcaseManager: Scrolling to story element with text-id: ${textId}`);
            
            // Use scrollIntoView with smooth behavior
            storyElement.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
                inline: 'nearest'
            });
            
            // Add a subtle highlight effect to draw attention
            storyElement.classList.add('highlight-scroll-target');
            setTimeout(() => {
                storyElement.classList.remove('highlight-scroll-target');
            }, 2000);
        } else {
            console.warn(`ShowcaseManager: Story element with text-id ${textId} not found`);
        }
    }
}