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
        this.formType = this.form.getAttribute('data-form-type');

        // Listen for validation changes
        eventBus.on('validationChanged', this.handleValidationChanged.bind(this));

        // Listen for form updates relative to saving
        eventBus.on('formUpdated', this.handleFormUpdated.bind(this));

        //Listen for a form that has no unsaved changes--called from autoSaveManager
        eventBus.on('hasUnsavedChanges', this.handleHasUnsavedChanges.bind(this));

        // Listen for form restore
        /* eventBus.on('formRestored', this.handleFormRestored.bind(this)); */

        // Initial button state update
        // handleValidationChanged will always be called on load... maybe... check
        /* this.updateButtons(); */
    }

/*     handleFormRestored(formData) {
        console.log('handleFormRestored', formData);
        if (this.autoSaveManager) {
            this.hasUnsavedChanges = this.autoSaveManager.hasUnsavedChanges();
            this.handleHasUnsavedChanges(this.hasUnsavedChanges);
        }
    }
 */
    updateButtons() {
        console.log('updateSaveButton called from updateButtons()');
        // Called on load, validation is also called on load, and updates some buttons
        this.updateDeleteButton();
        this.updateExitButton();  
        if (this.formType = 'root'){
            this.updateSaveButton(this.hasUnsavedChanges);
            this.updatePublishButton();
        }  
    }

    handleValidationChanged(results) {    
        console.log('updateSaveButton called from handleValidationChanged()', results);
        // Update buttons based on validation results
        this.updatePublishButton(results.canPublish);
        this.updateSaveButton(this.hasUnsavedChanges);
    }

    // This listens for an event emitted by autoSaveManager, at every input change, looking for unsaved changes. 
    handleHasUnsavedChanges(hasUnsavedChanges) {
        console.log('updateSaveButton called from handleHasUnsavedChanges()', hasUnsavedChanges);
        this.hasUnsavedChanges = hasUnsavedChanges;
        this.updateSaveButton(this.hasUnsavedChanges);
    }

    // TODO: when you load a draft... canAutosave is... either through formUpdate or InputChanged... calling updateSaveButton on load, and sending it hasUnsavedChanges = true... which is making the button available when it shouldn't be... not a big deal, but a little annoying.. 
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