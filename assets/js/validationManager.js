import { eventBus } from './eventBus.js';

export class ValidationManager {
    constructor() {
        eventBus.on('inputChanged', (data) => this.handleInputChanged(data));
        this.wordCountDisplayElement = document.querySelector('[data-wordCountDisplay]');
        this.maxWords = 50;
        this.textElement = document.querySelector('textarea[name="writing"] , textarea[name="note"]');
        this.parentTextElement = document.querySelector('input[name="parentWriting"]');
        this.formValidity = {};
        this.isFormValid = false;
        this.init();
        this.defaultValidationLevel = "strict";
    }

    init() {
        const editingForm = document.querySelector('form[data-form-activity="editing"]');
        if (editingForm) {
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
        }
    }

    handleInputChanged(data) {
        this.validateField(data);
        if (data.fieldName === 'writing' || data.fieldName === 'note') {
            this.updateWordCount(data.fieldValue);
        }
    }

    validateField({ fieldName, fieldValue, formType, init = false, validationLevel = this.defaultValidationLevel }) {
        console.log('validateField', fieldName, fieldValue, formType, validationLevel);
        const validators = this.getValidatorsForForm(formType, validationLevel);
        
        if (validators[fieldName]) {
            const validationResults = validators[fieldName].map((validator) => validator(fieldValue));
            
            // Process all validation results
            validationResults.forEach((result) => {
                this.showValidationResult(fieldName, result);
            });
            
            const isFieldValid = validationResults.every(result => result.isValid);
            this.formValidity[fieldName] = isFieldValid;

            if (!init) {
                this.checkOverallValidity();
            }
        }
        
        if (fieldName === 'writing' || fieldName === 'note') {
            const parentText = this.parentTextElement ? this.parentTextElement.value : '';
            const parentWordCount = this.countWords(parentText);
            const userWordCount = this.countWords(fieldValue);
            const remainingWords = this.maxWords - (userWordCount - parentWordCount);

            if (remainingWords < 0) {
                this.showValidationResult(fieldName, { 
                    isValid: false, 
                    message: `Word count exceeds the limit by ${-remainingWords} word${remainingWords !== -1 ? 's' : ''}`, 
                    type: 'error' 
                });
            } else {
                this.showValidationResult(fieldName, { isValid: true, message: '', type: 'success' });
            }
        }
    }

    getValidatorsForForm(formType, validationLevel = 'strict') {
        const strictValidators = {
            root: {
                title: [
                    this.validateRequired('Give it a name it can grow into'),
                    this.validateMaxWordCount(3, 'Title must be 3 words or less'),
                ],
                writing: [
                    this.validateRequired('You can\'t leave this empty.'),
                    this.validateMaxWordCount(50, 'Add 50 words', 'You\'re getting close to your max word count!', 45),
                ], 
                prompt: [
                    this.validateRequired('You can\'t leave this empty!'),
                ], 
                keywords: [
                    // TODO: the logic for checking commas
                    this.validateMaxWordCount(5, 'No more than 5 keywords'),
                ]
            },
            iteration: {
                title: [
                    this.validateRequired('Describe your changes'),
                    this.validateMaxWordCount(3, '3 words or less'),
                    //this.validateUniqueTitle(titleArray, 'Title must be unique')
                ],
                writing: [
                    this.validateRequired('You can\'t leave this empty.'),
                    this.validateMaxWordCount(50, 'Add 50 words', 'You\'re getting close to the max word count!', 45),
                    ], 
                keywords: [
                    this.validateMaxWordCount(5, 'No more than 5 keywords'),
                ]
            },
            addingNote: {
                note: [
                    this.validateRequired('You can\'t leave this empty.'),
                    this.validateMaxWordCount(50, '50 words max', 'You can\'t possibly have that much to say!', 45),
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
                ],
                lastName: [
                    this.validateRequired('Enter your last name'),
                ],
                email: [
                    this.validateRequired('Enter your email'),
                ],
                birthday: [
                    this.validateRequired('Enter your birthday'),
                    this.validateDate('Your birthday must be a valid date'),
                ],
                password: [
                    this.validateRequired('Enter your password'),
                    this.validateCharacterCount(300, 8, 'Password must be between 8 and 300 characters long'),
                ]
            }
        };

        const looseValidators = {
            root: {
                title: [
                    this.validateCharacterCount(300, 0, 'title must be less than 300 characters'),
                ],
                writing: [
                    this.validateCharacterCount(300, 0, 'title must be less than 300 characters'),
                ], 
                prompt: [
                    this.validateCharacterCount(300, 0, 'title must be less than 300 characters'),
                ], 
                keywords: [
                    this.validateCharacterCount(300, 0, 'title must be less than 300 characters'),
                ]
            },
            iteration: {
                title: [
                    this.validateCharacterCount(300, 0, 'title must be less than 300 characters'),
                ],
                writing: [
                    this.validateCharacterCount(300, 0, 'title must be less than 300 characters'),
                    ], 
                keywords: [
                    this.validateCharacterCount(300, 0, 'title must be less than 300 characters'),
                ]
            },
            addingNote: {
                note: [
                    this.validateCharacterCount(300, 0, 'title must be less than 300 characters'),
                ]
            },
            login: {
                email: [
                    this.validateCharacterCount(300, 0, 'title must be less than 300 characters'),
                ],
                password: [
                    this.validateCharacterCount(300, 0, 'title must be less than 300 characters'),
                ]
            },
            writerCreate: {
                firstName: [
                    this.validateCharacterCount(300, 0, 'title must be less than 300 characters'),
                ],
                lastName: [
                    this.validateCharacterCount(300, 0, 'title must be less than 300 characters'),
                ],
                email: [
                    this.validateCharacterCount(300, 0, 'title must be less than 300 characters'),
                ],
                birthday: [

                ],
                password: [
                    this.validateCharacterCount(300, 0, 'title must be less than 300 characters'),
                ]
            }
        };

        const validators = validationLevel === 'strict' ? strictValidators : looseValidators;
        return validators[formType] || {};
    }

    // Required field validation
    validateRequired(errorMessage) {
        return function (value) {
            return {
                isValid: value.trim().length > 0,
                message: value.trim().length > 0 ? '' : errorMessage,
                type: 'error'
            };
        };
    }

    validateDate(errorMessage) {
        return function (value) {
            const datePattern = /^\d{2}\/\d{2}\/\d{4}$/;
            return {
                isValid: datePattern.test(value),
                message: datePattern.test(value) ? '' : errorMessage,
                type: 'error'
            };
        };
    }

    // Max word count validation with intermediate feedback
    validateMaxWordCount(maxCount, errorMessage, warningMessage, warningThreshold) {
        return function (value) {
            const wordCount = value.trim().split(/\s+/).length;
            
            if (wordCount > maxCount) {
                return { isValid: false, message: errorMessage, type: 'error' };
            } else if (wordCount >= warningThreshold) {
                return { isValid: true, message: warningMessage, type: 'warning' };
            } else {
                return { isValid: true, message: '', type: 'info' };
            }
        };
    }

    // Uniqueness validation
    validateUniqueTitle(existingTitles, errorMessage) {
        return function (value) {
            const isUnique = !existingTitles.includes(value.trim());
            return {
                isValid: isUnique,
                message: isUnique ? '' : errorMessage,
                type: 'error'
            };
        };
    }

    //validate email
    validateEmail(errorMessage) {
        return function (value) {
            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return {
                isValid: emailPattern.test(value),
                message: emailPattern.test(value) ? '' : errorMessage,
                type: 'error'
            };
        };
    }

    //validate character count
    validateCharacterCount(maxCount, minCount, errorMessage) {
        return function (value) {
            return {
                isValid: value.trim().length >= minCount && value.trim().length <= maxCount,
                message: value.trim().length >= minCount && value.trim().length <= maxCount ? '' : errorMessage,
                type: 'error'
            };
        };
    }   



    // Handle displaying the validation results
    showValidationResult(fieldName, result) {
        const field = document.querySelector(`[name="${fieldName}"]`);
        let feedback = field.nextElementSibling; // Assuming feedback is next to the field
        // Create feedback element if it doesn't exist
        if (!feedback || feedback.className !== 'feedback') {
            feedback = document.createElement('div');
            feedback.className = 'feedback'; // Assign a class for styling
            field.parentNode.insertBefore(feedback, field.nextSibling); // Insert feedback after the field
        }

        if (result.type === 'error') {
            feedback.textContent = result.message;
            feedback.style.color = 'red'; // Error message
        } else if (result.type === 'warning') {
            feedback.textContent = result.message;
            feedback.style.color = 'orange'; // Warning message
            // Optionally flash the background to give a visual cue
            field.style.backgroundColor = 'yellow';
            setTimeout(() => {
                field.style.backgroundColor = '';
            }, 200);
        } else {
            feedback.textContent = ''; // Clear feedback for valid fields
        }
    }

    // Update word count and display
    updateWordCount(userText) {
        if (!this.wordCountDisplayElement) return;

        const parentText = this.parentTextElement ? this.parentTextElement.value : '';
        const parentWordCount = this.countWords(parentText);
        const userWordCount = this.countWords(userText);

        const remainingWords = this.maxWords - (userWordCount - parentWordCount);

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

    checkOverallValidity() {
        const test = Object.values(this.formValidity);
        console.log(test);
        const newValidity = Object.values(this.formValidity).every(isValid => isValid);
        if (newValidity !== this.isFormValid) {
            this.isFormValid = newValidity;
            eventBus.emit('validationChanged', this.isFormValid);
        }
    }
}
