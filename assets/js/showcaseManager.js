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
    }

    handleUrlChange() {
        const params = new URLSearchParams(window.location.search);
        const showcaseType = params.get('showcase');
        const rootStoryId = params.get('rootStoryId');

        if (rootStoryId) {
            eventBus.emit('createShowcaseContainer', { rootStoryId, showcaseType });
        }

        const modalTextId = params.get('modalTextId');
        if (modalTextId) {
            eventBus.emit('showStoryInModal', modalTextId);
        }
    }

    updateShowcaseParams(rootStoryId, type = null) {
        const urlParams = new URLSearchParams(window.location.search);
        
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
}