import { eventBus } from './eventBus.js';

export class ButtonUpdateManager {
    constructor(autoSaveManager) {
        this.autoSaveManager = autoSaveManager;
        this.form = document.querySelector('[data-form-type="root"], [data-form-type="iteration"]');
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
        this.hasAnId = this.idInput.value ? true : false;

        // Listen for validation changes
        eventBus.on('validationChanged', this.handleValidationChanged.bind(this));

        // Listen for form updates relative to saving
        eventBus.on('formUpdated', this.handleFormUpdated.bind(this));
        eventBus.on('inputChanged', this.handleInputChanged.bind(this));

        this.updateButtons();
    }

    updateButtons() {
        this.updatePublishButton();
        this.updateSaveButton( this.hasUnsavedChanges );
        this.updateDeleteButton();
        this.updateExitButton();    
    }

    handleValidationChanged(results) {    
        // Update buttons based on validation results
        this.updatePublishButton(results.canPublish);
        this.updateSaveButton(results.canAutosave);
    }

    handleFormUpdated() {
        this.hasUnsavedChanges = false;
        if (!this.hasAnId){
            this.hasAnId = true;
            this.updateDeleteButton();
            this.updateExitButton();
        } 
        this.updateSaveButton(this.hasUnsavedChanges); 
    }
    
    handleInputChanged() {
        if(!this.hasUnsavedChanges){
            this.hasUnsavedChanges = true;
            this.updateSaveButton(this.hasUnsavedChanges); 
        }
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