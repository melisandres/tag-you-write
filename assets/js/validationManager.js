import { eventBus } from './eventBus.js';

export class ValidationManager {
    constructor() {
        this.form = null;
        this.formType = null;
        this.validationRules = {};

        // Listen for form initialization and input changes
        eventBus.on('formInitialized', this.initialize.bind(this));
        eventBus.on('inputChanged', this.validateInput.bind(this));
    }

    initialize(form) {
        this.form = form;
        this.formType = form.getAttribute('data-form-type');
        this.validationRules = this.getValidationRules();
    }

    getValidationRules() {
        switch (this.formType) {
            case 'writing':
                return {
                    'title': this.validateTitle,
                    'writing': this.validateWriting,
                    // Add more rules as needed
                };
            case 'login':
                return {
                    'username': this.validateUsername,
                    'password': this.validatePassword,
                    // Add more rules as needed
                };
            // Add more form types as needed
            default:
                return {};
        }
    }

    validateTitle(value) {
        if (!value || value.split(' ').length > 3) {
            return 'Title must be 3 words or less.';
        }
        return null;
    }

    validateWriting(value) {
        if (!value || value.split(' ').length > 50) {
            return 'Writing must be 50 words or less.';
        }
        return null;
    }

    validateUsername(value) {
        if (!value || value.length < 3) {
            return 'Username must be at least 3 characters long.';
        }
        return null;
    }

    validatePassword(value) {
        if (!value || value.length < 6) {
            return 'Password must be at least 6 characters long.';
        }
        return null;
    }

    validate() {
        const errors = [];
        for (const [inputName, validationFn] of Object.entries(this.validationRules)) {
            const input = this.form.querySelector(`[name="${inputName}"]`);
            if (input) {
                const error = validationFn(input.value);
                if (error) {
                    errors.push({ inputName, error });
                }
            }
        }
        return errors;
    }

    validateInput({ inputName, value }) {
        const validationFn = this.validationRules[inputName];
        if (validationFn) {
            const error = validationFn(value);
            eventBus.emit('validationResult', { inputName, error });
        }
    }

    isValid() {
        return this.validate().length === 0;
    }
}