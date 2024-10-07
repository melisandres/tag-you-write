import { eventBus } from './eventBus.js';

export class ValidationManager {
    constructor() {
        eventBus.on('inputChanged', (data) => this.handleInputChanged(data));
        this.wordCountDisplayElement = document.querySelector('[data-wordCountDisplay]');
        this.maxWords = 50;
        this.textElement = document.querySelector('textarea[name="writing"] , textarea[name="note"]');
        this.parentTextElement = document.querySelector('input[name="parentWriting"]');
        this.parentText = this.parentTextElement? this.parentTextElement.value : '';
        this.parentWordCount = this.parentText ? this.countWords(this.parentText) : 0;

        this.isFormValid = false;
        this.formValidity = {};

        this.lastValidationStatus = {};

        this.init();
    }

    init() {
        // if there's no form, don't do anything
        if (!this.form) return;
        const form = document.querySelector('#main-form');
        const activity = form.dataset.formActivity;
        // if you are initializing in editing mode, validate all the fields
        if (activity === 'editing') {
            this.formValidity = {};
            const visibleFields = editingForm.querySelectorAll('input:not([type="hidden"]), textarea:not([type="hidden"])');
            visibleFields.forEach(field => {
                this.formValidity[field.name] = false;
                this.validateField({
                    fieldName: field.name,
                    fieldValue: field.value,
                    formType: editingForm.dataset.formType,
                    init: true
                });
            });
            this.updateWordCount(this.textElement.value);
            this.checkOverallValidity();
        } else if (activity === 'creating') {
            // if you are initializing in creating mode (a new form), autosave is allowed, publish is not-- but don't validate the fields, because they are still being filled out
            const visibleFields = form.querySelectorAll('input:not([type="hidden"]), textarea:not([type="hidden"])');
            visibleFields.forEach(field => {
                this.formValidity[field.name] = { canAutosave: true, canPublish: false };
            });

        }
        else {
            // there are other forms... like the signup form... 
            const visibleFields = form.querySelectorAll('input:not([type="hidden"]), textarea:not([type="hidden"])');
            visibleFields.forEach(field => {
                this.formValidity[field.name] = { canAutosave: false, canPublish: false };
            });
        }
    }

    // inputChange is being fired by the formManager
    handleInputChanged(data) {
        console.log('handleInputChanged', data);
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
            const warnings = validationResults.filter(result => result.severity === 'warning');
            const infos = validationResults.filter(result => result.severity === 'info');
            const successes = validationResults.filter(result => result.isValid && result.severity !== 'warning' && result.severity !== 'info');
    
            this.showValidationResult(fieldName, criticalErrors, errors, warnings, infos, successes);

            const canAutosave = criticalErrors.length === 0;
            const canPublish = criticalErrors.length === 0 && errors.length === 0;
    
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
                    this.validateRequired('Give it a name it will grow into'),
                    this.validateMaxCharacterCount(100, 'Titles must be 100 characters max', 'critical'),
                ],
                writing: [
                    this.validateRequired('You can\'t leave this empty--writing something is the whole point.'),
                    this.validateMaxWordCount(0, 50, 'Max 50 words', 'You\'re getting close to your max word count!', 45),
                    this.validateMaxCharacterCount(2500, 'Writing must be 2500 characters max', 'critical')
                ], 
                prompt: [
                    this.validateRequired('You can\'t leave this empty!'),
                    this.validateMaxWordCount(0, 100, 'Prompt must be 100 words max.'),
                    this.validateMaxCharacterCount(500, 'Prompt must be 500 characters max.', 'critical')
                ], 
                keywords: [
                    // TODO: the logic for checking commas
                    this.validateMaxKeywords(5, 'No more than 5 keywords--keywords are comma separated'),
                    this.validateMaxCharacterCount(255, 'Keywords must be 255 characters max'),
                    this.validateKeywordWordCount(2, 'Each keyword should be no more than 2 words.'),
                ]
            },
            iteration: {
                title: [
                    this.validateRequired('Describe your changes'),
                    this.validateMaxWordCount(0, 3, '3 words or less'),
                    this.validateMaxCharacterCount(100, 'Titles must be 100 characters max', 'critical'),
                    //this.validateUniqueTitle(titleArray, 'Title must be unique')
                ],
                writing: [
                    this.validateRequired('You can\'t leave this empty.'),
                    this.validateMaxWordCount(this.parentWordCount, 50, 'Max 50 words', 'You\'re getting close to the max word count!', 45),
                    this.validateWritingChanges(this.parentText, 'You haven\'t made any changes')
                    ], 
                keywords: [
                    this.validateMaxKeywords(5, 'No more than 5 keywords--keywords are comma separated'),
                    this.validateMaxCharacterCount(255, 'Keywords must be 255 characters max'),
                    this.validateKeywordWordCount(2, 'Each keyword should be no more than 2 words.'),
                ]
            },
            addingNote: {
                note: [
                    this.validateRequired('You can\'t leave this empty.'),
                    this.validateMaxWordCount(0, 50, '50 words max', 'Keep it short and sweet!', 45),
                ]
            },
            login: {
                email: [
                    this.validateRequired('Enter your username/email'),
                    this.validateEmail('Your username must be a valid email address')
                ],
                password: [
                    this.validateRequired('Enter your password')
                ]
            },
            writerCreate: {
                firstName: [
                    this.validateRequired('Enter your first name'),
                    this.validateMaxCharacterCount(45, 'First name must be 45 characters max'),
                    this.validatePattern('words', 'First name can only contain letters'),
                ],
                lastName: [
                    this.validateRequired('Enter your last name'),
                    this.validateMaxCharacterCount(45, 'Last name must be 45 characters max'),
                    this.validatePattern('words', 'Last name can only contain letters'),
                ],
                email: [
                    this.validateRequired('Enter your email'),
                    this.validateMaxCharacterCount(50, 'Email must be 50 characters max'),
                    this.validateEmail('Enter a valid email address'),
                ],
                birthday: [
                    this.validateDate('Your birthday must be a valid date'),
                    this.validateRequired('Enter your birthday')
                ],
                password: [
                    this.validateRequired('Enter your password'),
                    this.validateMaxCharacterCount(20, 'Password must be 20 characters max'),
                    this.validateMinCharacterCount(6, 'Password must be 6 characters min'),
                    this.validatePattern('alphanum', 'Password can only contain letters and numbers'),
                ]
            }
        };

        return validators[formType] || {};
    }

    // Required field validation
    validateRequired(errorMessage, severity = 'error') {
        return function (value) {
            return {
                isValid: value.trim().length > 0,
                message: value.trim().length > 0 ? '' : errorMessage,
                severity: severity
            };
        };
    }

    // Use arrow function to preserve 'this' context
    validateWritingChanges (parentText, errorMessage, severity = 'error') {
        return function (value) {
            console.log("this.parentText in validateWritingChanges", parentText);
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
            const datePattern = /^\d{2}\/\d{2}\/\d{4}$/;
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
            const wordCount = value.trim().split(/\s+/).length;
            return {
                isValid: wordCount >= minCount,
                message: wordCount >= minCount ? '' : errorMessage,
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
        let feedback = field.nextElementSibling; // Assuming feedback is next to the field
        // Create feedback element if it doesn't exist
        if (!feedback || feedback.className !== 'feedback') {
            feedback = document.createElement('div');
            feedback.className = 'feedback'; // Assign a class for styling
            field.parentNode.insertBefore(feedback, field.nextSibling); // Insert feedback after the field
        }

        if (criticalErrors.length > 0) {
            feedback.textContent = criticalErrors[0].message;
            feedback.style.color = 'red';
        } else if (errors.length > 0) {
            feedback.textContent = errors[0].message;
            feedback.style.color = 'darkred';
        } else if (warnings.length > 0) {
            feedback.textContent = warnings[0].message;
            feedback.style.color = 'hotpink';
        } else if (infos.length > 0) {
            feedback.textContent = infos[0].message;
            feedback.style.color = 'blue';
        } else if (successes.length > 0) {
            feedback.textContent = successes[0].message;
            feedback.style.color = 'green';
        } else {
            feedback.textContent = '';
        }
    }

    // Update word count and display
    updateWordCount(userText) {
        if (!this.wordCountDisplayElement) return;
/* 
        const parentWordCount = this.countWords(this.parentText); */
        //console.log('parentWordCount', parentWordCount);
        const userWordCount = this.countWords(userText);
        //console.log('userWordCount', userWordCount);

        const remainingWords = this.maxWords - (userWordCount - this.parentWordCount);
        console.log('remainingWords', remainingWords);
        if (remainingWords >= 0) {
            this.wordCountDisplayElement.textContent = `(add max ${remainingWords} word${remainingWords !== 1 ? 's' : ''})`;
        } else {
            this.wordCountDisplayElement.textContent = `(you are ${-remainingWords} word${remainingWords !== -1 ? 's' : ''} over the limit)`;
        }

        this.wordCountDisplayElement.classList.toggle('warning', remainingWords < 0);
    }

    // Count the number of words in a given text
    countWords(text) {
        return text.trim().split(/\s+/).filter(word => word.length > 0).length;
    }

    /* checkOverallValidity() {
        const canAutosave = Object.values(this.formValidity).every(field => 
            field.canAutosave
        );
        const canPublish = Object.values(this.formValidity).every(field => 
            field.canPublish
        );
    
        eventBus.emit('validationChanged', { canAutosave, canPublish });
    } */
   
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

        // Only emit if there's a change in canAutosave or canPublish
        // Only emit if there's a change in canAutosave or canPublish
        if (this.lastValidationStatus?.canAutosave !== canAutosave || 
            this.lastValidationStatus?.canPublish !== canPublish) {
            eventBus.emit('validationChanged', newValidationStatus);
            this.lastValidationStatus = newValidationStatus;
            console.log('newValidationStatus', newValidationStatus);
        } else {
            console.log('ValidationManager: No change in validation status, not emitting');
        }
    }

    
}
