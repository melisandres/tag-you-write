import { SVGManager } from './svgManager.js';
import { WarningManager } from './warningManager.js';
import { eventBus } from './eventBus.js';

export class FormManager {
    constructor(autoSaveManager, path) {
        this.autoSaveManager = autoSaveManager;
        this.path = path;
        this.form = document.querySelector('#main-form');
        this.formType = this.form ? this.form.getAttribute('data-form-type') : null;
        this.statusField = this.form ? this.form.querySelector('[data-text-status]') : null;
        this.buttons = this.form ? this.form.querySelectorAll('[data-status]') : null;

        this.init();
    }

    // Initialize form functionality
    init() {
        this.injectSVGIcons();
        // methods related to auto-saving, and handling buttons in the context of autosave
        if (this.form){
            this.addButtonEventListeners();
            this.setupExitWarning();
            if (this.formType == 'writing'){
                this.setupCheckForInput();
            }
        }
    }

    // Ensure that all the buttons on the form trigger asyncronous actions
    addButtonEventListeners() {
        console.log('adding button event listeners');
        if (!this.form || !this.buttons) return; 

        this.buttons.forEach(element => {
            const myStatus = element.dataset.status;
            element.addEventListener('click', (event) => {
                console.log('button clicked');
                event.preventDefault();
                this.setStatusAndSubmit(myStatus);
            });
        });
    }

    // Method to set the status and submit the form
    setStatusAndSubmit(status) {
        if (!this.form || !this.statusField) return;  

        switch(status) {
            case 'published':
                this.handlePublish();
                break;
            case 'draft':
                this.statusField.value = status;
                this.handleManualSave();
                break;
            case 'delete': 
                this.showDeleteWarning();
                break;
            case 'cancel':
                window.location.href=`${this.path}text`;
                break;
            default:
                console.log("button has not been given a purpose!");
        }
    }

    // Check if the autoSaveManager has unsaved changes
    handleManualSave() {
       // Check if there are unsaved changes
       if (!this.autoSaveManager.hasUnsavedChanges()) {
           eventBus.emit('showToast', { 
               message: 'Already up to date!', 
               type: 'info' 
           });
       } else {
           // Proceed with manual save logic if there are unsaved changes
           this.submitForm();
       }
    }

    // New method to handle publishing logic
    handlePublish() {
        const addNote = this.form.querySelector('input[name="currentPage"]').value === 'text-note-edit.php';

        if (addNote) {
            this.showAddNote();
        } else {
            this.showPublishWarning();
        }
    }

    showAddNote() {
        const warningManager = new WarningManager();
        warningManager.createWarningModal(
            "Your note will be public, but you can edit it any time.",
            () => {
                this.statusField.value = 'published';
                this.submitForm();
            },
            () => console.log("Note cancelled")
        );
    }

    showPublishWarning() {
        const warningManager = new WarningManager();
        warningManager.createWarningModal(
            "Are you sure you want to publish this text? This action cannot be undone.",
            () => {
                this.statusField.value = 'published';
                this.submitForm();
            },
            () => console.log("Publish cancelled")
        );
    }

    showDeleteWarning() {
        const warningManager = new WarningManager();
        warningManager.createWarningModal(
            "Are you sure you want to delete this text? This action cannot be undone.",
            () => this.submitDelete(`${this.path}text/delete`),
            () => console.log("Delete cancelled")
        );
    }

    // Method to handle form deletion
    // This is because the forms have an action that applies to all the buttons, except for the delete button, whose action is handled by the delete endpoint
    async submitDelete(deleteUrl) {
/*      this.form.action = deleteUrl;  // Set the action to the delete endpoint
        this.form.submit();  // Submit the form */
        if (!this.form) return;

        const formData = new FormData(this.form);
        const data = {};
        formData.forEach((value, key) => {
            data[key] = value;
        });

        try {
            const response = await fetch(deleteUrl, {
                method: 'DELETE', // Use DELETE method
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data) // Send the form data as JSON
            });

            const result = await response.json();
            if (result.success) {
                // Handle success (e.g., show toast message)
                eventBus.emit('showToast', { 
                    message: result.toastMessage, 
                    type: result.toastType 
                });
                // Optionally, redirect or update the UI
                window.location.href = `${this.path}text`; // Redirect after deletion
            } else {
                // Handle error
                console.error('Delete failed:', result.message);
                eventBus.emit('showToast', { 
                    message: result.message, 
                    type: 'error' 
                });
            }
        } catch (error) {
            console.error('Error:', error);
            eventBus.emit('showToast', { 
                message: 'An error occurred while deleting.', 
                type: 'error' 
            });
        }
    }

    // Method to inject SVGs into form buttons
    injectSVGIcons() {
        if (!this.form) return;

        const publishBtn = this.form.querySelector('.publish .icon');
        const saveBtn = this.form.querySelector('.save .icon');
        const deleteBtn = this.form.querySelector('.delete .icon');
        const cancelBtn = this.form.querySelector('.cancel .icon');

        if (publishBtn) publishBtn.innerHTML = SVGManager.publishSVG;
        if (saveBtn) saveBtn.innerHTML = SVGManager.saveSVG;
        if (deleteBtn) deleteBtn.innerHTML = SVGManager.deleteSVG;
        if (cancelBtn) cancelBtn.innerHTML = SVGManager.cancelSVG;
    }

    // TODO: I'm keeping this, but it may be better in autoSaveManager
    setupExitWarning() {
        window.addEventListener('beforeunload', (e) => {
            if (this.hasUnsavedChanges()) {
                e.preventDefault();
            }
        });
    }

    setupCheckForInput() {
        this.form.addEventListener('input', (event) => {
            const target = event.target;
            if (target.matches('textarea, input:not([type="hidden"])')) {
                eventBus.emit('inputChanged');
            }
        });
    }

    
    // Submits the form to store OR update.
    submitForm() {
        const formData = new FormData(this.form);
        const action = this.form.getAttribute('action'); // This gets the action URL

        // Convert FormData to a plain object
        const data = {};
        formData.forEach((value, key) => {
            data[key] = value;
        });

        console.log('Form Data:', data); // Debugging: Check the collected form data

        fetch(action, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Update the lastKeywords hidden input
                const lastKeywordsInput = this.form.querySelector('[name="lastKeywords"]');
                if (lastKeywordsInput) {
                    lastKeywordsInput.value = formData.get('keywords');
                }
                // Only update the Id if it's not already set
                let idInput = this.form.querySelector('[data-id]');
                if (idInput && !idInput.value && data.textId) {
                    console.log('setting textId:', data.textId);
                    idInput.value = data.textId;
                }
                // AutoSaveManager will reset the timers
                if (this.formType == 'writing'){  
                    eventBus.emit('manualSave');
                }
            }
            if (data.redirectUrl) {
                // Store toast data in localStorage before redirecting
                localStorage.setItem('pendingToast', JSON.stringify({
                    message: data.toastMessage,
                    type: data.toastType
                }));
                window.location.href = `${this.path}${data.redirectUrl}`;
            } else {
                eventBus.emit('showToast', { 
                    message: data.toastMessage, 
                    type: data.toastType 
                });
            }
        })
        .catch(error => {
            console.error('Error:', error);
            eventBus.emit('showToast', { 
                message: 'An error occurred', 
                type: 'error'
            });
        });
    }
}
