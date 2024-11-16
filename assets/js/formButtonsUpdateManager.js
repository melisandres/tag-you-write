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
            this.updateExitButton();
        }

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

        //Listen for a form that has no unsaved changes--called from autoSaveManager
        eventBus.on('hasUnsavedChanges', this.handleHasUnsavedChanges.bind(this));

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
        console.log('handleValidationChanged called with results:', results);
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
        console.log('handleHasUnsavedChanges called with:', hasUnsavedChanges);
        this.hasUnsavedChanges = hasUnsavedChanges;
        this.updateSaveButton(this.hasUnsavedChanges);
    }

    handleFormUpdated() {
        console.log('updateSaveButton called from handleFormUpdated()');
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

    updateSaveButton(stateChange) {
        // This may receive a stateChange = hasUnsavedChanges or canAutosave
        // hasUnsavedChanges is connected to a listener on form inputs
        // canAutosave is connected to a listener on validation
        console.log('updateSaveButton', stateChange);
        if (this.saveButton) {
            this.saveButton.classList.toggle('disabled', !stateChange);
        }
    }

    updateDeleteButton() {
        // My delete button is "disabling" itself in formManager.js
        this.deleteButton.classList.toggle('disabled', !this.hasAnId);
    }

    updateExitButton() {
        // If you haven't written anything, it's "Cancel" otherwise it's "Exit"
        this.cancelButton.querySelector('span.title').textContent = this.hasAnId ? 'Exit' : 'Cancel';
    }
}