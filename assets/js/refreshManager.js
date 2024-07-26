import { StoryManager } from './storyManager.js';
import { Modal } from './modal.js' ;

export class RefreshManager {
    constructor(uiManager, storyManager) {
        this.storyManager = storyManager;
        this.state = {};
        this.storiesEl = document.querySelector("[data-stories]")
        this.uiManager = uiManager;
    }

    saveState() {
        // Where you can keep drawer data
        this.state.drawers = [];
        this.state.showcase = "none";
        this.state.rootStoryId = null;
        this.state.modal = false;
        this.state.modalTextId = null;

        // The showcase element
        const showcaseEl = this.storiesEl.querySelector("#showcase");

        // The modal element if visible
        const treeModalEl = document.querySelector("[data-tree-modal='visible']");

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

        if(treeModalEl){
            // TODO: add a dataset to a parent element for the textID
            const currentTextId = treeModalEl.dataset.textId;
            this.state.modalTextId = currentTextId;
            this.state.modal = true;
        }else{
            this.state.modal = false;
        }

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
        
        //check if there's a modal id saved
        if (savedState.modal){
            this.storyManager.showStoryInModal(savedState.modalTextId);
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

