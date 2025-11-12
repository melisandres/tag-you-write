import { eventBus } from './eventBus.js';

export class ButtonUpdateManager {
    constructor(autoSaveManager) {
        this.autoSaveManager = autoSaveManager;
        this.form = document.querySelector('[data-form-type="root"], [data-form-type="iteration"], [data-form-type="writerCreate"]');
        this.hasUnsavedChanges = false;

        this.init();
    }

    init() {
        // Initial button state update
        if (!this.form) return;

        this.publishButton = this.form.querySelector('[data-button-type="publish"]');
        this.saveButton = this.form.querySelector('[data-button-type="save"]');
        this.deleteButton = this.form.querySelector('[data-button-type="delete"]');
        this.cancelButton = this.form.querySelector('[data-button-type="exit"]');
        this.idInput = this.form.querySelector('input[name="id"]');
        this.gameIdInput = this.form.querySelector('input[name="game_id"]');
        
        // Load initial permissions from script tag if available
        this.loadInitialPermissions();
        
        // Check initial ID state
        this.hasAnId = !!(this.idInput && this.idInput.value);
        
        this.formType = this.form.getAttribute('data-form-type');

        // Initial button states
        if (this.formType === 'writerCreate') {
            this.updateSaveButton(false);
        } else {
            // For other forms, set initial states based on current form data
            this.updatePublishButton(false);
            this.updateSaveButton(false);
            this.updateDeleteButton();
            //this.updateExitButton();
        }
        
        // Note: Button structure is already rendered correctly by PHP based on permissions
        // updatePublishButtonForLatePublication() is only called when permissions change dynamically

        // Add a MutationObserver to watch for changes to the id input value
        if (this.idInput) {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'value') {
                        this.hasAnId = !!this.idInput.value;
                        this.updateDeleteButton();
                        this.updateExitButton();
                    }
                });
            });

            observer.observe(this.idInput, { attributes: true });
        }

        // Listen for validation changes
        eventBus.on('validationChanged', this.handleValidationChanged.bind(this));

        // Listen for form updates relative to saving
        eventBus.on('formUpdated', this.handleFormUpdated.bind(this));

        // Listen for a form that has no unsaved changes--called from autoSaveManager
        eventBus.on('hasUnsavedChanges', this.handleHasUnsavedChanges.bind(this));

        // Add listener for form restored
        eventBus.on('formRestored', () => {
            // Force button state update
            if (this.autoSaveManager) {
                const hasChanges = this.autoSaveManager.hasUnsavedChanges();
                this.handleHasUnsavedChanges(hasChanges);
            }
        });

        // Listen for game ending modal (when game_closed notification is shown)
        // Note: gameStatusChanged event only fires on game_list and collab_page pages,
        // not on text_form pages, so we rely on the game ending modal
        eventBus.on('gameEndingModalShown', (notification) => {
            // Check if this is the game we're editing
            const currentGameId = this.gameIdInput?.value;
            if (currentGameId && currentGameId === String(notification.game_id)) {
                this.fetchUpdatedPermissions();
            }
        });

    }
    
    /**
     * Load initial permissions from script tag if available
     */
    loadInitialPermissions() {
        const permissionsScript = document.getElementById('text-permissions-data');
        if (permissionsScript) {
            try {
                this.permissions = JSON.parse(permissionsScript.textContent);
            } catch (e) {
                console.error('Error parsing permissions data:', e);
                this.permissions = null;
            }
        } else {
            this.permissions = null;
        }
    }
    
    /**
     * Fetch updated permissions when game status changes
     */
    async fetchUpdatedPermissions() {
        const textId = this.idInput?.value;
        if (!textId) return; // Can't fetch without text ID
        
        try {
            const endpoint = `text/getStoryNode/${textId}`;
            const url = window.i18n.createUrl(endpoint);
            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                if (data && data.permissions) {
                    this.permissions = data.permissions;
                    this.updatePublishButtonForLatePublication();
                }
            }
        } catch (error) {
            console.error('Error fetching updated permissions:', error);
        }
    }

    updateButtons() {
        // Called on load, validation is also called on load, and updates some buttons
        if (this.formType === 'writerCreate') {
            this.saveButton = this.form.querySelector('[data-button-type="save"]');
            // Initially disable the button until validation passes
            this.updateSaveButton(false);
        } else {
            // Your existing logic for other form types
            this.updateDeleteButton();
            this.updateExitButton();  
            if (this.formType === 'root'){
/*                 this.updateSaveButton(this.hasUnsavedChanges);
                this.updatePublishButton(); */
            }  
        }
    }

    handleValidationChanged(results) {    
        //console.log('handleValidationChanged called with results:', results);
        if (this.formType === 'writerCreate') {
            this.updateSaveButton(results.canPublish);
        } else {
            this.updatePublishButton(results.canPublish);
            // Only update save button if there are unsaved changes
            if (this.hasUnsavedChanges) {
                this.updateSaveButton(results.canAutosave);
            }
        }
    }

    // This listens for an event emitted by autoSaveManager, at every input change, looking for unsaved changes. 
    handleHasUnsavedChanges(hasUnsavedChanges) {
        //console.log('handleHasUnsavedChanges called with:', hasUnsavedChanges);
        this.hasUnsavedChanges = hasUnsavedChanges;
        this.updateSaveButton(this.hasUnsavedChanges);
    }

    handleFormUpdated() {
        //console.log('updateSaveButton called from handleFormUpdated()');
        if (!this.hasAnId){
            this.hasAnId = true;
            this.updateDeleteButton();
            this.updateExitButton();
        } 
        this.updateSaveButton(this.hasUnsavedChanges); 
    }
    
    updatePublishButton(canPublish) {
        if (this.publishButton) {
            this.publishButton.classList.toggle('disabled', !canPublish);
        }
    }
    
    /**
     * Update publish button text and styling for late publication
     * Called when permissions change dynamically (e.g., when game closes)
     */
    updatePublishButtonForLatePublication() {
        if (!this.publishButton) return;
        
        const canPublishTooLate = this.permissions?.canPublishTooLate || false;
        const canPublish = this.permissions?.canPublish || false;
        
        // Only update if we have canPublishTooLate permission
        if (canPublishTooLate) {
            // Add publish-late class for styling
            this.publishButton.classList.add('publish-late');
            
            // Check if button already has two-line structure
            const titleContainer = this.publishButton.querySelector('.btn-2wordtitle');
            const titleSpan = this.publishButton.querySelector('span.title:not(.btn-2wordtitle .title)');
            
            if (!titleContainer && titleSpan) {
                // Need to convert from single-line to two-line structure
                const wrapper = document.createElement('div');
                wrapper.className = 'btn-2wordtitle';
                titleSpan.parentNode.insertBefore(wrapper, titleSpan);
                wrapper.appendChild(titleSpan);
                
                // Create second line span for "late"
                const secondLineSpan = document.createElement('span');
                secondLineSpan.className = 'title';
                secondLineSpan.setAttribute('data-i18n', 'general.late');
                wrapper.appendChild(secondLineSpan);
                
                // Update first line to "publish"
                titleSpan.setAttribute('data-i18n', 'general.publish');
                
                // Trigger translations
                if (eventBus) {
                    eventBus.emit('requestTranslation', {
                        element: titleSpan,
                        key: 'general.publish'
                    });
                    eventBus.emit('requestTranslation', {
                        element: secondLineSpan,
                        key: 'general.late'
                    });
                }
            } else if (titleContainer) {
                // Already has two-line structure - just update translations
                const spans = titleContainer.querySelectorAll('span.title');
                if (spans.length >= 2) {
                    spans[0].setAttribute('data-i18n', 'general.publish');
                    spans[1].setAttribute('data-i18n', 'general.late');
                    if (eventBus) {
                        eventBus.emit('requestTranslation', { element: spans[0], key: 'general.publish' });
                        eventBus.emit('requestTranslation', { element: spans[1], key: 'general.late' });
                    }
                }
            }
            
            // Update tooltip
            const iconSpan = this.publishButton.querySelector('span.icon');
            if (iconSpan) {
                iconSpan.setAttribute('data-i18n-title', 'general.publish_late_tooltip');
                if (window.i18n) {
                    iconSpan.setAttribute('title', window.i18n.translate('general.publish_late_tooltip'));
                }
            }
        } else if (canPublish) {
            // Game is open - ensure normal styling
            this.publishButton.classList.remove('publish-late');
            
            // Check if button has two-line structure that needs to be converted back
            const titleContainer = this.publishButton.querySelector('.btn-2wordtitle');
            if (titleContainer) {
                // Convert from two-line to single-line structure
                const titleSpan = titleContainer.querySelector('span.title');
                if (titleSpan) {
                    titleContainer.parentNode.insertBefore(titleSpan, titleContainer);
                    titleContainer.remove();
                    titleSpan.setAttribute('data-i18n', 'general.publish');
                    if (eventBus) {
                        eventBus.emit('requestTranslation', {
                            element: titleSpan,
                            key: 'general.publish'
                        });
                    }
                }
            } else {
                // Already single-line, just update text
                const titleSpan = this.publishButton.querySelector('span.title');
                if (titleSpan) {
                    titleSpan.setAttribute('data-i18n', 'general.publish');
                    if (eventBus) {
                        eventBus.emit('requestTranslation', {
                            element: titleSpan,
                            key: 'general.publish'
                        });
                    }
                }
            }
            
            // Restore normal tooltip
            const iconSpan = this.publishButton.querySelector('span.icon');
            if (iconSpan) {
                iconSpan.setAttribute('data-i18n-title', 'general.publish_tooltip');
                if (window.i18n) {
                    iconSpan.setAttribute('title', window.i18n.translate('general.publish_tooltip'));
                }
            }
        }
    }

    updateSaveButton(stateChange) {
        // This may receive a stateChange = hasUnsavedChanges or canAutosave
        // hasUnsavedChanges is connected to a listener on form inputs
        // canAutosave is connected to a listener on validation
        //console.log('updateSaveButton', stateChange);
        if (this.saveButton) {
            this.saveButton.classList.toggle('disabled', !stateChange);
        }
    }

    updateDeleteButton() {
        // My delete button is "disabling" itself in formManager.js
        this.deleteButton.classList.toggle('disabled', !this.hasAnId);
    }

    updateExitButton() {
        // Get the title span element
        const titleSpan = this.cancelButton.querySelector('span.title');
        
        // Update the data-i18n attribute based on whether we have an ID
        const i18nKey = this.hasAnId ? 'general.exit' : 'general.cancel';
        titleSpan.setAttribute('data-i18n', i18nKey);
        
        // Emit an event to request translation
        if (eventBus) {   
            eventBus.emit('requestTranslation', {
                element: titleSpan,
                key: i18nKey
            });
        } else {
            // Fallback if neither is available (should rarely happen)
            titleSpan.textContent = this.hasAnId ? 'Exit' : 'Cancel';
        }
    }
}