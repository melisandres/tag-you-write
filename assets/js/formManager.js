import { SVGManager } from './svgManager.js';
import { WarningManager } from './warningManager.js';
import { eventBus } from './eventBus.js';

export class FormManager {
    constructor(path) {
        this.path = path;
        this.form = document.querySelector('#main-form');
        this.formType = this.form ? this.form.getAttribute('data-form-type') : null;
        this.statusField = this.form ? this.form.querySelector('[data-text-status]') : null;
        this.buttons = this.form ? this.form.querySelectorAll('[data-status]') : null;

        this.lastSavedContent = this.form ? JSON.stringify(Object.fromEntries(new FormData(this.form))) : null;
        this.autoSaveTimer = null;
        this.lastTypedTime = Date.now();
        this.continuousTypingDuration = 30000; // 30 seconds
        this.typingPauseDuration = 4000; // 4 seconds
        this.continuouslyTyping = false;
        this.continuousTypingStartTime = null;
        this.lastAutoSaveTime = null;

        this.init();
    }

    // Initialize form functionality
    init() {
        this.injectSVGIcons();
        // methods related to auto-saving, and handling buttons in the context of autosave
        if (this.form && this.formType == 'writing'){
            this.addButtonEventListeners();
            this.setupAutoSave();
            this.setupExitWarning();
            this.setupCheckForInput();
        }
    }

    // Ensure that all the buttons on the form trigger asyncronous actions
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
        this.startAutoSaveTimer();
    }

    startAutoSaveTimer() {
        clearInterval(this.autoSaveTimer);
        this.autoSaveTimer = setInterval(() => {
            const now = Date.now();
            const timeSinceLastType = now - this.lastTypedTime;
            const timeSinceLastAutoSave = now - (this.lastAutoSaveTime || 0);

            if (timeSinceLastType >= this.typingPauseDuration && timeSinceLastAutoSave >= this.typingPauseDuration) {
                this.autoSave();
                clearInterval(this.autoSaveTimer);
                this.continuouslyTyping = false;
                this.continuousTypingStartTime = null;
            }
        }, 1000);
    }

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
                // Update last typed time and start timers
                this.lastTypedTime = Date.now();
                this.startAutoSaveTimer();
    
                // Start continuous typing timer if not already active
                if (!this.continuouslyTyping) {
                    this.startContinuousTypingTimer();
                }
            }
        });
    }

    startContinuousTypingTimer() {
        clearInterval(this.continuousTypingTimer);
        this.continuouslyTyping = true;
        this.continuousTypingStartTime = Date.now();
        this.continuousTypingTimer = setInterval(() => {
            const now = Date.now();
            if (now - this.continuousTypingStartTime >= this.continuousTypingDuration) {
                this.autoSave();
                clearInterval(this.continuousTypingTimer);
                this.continuouslyTyping = false;
                this.continuousTypingStartTime = null;
                this.lastAutoSaveTime = now;
            }
            if (!this.continuouslyTyping) {
                clearInterval(this.continuousTypingTimer);
            }
        }, 1000);
    }

    hasUnsavedChanges() {
        const formData = new FormData(this.form);
        const dataObj = Object.fromEntries(formData.entries());
        dataObj.text_status = 'draft'; // Ensure text_status is set to 'draft'
        const currentData = JSON.stringify(dataObj);


        if (currentData !== this.lastSavedContent) {
            console.log('Differences:', this.getDifferences(this.lastSavedContent, currentData));
            return true;
        }
        console.log('No differences');
        return false;
    }

    getDifferences(lastData, currentData) {
        const lastObj = JSON.parse(lastData);
        const currentObj = JSON.parse(currentData);
        currentObj.text_status = 'draft';
    
        return Object.entries(currentObj).reduce((acc, [key, newValue]) => {
            const oldValue = lastObj[key];
            if (newValue !== oldValue) {
                acc[key] = { old: oldValue, new: newValue };
            }
            return acc;
        }, {});
    }

    autoSave() {
        if (this.hasUnsavedChanges()) {
            const formData = new FormData(this.form);
            const data = Object.fromEntries(formData.entries());
            data.text_status = 'draft';
            //console.log('this is the Data being sent:', data);

            fetch(`${this.path}text/autoSave`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            })
            .then(response => {
                if (!response.ok) {
                    return response.text().then(text => {
                        throw new Error(`HTTP error! status: ${response.status}, body: ${text}`);
                    });
                }
                return response.json();
            })
            .then(result => {
                if (result.success) {
                    console.log('Auto-save successful');
                    // Update lastSavedContent with the current form data
                    this.lastSavedContent = JSON.stringify(data);
                    this.lastAutoSaveTime = Date.now();

                    // Update the lastKeywords hidden input
                    const lastKeywordsInput = this.form.querySelector('[name="lastKeywords"]');
                    if (lastKeywordsInput) {
                        lastKeywordsInput.value = data.keywords;
                    }

                    // Only update the ID if it's not already set
                    let idInput = this.form.querySelector('[data-id]');
                    if (idInput && !idInput.value && result.textId) {
                        console.log('Updating ID:', result.textId);
                        idInput.value = result.textId;
                    }
                } else {
                    console.error('Auto-save failed:', result.message);
                }
                eventBus.emit('showToast', { 
                    message: result.toastMessage, 
                    type: result.toastType 
                });
            })
            .catch(error => {
                console.error('Auto-save error:', error);
                console.error('Full response:', error.message);
            });
        }
    }

    // Method to submit the form via AJAX
    // This is similar to autoSave, but it is for when the user clicks the save or publish button--publishing will close the form, so we need to redirect.
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
