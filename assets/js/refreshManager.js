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
        
        this.handlePageLoad();
        eventBus.on('inputChanged', this.handleInputChanged.bind(this));
        
        window.refreshManagerInstance = this;

        // Add event listener for restoringState
        document.addEventListener('restoringState', this.handleRestoringState.bind(this));
    }

    async handleRestoringState() {
        await this.restoreState();
        localStorage.removeItem('pageState');
    }

    handlePageLoad() {
        this.isAPageRefresh = this.isPageRefresh(); 

        if (this.isAPageRefresh) {
            const savedState = this.getSavedState();
            if (savedState && this.isFormPage()) {
                this.restoreFormState(savedState);
                this.autoSaveManager.setLastSavedContent(savedState.formData);
            }
        }
        
        this.saveCurrentPageUrl();
    }

    // Check if the page is a refresh
    isPageRefresh() {
        return this.previousUrl === window.location.href;
    }

    // Check if the page is a form page
    isFormPage() {
        return document.querySelector('[data-form-type="root"], [data-form-type="iteration"], [data-form-type="addingNote"]') !== null;
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

/*             const treeVisualizer = new TreeVisualizer();
            if (treeVisualizer) {
                this.state.constraints = {
                    minScale: treeVisualizer.minScale,
                    maxScale: treeVisualizer.maxScale,
                    buffer: treeVisualizer.buffer
                };
            } */
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
/*             this.uiManager.drawTree(savedState.rootStoryId, container).then(() => {
                this.applyD3Transform(savedState.zoomTransform, savedState.constraints);
            }); */
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

/*         // Clear the saved state after restoring
        setTimeout(() => {
            console.log('Removing saved state');
            localStorage.removeItem('pageState');
        }, 100); */
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

    /* applyD3Transform(transform, constraints) {
        if (transform) {
            const svg = d3.select('#showcase svg');
            const outerG = svg.select('g');
            const innerG = outerG.select('g');

            const zoom = d3.zoom()
            .scaleExtent([constraints.minScale, constraints.maxScale])
            .on('zoom', (event) => {
                const newTransform = event.transform;
                
                // Apply constraints
                const bounds = innerG.node().getBBox();
                const containerWidth = svg.node().clientWidth;
                const containerHeight = svg.node().clientHeight;
                
                const zoomedWidth = bounds.width * newTransform.k;
                const zoomedHeight = bounds.height * newTransform.k;
                
                const treeCenterX = bounds.x * newTransform.k + zoomedWidth / 2;
                const treeCenterY = bounds.y * newTransform.k + zoomedHeight / 2;
                
                const rangeX = Math.max(0, (zoomedWidth - containerWidth) / 2);
                const rangeY = Math.max(0, (zoomedHeight - containerHeight) / 2);

                const widthBuffer = containerWidth/2;
                const heightBuffer = containerHeight/2;
                
                newTransform.x = Math.min(Math.max(newTransform.x, containerWidth / 2 - treeCenterX - rangeX - widthBuffer), 
                                          containerWidth / 2 - treeCenterX + rangeX + widthBuffer);
                newTransform.y = Math.min(Math.max(newTransform.y, containerHeight / 2 - treeCenterY - rangeY - heightBuffer), 
                                          containerHeight / 2 - treeCenterY + rangeY + heightBuffer);
                
                innerG.attr('transform', newTransform);
            });

            svg.call(zoom);
            
            // Apply the stored transform to the inner g element
            innerG.attr('transform', `translate(${transform.x},${transform.y}) scale(${transform.k})`);
            
            // Update the zoom behavior's internal state
            svg.call(zoom.transform, d3.zoomIdentity.translate(transform.x, transform.y).scale(transform.k));
        }
    } */
}