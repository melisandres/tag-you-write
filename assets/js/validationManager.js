import { eventBus } from './eventBus.js';

export class ValidationManager {
    constructor() {
        eventBus.on('inputChanged', (data) => this.handleInputChanged(data));
        eventBus.on('formRestored', (formData) => this.handleFormRestored(formData));
        
        // Listen for context changes from modals (e.g., contact modal opening/closing)
        eventBus.on('formContextChanged', (data) => {
            this.activeFormType = data.formType;
            console.log('ValidationManager: Context switched to', data.formType);
        });
        
        this.wordCountDisplayElement = document.querySelector('[data-word-count-display]');
        this.maxWords = 50;
        this.textElement = document.querySelector('textarea[name="writing"] , textarea[name="note"]');
        this.parentTextElement = document.querySelector('input[name="parentWriting"]');
        this.parentText = this.parentTextElement? this.parentTextElement.value : '';
        this.parentWordCount = this.parentText ? this.countWords(this.parentText) : 0;

        this.isFormValid = false;
        // Store validity per formType to support parallel forms (page forms + modal forms)
        this.formValidity = {}; // Structure: { formType: { fieldName: { canAutosave, canPublish } } }

        this.lastValidationStatus = {}; // Store last status per formType: { formType: { canAutosave, canPublish } }
        this.lastFieldValidityStatus = {}; // Store last field validity status per formType: { formType: { fieldName: {...} } }
        
        // Track which form is currently active (for context-based validation)
        this.activeFormType = null; // Track which form is currently active
        
        // Check for main page form first, then modal forms
        this.form = document.querySelector('#main-form') || 
                    document.querySelector('[data-modal-form-type]');

        this.init();
    }

    init() {
        // if there's no form, don't do anything
        if (!this.form) return;
        const form = this.form;
        const activity = form.dataset.formActivity;
        if (this.textElement) this.updateWordCount(this.textElement.value);
        // Get formType from either data-form-type (page forms) or data-modal-form-type (modal forms)
        const formType = this.form.getAttribute('data-form-type') || 
                        this.form.getAttribute('data-modal-form-type');

        // Set initial activeFormType if form exists and not already set
        if (formType && !this.activeFormType) {
            this.activeFormType = formType;
        }

        // Initialize form validity for this formType if it doesn't exist
        if (!this.formValidity[formType]) {
            this.formValidity[formType] = {};
        }

        // if you are initializing in editing mode, validate all the fields
        if (activity === 'editing') {
            // Ensure formType structure exists (don't reset entire formValidity)
            if (!this.formValidity[formType]) {
                this.formValidity[formType] = {};
            }
            const visibleFields = this.form.querySelectorAll('input:not([type="hidden"]):not([data-ui-helper]), textarea:not([type="hidden"])');
            visibleFields.forEach(field => {
                this.formValidity[formType][field.name] = false;
                this.validateField({
                    fieldName: field.name,
                    fieldValue: field.value,
                    formType: formType,
                    init: true
                });
            });
            this.checkOverallValidity();
        } else if (activity === 'creating') {
            // if you are initializing in creating mode (a new form), autosave is allowed, publish is not-- but don't validate the fields, because they are still being filled out
            const visibleFields = form.querySelectorAll('input:not([type="hidden"]):not([data-ui-helper]), textarea:not([type="hidden"])');
            visibleFields.forEach(field => {
                // keywords is a special case, because you should be able to publish without adding anything there. 
                if(field.name === 'keywords') {
                    this.formValidity[formType][field.name] = { canAutosave: true, canPublish: true };
                }else{
                    this.formValidity[formType][field.name] = { canAutosave: true, canPublish: false };
                }
            });

        } else {
            console.log('doing this thing')
            // there are other forms... like the signup form... 
            const visibleFields = form.querySelectorAll('input:not([type="hidden"]):not([data-ui-helper]), textarea:not([type="hidden"])');
            visibleFields.forEach(field => {
                this.formValidity[formType][field.name] = { canAutosave: false, canPublish: false };
            });
        }
    }

    // Add this new method
    handleFormRestored(formData) {
        console.log('Form restored, validating fields');
        if (!this.form) return;
        
        // Get formType from form attributes (same as in init())
        const formType = this.form.getAttribute('data-form-type') || 
                        this.form.getAttribute('data-modal-form-type');
        
        if (!formType) {
            console.warn('ValidationManager: Cannot determine formType for handleFormRestored');
            return;
        }
        
        // Initialize formValidity for this formType if it doesn't exist
        if (!this.formValidity[formType]) {
            this.formValidity[formType] = {};
        }
        
        // Get all visible fields in the form
        const visibleFields = this.form.querySelectorAll('input:not([type="hidden"]):not([data-ui-helper]), textarea:not([type="hidden"])');
        
        visibleFields.forEach(field => {
            this.validateField({
                fieldName: field.name,
                fieldValue: field.value,
                formType: formType,
                init: true
            });
        });
        
        // Check overall form validity after all fields are validated
        this.checkOverallValidity(formType);
    }

    // inputChange is being fired by the formManager
    handleInputChanged(data) {
        // If activeFormType is set, only validate active form
        // If not set (backwards compatibility), validate any form
        if (this.activeFormType && this.activeFormType !== data.formType) {
            console.log('ValidationManager: Ignoring input from inactive form', data.formType);
            return;
        }
        
        this.validateField(data);
        if (data.fieldName === 'writing' || data.fieldName === 'note') {
            this.updateWordCount(data.fieldValue);
        }
    }

    /**
     * Get dependent fields that should be re-validated when this field changes
     */
    getDependentFields(fieldName, formType) {
        const fieldDependencies = {
            root: {
                'visible_to_all': ['invitees', 'joinable_by_all'],
                'joinable_by_all': ['invitees']
            },
            contact: {
                'subject': ['subject_other'] // When subject changes, re-validate subject_other
            }
        };

        return fieldDependencies[formType]?.[fieldName] || [];
    }

    validateField({ fieldName, fieldValue, formType, init = false}) {
        console.log('Validating field:', fieldName, 'with value:', fieldValue, 'for form type:', formType);
        
        // Initialize formValidity for this formType if it doesn't exist
        if (!this.formValidity[formType]) {
            this.formValidity[formType] = {};
        }
        
        const validators = this.getValidatorsForForm(formType);
        
        // Validate the main field
        if (validators[fieldName]) {
            console.log('Found validators for field:', fieldName);
            const validationResults = validators[fieldName].map((validator) => validator(fieldValue));
            console.log('Validation results:', validationResults);

            const criticalErrors = validationResults.filter(result => !result.isValid && result.severity === 'critical');
            const errors = validationResults.filter(result => !result.isValid && result.severity === 'error');
            const warnings = validationResults.filter(result => !result.isValid && result.severity === 'warning');
            const infos = validationResults.filter(result => result.severity === 'info');
            const successes = validationResults.filter(result => result.isValid && (result.severity === 'warning' || result.severity === 'info' || result.severity === 'success'));

            this.showValidationResult(fieldName, criticalErrors, errors, warnings, infos, successes, formType);

            const canAutosave = criticalErrors.length === 0;
            const canPublish = criticalErrors.length === 0 && errors.length === 0;

            // Debug: Log final validity state
            console.log(`${fieldName} final validity:`, { canAutosave, canPublish });

            // Store validity per formType
            this.formValidity[formType][fieldName] = { canAutosave, canPublish };
        }

        // Validate dependent fields automatically (only for non-init calls to prevent recursion)
        if (!init) {
            const dependentFields = this.getDependentFields(fieldName, formType);
            dependentFields.forEach(dependentField => {
                console.log(`Auto-validating dependent field: ${dependentField}`);
                const dependentFieldElement = document.querySelector(`[name="${dependentField}"]`);
                
                if (dependentFieldElement) {
                    // Trigger validation through the event system to get proper field value
/*                     eventBus.emit('inputChanged', {
                        fieldName: dependentField,
                        fieldValue: dependentFieldElement.value,
                        formType: formType,
                        init: true // Prevent infinite dependency loops
                    }); */

                    this.validateField({
                        fieldName: dependentField,
                        fieldValue: dependentFieldElement.value,
                        formType: formType,
                        init: true
                    });
                }
            });
        }

        // Always call checkOverallValidity, even during initialization
        if (!init) this.checkOverallValidity(formType);
        
        // Return validity from formType structure
        return this.formValidity[formType]?.[fieldName] || { canAutosave: true, canPublish: true }; 
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
                    this.validateMaxInvitees(10, 'front_val.root.invitees.max_invitees'),
                    this.validateInvitees('front_val.root.invitees.invalid_format'),
                    this.validateMaxCharacterCount(0, 'front_val.root.invitees.typed', 'info'),
                    this.validateInviteesRequired('front_val.root.invitees.required_when_access_limited')
                ],
                visible_to_all: [
                    this.validateBooleanValue('front_val.root.visible_to_all.invalid_value')
                ],
                joinable_by_all: [
                    this.validateBooleanValue('front_val.root.joinable_by_all.invalid_value'),
                    this.validateJoinabilityDependsOnVisibility('front_val.root.joinable_by_all.must_follow_visibility')
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
            },
            contact: {
                email: [
                    this.validateRequired('front_val.contact.email.required', 'error'),
                    this.validateEmail('front_val.contact.email.email', 'error'),
                    this.validateMaxCharacterCount(255, 'front_val.contact.email.max_character_count', 'error')
                ],
                subject: [
                    this.validateRequired('front_val.contact.subject.required', 'error')
                ],
                subject_other: [
                    this.validateConditionalRequired('subject', 'other', 'front_val.contact.subject_other.required', 'error'),
                    this.validateMaxCharacterCount(200, 'front_val.contact.subject_other.max_character_count', 'error')
                ],
                message: [
                    this.validateRequired('front_val.contact.message.required', 'error'),
                    this.validateMinCharacterCount(10, 'front_val.contact.message.min_character_count', 'error'),
                    this.validateMaxCharacterCount(5000, 'front_val.contact.message.max_character_count', 'error')
                ]
            }
        };

        //console.log('Validators for form type', formType, ':', validators[formType] || 'No validators found');
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

    // Conditional required validation - only required when another field has a specific value
    validateConditionalRequired(triggerFieldName, triggerValue, errorMessage, severity = 'error') {
        return (value) => {
            // Find the trigger field to check its value
            const triggerField = document.querySelector(`[name="${triggerFieldName}"][data-modal-form-type="contact"]`) ||
                                document.querySelector(`#contact-${triggerFieldName}`);
            
            // If trigger field doesn't have the required value, this field is not required (always valid)
            if (!triggerField || triggerField.value !== triggerValue) {
                return {
                    isValid: true,
                    message: '',
                    severity: severity
                };
            }
            
            // Trigger field has the required value, so this field is required
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

    /**
     * Strip HTML tags and entities from text for character counting
     * @param {string} text - Text that may contain HTML
     * @returns {string} - Plain text with HTML removed
     */
    stripHtmlForCounting(text) {
        if (!text) return '';
        // Create a temporary DOM element to parse HTML
        const doc = new DOMParser().parseFromString(text, 'text/html');
        // Get text content (automatically strips HTML tags)
        let plainText = doc.body.textContent || doc.body.innerText || '';
        // Replace HTML entities like &nbsp; with spaces, then normalize whitespace
        plainText = plainText.replace(/\u00A0/g, ' '); // Replace non-breaking spaces
        plainText = plainText.replace(/\s+/g, ' '); // Normalize whitespace
        return plainText.trim();
    }

    validateMaxCharacterCount(maxCount, errorMessage, severity = 'error') {
        return (value) => {
            // Strip HTML for accurate character counting (important for WYSIWYG content)
            const plainText = this.stripHtmlForCounting(value);
            return {
                isValid: plainText.length <= maxCount,
                message: plainText.length <= maxCount ? '' : errorMessage,
                severity: severity
            };
        };
    }
    
    validateMinCharacterCount(minCount, errorMessage, severity = 'error') {
        return (value) => {
            // Strip HTML for accurate character counting (important for WYSIWYG content)
            const plainText = this.stripHtmlForCounting(value);
            return {
                isValid: plainText.length >= minCount,
                message: plainText.length >= minCount ? '' : errorMessage,
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

    validateBooleanValue(errorMessage, severity = 'error') {
        return function (value) {
            // Accept "0", "1", 0, 1, true, false, or empty string (default to valid)
            const stringValue = String(value).trim();
            const isValid = stringValue === '' || stringValue === '0' || stringValue === '1';
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

                // Validate each invitee and add validation status
                // Use the same email regex as validateEmail method
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                // Updated regex to accept "firstName lastName" format with Unicode letters (including accents)
                const usernameRegex = /^[\p{L}]+\s[\p{L}]+$/u;
                
                let hasErrors = false;
                const validatedInvitees = [];
                
                for (const invitee of invitees) {
                    // Create a copy with validation status
                    const validatedInvitee = { ...invitee };
                    
                    // Validate structure
                    if (!invitee.input || !invitee.type) {
                        validatedInvitee.validationStatus = {
                            isValid: false,
                            errorType: 'structure',
                            message: 'Invalid invitee format'
                        };
                        hasErrors = true;
                    }
                    // Validate email format
                    else if (invitee.type === 'email' && !emailRegex.test(invitee.input)) {
                        validatedInvitee.validationStatus = {
                            isValid: false,
                            errorType: 'email_format',
                            message: 'Invalid email format'
                        };
                        hasErrors = true;
                    }
                    // For usernames with ID (selected from list), they're automatically valid
                    else if (invitee.type === 'username' && invitee.userId) {
                        validatedInvitee.validationStatus = {
                            isValid: true,
                            message: 'Valid user selected'
                        };
                    }
                    // For usernames without ID, check if they match someone in available users (recent collaborators + search results)
                    else if (invitee.type === 'username' && !invitee.userId) {
                        // Try to auto-select from all available users (recent collaborators + search results)
                        const recentCollaboratorsManager = window.recentCollaboratorsManagerInstance;
                        if (recentCollaboratorsManager && typeof recentCollaboratorsManager.getAllUsers === 'function') {
                            const allAvailableUsers = recentCollaboratorsManager.getAllUsers();
                            const matchingUser = allAvailableUsers.find(
                                user => user.fullName.toLowerCase() === invitee.input.toLowerCase()
                            );
                            
                            if (matchingUser) {
                                // Auto-populate the userId
                                validatedInvitee.userId = matchingUser.id;
                                
                                // Determine source for better messaging
                                const isFromRecentCollaborators = recentCollaboratorsManager.collaborators.some(
                                    collab => collab.id === matchingUser.id
                                );
                                const sourceMessage = isFromRecentCollaborators ? 
                                    'Auto-selected from recent collaborators' : 
                                    'Auto-selected from search results';
                                
                                validatedInvitee.validationStatus = {
                                    isValid: true,
                                    message: sourceMessage
                                };
                            } else {
                                // Check format first, then show user not found
                                if (!usernameRegex.test(invitee.input)) {
                                    validatedInvitee.validationStatus = {
                                        isValid: false,
                                        errorType: 'username_format',
                                        message: 'Username must be in "firstName lastName" format'
                                    };
                                } else {
                                    validatedInvitee.validationStatus = {
                                        isValid: false,
                                        errorType: 'user_not_found',
                                        message: 'User not found. Please search and select from suggestions.'
                                    };
                                }
                                hasErrors = true;
                            }
                        } else {
                            // Fallback to legacy validation if enhanced search not available
                            if (!usernameRegex.test(invitee.input)) {
                                validatedInvitee.validationStatus = {
                                    isValid: false,
                                    errorType: 'username_format',
                                    message: 'Username must be in "firstName lastName" format'
                                };
                            } else {
                                validatedInvitee.validationStatus = {
                                    isValid: false,
                                    errorType: 'user_not_found',
                                    message: 'User not found. Please search and select from suggestions.'
                                };
                            }
                            hasErrors = true;
                        }
                    }
                    // Valid invitee (email with valid format)
                    else {
                        validatedInvitee.validationStatus = {
                            isValid: true,
                            message: 'Valid'
                        };
                    }
                    
                    validatedInvitees.push(validatedInvitee);
                }
                
                // Emit event to trigger a complete re-render with validation status
                // This becomes the single source of truth for invitee rendering
                eventBus.emit('renderInviteesWithValidation', {
                    invitees: validatedInvitees,
                    hasErrors: hasErrors
                });
                
                // Return aggregate result (existing behavior preserved)
                return {
                    isValid: !hasErrors,
                    message: hasErrors ? errorMessage : '',
                    severity: hasErrors ? severity : 'success'
                };
                
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
                    severity: isValid ? 'success' : severity
                };
            } catch (e) {
                return { isValid: true, message: '', severity: 'success' }; // Let validateInvitees handle JSON errors
            }
        };
    }

    /**
     * Validate that invitees are provided when access is limited to invitees only
     * This prevents publishing when visibility or joinability is limited but no invitees exist
     */
    validateInviteesRequired(errorMessage, severity = 'error') {
        const form = this.form; // Capture form reference in closure
        
        return function (value) {
            if (!form) return { isValid: true, message: '', severity: 'success' };

            const visibilityInput = form.querySelector('input[name="visible_to_all"]');
            const joinabilityInput = form.querySelector('input[name="joinable_by_all"]');

            if (!visibilityInput || !joinabilityInput) {
                return { isValid: true, message: '', severity: 'success' };
            }

            const visibilityValue = visibilityInput.value; // "0" = invitees only, "1" = all users
            const joinabilityValue = joinabilityInput.value; // "0" = invitees only, "1" = all users

            // Check if either visibility or joinability is limited to invitees
            const isVisibilityLimited = visibilityValue === '0';
            const isJoinabilityLimited = joinabilityValue === '0';
            const accessIsLimited = isVisibilityLimited || isJoinabilityLimited;

            if (!accessIsLimited) {
                return { isValid: true, message: '', severity: 'success' };
            }

            // Check if there are any invitees
            let hasInvitees = false;
            if (value && value.trim() !== '') {
                try {
                    const invitees = JSON.parse(value);
                    hasInvitees = Array.isArray(invitees) && invitees.length > 0;
                } catch (e) {
                    hasInvitees = false;
                }
            }

            if (accessIsLimited && !hasInvitees) {
                return {
                    isValid: false,
                    message: errorMessage,
                    severity: severity
                };
            }

            return { isValid: true, message: '', severity: 'success' };
        };
    }

    /**
     * Validate that joinability follows visibility constraints
     * If visibility is limited to invitees (0), then joinability must also be limited to invitees (0)
     */
    validateJoinabilityDependsOnVisibility(errorMessage, severity = 'error') {
        const form = this.form; // Capture form reference in closure
        
        return function (value) {
            if (!form) return { isValid: true, message: '', severity: 'success' };

            const visibilityInput = form.querySelector('input[name="visible_to_all"]');
            
            if (!visibilityInput) {
                return { isValid: true, message: '', severity: 'success' };
            }

            const visibilityValue = visibilityInput.value; // "0" = invitees only, "1" = all users
            const joinabilityValue = value; // Current field value being validated

            // If visibility is limited to invitees (0), joinability must also be limited to invitees (0)
            if (visibilityValue === '0' && joinabilityValue !== '0') {
                return {
                    isValid: false,
                    message: errorMessage,
                    severity: severity
                };
            }

            return { isValid: true, message: '', severity: 'success' };
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

    /**
     * Validate a single username - can be enhanced for API validation
     * @param {string} username - The username to validate
     * @returns {Promise<Object>} - Validation result with async support
     */
    async validateUsername(username) {
        // Phase 1: Basic format validation (firstName lastName format)
        const usernameRegex = /^[a-zA-Z]+\s[a-zA-Z]+$/;
        
        if (!usernameRegex.test(username)) {
            return {
                isValid: false,
                errorType: 'username_format',
                message: 'Username must be in "firstName lastName" format'
            };
        }
        
        // Phase 2: API validation (future enhancement)
        // TODO: Add API call here to check:
        // - Does user exist?
        // - Is user in same age/school group?
        // - Has user opted into collaboration?
        
        // For now, assume valid if format is correct
        return {
            isValid: true,
            message: 'Valid username format'
        };
    }

    // Extract display target logic into separate method
    getDisplayTarget(fieldName, field) {
        // First check if there's a UI helper (custom form component)
        const uiHelper = field.closest('label')?.querySelector('[data-ui-helper="true"]');
        if (uiHelper) {
            const labelElement = uiHelper.closest('label');
                        // Look for a custom display container or fall back to the UI helper itself
            const displayContainer = labelElement?.querySelector(`#${fieldName}-display`) || uiHelper;
            return { labelElement, targetElement: displayContainer };
        }

        // Second, check if this is a CKEditor field (hidden textarea with .ck-editor)
        if (field.tagName === 'TEXTAREA' && field.style.display === 'none') {
            const labelElement = field.closest('label');
            const editorElement = labelElement?.querySelector('.ck-editor__editable');
            if (editorElement) {
                return { labelElement, targetElement: editorElement };
            }
        }

        // Default logic for standard fields (input, select, etc.)
        const labelElement = field.closest('label');
        const targetElement = field;

        return { labelElement, targetElement };
    }

    // Handle displaying the validation results
    showValidationResult(fieldName, criticalErrors, errors, warnings, infos, successes, formType = null) {
        // Scope field query to the specific form to avoid conflicts when multiple forms have fields with the same name
        let field = null;
        if (formType) {
            // Try to find the form first based on formType
            const modalForm = document.querySelector(`[data-modal-form-type="${formType}"]`);
            const pageForm = document.querySelector(`#main-form[data-form-type="${formType}"]`);
            const formElement = modalForm || pageForm;
            
            if (formElement) {
                // Scope field query to the specific form
                field = formElement.querySelector(`[name="${fieldName}"]`);
            }
        }
        
        // Fallback to global query if formType not provided or form not found
        if (!field) {
            field = document.querySelector(`[name="${fieldName}"]`);
        }
        
        if (!field) return;

        const { labelElement, targetElement } = this.getDisplayTarget(fieldName, field);
        if (!labelElement || !targetElement) return;

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
   
    checkOverallValidity(formType = null) {
        // Use provided formType, or activeFormType, or try to determine from this.form
        const targetFormType = formType || this.activeFormType || 
            (this.form?.getAttribute('data-form-type') || this.form?.getAttribute('data-modal-form-type'));
        
        if (!targetFormType) {
            console.warn('ValidationManager: Cannot determine formType for checkOverallValidity');
            return;
        }
        
        // Initialize formValidity for this formType if it doesn't exist
        if (!this.formValidity[targetFormType]) {
            this.formValidity[targetFormType] = {};
        }
        
        console.log('checking overall validity for formType:', targetFormType);
        const formValidity = this.formValidity[targetFormType];
        const fieldValues = Object.values(formValidity);
        
        // If no fields have been validated yet, treat form as invalid
        // This prevents empty formValidity from being treated as valid (empty array .every() returns true)
        if (fieldValues.length === 0) {
            const newValidationStatus = {
                formType: targetFormType,
                canAutosave: false,
                canPublish: false,
                fields: formValidity
            };
            // Still emit the event so button states are updated correctly
            if (this.lastValidationStatus[targetFormType]?.canPublish !== false) {
                console.log('ValidationManager: Emitting validationChanged event (empty formValidity)', newValidationStatus);
                eventBus.emit('validationChanged', newValidationStatus);
                this.lastValidationStatus[targetFormType] = newValidationStatus;
            }
            return;
        }
        
        const canAutosave = fieldValues.every(field => 
            field.canAutosave
        );
        const canPublish = fieldValues.every(field => 
            field.canPublish
        );

        const newValidationStatus = {
            formType: targetFormType,
            canAutosave,
            canPublish,
            fields: formValidity
        };
        console.log('this.formValidity[targetFormType]', formValidity);
        /* console.log('newValidationStatus', newValidationStatus); */

        // Initialize lastFieldValidityStatus and lastValidationStatus per formType if needed
        if (!this.lastFieldValidityStatus) {
            this.lastFieldValidityStatus = {};
        }
        if (!this.lastValidationStatus) {
            this.lastValidationStatus = {};
        }
        if (!this.lastFieldValidityStatus[targetFormType]) {
            this.lastFieldValidityStatus[targetFormType] = {};
        }
        if (!this.lastValidationStatus[targetFormType]) {
            this.lastValidationStatus[targetFormType] = {};
        }

        // Check for changes in field validation status related to autosave
        const autoSaveFieldsChanged = !this.lastFieldValidityStatus[targetFormType] || 
            JSON.stringify(this.getFailedAutoSaveFields(formValidity)) !== 
            JSON.stringify(this.getFailedAutoSaveFields(this.lastFieldValidityStatus[targetFormType] || {}));
        
        // Emit field validation changes event if needed
        if (autoSaveFieldsChanged) {
            console.log('autoSaveFieldsChanged', autoSaveFieldsChanged);
            eventBus.emit('autoSaveFieldValidationChanged', {
                formType: targetFormType,
                failedAutoSaveFields: this.getFailedAutoSaveFields(formValidity),
                fields: formValidity
            });
            this.lastFieldValidityStatus[targetFormType] = {...formValidity};
        }

        // Only emit if there's a change in canAutosave or canPublish
        if (this.lastValidationStatus[targetFormType]?.canAutosave !== canAutosave || 
            this.lastValidationStatus[targetFormType]?.canPublish !== canPublish) {
            console.log('ValidationManager: Emitting validationChanged event', newValidationStatus);
            eventBus.emit('validationChanged', newValidationStatus);
            this.lastValidationStatus[targetFormType] = newValidationStatus;
            //console.log('newValidationStatus', newValidationStatus);
        } else {
            console.log('ValidationManager: No change in validation status, not emitting');
        }
    }

    // Helper method to get fields that fail autosave validation
    getFailedAutoSaveFields(validityStatus) {
        return Object.entries(validityStatus)
            .filter(([_, fieldStatus]) => !fieldStatus.canAutosave)
            .map(([fieldName, _]) => fieldName)
            .sort(); // Sort for consistent comparison
    }

    // Get current validation state for external systems
    getCurrentValidationState() {
        const canAutosave = Object.values(this.formValidity).every(field => field.canAutosave);
        const canPublish = Object.values(this.formValidity).every(field => field.canPublish);
        
        return {
            canAutosave,
            canPublish,
            fields: this.formValidity
        };
    }
}
