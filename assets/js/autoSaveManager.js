import { eventBus } from './eventBus.js';

export class AutoSaveManager {
    constructor() {
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
        this.lastFailedFields = [];

        // Listen for events
        eventBus.on('inputChanged', this.handleInputChange.bind(this));
        eventBus.on('manualSave', this.handleManualSave.bind(this));
        eventBus.on('autoSaveFieldValidationChanged', this.handleFieldValidationChanged.bind(this));
        eventBus.on('validationChanged', this.handleValidationChanged.bind(this));
        eventBus.on('formRestored', this.handleFormRestored.bind(this));
    }

    handleFormRestored() {
        // Now check for changes and start timers if needed
        const hasChanges = this.hasUnsavedChanges();
        if (hasChanges) {
            eventBus.emit('hasUnsavedChanges', hasChanges);
            this.startAutoSaveTimer();
            this.startContinuousTypingTimer();
        }
    }

    // method to handle field validation changes
    handleFieldValidationChanged(data) {
        const failedFields = data.failedAutoSaveFields;
        
        // Update warning if failed fields have changed
        if (JSON.stringify(failedFields) !== JSON.stringify(this.lastFailedFields)) {
            this.lastFailedFields = failedFields;
            
            if (failedFields.length > 0) {
                this.showFormWarning(failedFields);
            } else {
                this.removeFormWarning();
            }
        }
    }

    // If validation allows/disallows autosave, make it so
    handleValidationChanged(results) {
        this.canAutosave = results.canAutosave;
    }

    showFormWarning(failedFields) {
        // Create warning element if it doesn't exist
        if (!this.warningElement) {
            this.warningElement = document.createElement('div');
            this.warningElement.className = 'form-warning';
        }
        
        // Format field names with spans that support i18n
        const fieldSpans = failedFields.map(field => {
            const sanitizedField = field.replace(/[<>]/g, '');
            const translation = window.i18n.translate(`form_field.${sanitizedField}`);
            return `<span class="field-name" data-i18n-inner="form_field.${sanitizedField}">${translation}</span>`;
        });
        
        // Clear previous content
        this.warningElement.innerHTML = '';
        
        // Helper function to create and append i18n spans
        const createI18nSpan = (key, params = null, isHtml = false) => {
            const span = document.createElement('span');
            span.setAttribute('data-i18n', key);
            
            if (params) {
                span.setAttribute('data-i18n-params', JSON.stringify(params));
            }
            
            if (isHtml) {
                span.setAttribute('data-i18n-html', 'true');
            }
            
            this.warningElement.appendChild(span);
            return span;
        };
        
        // Create the three parts of the message
        createI18nSpan('auto_save.fix_fields_intro');
        
        // Handle field part with different cases for singular/dual/plural
        if (fieldSpans.length === 1) {
            createI18nSpan('auto_save.field_singular', { field: fieldSpans[0] }, true);
        } else if (fieldSpans.length === 2) {
            createI18nSpan('auto_save.field_dual', { 
                field1: fieldSpans[0], 
                field2: fieldSpans[1] 
            }, true);
        } else {
            const lastField = fieldSpans.pop();
            createI18nSpan('auto_save.field_plural', { 
                fields: fieldSpans.join(', '), 
                lastField: lastField 
            }, true);
        }
        
        createI18nSpan('auto_save.fix_fields_outro');
        
        // Add to DOM if not already there
        if (this.form && !this.form.contains(this.warningElement)) {
            this.form.insertBefore(this.warningElement, this.form.firstChild);
        }
        
        // Apply translations - assuming i18n is available
        if (window.i18n) {
            window.i18n.updatePageTranslations(this.warningElement);
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
    setLastSavedContent(content, checkForChanges = true) {
        this.lastSavedContent = typeof content === 'string' 
            ? JSON.parse(content) 
            : content;
        
        //console.log('setLastSavedContent', this.lastSavedContent);
        // Check for unsaved changes immediately after setting last saved content
        //TODO: this was commented out... I don't know why. I needed to put it back
        // because it allows the save button to be availabel after a page refresh on a form that has unsaved changes. 
        if (this.form && checkForChanges) {
            const hasChanges = this.hasUnsavedChanges();
            eventBus.emit('hasUnsavedChanges', hasChanges);
        }
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
    
/*         console.log('hasUnsavedChanges check:', {
            currentData,
            lastSavedContent: this.lastSavedContent,
            isLastSavedNull: this.lastSavedContent === null
        }); */
        
        // Handle null lastSavedContent case
        if (this.lastSavedContent === null) {
            //console.log('lastSavedContent is null, returning true');
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
                
/*             console.log('Comparing:', {
                currentData,
                lastSavedString,
                areEqual: currentData === lastSavedString
            }); */

            // Quick equality check first
            if (currentData === lastSavedString) {
                //console.log('Data matches exactly, no changes');
                if (this.previousHasChangesState !== false) {
                    this.previousHasChangesState = false;
                    eventBus.emit('hasUnsavedChanges', false);
                }
                return false;
            }
                
            const differences = this.getDifferences(lastSavedString, currentData);
            //console.log('Differences found:', differences);

            const hasOnlyIdDifference = Object.keys(differences).length === 1 && differences.hasOwnProperty('id');
            const hasDifferences = Object.keys(differences).length > 0 && !hasOnlyIdDifference;

/*             console.log('Difference analysis:', {
                hasOnlyIdDifference,
                hasDifferences
            }); */

            if (this.previousHasChangesState !== hasDifferences) {
                this.previousHasChangesState = hasDifferences;
                eventBus.emit('hasUnsavedChanges', hasDifferences);
            }
            
            return hasDifferences;
        }
        
        // Default case
        //console.log('No lastSavedContent, returning false');
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
            const endpoint = 'text/autoSave';
            const url = window.i18n.createUrl(endpoint);

            fetch(url, {
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
                    // Update URL if this is the first save (ID was empty before)
                    let idInput = this.form.querySelector('[data-id]');
                    if (idInput && result.textId && !idInput.value) {
                        // Always use edit endpoint after first save - for both root and iterations
                        let newUrl = window.i18n.createUrl(`text/edit?id=${result.textId}`);
                        
                        // Update browser history without refreshing
                        window.history.replaceState({id: result.textId}, document.title, newUrl);
                    }

                    // First update the form inputs
                    this.updateFormInputs(formData, result);
                    // Change the data-form-activity attribute
                    this.form.setAttribute('data-form-activity', 'editing');

                    // Update lastSavedContent with the current form data
                    const currentFormData = new FormData(this.form);
                    this.lastSavedContent = JSON.stringify(Object.fromEntries(currentFormData));
                    this.lastAutoSaveTime = Date.now();

                    // Force a check for unsaved changes before emitting formUpdated
                    const hasChanges = this.hasUnsavedChanges();

                  
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

    // Helper method to update form inputs
    updateFormInputs(formData, result) {
        const lastKeywordsInput = this.form.querySelector('[name="lastKeywords"]');
        if (lastKeywordsInput) {
            lastKeywordsInput.value = formData.get('keywords');
        }

        let idInput = this.form.querySelector('[data-id]');
        if (idInput && !idInput.value && result.textId) {
            idInput.value = result.textId;
            //this.lastSavedContent.id = result.textId;
        }
    }
}
