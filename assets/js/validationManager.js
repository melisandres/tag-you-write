import { eventBus } from './eventBus.js';

export class ValidationManager {
    constructor() {
        eventBus.on('inputChanged', (data) => this.handleInputChanged(data));
        this.wordCountDisplayElement = document.querySelector('[data-wordCountDisplay]');
        this.maxWords = 50;
        this.textElement = document.querySelector('textarea[name="writing"]');
        this.parentTextElement = document.querySelector('input[name="parentWriting"]');
    }

    handleInputChanged(data) {
        this.validateField(data);
        if (data.fieldName === 'writing') {
            this.updateWordCount(data.fieldValue);
        }
    }

    validateField({ fieldName, fieldValue, formType }) {
        console.log('validateField', fieldName, fieldValue, formType);
        const validators = this.getValidatorsForForm(formType);
        
        if (validators[fieldName]) {
            const validationResults = validators[fieldName].map((validator) => validator(fieldValue));
            
            // Process all validation results
            validationResults.forEach((result) => {
                this.showValidationResult(fieldName, result);
            });
        }
        
        if (fieldName === 'writing') {
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

    getValidatorsForForm(formType) {
        // A title array for checking uniquness...
        // const titleArray = ['existing title 1', 'existing title 2'];
        
        const validators = {
            root: {
                title: [
                    this.validateRequired('Give it a name it can grow into'),
                    this.validateMaxWordCount(3, 'Title must be 3 words or less', 'Title is close to max word count', 2),
                    //this.validateUniqueTitle(titleArray, 'Title must be unique')
                ],
                writing: [
                    this.validateRequired('You can\'t leave this empty.'),
                    this.validateMaxWordCount(50, 'Add 50 words', 'You\'re getting close to the max word count!', 45),
                ], 
                prompt: [
                    this.validateRequired('You can\'t leave this empty!'),
                ], 
                keywords: [
                    this.validateMaxWordCount(5, 'No more than 5 keywords'),
                ]
            },
            iteration: {
                title: [
                    this.validateRequired('Give it a name it can grow into'),
                    this.validateMaxWordCount(3, 'Title must be 3 words or less', 'Title is close to max word count', 2),
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
                writing: [
                    this.validateRequired('You can\'t leave this empty.'),
                    this.validateMaxWordCount(50, 'Add 50 words', 'You\'re getting close to the max word count!', 45),
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
            }
        };
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
    validateCharacterCount(maxCount, errorMessage) {
        return function (value) {
            return {
                isValid: value.trim().length <= maxCount,
                message: value.trim().length <= maxCount ? '' : errorMessage,
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
}
