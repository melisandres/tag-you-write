import { SVGManager } from './svgManager.js';
import { WarningManager } from './warningManager.js';
import { eventBus } from './eventBus.js';

export class FormManager {
    constructor(autoSaveManager, path) {
        this.autoSaveManager = autoSaveManager;
        //this.validationManager = validationManager;
        this.path = path;
        this.form = document.querySelector('#main-form');
        this.formType = this.form ? this.form.getAttribute('data-form-type') : null;
        this.statusField = this.form ? this.form.querySelector('[data-text-status]') : null;
        this.buttons = this.form ? this.form.querySelectorAll('[data-status]') : null;
        this.canPublish = false;
        this.canAutosave = false;
        // A flag to prevent the beforeunload event from triggering
        this.isIntentionalNavigation = false;
        this.init();
    }

    // Initialize form functionality
    init() {
        this.injectSVGIcons();
        // methods related to auto-saving, and handling buttons in the context of autosave
        if (this.form){
            this.addButtonEventListeners();
            this.setupExitWarning();
            // SetupCheckForInput is used for autosave AND for validation --so you always need it
            this.setupCheckForInput();
            eventBus.on('validationChanged', this.handleValidationChanged.bind(this));
            
            // Check if the form has a textarea
            if (this.form.querySelector('textarea')) {
                this.initializeWysiwygEditors();
            }
        }
    }

    initializeWysiwygEditors() {
        // Initialize the global CKEditor instances container if it doesn't exist
        window.CKEditorInstances = window.CKEditorInstances || {};

        const textareas = document.querySelectorAll('textarea');
        textareas.forEach(textarea => {
            const container = document.createElement('div');
            container.className = textarea.className + ' editor-wrapper';
            textarea.parentNode.insertBefore(container, textarea);
            
            ClassicEditor
                .create(textarea, {
                    toolbar: ['undo', 'redo', 'bold', 'italic'],
                    placeholder: textarea.placeholder
                })
                .then(editor => {
                    // Store editor instance globally
                    window.CKEditorInstances[textarea.name] = editor;

                    // Set initial content
                    if (textarea.value) {
                        editor.setData(textarea.value);
                    }

                    // Update textarea on change
                    editor.model.document.on('change:data', () => {
                        textarea.value = editor.getData();
                        const event = new Event('input', { bubbles: true });
                        textarea.dispatchEvent(event);
                    });

                   // Emit when this specific editor is ready
                    eventBus.emit('editorReady', {
                        name: textarea.name,
                        editor: editor
                    });
                })
                .catch(error => {
                    console.error('Error initializing CKEditor:', error);
                });
        });
    }

    handleValidationChanged(results) {
        console.log('in form: validation changed', results);
        this.canPublish = results.canPublish;
        this.canAutosave = results.canAutosave;
    }

    // Ensure that all the buttons on the form trigger asyncronous actions
    addButtonEventListeners() {
        if (!this.form || !this.buttons) return; 

        this.buttons.forEach(element => {
            const myStatus = element.dataset.status;
            element.addEventListener('click', (event) => {
                console.log('button clicked', myStatus);
                event.preventDefault();
                this.setStatusAndSubmit(myStatus);
            });
        });
    }

    // Method to set the status and submit the form
    // Setting the status is only relevent for "draft" and "published"
    // TODO: But since I'm also using this to submit to form, I created a data-status attribute for all the buttons, that help determine the action... I should probably rename it though, so that it's not confused with the status of the text... 
    setStatusAndSubmit(status) {
        //console.log(this.statusField)
        if (!this.form) return;  

        switch(status) {
            case 'writerSave':
               this.handleWriterSave();
               break;
            case 'published':
                this.handlePublish();
                break;
            case 'draft':
                this.statusField.value = status;
                this.handleManualSave();
                break;
            case 'delete': 
                this.handleDelete();
                break;
            case 'cancel':
                this.handleCancel();
                break;
            default:
                console.log("button has not been given a purpose!");
        }
    }

    // 
    async handleCancel() {
        try {
            const redirectUrl = await this.getRedirectUrlWithFilters();
            window.location.href = redirectUrl;
        } catch (error) {
            console.error('Error generating redirect URL:', error);
            // Fallback to simple redirect
            window.location.href = `${this.path}text`;
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
           // We need to check if this is a store or an update
           const idValue = this.form.querySelector('input[name="id"]').value;
           const actionUrl = idValue === '' ? `${this.path}text/store` : `${this.path}text/update`;
           this.submitForm(actionUrl);
       }
    }

    handleWriterSave() {
        console.log('handleWriterSave', this.canPublish);
        if (this.canPublish) {  
            const actionUrl = this.form.getAttribute('action');
            this.submitNewAccountInfo(actionUrl);
        } else {
            eventBus.emit('showToast', { 
                message: 'Please fill all required fields correctly', 
                type: 'error' 
            });
        }
    }

    // New method to handle publishing logic
    handlePublish() {
        if (!this.canPublish){
            eventBus.emit('showToast', { 
                message: 'validation failed', 
                type: 'error' 
            });
            return;
        }
        switch (this.formType) {
            case 'root':
                this.showNewGameWarning();
                break;
            case 'addingNote':
                this.showAddNoteWarning();
                break;
            case 'iteration':
                this.showPublishWarning();
                break;
            default:
                this.showPublishWarning();
        }
    }

    handleLogin() {
        const urlAction = this.form.getAttribute('action');
        this.submitForm(urlAction);
    }

    async handleDelete() {
        const idInput = this.form.querySelector('[data-id]');
        if (!idInput || !idInput.value) {
            // Create a redirect with filters
            const redirectUrl = await this.getRedirectUrlWithFilters();
            window.location.href = redirectUrl;

            localStorage.setItem('pendingToast', JSON.stringify({
                message: 'Creation aborted',
                type: 'success'
            }));
        } else {
            this.showDeleteWarning();
        }
    }

    showAddNoteWarning() {
        const warningManager = new WarningManager();
        warningManager.createWarningModal(
            "Your note will be public, but you can edit it any time.",
            () => {
                this.statusField.value = 'published';
                this.submitForm(`${this.path}text/update`);
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
                this.submitForm(`${this.path}text/update`);
            },
            () => console.log("Publish cancelled")
        );
    }

    showNewGameWarning() {
        const warningManager = new WarningManager();
        warningManager.createWarningModal(
            `Ready to start a new game? This action cannot be undone.`,
            () => {
                this.statusField.value = 'published';
                this.submitForm(`${this.path}text/update`);
            },
            () => console.log("New game cancelled") 
        );
    }

    showDeleteWarning() {
        const warningManager = new WarningManager();
        warningManager.createWarningModal(
            "Are you sure you want to delete this text? This action cannot be undone.",
            () => this.submitDelete(),
            () => console.log("Delete cancelled")
        );
    }

    // Method to inject SVGs into form buttons
    injectSVGIcons() {
        if (!this.form) return;

        const publishBtn = this.form.querySelector('.publish .icon');
        const saveBtn = this.form.querySelector('.save .icon');
        const deleteBtn = this.form.querySelector('.delete .icon');
        const cancelBtn = this.form.querySelector('.cancel .icon');
        const loginBtn = this.form.querySelector('.login .icon');

        if (publishBtn) publishBtn.innerHTML = SVGManager.publishSVG;
        if (saveBtn) saveBtn.innerHTML = SVGManager.saveSVG;
        if (deleteBtn) deleteBtn.innerHTML = SVGManager.deleteSVG;
        if (cancelBtn) cancelBtn.innerHTML = SVGManager.cancelSVG;
        if (loginBtn) loginBtn.innerHTML = SVGManager.logInSVG;
    }

    // TODO: I don't know if this is better in autoSaveManager
    // TODO: Not sure this is the right approach... 
    // Although the most recent changes are saved in local Storage, this checks if the last database save is up to date with what is in the form now. 
    setupExitWarning() {
        if (this.formType == 'login' || this.formType == 'writer-create' || this.formType == 'addingNote') return;
        window.addEventListener('beforeunload', (event) => {
            // If the navigation is intentional, don't trigger the warning
            if (this.isIntentionalNavigation) return;
            if (this.autoSaveManager.hasUnsavedChanges()) {
                // If the lastSavedContent will be null on refresh
                if (this.autoSaveManager.lastSavedContent !== null) {
                    event.preventDefault();
                }
            }
        });
    }

    // This emits "inputChanged" which is listened for by autoSaveManager and validationManager
    setupCheckForInput() {
        this.form.addEventListener('input', (event) => {
            const target = event.target;
            if (target.matches('textarea, input:not([type="hidden"]), input[type="hidden"][name="id"]')) {
                console.log('input changed', target.name, target.value);
                eventBus.emit('inputChanged', {
                    formType: this.formType,
                    fieldName: target.name,
                    fieldValue: target.value
                });
            }
        });
    }

    
    // Submits the form to store OR update.
    async submitForm(actionUrl) {
        try {
            const formData = new FormData(this.form);
            const data = {};
            formData.forEach((value, key) => {
                data[key] = value;
            });

            const response = await fetch(actionUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const responseData = await response.json();

            if (responseData.success) {
                // Update form fields if needed
                const lastKeywordsInput = this.form.querySelector('[name="lastKeywords"]');
                if (lastKeywordsInput) {
                    lastKeywordsInput.value = formData.get('keywords');
                }
                // Only update the Id if it's not already set
                let idInput = this.form.querySelector('[data-id]');
                if (idInput && !idInput.value && responseData.textId) {
                    idInput.value = responseData.textId;
                }
                // Changge the data-form-activity attribute
                this.form.setAttribute('data-form-activity', 'editing');

                if (this.formType == 'root' || this.formType == 'iteration') {
                    eventBus.emit('manualSave');
                }

                if (responseData.redirectUrl) {
                    localStorage.setItem('pendingToast', JSON.stringify({
                        message: responseData.toastMessage,
                        type: responseData.toastType
                    }));

                    const redirectUrl = await this.getRedirectUrlWithFilters(response, responseData.redirectUrl);
                    window.location.href = redirectUrl;
                } else {
                    eventBus.emit('showToast', {
                        message: responseData.toastMessage,
                        type: responseData.toastType
                    });
                }
            }
        } catch (error) {
            console.error('Error:', error);
            eventBus.emit('showToast', {
                message: 'An error occurred',
                type: 'error'
            });
        }
    }

    // Submit Writer information--new account
    async submitNewAccountInfo(actionUrl) {
        try {
            const formData = new FormData(this.form);
            const response = await fetch(actionUrl, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                // Store toast data in localStorage before redirecting
                localStorage.setItem('pendingToast', JSON.stringify({
                    message: 'Account created successfully! Welcome!',
                    type: 'success'
                }));

                // Redirect to the text page
                const redirectUrl = await this.getRedirectUrlWithFilters(response);
                window.location.href = redirectUrl;
            } else {
                eventBus.emit('showToast', {
                    message: data.message || 'An error occurred',
                    type: 'error'
                });
            }
        } catch (error) {
            console.error('Error:', error);
            eventBus.emit('showToast', {
                message: 'An error occurred',
                type: 'error'
            });
        }
    }

    // Method to handle form deletion
    // This is because the forms have an action that applies to all the buttons, except for the delete button, whose action is handled by the delete endpoint
    async submitDelete() {
        if (!this.form) return;
        // A flag to prevent the beforeunload event from triggering
        this.isIntentionalNavigation = true;
        try {
            const formData = new FormData(this.form);

            const response = await fetch(`${this.path}text/delete`, {
                method: 'POST', // Use DELETE method
                body: formData // Send the form data as JSON
            });

            const result = await response.json();
            if (result.success) {
                // Delete the node from the data cache
                eventBus.emit('deleteNode', { textId });
                
                // Show toast message
                localStorage.setItem('pendingToast', JSON.stringify({
                    message: result.toastMessage,
                    type: result.toastType
                }));

                // Get the redirect URL with filters
                const redirectUrl = await this.getRedirectUrlWithFilters(response);
                window.location.href = redirectUrl;
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
        // A flag to prevent the beforeunload event from triggering
        this.isIntentionalNavigation = false;
    }

    async getRedirectUrlWithFilters(response = null, redirectUrl = 'text') {
        // Debug URL construction
        const filters = window.dataManager.getFilters();
        console.log('Filters before URL construction:', filters);
        
        const filterParams = new URLSearchParams();
        if (filters.hasContributed !== null) {
            filterParams.append('hasContributed', filters.hasContributed);
        }
        if (filters.gameState !== 'all') {
            filterParams.append('gameState', filters.gameState);
        }
        
        const finalUrl = `${this.path}${redirectUrl}${filterParams.toString() ? '?' + filterParams.toString() : ''}`;
        console.log('Constructed redirect URL:', finalUrl);
        
        return finalUrl;
    }
}
