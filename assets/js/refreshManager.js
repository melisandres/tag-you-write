import { StoryManager } from './storyManager.js';
import { Modal } from './modal.js' ;

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
        this.shouldRefreshGames = false;
        
        // Initialize dataManager reference before any methods that might use it
        this.dataManager = window.dataManager;
        if (!this.dataManager) {
            console.error('DataManager not initialized');
            return;
        }

        // Move this after dataManager initialization
        this.isAPageRefresh = this.isPageRefresh();
        window.refreshManagerInstance = this;

        //console.log('RefreshManager initialized');
        
        this.initCustomEvents();
        this.init();
    }

    initCustomEvents() {
        // Listen for any changes to the form
        //console.log('Initializing custom events');
        eventBus.on('inputChanged', this.handleInputChanged.bind(this));
        eventBus.on('formUpdated', this.handleFormUpdated.bind(this));
        eventBus.on('manualSave', this.handleManualSave.bind(this));
        // Add event listener for restoringState for story page and forms   
        eventBus.on('restoringState', this.handleRestoringState.bind(this));
        //console.log('Custom events initialized');
    }

    init() {    
        // Prevent default refresh for games page
        window.addEventListener('load', () => {
            if (this.isStoriesPage() && this.isPageRefresh()) {
                // Prevent the default refresh behavior
                window.stop();
                
                // Use our update mechanism instead
                window.dataManager.checkForUpdates().then(hasUpdates => {
                    if (hasUpdates) {
                        const modifiedGames = window.dataManager.getRecentlyModifiedGames();
                        modifiedGames.forEach(game => {
                            eventBus.emit('updateGame', game);
                        });
                    }
                });
            }
        });

        window.addEventListener('beforeunload', (e) => {
            if (this.isStoriesPage() && !this.shouldRefreshGames) {
                //e.preventDefault();
                eventBus.emit('refreshGames');
            }
        });
    }

    triggerRefreshGames() {
        this.shouldRefreshGames = true;
    }

    handleFormUpdated() {
        // update the last saved content from the autoSaveManager
        this.updateLastSavedContent(this.autoSaveManager.lastSavedContent);
    }

    handleManualSave() {
        // update the last saved content from the autoSaveManager
        this.updateLastSavedContent(this.autoSaveManager.lastSavedContent);
    }

    updateLastSavedContent(formData) {
        if (formData) {
            this.state.lastDatabaseState = formData;
        }

        // Save to localStorage
        const pageState = JSON.parse(localStorage.getItem('pageState') || '{}');
        pageState.lastDatabaseState = formData;
        localStorage.setItem('pageState', JSON.stringify(pageState));
    }

    // This is called when the restoringState event is emitted from the main.js file
    // It is async to enable removing the saved state after it is restored
    // But the localStorage is not being removed for now, because the state is being kept in order to handle returns to the story page from other pages. When the system becomes more complex, this may need to be revisited. 
    async handleRestoringState() {
        //console.log('handleRestoringState called');
        this.isAPageRefresh = this.isPageRefresh();
        //console.log('isAPageRefresh:', this.isAPageRefresh);
        
        const savedState = this.getSavedState();
        //console.log('savedState:', savedState);
        
        if (!savedState) {
            //console.log('No saved state found');
            return;
        }
        // Clear form data if we're not on a form page
/*         if (!this.isFormPage() && savedState.formData) {
            const pageState = {...savedState};
            pageState.formData = null;
            pageState.formType = null;
            localStorage.setItem('pageState', JSON.stringify(pageState));
        } */
        
        const isFormPage = this.isFormPage();
        const isStoriesPage = this.isStoriesPage();


/*         console.log('Current page type:', {
            isFormPage,
            isStoriesPage
        }); */

        // Only restore form state if we're on a form page AND it's a refresh
        if (isFormPage && this.isAPageRefresh) {
            //console.log('Attempting to restore form state');
            this.restoreFormState(savedState);
            //console.log('Form state restored');
        }

        // Always restore stories state if we're on the stories page
        if (isStoriesPage && savedState.showcase) {
            //console.log('Attempting to restore stories state');
            await this.restoreState();
            //console.log('Stories state restored');
        }
    }

    // Check if the page is a refresh-- if it is trigger handlePageRefresh
    isPageRefresh() {
        const isRefresh = this.previousUrl === window.location.href;
        
        // If URL has ?new=true, it's not a refresh (it's a new game)
        if (window.location.search.includes('new=true')) {
            //console.log('isPageRefresh: NOT CAUSE new=true');
            return false;
        }
        if (isRefresh) {
            this.isAPageRefresh = true;
            return this.handlePageRefresh();
        }
        return true;
    }

    // Check if the page is a form page
    isFormPage() {
        const result = document.querySelector('[data-form-type]') !== null;
        return result;
    }

        // Method to check if the form includes a password field
    isPasswordForm() {
        return document.querySelector('[data-form-type="login"], [data-form-type="writerCreate"]') !== null;
    }

    isStoriesPage() {
        // This is the container for stories
        return document.querySelector('[data-stories]') !== null;
    }

    // Save the current page URL
    saveCurrentPageUrl() {
        sessionStorage.setItem('previousUrl', window.location.href);
        this.previousUrl = window.location.href;

        // Remove the filter clearing since we want to preserve filters
        // when navigating to/from form pages
        /* if (!this.isStoriesPage()) {
            localStorage.removeItem('currentFilters');
        } */
    }

    // Get the saved state from localStorage
    getSavedState() {
        return JSON.parse(localStorage.getItem('pageState'));
    }

    // Restore the form state
    async restoreFormState(savedState) {
        //console.log('restoreFormState', savedState);
        if (!savedState.formData) return;

        const form = document.querySelector('[data-form-type="root"], [data-form-type="iteration"], [data-form-type="addingNote"], [data-form-type="writerCreate"], [data-form-type="login"]');

        if (!form) return;

        // Parse the form data
        const formData = typeof savedState.formData === 'string' 
            ? JSON.parse(savedState.formData) 
            : savedState.formData;

        // Then restore form values
        Object.entries(formData).forEach(([key, value]) => {
            const input = form.elements[key];
            if (input) {
                input.value = value;
                // Trigger input event for validation and word count
                const event = new Event('input', { bubbles: true, cancelable: true });
                input.dispatchEvent(event);
            }
        });

        // Set form activity state if we have an ID
        if (formData.id !== '') {
            form.setAttribute('data-form-activity', 'editing');
        }

        // Set the last database state in autoSaveManager
        if (savedState.lastDatabaseState && this.autoSaveManager) {
            //console.log("Setting last database state before form restoration");
            this.autoSaveManager.setLastSavedContent(savedState.lastDatabaseState, false);
        } 

        // Force a check for unsaved changes
        if (this.autoSaveManager) {
            const hasChanges = this.autoSaveManager.hasUnsavedChanges();
            eventBus.emit('hasUnsavedChanges', hasChanges);
        }

        // Emit events
        eventBus.emit('formRestored', formData);
        eventBus.emit('formUpdated');
    }
    

    handleInputChanged() {
        this.saveFormData();
    }

    //TODO:  Check if this is saving all the fields of all the forms on input... it's called by inputChanged... but is inputChanged called for EVERY input? on every field? 
    saveFormData() {
        const form = document.querySelector('[data-form-type="root"], [data-form-type="iteration"], [data-form-type="addingNote"], [data-form-type="writerCreate"], [data-form-type="login"]');
        if (!form) return;

        const formData = new FormData(form);
        const formDataObj = Object.fromEntries(formData);

        // Remove password fields from the saved data
        if (this.isPasswordForm()) {
            delete formDataObj.password; // Exclude password field
        }

        const formType = form.getAttribute('data-form-type');

        // Save to this.state
        this.state.formData = formDataObj;
        this.state.formType = formType;

        // Save the last database state
        if (this.autoSaveManager && this.autoSaveManager.lastSavedContent) {
            this.state.lastDatabaseState = this.autoSaveManager.lastSavedContent;
        }

        // Save to localStorage
        const pageState = JSON.parse(localStorage.getItem('pageState') || '{}');
        pageState.formData = formDataObj;
        pageState.formType = formType;
        pageState.lastDatabaseState = this.autoSaveManager.lastSavedContent;
        localStorage.setItem('pageState', JSON.stringify(pageState));
    }

    saveState() {
/*         const currentPath = window.location.pathname + '/';
        if (!this.textPagePath.endsWith(currentPath)) return; */

         // If we're on a form page, save complete form state
        if (this.isFormPage()) {
            this.saveFormData();
            return;
        }

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
            console.log('Saving transform:', transform);
            this.state.zoomTransform = {
                x: transform.x,
                y: transform.y,
                k: transform.k
            };
        }
    }

    // This is used to restore the state of the page with the game list
    async restoreState() {
        //console.log('Restoring state...');
        const savedState = JSON.parse(localStorage.getItem('pageState'));
        if (!savedState) {
            return;
        }

        // Handle form state restoration
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
                if(formData.id !== '') {
                    form.setAttribute('data-form-activity', 'editing');
                    eventBus.emit('formUpdated');
                }
            }
        }

        // Create showcase container and restore view state
        const container = this.uiManager.createShowcaseContainer(savedState.rootStoryId);
        if (container) {
            if (savedState.showcase === 'shelf') {
                await this.uiManager.drawShelf(savedState.rootStoryId, container).then(() => {
                    this.restoreDrawers(savedState);
                });
            } else if (savedState.showcase === 'tree') {
                console.log('Restoring tree view');
                
                // Set flag before drawing tree
                window.skipInitialTreeTransform = true;
                
                // Wait for tree to be drawn
                await this.uiManager.drawTree(savedState.rootStoryId, container);
                
                // Wait a bit for D3 to initialize
                await new Promise(resolve => setTimeout(resolve, 100));
                
                // TODO: seems like a duplicate of gameListRenderer.js line 247-- HOWEVER... that is called when the filters are changed... to apply to the game when it returns in the list of games as filters change... we may want to consolidate these and just grab them from the same place when they are needed. 
                // Add tree-specific zoom transform restoration
                if (savedState.zoomTransform) {
                    const svg = d3.select('#showcase svg');
                    if (!svg.empty() && window.treeVisualizerInstance?.zoom) {
                        const transform = savedState.zoomTransform;
                        
                        // Only apply if values are valid
                        if (transform && 
                            typeof transform.x === 'number' && 
                            typeof transform.y === 'number' && 
                            typeof transform.k === 'number' && 
                            !isNaN(transform.x) && 
                            !isNaN(transform.y) && 
                            !isNaN(transform.k)) {
                            
                            try {
                                // Create new transform
                                const newTransform = d3.zoomIdentity
                                    .translate(transform.x, transform.y)
                                    .scale(transform.k);
                                
                                // Apply transform
                                window.treeVisualizerInstance.zoom.transform(svg, newTransform);
                            } catch (error) {
                                console.error('Failed to apply transform:', error);
                            }
                        }
                    }
                }
                
                // Reset flag
                window.skipInitialTreeTransform = false;
            }
        }

        // Restore modal state
        if (savedState.modal) {
            this.storyManager.showStoryInModal(savedState.modalTextId);
        }

        // Restore scroll position
        if (savedState.scrollPosition) {
            setTimeout(() => {
                window.scrollTo(savedState.scrollPosition.x, savedState.scrollPosition.y);
            }, 100);
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

    // Handle page refresh
    handlePageRefresh() {
        if (this.isStoriesPage()) {    
            // Make sure dataManager exists before using it
            if (!this.dataManager) {
                console.error('DataManager not available for refresh handling');
                return true; // Allow default refresh if no dataManager
            }

            // Show loading indicator
            document.body.classList.add('refreshing');

             // Check for updates without full rerender
            window.dataManager.checkForUpdates().then(hasUpdates => {
                if (hasUpdates) {
                    const modifiedGames = window.dataManager.getRecentlyModifiedGames();
                    modifiedGames.forEach(game => {
                        eventBus.emit('updateGame', game);
                    });
                }
                // Restore state after updates
                this.restoreState();
                document.body.classList.remove('refreshing');
            });
            
            // Prevent browser refresh
            return false;
        }
        return true; // Allow refresh for other pages
    }
}