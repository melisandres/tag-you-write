import { StoryManager } from './storyManager.js';

export class RefreshManager {
    constructor(uiManager) {
        this.state = {};
        this.storiesEl = document.querySelector("[data-stories]")
        this.uiManager = uiManager;
    }

    saveState() {
        // Where you can keep drawer data
        this.state.drawers = [];
        this.state.showcase = "none";
        this.state.modal = "none";
        this.state.rootStoryId = null;

        // The showcase element
        const showcaseEl = this.storiesEl.querySelector("#showcase");

        if(showcaseEl){
            // Save state of open drawers
            showcaseEl.querySelectorAll('.writing').forEach(drawer => {
                if(!drawer.classList.contains("hidden")){
                    this.state.drawers.push(drawer.closest('[data-story-id]').dataset.storyId);
                }
            });  

            // Save current view type
            this.state.showcase = showcaseEl.dataset.showcase;

            // Save story id
            this.state.rootStoryId = showcaseEl.closest('[data-text-id]').dataset.textId;
        }
        console.log(this.state);

        localStorage.setItem('pageState', JSON.stringify(this.state));
    }

    restoreState() {
        // Check if you've saved a page state
        const savedState = JSON.parse(localStorage.getItem('pageState'));
        if (!savedState) return;
        
        // Use the uiManager's method to create the container you need
        const container = this.uiManager.createShowcaseContainer(savedState.rootStoryId);
        if (!container) return;


        if (savedState.showcase === 'shelf') {
            this.uiManager.drawShelf(savedState.rootStoryId, container).then(() => {
                this.restoreDrawers(savedState);
            });
        } else if (savedState.showcase === 'tree') {
            this.uiManager.drawTree(savedState.rootStoryId, container)
        }
        // Restore drawer states
        /* if(showcaseEl && savedState.showcase === "shelf"){
            savedState.drawers.forEach(storyId => {
                const drawer = showcaseEl.querySelector(`[data-story-id="${storyId}"] .writing`);
                if (drawer) {
                    drawer.classList.add('visible');
                    drawer.classList.remove('hidden');
                }
            });
        } */

        // Restore modal state if needed (additional logic can be added here)
    }

    restoreDrawers(savedState) {
        savedState.drawers.forEach(storyId => {
            const drawer = document.querySelector(`[data-story-id="${storyId}"] .writing`);
            if (drawer) {
                drawer.classList.add('visible');
                drawer.classList.remove('hidden');
                const arrow = drawer.closest('.node').querySelector(".arrow");
                arrow.textContent = '▼';
            }
        });
    }

    async fetchDataAndRefresh() {
        this.saveState();
        this.restoreState();
    }

    /* async fetchDataAndRefresh() {
        // Save current state before fetching new data
        this.saveState();

        // Restore showcase state
        const storyManager = new StoryManager(this.path, this.modal);
        if (savedState.showcase === 'shelf') {
            storyManager.drawShelf(savedState.rootStoryId, showcaseEl);
        } else if (savedState.showcase === 'tree') {
            storyManager.drawTree(savedState.rootStoryId, showcaseEl);
        }

        // Restore previous state
        this.restoreState();
    } */
}

