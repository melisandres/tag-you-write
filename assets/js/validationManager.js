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
        const validators = this.getValidatorsForForm(formType);
        
        if (validators[fieldName]) {
            const validationResults = validators[fieldName].map((validator) => validator(fieldValue));

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
        // Strict validators are PUBLISHING: warnings on save
        const validators = {
            root: {
                title: [
                    this.validateRequired('*a name for the text to grow into'),
                    this.validateMaxCharacterCount(100, '*100 characters max', 'critical'),
                    this.validateMaxCharacterCount(0, '*the title you choose will be carved in stone', 'info')
                ],
                writing: [
                    this.validateRequired('*don\'t be too precious...'),
                    this.validateMaxCharacterCount(0, '*whatever you write will be subject to iteration', 'info'),
                    this.validateMaxWordCount(0, 50, '*add 50 words max', '* nearing 50 words...', 45),
                ], 
                prompt: [
                    this.validateMaxCharacterCount(0, '*your prompt will be the yardstick for all iterations', 'info'),
                    this.validateRequired('*a prompt to steer all iterations'),
                    this.validateMaxCharacterCount(0, '*the prompt you choose will be carved in stone', 'info'),
                    this.validateMaxWordCount(0, 100, '*100 words max.'),
                    this.validateMaxCharacterCount(500, '*500 characters max.', 'critical'),
                ], 
                keywords: [
                    this.validateMaxCharacterCount(0, '*max 3 keywords, separated by commas please', 'info'),
                    this.validateMaxKeywords(5, '*5 keywords max--comma separated'),
                    this.validateMaxCharacterCount(255, '*255 characters max'),
                    this.validateKeywordWordCount(2, '*a keyword can be 2 words, but no more.'),
                ]
            },
            iteration: {
                title: [
                    this.validateRequired('*required'),
                    this.validateMaxWordCount(0, 3, '*3 words or less'),
                    this.validateMaxCharacterCount(100, '*100 characters max', 'critical'),
                    //this.validateUniqueTitle(titleArray, 'Title must be unique')
                ],
                writing: [
                    this.validateRequired('*required'),
                    this.validateMaxWordCount(this.parentWordCount, 50, '*add 50 words max', '* nearing 50 words...', 45),
                    this.validateWritingChanges(this.parentText, '*changes required')
                    ], 
                keywords: [
                    this.validateMaxCharacterCount(0, '*max 3 keywords, separated by commas please', 'info'),
                    this.validateMaxKeywords(5, '*5 keywords max--comma separated'),
                    this.validateMaxCharacterCount(255, '*255 characters max'),
                    this.validateKeywordWordCount(2, '*a keyword can be 2 words, but no more.'),
                ]
            },
            addingNote: {
                note: [
                    this.validateRequired('*required'),
                    this.validateMaxWordCount(0, 50, '*50 words max', '*nearing 50 words...', 45),
                ]
            },
            login: {
                email: [
                    this.validateRequired('*required'),
                    this.validateEmail('*must be a valid email address')
                ],
                password: [
                    this.validateRequired('*required')
                ]
            },
            writerCreate: {
                firstName: [
                    this.validateRequired('*required', 'critical'),
                    this.validateMaxCharacterCount(45, '*45 characters max', 'critical'),
                    this.validatePattern('words', '*only letters allowed', 'critical'),
                ],
                lastName: [
                    this.validateRequired('*required', 'critical'),
                    this.validateMaxCharacterCount(45, '*45 characters max', 'critical'),
                    this.validatePattern('words', '*only letters allowed', 'critical'),
                ],
                email: [
                    this.validateRequired('*required', 'critical'),
                    this.validateMaxCharacterCount(50, '*50 characters max', 'critical'),
                    this.validateEmail('*must be a valid email address', 'critical'),
                ],
                birthday: [
                    this.validateDate('*must be a valid date', 'critical'),
                    this.validateRequired('*required', 'critical')
                ],
                password: [
                    this.validateRequired('*required', 'critical'),
                    this.validateMaxCharacterCount(20, '*20 characters max', 'critical'),
                    this.validateMinCharacterCount(6, '*6 characters min', 'critical'),
                    this.validatePattern('alphanum', '*only letters and numbers allowed', 'critical'),
                ]
            }
        };

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
                return wordCount > maxWordsPerKeyword;
            });
    
            if (invalidKeywords.length > 0) {
                const invalidKeywordList = invalidKeywords.join(', ');
                return {
                    isValid: false,
                    message: `${errorMessage} Invalid keywords: ${invalidKeywordList}`,
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
            //TODO: is this keywords pattern correct? 
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
                feedback.textContent = criticalErrors[0].message;
                feedback.classList.add('critical');
            } else if (errors.length > 0) {
                feedback.textContent = errors[0].message;
                feedback.classList.add('error');
            } else {
                feedback.textContent = warnings[0].message;
                feedback.classList.add('warning');
            }
        } else {
            // Remove has-feedback class when there are no errors
            labelElement.classList.remove('has-feedback');
            
            if (infos.length > 0) {
                feedback.textContent = infos[0].message;
                feedback.classList.add('info');
            } else if (successes.length > 0) {
                feedback.textContent = successes[0].message;
                feedback.classList.add('success');
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
        
        if (remainingWords >= 0) {
            tooltipElement.textContent = `
                you can add ${remainingWords} more word${remainingWords !== 1 ? 's' : ''}`;
        } else {
            tooltipElement.textContent = `
                you are ${-remainingWords} word${remainingWords !== -1 ? 's' : ''} over the limit`;
        }

        this.wordCountDisplayElement.classList.toggle('warning', remainingWords < 0);
    }

    // Count the number of words in a given text
    countWords(text) {
        return text.trim().split(/\s+/).filter(word => word.length > 0).length;
    }
   
    checkOverallValidity() {
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
        /* console.log('newValidationStatus', newValidationStatus); */

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

    
}
