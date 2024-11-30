export class ShowcaseManager {
    constructor(path) {
        this.path = path;
        this.bindEvents();
    }

    bindEvents() {
        // Listen for showcase changes
        eventBus.on('showcaseChanged', (rootStoryId) => {
            this.updateShowcaseParams(rootStoryId);
        });

        // Listen for showcase type changes (tree/shelf)
        eventBus.on('showcaseTypeChanged', ({ type, rootStoryId }) => {
            this.updateShowcaseParams(rootStoryId, type);
        });
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
                // Get existing type or default to 'shelf'
                const showcaseEl = document.querySelector('#showcase');
                const currentType = showcaseEl?.dataset.showcase || 'shelf';
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