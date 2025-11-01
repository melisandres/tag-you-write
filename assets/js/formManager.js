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

    /**
     * REDIRECT: Cancel button clicked
     * Uses smart redirect logic: history.back → collab page → text page
     */
    async handleCancel() {
        try {
            // In the this.getSmartRedirectUrl params, we could pass "back" but... the issue is that if there are filters on a gameLIst... and the story no longer matches those filters it isn't included... 
            const redirectUrl = await this.getSmartRedirectUrl();
            // Check if a draft was saved (has id) - if so, prepare showcase state
            const idInput = this.form?.querySelector('[data-id]');
            const textId = idInput?.value || null;
            this.executeRedirect(redirectUrl, textId);
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
        console.log('handleForgotPassword called, canPublish:', this.canPublish);
        if (this.canPublish) {
            const urlAction = this.form.getAttribute('action');
            console.log('Forgot password form action URL:', urlAction);
            this.submitForm(urlAction);
        } else {
            console.log('Forgot password validation failed');
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

    

    /**
     * REDIRECT: Delete button clicked (for new/unsaved texts only)
     * Uses smart redirect logic when aborting creation of unsaved text
     */
    async handleDelete() {
        const idInput = this.form.querySelector('[data-id]');
        if (!idInput || !idInput.value) {
            // Create a redirect with filters
            const redirectUrl = await this.getSmartRedirectUrl();
            this.executeRedirect(redirectUrl);

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
            null,
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
            null,
            () => {
                this.statusField.value = 'published';
                const idValue = this.form.querySelector('input[name="id"]').value;
                const endpoint = idValue === '' ? 'text/store' : 'text/update';
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
            null,
            () => {
                this.statusField.value = 'published';
                const idValue = this.form.querySelector('input[name="id"]').value;
                const endpoint = idValue === '' ? 'text/store' : 'text/update';
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
            null,
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
            if (target.matches('textarea, input:not([type="hidden"]):not([data-ui-helper]), input[type="hidden"][name="id"], input[name="invitees"]')) {
                console.log('input changed', target.name, target.value);
                eventBus.emit('inputChanged', {
                    formType: this.formType,
                    fieldName: target.name,
                    fieldValue: target.value
                });
            }
        });
    }

    
    /**
     * Submit form with backend-first redirect architecture
     * 
     * ARCHITECTURE: Backend determines redirects, frontend executes them
     * 
     * Flow:
     * - Backend sends redirectUrl in JSON response (or null if no redirect)
     * - Frontend respects backend's redirectUrl completely
     * - If backend sends null/missing redirectUrl, frontend uses smart fallback
     * 
     * This ensures business logic (who goes where) stays in backend,
     * while frontend handles UX enhancements (preserving query params, etc.)
     */
    async submitForm(actionUrl) {
        try {
            console.log('submitForm called with URL:', actionUrl);
            const formData = new FormData(this.form);
            const data = {};
            formData.forEach((value, key) => {
                // Make sure to trim values to eliminate whitespace issues
                data[key] = typeof value === 'string' ? value.trim() : value;
            });
            
            // Debug logging for text_status
            console.log('text_status being sent:', data.text_status);
            console.log('Form data being sent:', data);
            console.log('Form type:', this.formType);

            const response = await fetch(actionUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            console.log('Response status:', response.status);
            const responseData = await response.json();
            console.log('Response data:', responseData);

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

                // Emit tutorial completion event if this is a publish action
                if (this.statusField && this.statusField.value === 'published') {
                    eventBus.emit('publishSuccess', {
                        action: this.formType, // 'root' for new game, 'iteration' for contribution
                        textId: responseData.textId,
                        message: responseData.toastMessage
                    });
                }
                
                if (responseData.redirectUrl) {
                    // Backend wants to redirect - use unified redirect logic
                    localStorage.setItem('pendingToast', JSON.stringify({
                        message: responseData.toastMessage,
                        type: responseData.toastType
                    }));

                    // Unified redirect logic (applies to all form types)
                    const redirectUrl = await this.getSmartRedirectUrl(response, responseData.redirectUrl);
                    // Pass textId for showcase state preparation (publish or save scenarios)
                    const textId = responseData.textId || idInput?.value || null;
                    this.executeRedirect(redirectUrl, textId);
                } else {
                    // No redirect - just show toast and stay on page
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

                // REDIRECT: New account created
                // Uses smart redirect logic (no backend redirectUrl in response)
                const redirectUrl = await this.getSmartRedirectUrl(response);
                this.executeRedirect(redirectUrl);
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

                // REDIRECT: Text successfully deleted
                // Uses smart redirect logic (no backend redirectUrl in response)
                const redirectUrl = await this.getSmartRedirectUrl(response);
                this.executeRedirect(redirectUrl);
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

    /**
     * Prepare showcase state before redirecting back to a showcase page
     * Updates modal.textId or drawers array based on showcase type
     * 
     * @param {string|null} textId - The text ID to show in the showcase
     * @returns {boolean} True if showcase state was updated
     */
    prepareShowcaseState(textId) {
        if (!textId) return false;

        // Check if we're going back to a showcase page by checking referrer
        const referrer = document.referrer;
        if (!referrer) return false;

        // Check if referrer is a showcase page (collab or text index, but not edit/create)
        const isCollabPage = referrer.includes('/text/collab/');
        const isTextIndex = referrer.includes('/text') && 
                            !referrer.includes('/text/edit') && 
                            !referrer.includes('/text/create') &&
                            !referrer.includes('/text/iterate');
        
        if (!isCollabPage && !isTextIndex) return false;

        // Get current pageState
        const pageState = JSON.parse(localStorage.getItem('pageState') || '{}');
        const showcase = pageState.showcase || {};
        const modal = pageState.modal || {};

        // Check showcase type from URL params or pageState
        const referrerUrl = new URL(referrer);
        const showcaseParam = referrerUrl.searchParams.get('showcase');
        const showcaseType = showcaseParam || showcase.type;

        let stateUpdated = false;

        if (showcaseType === 'shelf') {
            // For shelf: add textId to drawers array if not already present
            const drawers = showcase.drawers || [];
            if (!drawers.includes(textId)) {
                drawers.push(textId);
                if (window.refreshManager) {
                    window.refreshManager.setShowcaseState({ drawers });
                } else {
                    // Fallback: update localStorage directly
                    pageState.showcase = { ...showcase, drawers };
                    localStorage.setItem('pageState', JSON.stringify(pageState));
                }
                stateUpdated = true;
                console.log('Showcase: Added textId to shelf drawers', textId);
            }
        } else {
            // For tree or default: set modal.textId if modal was open (or should be opened)
            // If modal wasn't explicitly set to false, we assume it should be open to show the new text
            if (modal.isOpen !== false) {
                // Update modal state in pageState
                pageState.modal = { ...modal, isOpen: true, textId };
                localStorage.setItem('pageState', JSON.stringify(pageState));
                stateUpdated = true;
                console.log('Showcase: Set modal.textId to', textId);
            }
        }

        return stateUpdated;
    }

    /**
     * Execute redirect based on URL string (handles 'history.back' special case)
     * Also prepares showcase state if going back to a showcase page
     * 
     * @param {string} redirectUrl - The redirect URL or 'history.back' string
     * @param {string|null} textId - Optional text ID to show in showcase (for publish/exit scenarios)
     */
    executeRedirect(redirectUrl, textId = null) {
        if (redirectUrl === 'history.back') {
            // Before going back, prepare showcase state if we have a textId
            if (textId) {
                this.prepareShowcaseState(textId);
            }
            window.history.back();
        } else {
            window.location.href = redirectUrl;
        }
    }

    /**
     * Get redirect URL - Backend-First Architecture
     * 
     * ARCHITECTURE PRINCIPLE: Backend determines WHERE to go based on business logic.
     * Frontend only executes the redirect or provides fallback if backend doesn't specify.
     * 
     * Priority order:
     * 1. Backend redirectUrl (ALWAYS respected if provided - backend knows best)
     *    - Can be: 'dashboard', 'text', 'back' (for history.back), or full URL
     * 2. Smart fallback (only if backend doesn't provide redirectUrl):
     *    - Collab page (if editing contribution/note)
     *    - Dashboard (if logged in) or text page (fallback)
     * 
     * @param {Response} response - Fetch response (currently unused, kept for compatibility)
     * @param {string|null} backendRedirectUrl - Backend's redirect instruction
     * @returns {Promise<string>} The final redirect URL or 'history.back' string
     */
    async getSmartRedirectUrl(response = null, backendRedirectUrl = null) {
        // 1. Backend redirectUrl - ALWAYS respect it (backend is source of truth)
        if (backendRedirectUrl) {
            // Special value "back" means use browser history
            if (backendRedirectUrl === 'back') {
                console.log('Redirect: Backend requested history.back');
                return 'history.back';
            }
            
            console.log('Redirect: Using backend redirect', backendRedirectUrl);
            return window.i18n.createUrl(backendRedirectUrl);
        }

        // 2. Fallback: Only used if backend doesn't provide redirectUrl
        //    This is a UX enhancement, not a business logic decision
        
        // 2a. Collab page (if editing a contribution/note)
        const rootTextId = this.getRootTextId();
        if (rootTextId) {
            console.log('Redirect: Fallback - going to collab page for root text', rootTextId);
            return window.i18n.createUrl(`text/collab/${rootTextId}`);
        }

        // 2b. Dashboard if logged in, otherwise text page
        const isLoggedIn = this.isUserLoggedIn();
        const fallbackUrl = isLoggedIn ? 'dashboard' : 'text';
        console.log('Redirect: Fallback - using', fallbackUrl, '(logged in:', isLoggedIn, ')');
        return window.i18n.createUrl(fallbackUrl);
    }

    /**
     * Check if user is logged in
     * @returns {boolean}
     */
    isUserLoggedIn() {
        const userMeta = document.querySelector('meta[name="user"]');
        return userMeta && userMeta.dataset.userId !== 'null';
    }

    /**
     * Get root text ID using form fields and dataManager
     */
    getRootTextId() {
        // Get form field values
        const id = this.form?.querySelector('input[name="id"]')?.value;
        const parentId = this.form?.querySelector('input[name="parent_id"]')?.value;
        const gameId = this.form?.querySelector('input[name="game_id"]')?.value;

        // If parent_id is null/empty, this is a root text - use the id
        if (!parentId || parentId === '') {
            return id;
        }

        // If we have a game_id, use dataManager to get root text ID
        if (gameId) {
            return window.dataManager.getGameRootId(gameId);
        }

        return null;
    }
}
