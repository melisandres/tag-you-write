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
        this.updateSaveButton();
        this.updateDeleteButton();
        this.updateExitButton();    
    }

    handleValidationChanged() {
        // There will be two tiers of validation

        // TODO: create validationChanged event... figure out the logic
        // Tier 1: (more strict) Publish validation
        this.updatePublishButton();

        // TODO: Tier 2: (super lax) Save validation
        //this.updateSaveButton();
        //this.updatePublishButton();... 
    }

    handleFormUpdated() {
        this.hasUnsavedChanges = false;
        if (!this.hasAnId){
            this.hasAnId = true;
            this.updateDeleteButton();
            this.updateExitButton();
        } 
        this.updateSaveButton(); 
    }
    
    handleInputChanged() {
        if(!this.hasUnsavedChanges){
            this.hasUnsavedChanges = true;
            this.updateSaveButton(); 
        }
    }
    
    updatePublishButton() {
        const isFormValid = this.form.checkValidity(); // Assuming HTML5 validation
        this.publishButton.disabled = !isFormValid;
    }

    updateSaveButton() {
        // My save button is already checkin for unsaved changes, so I just need to style it
        this.saveButton.classList.toggle('disabled', !this.hasUnsavedChanges);
    }

    updateDeleteButton() {
        // My delete button is "disabling" itself in formManager.js
        this.deleteButton.classList.toggle('disabled', !this.hasAnId);
    }

    updateExitButton() {
        const isIdEmpty = !this.idInput.value;
        this.cancelButton.querySelector('span.title').textContent = this.hasAnId ? 'Exit' : 'Cancel';
    }
}