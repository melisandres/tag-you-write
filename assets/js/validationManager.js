import { eventBus } from './eventBus.js';

export class ValidationManager {
    constructor() {
        eventBus.on('inputChanged', (data) => this.handleInputChanged(data));
        eventBus.on('formRestored', (formData) => this.handleFormRestored(formData));
        this.wordCountDisplayElement = document.querySelector('[data-word-count-display]');
        this.maxWords = 50;
        this.textElement = document.querySelector('textarea[name="writing"] , textarea[name="note"]');
        this.parentTextElement = document.querySelector('input[name="parentWriting"]');
        this.parentText = this.parentTextElement? this.parentTextElement.value : '';
        this.parentWordCount = this.parentText ? this.countWords(this.parentText) : 0;

        this.isFormValid = false;
        this.formValidity = {};

        this.lastValidationStatus = {};
        this.form = document.querySelector('#main-form');

        this.init();
    }

    init() {
        // if there's no form, don't do anything
        if (!this.form) return;
        const form = this.form;
        const activity = form.dataset.formActivity;
        if (this.textElement) this.updateWordCount(this.textElement.value);
        const formType = this.form.dataset.formType;

        // if you are initializing in editing mode, validate all the fields
        if (activity === 'editing') {
            this.formValidity = {};
            const visibleFields = this.form.querySelectorAll('input:not([type="hidden"]), textarea:not([type="hidden"])');
            visibleFields.forEach(field => {
                this.formValidity[field.name] = false;
                this.validateField({
                    fieldName: field.name,
                    fieldValue: field.value,
                    formType: this.form.dataset.formType,
                    init: true
                });
            });
            this.checkOverallValidity();
        } else if (activity === 'creating') {
            // if you are initializing in creating mode (a new form), autosave is allowed, publish is not-- but don't validate the fields, because they are still being filled out
            const visibleFields = form.querySelectorAll('input:not([type="hidden"]), textarea:not([type="hidden"])');
            visibleFields.forEach(field => {
                // keywords is a special case, because you should be able to publish without adding anything there. 
                if(field.name === 'keywords') {
                    this.formValidity[field.name] = { canAutosave: true, canPublish: true };
                }else{
                    this.formValidity[field.name] = { canAutosave: true, canPublish: false };
                }
            });

        } else {
            console.log('doing this thing')
            // there are other forms... like the signup form... 
            const visibleFields = form.querySelectorAll('input:not([type="hidden"]), textarea:not([type="hidden"])');
            visibleFields.forEach(field => {
                this.formValidity[field.name] = { canAutosave: false, canPublish: false };
            });
        }
    }

    // Add this new method
    handleFormRestored(formData) {
        console.log('Form restored, validating fields');
        if (!this.form) return;
        
        // Get all visible fields in the form
        const visibleFields = this.form.querySelectorAll('input:not([type="hidden"]), textarea:not([type="hidden"])');
        
        visibleFields.forEach(field => {
            this.validateField({
                fieldName: field.name,
                fieldValue: field.value,
                formType: this.form.dataset.formType,
                init: true
            });
        });
        
        // Check overall form validity after all fields are validated
        this.checkOverallValidity();
    }

    // inputChange is being fired by the formManager
    handleInputChanged(data) {
        //console.log('handleInputChanged', data);
        this.validateField(data);
        if (data.fieldName === 'writing' || data.fieldName === 'note') {
            this.updateWordCount(data.fieldValue);
        }
    }

    validateField({ fieldName, fieldValue, formType, init = false }) {
        console.log('Validating field:', fieldName, 'with value:', fieldValue, 'for form type:', formType);
        const validators = this.getValidatorsForForm(formType);
        
        if (validators[fieldName]) {
            console.log('Found validators for field:', fieldName);
            const validationResults = validators[fieldName].map((validator) => validator(fieldValue));
            console.log('Validation results:', validationResults);

            const criticalErrors = validationResults.filter(result => !result.isValid && result.severity === 'critical');
            const errors = validationResults.filter(result => !result.isValid && result.severity === 'error');
            const warnings = validationResults.filter(result => !result.isValid && result.severity === 'warning');
            const infos = validationResults.filter(result => result.severity === 'info');
            const successes = validationResults.filter(result => result.isValid && (result.severity === 'warning' || result.severity === 'info' || result.severity === 'success'));

            this.showValidationResult(fieldName, criticalErrors, errors, warnings, infos, successes);

            const canAutosave = criticalErrors.length === 0;
            const canPublish = criticalErrors.length === 0 && errors.length === 0;

            // Debug: Log final validity state
            console.log(`${fieldName} final validity:`, { canAutosave, canPublish });

            this.formValidity[fieldName] = { canAutosave, canPublish };

            // Always call checkOverallValidity, even during initialization
            if (!init) this.checkOverallValidity();
            
            return { canAutosave, canPublish }; 
        }
        
        if (fieldName === 'writing' || fieldName === 'note') {
            const parentText = this.parentTextElement ? this.parentTextElement.value : '';
            const parentWordCount = this.countWords(parentText);
            const userWordCount = this.countWords(fieldValue);
            const remainingWords = this.maxWords - (userWordCount - parentWordCount);

            let result;
            if (remainingWords < 0) {
                result = { 
                    isValid: false, 
                    message: `Word count exceeds the limit by ${-remainingWords} word${remainingWords !== -1 ? 's' : ''}`, 
                    severity: 'error' 
                };
            } else if (remainingWords <= 5) {
                result = {
                    isValid: true,
                    message: `You have ${remainingWords} word${remainingWords !== 1 ? 's' : ''} left`,
                    severity: 'warning'
                };
            } else {
                result = { isValid: true, message: '', severity: 'success' };
            }
            
            // TODO: this is not right: I need to further study this... but a result is not necessarily an "error"... this is sending every result as an error... I think. 
            this.showValidationResult(fieldName, [], [result], [], [], []);
            
            const canAutosave = result.severity !== 'critical';
            const canPublish = result.severity !== 'critical' && result.severity !== 'error';
            
            this.formValidity[fieldName] = { canAutosave, canPublish };
            
            // Always call checkOverallValidity, even during initialization
            if (!init) this.checkOverallValidity();
            
            return { canAutosave, canPublish };
        }

    }

    getValidatorsForForm(formType) {
        console.log('Getting validators for form type:', formType);
        // Strict validators are PUBLISHING: warnings on save
        const validators = {
            root: {
                title: [
                    this.validateRequired('front_val.root.title.required'),
                    this.validateMaxCharacterCount(100, 'front_val.root.title.max_char', 'critical'),
                    this.validateMaxCharacterCount(0, 'front_val.root.title.typed', 'info')
                ],
                writing: [
                    this.validateRequired('front_val.root.writing.required'),
                    this.validateMaxCharacterCount(0, 'front_val.root.writing.typed', 'info'),
                    this.validateMaxWordCount(0, 50, 'front_val.root.writing.max_word_count', 'front_val.root.writing.max_word_count_warning_threshold', 45),
                ], 
                prompt: [
                    this.validateMaxCharacterCount(0, 'front_val.root.prompt.typed', 'info'),
                    this.validateRequired('front_val.root.prompt.required'),
                    this.validateMaxWordCount(0, 100, 'front_val.root.prompt.max_word_count'),
                    this.validateMaxCharacterCount(500, 'front_val.root.prompt.max_character_count_critical', 'critical'),
                ], 
                keywords: [
                    this.validateMaxCharacterCount(0, 'front_val.root.keywords.typed', 'info'),
                    this.validateMaxKeywords(5, 'front_val.root.keywords.max_keywords'),
                    this.validateMaxCharacterCount(255, 'front_val.root.keywords.max_character_count'),
                    this.validateKeywordWordCount(2, 'front_val.root.keywords.keyword_word_count'),
                ],
                invitees: [
                    this.validateInvitees('front_val.root.invitees.invalid_format'),
                    this.validateMaxInvitees(10, 'front_val.root.invitees.max_invitees'),
                    this.validateMaxCharacterCount(0, 'front_val.root.invitees.typed', 'info')
                ]
            },
            iteration: {
                title: [
                    this.validateRequired('front_val.iteration.title.required'),
                    this.validateMaxWordCount(0, 3, 'front_val.iteration.title.typed'),
                    this.validateMaxCharacterCount(100, 'front_val.iteration.title.max_character_count_critical', 'critical'),
                    //this.validateUniqueTitle(titleArray, 'Title must be unique')
                ],
                writing: [
                    this.validateRequired('front_val.iteration.writing.required'),
                    this.validateMaxWordCount(this.parentWordCount, 50, 'front_val.iteration.writing.max_word_count', 'front_val.iteration.writing.max_word_count_warning_threshold', 45),
                    this.validateWritingChanges(this.parentText, 'front_val.iteration.writing.writing_changes')
                    ], 
                keywords: [
                    this.validateMaxCharacterCount(0, 'front_val.iteration.keywords.typed', 'info'),
                    this.validateMaxKeywords(5, 'front_val.iteration.keywords.max_keywords'),
                    this.validateMaxCharacterCount(255, 'front_val.iteration.keywords.max_character_count'),
                    this.validateKeywordWordCount(2, 'front_val.iteration.keywords.keyword_word_count'),
                ]
            },
            addingNote: {
                note: [
                    this.validateRequired('front_val.addingNote.note.required'),
                    this.validateMaxWordCount(0, 50, 'front_val.addingNote.note.max_word_count', 'front_val.addingNote.note.max_word_count_warning_threshold', 45),
                ]
            },
            login: {
                email: [
                    this.validateRequired('front_val.login.email.required'),
                    this.validateEmail('front_val.login.email.email')
                ],
                password: [
                    this.validateRequired('front_val.login.password.required'),
                    this.validateMaxCharacterCount(20, 'front_val.login.password.max_character_count'),
                    this.validateMinCharacterCount(6, 'front_val.login.password.min_character_count'),
                    this.validatePattern('alphanum', 'front_val.login.password.pattern'),   
                ]
            },
            forgotPassword: {
                email: [
                    this.validateRequired('front_val.forgotPassword.email.required'),
                    this.validateEmail('front_val.forgotPassword.email.email')
                ]
            },
            resetPassword: {
                password: [
                    this.validateRequired('front_val.resetPassword.password.required'),
                    this.validateMaxCharacterCount(20, 'front_val.resetPassword.password.max_character_count', 'critical'),
                    this.validateMinCharacterCount(6, 'front_val.resetPassword.password.min_character_count', 'critical'),
                    this.validatePattern('alphanum', 'front_val.resetPassword.password.pattern', 'critical'),   
                ]
            },
            writerCreate: {
                firstName: [
                    this.validateRequired('front_val.writerCreate.firstName.required'),
                    this.validateMaxCharacterCount(45, 'front_val.writerCreate.firstName.max_character_count', 'critical'),
                    this.validatePattern('words', 'front_val.writerCreate.firstName.pattern', 'critical'),
                ],
                lastName: [
                    this.validateRequired('front_val.writerCreate.lastName.required'),
                    this.validateMaxCharacterCount(45, 'front_val.writerCreate.lastName.max_character_count', 'critical'),
                    this.validatePattern('words', 'front_val.writerCreate.lastName.pattern', 'critical'),
                ],
                email: [
                    this.validateRequired('front_val.writerCreate.email.required'),
                    this.validateMaxCharacterCount(50, 'front_val.writerCreate.email.max_character_count', 'critical'),
                    this.validateEmail('front_val.writerCreate.email.email', 'critical'),
                ],
                birthday: [
                    this.validateDate('front_val.writerCreate.birthday.date', 'critical'),
                    this.validateRequired('front_val.writerCreate.birthday.required', 'critical')
                ],
                password: [
                    this.validateRequired('front_val.writerCreate.password.required', 'critical'),
                    this.validateMaxCharacterCount(20, 'front_val.writerCreate.password.max_character_count', 'critical'),
                    this.validateMinCharacterCount(6, 'front_val.writerCreate.password.min_character_count', 'critical'),
                    this.validatePattern('alphanum', 'front_val.writerCreate.password.pattern', 'critical'),
                ]
            }
        };

        console.log('Validators for form type', formType, ':', validators[formType] || 'No validators found');
        return validators[formType] || {};
    }

    // Required field validation
    validateRequired(errorMessage, severity = 'error') {
        return function (value) {
            const isValid = value && value.trim().length > 0;
            return {
                isValid: isValid,
                message: isValid ? '' : errorMessage,
                severity: severity
            };
        };
    }

/*     validateRequired(errorMessage, severity = 'error') {
        return function (value) {
            // Strip HTML before checking length
            const stripHtml = (text) => {
                const doc = new DOMParser().parseFromString(text, 'text/html');
                return doc.body.textContent || doc.body.innerText || '';
            };
            const strippedValue = stripHtml(value).trim();
            return {
                isValid: strippedValue.length > 0,
                message: strippedValue.length > 0 ? '' : errorMessage,
                severity: severity
            };
        };
    } */

    // Use arrow function to preserve 'this' context
    validateWritingChanges (parentText, errorMessage, severity = 'error') {
        return function (value) {
            return {
                isValid: value !== parentText,
                message: value !== parentText ? '' : errorMessage,
                severity: severity
            };
        };
    }

    validateMaxKeywords(maxCount, errorMessage, severity = 'error') {
        return function (value) {
            const keywordCount = value.trim().split(',').length;
            return {
                isValid: keywordCount <= maxCount,
                message: keywordCount <= maxCount ? '' : errorMessage,
                severity: severity
            };
        };
    }

    validateKeywordWordCount(maxWordsPerKeyword, errorMessage, severity = 'error') {
        return function (value) {
            const keywords = value.split(',').map(keyword => keyword.trim());
            const invalidKeywords = keywords.filter(keyword => {
                const wordCount = keyword.split(/\s+/).length;
                return wordCount > maxWordsPerKeyword && keyword.trim() !== '';
            });
    
            if (invalidKeywords.length > 0) {
                const invalidKeywordList = invalidKeywords.join(', ');
                return {
                    isValid: false,
                    // Return a structured message object instead of a string
                    message: {
                        key: errorMessage,
                        params: { invalidKeywords: invalidKeywordList }
                    },
                    severity: severity
                };
            }
    
            return { isValid: true, message: '', severity: 'success' };
        };
    }
            

    validateDate(errorMessage, severity = 'error') {
        return function (value) {
            const datePattern = /^\d{4}-\d{2}-\d{2}$/; 
            return {
                isValid: datePattern.test(value),
                message: datePattern.test(value) ? '' : errorMessage,
                severity: severity
            };
        };
    }

    // Max word count validation with intermediate feedback
    validateMaxWordCount(parentWordCount, maxCount, errorMessage, warningMessage, warningThreshold) {
        return function (value) {
            const totalWordCount = value.trim().split(/\s+/).length;
            const wordCount = totalWordCount - parentWordCount;
            
            if (wordCount > maxCount) {
                return { isValid: false, message: errorMessage, severity: 'error' };
            } else if (wordCount >= warningThreshold) {
                return { isValid: false, message: warningMessage, severity: 'warning' };
            } else {
                return { isValid: true, message: '', severity: 'info' };
            }
        };
    }

    // Uniqueness validation
    validateUniqueTitle(existingTitles, errorMessage, severity = 'error') {
        return function (value) {
            const isUnique = !existingTitles.includes(value.trim());
            return {
                isValid: isUnique,
                message: isUnique ? '' : errorMessage,
                severity: severity
            };
        };
    }

    //validate email
    validateEmail(errorMessage, severity = 'error') {
        return function (value) {
            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return {
                isValid: emailPattern.test(value),
                message: emailPattern.test(value) ? '' : errorMessage,
                severity: severity
            };
        };
    }

    validateMaxCharacterCount(maxCount, errorMessage, severity = 'error') {
        return function (value) {
            return {
                isValid: value.length <= maxCount,
                message: value.length <= maxCount ? '' : errorMessage,
                severity: severity
            };
        };
    }
    
    validateMinCharacterCount(minCount, errorMessage, severity = 'error') {
        return function (value) {
            return {
                isValid: value.length >= minCount,
                message: value.length >= minCount ? '' : errorMessage,
                severity: severity
            };
        };
    }

    validatePattern(patternName, errorMessage, severity = 'error') {
        const patterns = {
            words: /^[\p{L}\s]+$/u,
            alphanum: /^[a-zA-Z0-9]+$/,
            keywords: /^([\w\s]+)(, [\w\s]+)*$/
        };
        return function (value) {
            const isValid = patterns[patternName].test(value);
            return {
                isValid: isValid,
                message: isValid ? '' : errorMessage,
                severity: severity
            };
        };
    }

    validateInvitees(errorMessage, severity = 'error') {
        return function (value) {
            // If empty, that's valid (not required)
            if (!value || value.trim() === '') {
                return { isValid: true, message: '', severity: 'success' };
            }

            try {
                const invitees = JSON.parse(value);
                
                // Must be an array
                if (!Array.isArray(invitees)) {
                    return { isValid: false, message: errorMessage, severity: severity };
                }

                // Validate each invitee
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
                
                for (const invitee of invitees) {
                    if (!invitee.input || !invitee.type || !invitee.id) {
                        return { isValid: false, message: errorMessage, severity: severity };
                    }
                    
                    if (invitee.type === 'email' && !emailRegex.test(invitee.input)) {
                        return { isValid: false, message: errorMessage, severity: severity };
                    }
                    
                    if (invitee.type === 'username' && !usernameRegex.test(invitee.input)) {
                        return { isValid: false, message: errorMessage, severity: severity };
                    }
                }
                
                return { isValid: true, message: '', severity: 'success' };
                
            } catch (e) {
                return { isValid: false, message: errorMessage, severity: severity };
            }
        };
    }

    validateMaxInvitees(maxCount, errorMessage, severity = 'error') {
        return function (value) {
            // If empty, that's valid
            if (!value || value.trim() === '') {
                return { isValid: true, message: '', severity: 'success' };
            }

            try {
                const invitees = JSON.parse(value);
                const isValid = Array.isArray(invitees) && invitees.length <= maxCount;
                
                return {
                    isValid: isValid,
                    message: isValid ? '' : errorMessage,
                    severity: severity
                };
            } catch (e) {
                return { isValid: true, message: '', severity: 'success' }; // Let validateInvitees handle JSON errors
            }
        };
    }

    // Helper method to set feedback message with translation support
    setFeedbackMessage(feedback, messageObj) {
        const message = messageObj.message;
        
        // Check if the message is a structured object with key and params
        if (message && typeof message === 'object' && message.key) {
            // This is a structured message with parameters
            feedback.setAttribute('data-i18n', message.key);
            
            if (message.params) {
                feedback.setAttribute('data-i18n-params', JSON.stringify(message.params));
                feedback.setAttribute('data-i18n-html', 'true');
            }
            
            // Apply initial translation
            if (window.i18n) {
                const translatedBase = window.i18n.translate(message.key);
                
                // Replace parameters in the translated text
                let finalText = translatedBase;
                if (message.params) {
                    Object.entries(message.params).forEach(([key, value]) => {
                        finalText = finalText.replace(`{${key}}`, value);
                    });
                }
                
                feedback.textContent = finalText;

            } else {
                // Fallback if i18n is not available
                feedback.textContent = message.key;
            }
        }
        // Check if the message is a simple translation key
        else if (typeof message === 'string' && message.startsWith('front_val.')) {
            feedback.setAttribute('data-i18n', message);
            feedback.textContent = window.i18n ? window.i18n.translate(message) : message;
        } else {
            // Handle regular messages
            feedback.textContent = message;
        }
        
        // Add the appropriate class based on severity
        feedback.classList.add(messageObj.severity);
    }

    // Handle displaying the validation results
    showValidationResult(fieldName, criticalErrors, errors, warnings, infos, successes) {
        const field = document.querySelector(`[name="${fieldName}"]`);
        if (!field) return;

        // Get the parent label
        const labelElement = field.closest('label');
        
        // Remove any existing feedback elements
        const existingFeedbacks = labelElement.querySelectorAll('.feedback');
        existingFeedbacks.forEach(feedback => feedback.remove());

        // Create feedback element
        const feedback = document.createElement('div');
        feedback.className = 'feedback';

        // Set message and class based on validation results
        if (criticalErrors.length > 0 || errors.length > 0 || warnings.length > 0) {
            // Add has-feedback class to the label
            labelElement.classList.add('has-feedback');
            
            if (criticalErrors.length > 0) {
                this.setFeedbackMessage(feedback, criticalErrors[0]);
            } else if (errors.length > 0) {
                this.setFeedbackMessage(feedback, errors[0]);
            } else {
                this.setFeedbackMessage(feedback, warnings[0]);
            }
        } else {
            // Remove has-feedback class when there are no errors
            labelElement.classList.remove('has-feedback');
            
            if (infos.length > 0) {
                this.setFeedbackMessage(feedback, infos[0]);
            } else if (successes.length > 0) {
                this.setFeedbackMessage(feedback, successes[0]);
            }
        }

        // Find the target element for feedback insertion
        let targetElement = field;
        if (field.tagName === 'TEXTAREA' && field.style.display === 'none') {
            const editorElement = labelElement.querySelector('.ck-editor__editable');
            if (editorElement) {
                targetElement = editorElement;
            }
        }

        // Only insert feedback if there's a message
        if (feedback.textContent) {
            targetElement.parentNode.insertBefore(feedback, targetElement.nextSibling);
            
            // Now that the feedback element is in the DOM, we can update its translations
            if (window.i18n && window.i18n.updatePageTranslations) {
                // Use a small timeout to ensure the DOM has been updated
                setTimeout(() => {
                    window.i18n.updatePageTranslations(feedback.parentNode);
                }, 0);
            }
        }
    }

    // Update word count and display
    updateWordCount(userText) {
        if (!this.wordCountDisplayElement) return;
        const numberElement = this.wordCountDisplayElement.querySelector('.word-count-number');
        const tooltipElement = this.wordCountDisplayElement.querySelector('.word-count-tooltip');

        const userWordCount = this.countWords(userText);
        const remainingWords = this.maxWords - (userWordCount - this.parentWordCount);

        numberElement.textContent = remainingWords;
        numberElement.classList.toggle('positive', remainingWords > 0);
        numberElement.classList.toggle('negative', remainingWords < 0);
        
        // Prepare parameters for translation
        const params = {
            remainingWords: Math.abs(remainingWords),
            pluralization: Math.abs(remainingWords) !== 1 ? 's' : ''
        };
        
        // Set the appropriate translation key
        const translationKey = remainingWords >= 0 
            ? 'front_val.word_count.remaining' 
            : 'front_val.word_count.over';
        
        // Set data attributes for translation system
        tooltipElement.setAttribute('data-i18n', translationKey);
        tooltipElement.setAttribute('data-i18n-params', JSON.stringify(params));

        // Get the translation, for the tooltip
        window.i18n ? window.i18n.updatePageTranslations(tooltipElement.parentNode) : null;

        this.wordCountDisplayElement.classList.toggle('warning', remainingWords < 0);
    }

    // Count the number of words in a given text
    countWords(text) {
        return text.trim().split(/\s+/).filter(word => word.length > 0).length;
    }
   
    checkOverallValidity() {
        console.log('checking overall validity');
        const canAutosave = Object.values(this.formValidity).every(field => 
            field.canAutosave
        );
        const canPublish = Object.values(this.formValidity).every(field => 
            field.canPublish
        );

        const newValidationStatus = {
            canAutosave,
            canPublish,
            fields: this.formValidity
        };
        console.log('this.formValidity', this.formValidity);
        /* console.log('newValidationStatus', newValidationStatus); */

        // Check for changes in field validation status related to autosave
        const autoSaveFieldsChanged = !this.lastFieldValidityStatus || 
            JSON.stringify(this.getFailedAutoSaveFields(this.formValidity)) !== 
            JSON.stringify(this.getFailedAutoSaveFields(this.lastFieldValidityStatus || {}));
        
        // Emit field validation changes event if needed
        if (autoSaveFieldsChanged) {
            console.log('autoSaveFieldsChanged', autoSaveFieldsChanged);
            eventBus.emit('autoSaveFieldValidationChanged', {
                failedAutoSaveFields: this.getFailedAutoSaveFields(this.formValidity),
                fields: this.formValidity
            });
            this.lastFieldValidityStatus = {...this.formValidity};
        }

        // Only emit if there's a change in canAutosave or canPublish
        if (this.lastValidationStatus?.canAutosave !== canAutosave || 
            this.lastValidationStatus?.canPublish !== canPublish) {
            eventBus.emit('validationChanged', newValidationStatus);
            this.lastValidationStatus = newValidationStatus;
            //console.log('newValidationStatus', newValidationStatus);
        } else {
            //console.log('ValidationManager: No change in validation status, not emitting');
        }
    }

    // Helper method to get fields that fail autosave validation
    getFailedAutoSaveFields(validityStatus) {
        return Object.entries(validityStatus)
            .filter(([_, fieldStatus]) => !fieldStatus.canAutosave)
            .map(([fieldName, _]) => fieldName)
            .sort(); // Sort for consistent comparison
    }
}
