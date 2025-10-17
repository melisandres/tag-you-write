export class RefreshManager {
    constructor(uiManager, storyManager, autoSaveManager) {
        if (window.refreshManagerInstance) {
            return window.refreshManagerInstance;
        }
        
        this.textPagePath = window.i18n.createUrl('text/');
        this.storyManager = storyManager;
        this.uiManager = uiManager;
        this.autoSaveManager = autoSaveManager;
        this.state = {
            showcase: {
                type: null,
                rootStoryId: null,
                transform: null,
                drawers: []
            },
            modal: {
                isOpen: false,
                textId: null
            },
            form: {
                data: null,
                type: null,
                lastDatabaseState: null,
                validity: null // Store form validity state
            },
            scroll: {
                x: 0,
                y: 0
            }
        };
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
        this.isRestoring = false;
        this.isRefreshing = false;
        this.pendingRefresh = null;
        this.initialized = false;
        this.pendingEditorContent = new Map();

        window.refreshManagerInstance = this;
        this.initCustomEvents();
        this.init();
    }

    initCustomEvents() {
        // Listen for any changes to the form
        //console.log('Initializing custom events');
        eventBus.on('inputChanged', this.handleInputChanged.bind(this));
        
        // Listen for validation changes to store form validity state
        eventBus.on('validationChanged', (validationStatus) => {
            this.state.form.validity = validationStatus;
            console.log('RefreshManager: Updated form validity state from validationChanged event', validationStatus);
            console.log('RefreshManager: Current state.form.validity:', this.state.form.validity);
        });
        eventBus.on('formUpdated', this.handleFormUpdated.bind(this));
        eventBus.on('manualSave', this.handleManualSave.bind(this));
/*         // Add event listener for restoringState for story page and forms   
        eventBus.on('restoringState', this.handleRestoringState.bind(this)); */
        //console.log('Custom events initialized');
        eventBus.on('editorReady', this.handleEditorReady.bind(this));
        eventBus.on('showcaseChanged', (newShowcaseAndId) => this.setShowcaseState(newShowcaseAndId));
    }

    init() {    
        console.log('=== REFRESH MANAGER INIT START ===');
        console.log('initialized:', this.initialized);
        
        if (this.initialized) return;
        this.initialized = true;

        // Handle both cases: document still loading and document already loaded
        if (document.readyState === 'loading') {
            // Document still loading, wait for DOMContentLoaded
            document.addEventListener('DOMContentLoaded', () => {
                console.log('=== DOM CONTENT LOADED EVENT FIRED ===');
                this.handleInitialLoad();
            }, { once: true });
        } else {
            // Document already loaded, call immediately
            console.log('=== DOCUMENT ALREADY LOADED, CALLING IMMEDIATELY ===');
            // Use setTimeout to ensure this runs after current execution stack
            setTimeout(() => this.handleInitialLoad(), 0);
        }

        window.addEventListener('beforeunload', (e) => {
            if (this.isStoriesPage() && !this.shouldRefreshGames) {
                //eventBus.emit('refreshGames');
                this.saveState();
                this.saveCurrentPageUrl();
            }
        });
        
        console.log('=== REFRESH MANAGER INIT END ===');
    }

    async handleInitialLoad() {
        console.log('=== HANDLE INITIAL LOAD START ===');
        console.log('isRefreshing:', this.isRefreshing);
        
        if (this.isRefreshing) {
            console.log('Refresh already in progress, skipping...');
            return;
        }
        
        this.isRefreshing = true;

        try {
            document.body.classList.add('refreshing');
            console.log('About to call restoreState...');
            // Single state restoration
            await this.restoreState();
            console.log('restoreState completed');
        } finally {
            document.body.classList.remove('refreshing');
            this.isRefreshing = false;
            console.log('=== HANDLE INITIAL LOAD END ===');
        }
    }

    handleEditorReady({ name, editor }) {
        // Check if we have pending content for this editor
        if (this.pendingEditorContent && this.pendingEditorContent.has(name)) {
            const content = this.pendingEditorContent.get(name);
            editor.setData(content);
            console.log(`Updated CKEditor content for ${name}:`, content);
            this.pendingEditorContent.delete(name);
        }
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

    setShowcaseState(showcaseData) {
        // Get existing state
        const currentState = JSON.parse(localStorage.getItem('pageState')) || {
            showcase: {
                type: null,
                rootStoryId: null,
                transform: null,
                drawers: []
            }
        };

        // Only update the properties that are provided
        if (showcaseData) {
            currentState.showcase = {
                ...currentState.showcase,  // preserve existing showcase state
                ...showcaseData           // update only provided properties
            };
        }

        // Save back to localStorage
        localStorage.setItem('pageState', JSON.stringify(currentState));
    }

    updateLastSavedContent(formData) {
        if (formData) {
            this.state.lastDatabaseState = formData;
        }

        // Save to localStorage
        const pageState = JSON.parse(localStorage.getItem('pageState') || '{}');
        pageState.form.lastDatabaseState = formData;
        localStorage.setItem('pageState', JSON.stringify(pageState));
    }

    // This is called when the restoringState event is emitted from the main.js file
    // It is async to enable removing the saved state after it is restored
    // But the localStorage is not being removed for now, because the state is being kept in order to handle returns to the story page from other pages. When the system becomes more complex, this may need to be revisited. 
/*     async handleRestoringState() {
        console.log('HERE handleRestoringState called');
        this.isAPageRefresh = this.isPageRefresh();
        const savedState = this.getSavedState();
        
        if (!savedState) {
            return;
        }
        // Clear form data if we're not on a form page
/*         if (!this.isFormPage() && savedState.formData) {
            const pageState = {...savedState};
            pageState.formData = null;
            pageState.formType = null;
            localStorage.setItem('pageState', JSON.stringify(pageState));
        } */
        
        /*const isFormPage = this.isFormPage();
        const isStoriesPage = this.isStoriesPage();

        // Only restore form state if we're on a form page AND it's a refresh
        if (isFormPage && this.isAPageRefresh) {
            this.restoreFormState(savedState);
        }

        // For stories page, check both URL params and saved state
        if (isStoriesPage) {
            // First check URL parameters
            const { type: urlType, rootStoryId: urlRootStoryId } = this.showcaseManager.getShowcaseParams();
            console.log('urlType:', urlType);
            console.log('urlRootStoryId:', urlRootStoryId);
            
            // If URL has showcase params, use those
            if (urlRootStoryId) {
                console.log('Restoring showcase state from URL params');
                const container = this.uiManager.createShowcaseContainer(urlRootStoryId);
                if (container) {
                    if (urlType === 'tree') {
                        await this.uiManager.drawTree(urlRootStoryId, container);
                    } else {
                        await this.uiManager.drawShelf(urlRootStoryId, container);
                    }
                }
            } 
            // Otherwise use saved state
            // TODO: showcase.type? 
            else if (savedState.showcase.type) {
                console.log('Restoring showcase state');
                await this.restoreState();
            }
        }
    } */

    // Check if the page is a refresh-- if it is trigger handlePageRefresh
/*     isPageRefresh() {
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
    } */

    isPageRefresh() {
        const isRefresh = this.previousUrl === window.location.href;
        return isRefresh && !window.location.search.includes('new=true');
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
        if (!savedState.form.data) return;

        const form = document.querySelector('[data-form-type="root"], [data-form-type="iteration"], [data-form-type="addingNote"], [data-form-type="writerCreate"], [data-form-type="login"]');

        if (!form) return;

        // Parse the form data
        const formData = typeof savedState.form.data === 'string' 
            ? JSON.parse(savedState.form.data) 
            : savedState.form.data;

        // Then restore form values
        Object.entries(formData).forEach(([key, value]) => {
            const input = form.elements[key];
            if (input) {
                input.value = value;
                // Trigger input event for validation and word count
                const event = new Event('input', { bubbles: true, cancelable: true });
                input.dispatchEvent(event);
            }

            // Special handling for CKEditor 5
            if (['writing', 'prompt', 'note'].includes(key)) {
                // First try to get existing editor instance
                const editor = window.CKEditorInstances?.[key];
                if (editor) {
                    // Editor already exists, update it directly
                    editor.setData(value);
                    console.log(`Updated CKEditor content for ${key}:`, value);
                } else {
                    // Store content to be set when editor becomes ready
                    this.pendingEditorContent.set(key, value);
                    console.log(`Stored pending content for ${key}`);
                }
            }
        });

        // Set form activity state if we have an ID
        if (formData.id !== '') {
            form.setAttribute('data-form-activity', 'editing');
            //eventBus.emit('formUpdated');
        }

        // Set the last database state in autoSaveManager
        if (savedState.lastDatabaseState && this.autoSaveManager) {
            //console.log("Setting last database state before form restoration");
            this.autoSaveManager.setLastSavedContent(savedState.form.lastDatabaseState, false);
        } 

        // Force a check for unsaved changes
        if (this.autoSaveManager) {
            const hasChanges = this.autoSaveManager.hasUnsavedChanges();
            eventBus.emit('hasUnsavedChanges', hasChanges);
        }

        // Restore form validity from saved state
        if (savedState.form.validity) {
            this.state.form.validity = savedState.form.validity;
        }
        
        // Emit events
        eventBus.emit('formRestored', formData);
        eventBus.emit('formUpdated');
        
        // Store form validity in state for tutorial system (if not already restored)
        if (!this.state.form.validity) {
            this.storeFormValidity();
        }
    }
    

    handleInputChanged() {
        this.saveFormData();
    }
    
    /**
     * Store current form validity state for tutorial system
     */
    storeFormValidity() {
        if (window.validationManager) {
            const validityState = window.validationManager.getCurrentValidationState();
            this.state.form.validity = validityState;
            console.log('RefreshManager: Stored form validity state', validityState);
        }
    }
    
    /**
     * Get stored form validity state
     */
    getFormValidity() {
        return this.state.form.validity;
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
        pageState.form.data = formDataObj;
        pageState.form.type = formType;
        pageState.form.lastDatabaseState = this.autoSaveManager.lastSavedContent;
        pageState.form.validity = this.state.form.validity; // Save form validity state
        localStorage.setItem('pageState', JSON.stringify(pageState));
    }

    saveState() {
/*         const currentPath = window.location.pathname + '/';
        if (!this.textPagePath.endsWith(currentPath)) return; */

         // If we're on a form page, save complete form state
         console.log('Saving state...');
        if (this.isFormPage()) {
            this.saveFormData();
            return;
        }

        // Single source of truth for view state
        this.state = {
            showcase: {
                type: null,        // 'tree' or 'shelf'
                rootStoryId: null, // text_id of the root story
                drawers: [],       // array of open drawer IDs
                transform: null    // zoom/pan state for tree view
            },
            // Modal state
            modal: {
                isOpen: false,
                textId: null
            },
            // Form state
            form: {
                data: null,
                type: null
            },
            // Page state
            scroll: {
                x: window.scrollX,
                y: window.scrollY
            }
        };

        const storiesEl = document.querySelector("[data-stories]");
        const showcaseEl = storiesEl ? storiesEl.querySelector("#showcase") : null;
        const treeModalEl = document.querySelector("[data-tree-modal='visible']");
        console.log('Current showcase element:', showcaseEl?.dataset);

        if (showcaseEl) {
            // Save showcase state
            this.state.showcase.type = showcaseEl.dataset.showcase;
            this.state.showcase.rootStoryId = showcaseEl.closest('[data-text-id]').dataset.textId;
            
            // Save open drawers
            showcaseEl.querySelectorAll('.writing').forEach(drawer => {
                if (!drawer.classList.contains("hidden")) {
                    this.state.showcase.drawers.push(
                        drawer.closest('[data-story-id]').dataset.storyId
                    );
                }
            });

            // Save transform for tree view
            if (this.state.showcase.type === 'tree') {
                this.captureD3Transform();
            }
        }

        if (treeModalEl) {
            this.state.modal.isOpen = true;
            this.state.modal.textId = treeModalEl.dataset.textId;
            console.log('Saving showcase state:', this.state.showcase);
        }

        localStorage.setItem('pageState', JSON.stringify(this.state));
    }

    captureD3Transform() {
        const svg = d3.select('#showcase svg');
        if (!svg.empty()) {
            const transform = d3.zoomTransform(svg.node());
            if (transform) {
                // Update both local state and localStorage
                this.state.showcase.transform = {
                    x: transform.x,
                    y: transform.y,
                    k: transform.k
                };
                
                // Update localStorage with new transform
                const currentState = JSON.parse(localStorage.getItem('pageState')) || { showcase: {} };
                currentState.showcase.transform = this.state.showcase.transform;
                localStorage.setItem('pageState', JSON.stringify(currentState));
            }
        }
    }

    // This is used to restore the state of the page with the game list
    async restoreState() {
        console.log('=== RESTORE STATE START ===');
        console.log('Is restoring:', this.isRestoring);
        if (this.isRestoring) return;
        this.isRestoring = true;

        try {
            let savedState = JSON.parse(localStorage.getItem('pageState'));
            console.log('Saved state:', {
                hasShowcase: !!savedState?.showcase,
                showcaseType: savedState?.showcase?.type,
                transform: savedState?.showcase?.transform
            });

            // Check for saved state
            savedState = JSON.parse(localStorage.getItem('pageState'));
            console.log('Initial savedState:', savedState);

            if (!savedState) return;

            // Check URL parameters first
            const urlParams = new URLSearchParams(window.location.search);
            const urlShowcaseType = urlParams.get('showcase');
            const urlRootStoryId = urlParams.get('rootStoryId');

            console.log('URL params:', { urlShowcaseType, urlRootStoryId });

            // Priority is URL params, then saved state
            const priorityShowcaseType = urlShowcaseType || savedState.showcase.type;
            console.log('priorityShowcaseType:', priorityShowcaseType, 
                'from URL:', urlShowcaseType, 
                'from savedState:', savedState.showcase.type);
            const priorityRootStoryId = urlRootStoryId || savedState.showcase.rootStoryId;

            // Handle form state restoration
            if (savedState.form.data && savedState.form.type && this.isAPageRefresh) {
               await this.restoreFormState(savedState);
            }

            // Create showcase container and restore view state
            if (this.isStoriesPage()) {
                if (!priorityRootStoryId) {
                    console.log('No root story ID found, skipping showcase container creation');
                    return;
                }
                const container = this.uiManager.createShowcaseContainer(priorityRootStoryId, false);
                if (container) {
                    console.log('container exists, drawing showcase content');
                    console.log('priorityShowcaseType:', priorityShowcaseType);
                    if (priorityShowcaseType === 'shelf') {
                        console.log('Restoring shelf view');
                        await this.uiManager.drawShelf(priorityRootStoryId, container);
                        this.restoreDrawers(savedState);
                    } else if (priorityShowcaseType === 'tree') {
                        console.log('Restoring tree view');
                        await this.uiManager.drawTree(priorityRootStoryId, container);
                    } else {
                        // Default to tree view if no type specified
                        console.log('No showcase type specified, defaulting to tree view');
                        await this.uiManager.drawTree(priorityRootStoryId, container);
                    }
                } else {
                    console.warn('Failed to create showcase container for rootStoryId:', priorityRootStoryId);
                }

                // Restore modal state (only on stories pages)
                if (savedState.modal.isOpen && savedState.modal.textId) {
                    await this.storyManager.showStoryInModal(savedState.modal.textId);
                }

                // Restore scroll position (only on stories pages)
                if (savedState.scroll) {
                    setTimeout(() => {
                        window.scrollTo(savedState.scroll.x, savedState.scroll.y);
                    }, 100);
                }
            }
        } catch (error) {
            console.error('Error restoring state:', error);
        } finally {
            this.isRestoring = false;
        }
    }

    // Helper method to restore tree transform
    restoreTreeTransform(transform) {
        console.log('restoreTreeTransform called', transform);
        const svg = d3.select('#showcase svg');
        if (!svg.empty() && window.treeVisualizerInstance?.zoom) {
            if (transform && 
                typeof transform.x === 'number' && 
                typeof transform.y === 'number' && 
                typeof transform.k === 'number' && 
                !isNaN(transform.x) && 
                !isNaN(transform.y) && 
                !isNaN(transform.k)) {
                
                try {
                    const newTransform = d3.zoomIdentity
                        .translate(transform.x, transform.y)
                        .scale(transform.k);
                    
                    window.treeVisualizerInstance.zoom.transform(svg, newTransform);
                } catch (error) {
                    console.error('Failed to apply transform:', error);
                }
            }
        }
    }

    restoreDrawers(savedState) {
        savedState.showcase.drawers.forEach(storyId => {
            const drawer = document.querySelector(`[data-story-id="${storyId}"] .writing`);
            if (drawer) {
                drawer.classList.add('visible');
                drawer.classList.remove('hidden');
                const arrow = drawer.closest('.node').querySelector(".arrow");
                if (arrow) {
                    arrow.classList.add('open');
                    arrow.classList.add('arrow-down')
                    arrow.classList.remove('closed');
                    arrow.classList.remove('arrow-right');
                }
            }
        });
    }

    async handlePageRefresh() {
        // Prevent multiple simultaneous refreshes
        if (this.isRefreshing) {
            console.log('Refresh already in progress, skipping...');
            return false;
        }

        if (!this.isStoriesPage()) {
            return true;
        }

        this.isRefreshing = true;
        
        try {
            document.body.classList.add('refreshing');
            
           // Single update check - updates will be handled by listeners
            await window.dataManager.checkForUpdates();

            // Single state restoration
            await this.restoreState();
            
        } catch (error) {
            console.error('Error during page refresh:', error);
        } finally {
            document.body.classList.remove('refreshing');
            this.isRefreshing = false;
        }
        
        return false;
    }
}