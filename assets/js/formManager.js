import { SVGManager } from './svgManager.js';
import { WarningManager } from './warningManager.js';
import { eventBus } from './eventBus.js';

export class FormManager {
    constructor(path) {
        this.path = path;
        this.form = document.querySelector('#main-form');
        this.statusField = this.form ? this.form.querySelector('[data-text-status]') : null;
        this.buttons = this.form ? this.form.querySelectorAll('[data-status]') : null;

        this.lastSavedContent = '';
        this.autoSaveInterval = null;
        this.saveTimeout = null;

        this.init();
    }

    // Initialize form functionality
    init() {
        this.addButtonEventListeners();
        this.injectSVGIcons();
        // TODO: must test the following methods.
        //this.setupAutoSave();
        //this.setupExitWarning();
        //this.setupSaveOnInput();
    }

    // Add button event listeners
    addButtonEventListeners() {
        if (!this.form || !this.buttons) return; 

        this.buttons.forEach(element => {
            const myStatus = element.dataset.status;
            element.addEventListener('click', (event) => {
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
                this.showPublishWarning();
                break;
            case 'draft':
                this.statusField.value = status;
                this.submitForm();
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
    submitDelete(deleteUrl) {
        this.form.action = deleteUrl;  // Set the action to the delete endpoint
        this.form.submit();  // Submit the form
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

    // TODO: check code below. needs to be tested.
    setupAutoSave() {
        this.autoSaveInterval = setInterval(() => this.autoSave(), 60000); // Auto-save every minute
    }

    setupExitWarning() {
        window.addEventListener('beforeunload', (e) => {
            if (this.hasUnsavedChanges()) {
                e.preventDefault();
            }
        });
    }

    setupSaveOnInput() {
        const textArea = this.form.querySelector('textarea');
        if (textArea) {
            textArea.addEventListener('input', () => {
                clearTimeout(this.saveTimeout);
                this.saveTimeout = setTimeout(() => this.autoSave(), 3000); // Save 3 seconds after last input
            });
        }
    }

    hasUnsavedChanges() {
        const textArea = this.form.querySelector('textarea');
        return textArea && textArea.value !== this.lastSavedContent;
    }

    autoSave() {
        if (this.hasUnsavedChanges()) {
            // Implement your auto-save logic here
            // This could be an AJAX request to save the draft
            console.log('Auto-saving draft...');
            // After successful save:
            // this.lastSavedContent = this.form.querySelector('textarea').value;
        }
    }

    // Method to submit the form via AJAX
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
