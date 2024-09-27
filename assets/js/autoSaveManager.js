import { eventBus } from './eventBus.js';

export class AutoSaveManager {
    constructor(path) {
        this.path = path;
        this.form = document.querySelector('[data-form-type="writing"]');
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

    handleInputChange() {
        console.log('handleInputChange');
        this.lastTypedTime = Date.now();
        this.startAutoSaveTimer();

        if (!this.continuouslyTyping) {
            this.startContinuousTypingTimer();
        }
    }

    handleManualSave() {
        this.lastAutoSaveTime = Date.now();
        this.continuouslyTyping = false;
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
        // When you feel ready, you can replace the 5 lines above with this:
        // return currentData !== this.lastSavedContent;
    }

    // This is just for debugging
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
                    console.log('Auto-save successful');

                    // Update lastSavedContent with the current form data
                    this.lastSavedContent = JSON.stringify(data);
                    this.lastAutoSaveTime = Date.now();

                    // Only update the Id if it's not already set
                    let idInput = this.form.querySelector('[data-id]');
                    if (idInput && !idInput.value && result.textId) {
                        console.log('setting textId:', result.textId);
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
}