import { StoryManager } from './storyManager.js';
import { Modal } from './modal.js' ;
import { TreeVisualizer } from './treeVisualizer.js';

export class RefreshManager {
    constructor(path, uiManager, storyManager, autoSaveManager) {
        if (window.refreshManagerInstance) {
            return window.refreshManagerInstance;
        }
        
        this.path = path;
        this.textPagePath = `${path}text/`;
        this.storyManager = storyManager;
        this.autoSaveManager = autoSaveManager;
        this.state = {};
        this.uiManager = uiManager;        
        this.previousUrl = sessionStorage.getItem('previousUrl');
        this.isAPageRefresh = false;
        
        eventBus.on('inputChanged', this.handleInputChanged.bind(this));
        
        window.refreshManagerInstance = this;

        // Add event listener for restoringState         
        document.addEventListener('restoringState', this.handleRestoringState.bind(this));
    }

    // This is called when the restoringState event is emitted from the main.js file
    // It is async to enable removing the saved state after it is restored
    // But the localStorage is not being removed for now, because the state is being kept in order to handle returns to the story page from other pages. When the system becomes more complex, this may need to be revisited. 
    async handleRestoringState() {
        this.isAPageRefresh = this.isPageRefresh(); 

        if (this.isAPageRefresh) {
            const savedState = this.getSavedState();
            if (savedState && this.isFormPage()) {
                this.restoreFormState(savedState);
                this.autoSaveManager.setLastSavedContent(savedState.formData);
            }else if(savedState && !this.isFormPage()){
                await this.restoreState();
                //localStorage.removeItem('pageState');
            }
        }else if(this.isStoriesPage() && savedState){
            await this.restoreState();
            //localStorage.removeItem('pageState');
        }
        
    }

    // Check if the page is a refresh
    isPageRefresh() {
        return this.previousUrl === window.location.href;
    }

    // Check if the page is a form page
    isFormPage() {
        return document.querySelector('[data-form-type="root"], [data-form-type="iteration"], [data-form-type="addingNote"]') !== null;
    }

    isStoriesPage() {
        // this is the container for stories
        return document.querySelector('[data-stories]') !== null;
    }

    // Save the current page URL
    saveCurrentPageUrl() {
        sessionStorage.setItem('previousUrl', window.location.href);
        this.previousUrl = window.location.href;
    }

    // Get the saved state from localStorage
    getSavedState() {
        return JSON.parse(localStorage.getItem('pageState'));
    }

    // Restore the form state
    restoreFormState(savedState) {
        if (savedState.formData) {
            const form = document.querySelector('[data-form-type="root"], [data-form-type="iteration"], [data-form-type="addingNote"]');
            if (form) {
                Object.entries(savedState.formData).forEach(([key, value]) => {
                    const input = form.elements[key];
                    if (input) {
                        input.value = value;
                    }
                });
            }
        }
    }

    handleInputChanged() {
        this.saveFormData();
    }

    saveFormData() {
        const form = document.querySelector('[data-form-type="root"], [data-form-type="iteration"], [data-form-type="addingNote"]');
        if (form) {
            const formData = new FormData(form);
            const formDataJSON = JSON.stringify(Object.fromEntries(formData));
            const formType = form.getAttribute('data-form-type');

            // Save to this.state
            this.state.formData = formDataJSON;
            this.state.formType = formType;

            // Save to localStorage
            const pageState = JSON.parse(localStorage.getItem('pageState') || '{}');
            pageState.formData = formDataJSON;
            pageState.formType = formType;
            localStorage.setItem('pageState', JSON.stringify(pageState));
        }
    }

    saveState() {
        const currentPath = window.location.pathname + '/';
        if (!this.textPagePath.endsWith(currentPath)) return;

        // Where you can keep drawer data
        this.state.drawers = [];
        this.state.showcase = "none";
        this.state.rootStoryId = null;
        this.state.modal = false;
        this.state.modalTextId = null;
        this.state.zoomTransform = null;
        this.state.formData = null;
        this.state.formType = null;

        this.state.scrollPosition = {
            x: window.scrollX,
            y: window.scrollY
        };

        const storiesEl = document.querySelector("[data-stories]")
        const showcaseEl = storiesEl ? storiesEl.querySelector("#showcase") : null; // The showcase element
        const treeModalEl = document.querySelector("[data-tree-modal='visible']"); // The modal element if visible

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

            // Save zoom transform
            this.captureD3Transform();
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

    captureD3Transform() {
        const svg = d3.select('#showcase svg');

        if (!svg.empty()) {
            const transform = d3.zoomTransform(svg.node());
            this.state.zoomTransform = {
                x: transform.x,
                y: transform.y,
                k: transform.k
            };
        }
    }

    async restoreState() {
        console.log('Restoring state...');
        const savedState = JSON.parse(localStorage.getItem('pageState'));
        if (!savedState) {
            return;
        }

        if (savedState.formData && savedState.formType && this.isAPageRefresh) {
            const form = document.querySelector(`[data-form-type="${savedState.formType}"]`);

            if (form) {
                const formData = JSON.parse(savedState.formData);
                Object.keys(formData).forEach(key => {
                    const input = form.elements[key];
                    if (input) {
                        input.value = formData[key];
                        // Trigger input event to update validation and word count
                        const event = new Event('input', { bubbles: true, cancelable: true });
                        input.dispatchEvent(event);
                    }
                });
                console.log(formData.id);
                if(formData.id !== '') form.setAttribute('data-form-activity', 'editing');
            }
        }

        // Use the uiManager's method to create the container you need
        const container = this.uiManager.createShowcaseContainer(savedState.rootStoryId);
        if (!container) return;


        if (savedState.showcase === 'shelf') {
            await this.uiManager.drawShelf(savedState.rootStoryId, container).then(() => {
                this.restoreDrawers(savedState);
            });
        } else if (savedState.showcase === 'tree') {
            await this.uiManager.drawTree(savedState.rootStoryId, container);
        } 
        
        //check if there's a modal id saved
        if (savedState.modal){
            this.storyManager.showStoryInModal(savedState.modalTextId);
        }

        // Restore scroll position
        if (savedState.scrollPosition) {
            setTimeout(() => {
                window.scrollTo(savedState.scrollPosition.x, savedState.scrollPosition.y);
            }, 100); // Adjust the delay as needed
        }
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
}