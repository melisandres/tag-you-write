import { eventBus } from './eventBus.js';

export class AutoSaveManager {
    constructor(path) {
        this.path = path;
        this.form = document.querySelector('[data-form-type="root"], [data-form-type="iteration"]');

        // Initialize if you have a form that needs autosaving
        if (this.form) this.init();
    }

    //init
    init() {
        if (!this.form) return;
        
        this.formType = this.form.getAttribute('data-form-type');
        this.lastSavedContent = null;
        this.autoSaveTimer = null;
        this.lastTypedTime = Date.now();
        this.continuousTypingDuration = 30000; // 30 seconds
        this.typingPauseDuration = 4000; // 4 seconds
        this.continuouslyTyping = false;
        this.continuousTypingStartTime = null;
        this.lastAutoSaveTime = null;
        this.canAutosave = false; 

        // Listen for events
        eventBus.on('inputChanged', this.handleInputChange.bind(this));
        eventBus.on('manualSave', this.handleManualSave.bind(this));
        eventBus.on('validationChanged', this.handleValidationChanged.bind(this));
        eventBus.on('formRestored', this.handleFormRestored.bind(this));
    }

    handleFormRestored() {
        // Now check for changes and start timers if needed
        const hasChanges = this.hasUnsavedChanges();
        if (hasChanges) {
            this.startAutoSaveTimer();
            this.startContinuousTypingTimer();
        }
    }

    // Must check if validation fails for autosave
    handleValidationChanged(results) {
        this.canAutosave = results.canAutosave;
        console.log("can autosave:", this.canAutosave);

        if (!this.canAutosave) {
            const failedFields = Object.entries(results.fields)
                .filter(([_, fieldStatus]) => !fieldStatus.canAutosave)
                .map(([fieldName, _]) => fieldName);
            
            this.showFormWarning(failedFields);
        } else {
            this.removeFormWarning();
        }
    }

    showFormWarning(failedFields) {
        if (!this.warningElement) {
            this.warningElement = document.createElement('div');
            this.warningElement.className = 'form-warning';
        }
        
        const fieldSpans = failedFields.map(field => 
            `<span class="field-name">${field.replace(/[<>]/g, '')}</span>`
        );
        
        let message = 'Please fix ';
        if (fieldSpans.length === 1) {
            message += `the ${fieldSpans[0]} field`;
        } else if (fieldSpans.length === 2) {
            message += `the ${fieldSpans[0]} and ${fieldSpans[1]} fields`;
        } else {
            const lastField = fieldSpans.pop();
            message += `the ${fieldSpans.join(', ')}, and ${lastField} fields`;
        }
        message += ' to enable autosaving.';
        
        this.warningElement.textContent = ''; // Clear existing content
        const messageContainer = document.createElement('span');
        messageContainer.innerHTML = message;
        this.warningElement.appendChild(messageContainer);
        
        if (this.form && !this.form.contains(this.warningElement)) {
            this.form.insertBefore(this.warningElement, this.form.firstChild);
        }
    }

    removeFormWarning() {
        if (this.warningElement) {
            this.warningElement.remove();
            this.warningElement = null;
        }
        if (this.form && this.form.classList.contains('has-validation-errors')) {
            this.form.classList.remove('has-validation-errors');
        }
    }

    // When the page is refreshed, the lastSavedContent is set from localStorage
    setLastSavedContent(content) {
        this.lastSavedContent = typeof content === 'string' 
        ? JSON.parse(content) 
        : content;
        
        console.log('setLastSavedContent', this.lastSavedContent);
/*         // Check for unsaved changes immediately after setting last saved content
        if (this.form) {
            const hasChanges = this.hasUnsavedChanges();
            eventBus.emit('hasUnsavedChanges', hasChanges);
        } */
    }

    handleInputChange() {
        // You don't want this for adding notes, because it would autoPublish
        if (this.formType == 'root' || this.formType == 'iteration'){
            this.lastTypedTime = Date.now();
            this.startAutoSaveTimer();

            if (!this.continuouslyTyping) {
                this.startContinuousTypingTimer();
            }
            
            // Check for changes immediately
            this.hasUnsavedChanges();
        }
    }

    handleManualSave() {
        this.lastAutoSaveTime = Date.now();
        this.continuouslyTyping = false;
        this.lastSavedContent = JSON.stringify(Object.fromEntries(new FormData(this.form)));
        eventBus.emit('formUpdated');
        // Let the formButtonsUpdateManager know that there are no unsaved changes
        this.hasUnsavedChanges();
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
   
    hasUnsavedChanges() {
        const formData = this.form ? new FormData(this.form) : new FormData();
        const dataObj = Object.fromEntries(formData.entries());
        const currentData = JSON.stringify(dataObj);
    
        // Handle null lastSavedContent case
        if (this.lastSavedContent === null) {
            if (this.previousHasChangesState !== true) {
                this.previousHasChangesState = true;
                eventBus.emit('hasUnsavedChanges', true);
            }
            return true;
        }
    
        if (this.lastSavedContent) {
            const lastSavedString = typeof this.lastSavedContent === 'string' 
                ? this.lastSavedContent 
                : JSON.stringify(this.lastSavedContent);
                
            // Quick equality check first
            if (currentData === lastSavedString) {
                if (this.previousHasChangesState !== false) {
                    this.previousHasChangesState = false;
                    eventBus.emit('hasUnsavedChanges', false);
                }
                return false;
            }
                
            const differences = this.getDifferences(lastSavedString, currentData);
            const hasOnlyIdDifference = Object.keys(differences).length === 1 && differences.hasOwnProperty('id');
            
            const hasDifferences = Object.keys(differences).length > 0 
                && !hasOnlyIdDifference;
    
            // Only emit if the state has changed
            if (this.previousHasChangesState !== hasDifferences) {
                this.previousHasChangesState = hasDifferences;
                eventBus.emit('hasUnsavedChanges', hasDifferences);
            }
            
            return hasDifferences;
        }
        
        // Default case
        if (this.previousHasChangesState !== false) {
            this.previousHasChangesState = false;
            eventBus.emit('hasUnsavedChanges', false);
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
        if (this.hasUnsavedChanges() && this.canAutosave) {
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
                    // make sure the formButtonsUpdateManager knows there are unsaved changes
                    this.hasUnsavedChanges();
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
