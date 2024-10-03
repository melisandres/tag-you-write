import { eventBus } from './eventBus.js';

export class AutoSaveManager {
    constructor(path) {
        this.path = path;
        this.form = document.querySelector('[data-form-type="root"], [data-form-type="iteration"]');
        this.formType = this.form ? this.form.getAttribute('data-form-type') : null;
        this.lastSavedContent = this.form ? JSON.stringify(Object.fromEntries(new FormData(this.form))) : null;
        this.autoSaveTimer = null;
        this.lastTypedTime = Date.now();
        this.continuousTypingDuration = 30000; // 30 seconds
        this.typingPauseDuration = 4000; // 4 seconds
        this.continuouslyTyping = false;
        this.continuousTypingStartTime = null;
        this.lastAutoSaveTime = null;

        // Listen for input changes and manual saves
        eventBus.on('inputChanged', this.handleInputChange.bind(this));
        eventBus.on('manualSave', this.handleManualSave.bind(this));
    }

    // When the page is refreshed, the lastSavedContent is set from localStorage
    setLastSavedContent(content) {
        let savedState = JSON.parse(localStorage.getItem('pageState'));
        this.lastSavedContent = JSON.parse(savedState.formData);
        //if(this.lastSavedContent)this.lastSavedContent.text_status = 'draft';
    }

    handleInputChange() {
        // You don't want this for adding notes, because it would autoPublish
        if (this.formType == 'root' || this.formType == 'iteration'){
            this.lastTypedTime = Date.now();
            this.startAutoSaveTimer();

            if (!this.continuouslyTyping) {
                this.startContinuousTypingTimer();
            }
        }
    }

    handleManualSave() {
        this.lastAutoSaveTime = Date.now();
        this.continuouslyTyping = false;
        this.lastSavedContent = JSON.stringify(Object.fromEntries(new FormData(this.form)));
        eventBus.emit('formUpdated');
    }

    startAutoSaveTimer() {
        clearInterval(this.autoSaveTimer);
        this.autoSaveTimer = setInterval(() => {
            const now = Date.now();
            const timeSinceLastType = now - this.lastTypedTime;
            const timeSinceLastAutoSave = now - (this.lastAutoSaveTime || 0);

            if (timeSinceLastType >= this.typingPauseDuration) { 
                if(timeSinceLastAutoSave >= this.typingPauseDuration){
                    this.continuouslyTyping = false;
                    this.autoSave();
                }
                clearInterval(this.autoSaveTimer); // Clear the timer regardless of whether autoSave was called
            }
        }, 1000);
    }

    startContinuousTypingTimer() {
        clearInterval(this.continuousTypingTimer);
        this.continuouslyTyping = true;
        this.continuousTypingStartTime = Date.now();

        this.continuousTypingTimer = setInterval(() => {
            const now = Date.now();
            if (now - this.continuousTypingStartTime > this.continuousTypingDuration) {
                this.autoSave();
                this.continuouslyTyping = false;
            }
            if (!this.continuouslyTyping) {
                clearInterval(this.continuousTypingTimer);
            }
        }, 1000);
    }

    // Check for unsaved changes
    hasUnsavedChanges() {
        const formData = this.form ? new FormData(this.form) : new FormData();
        const dataObj = Object.fromEntries(formData.entries());
        const currentData = JSON.stringify(dataObj);
        //currentData.text_status = 'draft'; // Ensure text_status is always set to 'draft'

        // if there is a lastSavedContent...
        if (this.lastSavedContent && currentData) {
            const differences = this.getDifferences(this.lastSavedContent, currentData);
            console.log('line 89 differences:', differences);
            
            // Check if the only difference is the 'id' key
            // The id is set to shift the form from a store to an update
            const hasOnlyIdDifference = Object.keys(differences).length === 1 && differences.hasOwnProperty('id');
            
            if (hasOnlyIdDifference) {
                return false; // Treat as no unsaved changes
            }

            const hasDifferences = Object.keys(differences).length > 0;
            return hasDifferences;
        }else if(this.lastSavedContent == null){
            // When the page is refreshed the lastSavedContent is null, so we should assume that there are unsaved changes after either timer runs out, and get a new "lastSavedContent"
            return true;
        }
        return false;
    }

    // This is just for debugging
    getDifferences(lastData, currentData) {
        if (!lastData || !currentData) return {};
        // Convert lastData to JSON string if it's an object
        if (typeof lastData === 'object' && lastData !== null) {
            lastData = JSON.stringify(lastData);
        }

        const lastObj = JSON.parse(lastData);
        const currentObj = JSON.parse(currentData);
        //currentObj.text_status = 'draft';
    
        return Object.entries(currentObj).reduce((acc, [key, newValue]) => {
            const oldValue = lastObj[key];
            if (newValue !== oldValue) {
                acc[key] = { old: oldValue, new: newValue };
            }
            return acc;
        }, {});
    }

    // this is where the autoSave happens
    autoSave() {
        if (this.hasUnsavedChanges()) {
            const formData = new FormData(this.form);
            const data = Object.fromEntries(formData.entries());
            data.text_status = 'draft';

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
                    // Change the data-form-activity attribute
                    this.form.setAttribute('data-form-activity', 'editing');

                    //TODO: formUpdated could handle some of the logic below... however, manualSave does some extra stuff, and it emits formUpdated... so it might just be fine to keep the logic here and in manualsave. 

                    // Update the lastKeywords hidden input
                    const lastKeywordsInput = this.form.querySelector('[name="lastKeywords"]');
                    if (lastKeywordsInput) {
                        lastKeywordsInput.value = formData.get('keywords');
                        //this.lastSavedContent.keywords = formData.get('keywords');
                    }

                    // Only update the Id if it's not already set
                    let idInput = this.form.querySelector('[data-id]');
                    if (idInput && !idInput.value && result.textId) {
                        idInput.value = result.textId;
                        //this.lastSavedContent.id = result.textId;
                    }
                    // Update lastSavedContent with the current form data
                    this.lastSavedContent = JSON.stringify(data);
                    this.lastAutoSaveTime = Date.now();
                    eventBus.emit('formUpdated', result);
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
}