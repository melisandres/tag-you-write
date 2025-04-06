import { SVGManager } from './svgManager.js';
import { WarningManager } from './warningManager.js';
import { eventBus } from './eventBus.js';

export class FormManager {
    constructor(autoSaveManager) {
        this.autoSaveManager = autoSaveManager;
        this.form = document.querySelector('#main-form');
        this.formType = this.form ? this.form.getAttribute('data-form-type') : null;
        this.statusField = this.form ? this.form.querySelector('[data-text-status]') : null;
        this.buttons = this.form ? this.form.querySelectorAll('[data-status]') : null;
        this.canPublish = false;
        this.canAutosave = false;
        // A flag to prevent the beforeunload event from triggering
        this.isIntentionalNavigation = false;
        this.wasIdAlreadySet = false;
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
            case 'login':
                this.handleLogin();
                break;
            case 'forgotPassword':
                this.handleForgotPassword();
                break;
            case 'resetPassword':
                this.handleResetPassword();
                break;
            default:
                console.log("button has not been given a purpose!");
        }
    }

    //  Redirect to the text page, with filters if they exist
    async handleCancel() {
        try {
            const redirectUrl = await this.getRedirectUrlWithFilters();
            window.location.href = redirectUrl;
        } catch (error) {
            console.error('Error generating redirect URL:', error);
            // Fallback to simple redirect
            const urlWithoutFilters = window.i18n.createUrl('text');
            window.location.href = urlWithoutFilters;
        }
    }

    // Check if the autoSaveManager has unsaved changes
    handleManualSave() {
       // Check if there are unsaved changes
       if (!this.autoSaveManager.hasUnsavedChanges()) {
           eventBus.emit('showToast', { 
               message: 'toast.form_manager.up_to_date', 
               type: 'info' 
           });
       } else {
           // We need to check if this is a store or an update
           const idValue = this.form.querySelector('input[name="id"]').value;
           const endpoint = idValue === '' ? 'text/store' : 'text/update';
           const actionUrl = window.i18n.createUrl(endpoint);
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
                message: 'toast.form_manager.please_fill_required_fields_correctly', 
                type: 'error' 
            });
        }
    }

    // New method to handle publishing logic
    handlePublish() {
        if (!this.canPublish){
            eventBus.emit('showToast', { 
                message: 'toast.form_manager.validation_failed', 
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
        if (this.canPublish) {
            const urlAction = this.form.getAttribute('action');
            this.submitForm(urlAction);
        } else {
            eventBus.emit('showToast', { 
                message: 'toast.form_manager.please_fill_required_fields_correctly', 
                type: 'error' 
            });
        }
    }

    handleForgotPassword() {
        if (this.canPublish) {
            const urlAction = this.form.getAttribute('action');
            this.submitForm(urlAction);
        } else {
            eventBus.emit('showToast', { 
                message: 'toast.form_manager.please_fill_required_fields_correctly', 
                type: 'error' 
            });
        }
    }

    handleResetPassword() {
        if (this.canPublish) {
            const urlAction = this.form.getAttribute('action');
            this.submitForm(urlAction);
        } else {
            eventBus.emit('showToast', { 
                message: 'toast.form_manager.please_fill_required_fields_correctly', 
                type: 'error' 
            });
        }
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
            'warning.add_note',
            () => {
                this.statusField.value = 'published';
                const endpoint = 'text/update';
                const actionUrl = window.i18n.createUrl(endpoint);
                this.submitForm(actionUrl);
            },
            () => console.log("Note cancelled")
        );
    }

    showPublishWarning() {
        const warningManager = new WarningManager();
        warningManager.createWarningModal(
            "warning.publish",
            () => {
                this.statusField.value = 'published';
                const endpoint = 'text/update';
                const actionUrl = window.i18n.createUrl(endpoint);
                this.submitForm(actionUrl);
            },
            () => console.log("Publish cancelled")
        );
    }

    showNewGameWarning() {
        const warningManager = new WarningManager();
        warningManager.createWarningModal(
            "warning.new_game",
            () => {
                this.statusField.value = 'published';
                const endpoint = 'text/update';
                const actionUrl = window.i18n.createUrl(endpoint);
                this.submitForm(actionUrl);
            },
            () => console.log("New game cancelled") 
        );
    }

    showDeleteWarning() {
        const warningManager = new WarningManager();
        warningManager.createWarningModal(
            "warning.delete",
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
                // Make sure to trim values to eliminate whitespace issues
                data[key] = typeof value === 'string' ? value.trim() : value;
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
                // Change the data-form-activity attribute
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

                // Update URL if this is the first save (ID was empty before)
                if (idInput && responseData.textId && !this.wasIdAlreadySet) {
                    this.wasIdAlreadySet = true;
                    
                    // Always use edit endpoint after first save
                    let newUrl = window.i18n.createUrl(`text/edit?id=${responseData.textId}`);
                    
                    // Update browser history without refreshing
                    window.history.replaceState({id: responseData.textId}, document.title, newUrl);
                }
            } else {
                // Handle unsuccessful responses (e.g., failed login)
                eventBus.emit('showToast', {
                    message: responseData.toastMessage,
                    type: responseData.toastType || 'error'
                });
                
                // If there are specific errors to display in the form
                if (responseData.errors) {
                    // You could add code here to display errors in the form if needed
                    console.log('Validation errors:', responseData.errors);
                }
            }
        } catch (error) {
            console.error('Error:', error);
            eventBus.emit('showToast', {
                message: 'toast.form_manager.error_occurred',
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
                    message: 'toast.form_manager.account_created_successfully',
                    type: 'success'
                }));

                // Redirect to the text page
                const redirectUrl = await this.getRedirectUrlWithFilters(response);
                window.location.href = redirectUrl;
            } else {
                eventBus.emit('showToast', {
                    message: data.message || 'toast.form_manager.error_occurred',
                    type: 'error'
                });
            }
        } catch (error) {
            console.error('Error:', error);
            eventBus.emit('showToast', {
                message: 'toast.form_manager.error_occurred',
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
            const id = formData.get('id');
            const endpoint = 'text/delete';
            const actionUrl = window.i18n.createUrl(endpoint);

            const response = await fetch(actionUrl, {
                method: 'POST', // Use DELETE method
                body: formData // Send the form data as JSON
            });

            const result = await response.json();
            if (result.success) {
                // Delete the node from the data cache
                eventBus.emit('deleteNode', id );

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
                message: 'toast.form_manager.error_deleting', 
                type: 'error' 
            });
        }
        // A flag to prevent the beforeunload event from triggering
        this.isIntentionalNavigation = false;
    }

    async getRedirectUrlWithFilters(response = null, redirectUrl = 'text') {
        const filters = window.dataManager.getFilters();
        
        const queryParams = {};
        if (filters.hasContributed !== null) {
            queryParams.hasContributed = filters.hasContributed;
        }
        if (filters.gameState !== 'all') {
            queryParams.gameState = filters.gameState;
        }
        
        // Use the localization utility
        const finalUrl = window.i18n.createUrl(redirectUrl, queryParams);
        console.log('Constructed redirect URL:', finalUrl);
        
        return finalUrl;
    }
}
