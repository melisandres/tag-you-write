import { SVGManager } from './svgManager.js';
import { eventBus } from './eventBus.js';
import { SelectOtherField } from './components/selectOtherField.js';

/**
 * ContactModalManager - Handles the contact modal functionality
 * Maintains separation of concerns for contact form display
 */
export class ContactModalManager {
    // Timing constants (in milliseconds)
    static FOCUS_DELAY = 100; // Delay for focusing input fields after DOM manipulation (allows browser to complete rendering)
    static VALIDATION_INIT_DELAY = 150; // Delay for validation state initialization (ensures all input events from restore/auto-fill are processed)
    
    // Form type constant
    static FORM_TYPE = 'contact'; // Form type identifier for validation and event handling

    constructor() {
        this.contactModal = null;
        this.isOpen = false;
        this.sendButton = null;
        this.deleteButton = null;
        this.pendingFormData = null; // Store form data before submission
        this.boundHandlers = {}; // Store bound handlers for cleanup
        this.boundValidationHandler = null; // Store validation event handler for cleanup
        this.boundLanguageChangeHandler = null; // Store language change event handler for cleanup
        
        // Subject field component (initialized after modal is created)
        this.subjectFieldManager = null;
        
        // Cached DOM elements (populated after modal is created)
        this.contactForm = null;
        this.subjectSelect = null;
        this.subjectOtherWrapper = null;
        this.subjectOtherInput = null;
        this.subjectChangeBtn = null;
        this.emailInput = null;
        this.emailLabel = null;
        this.formView = null;
        this.confirmationView = null;
        this.contactTitle = null; // Header title (H1)
        this.contactDescription = null; // Description paragraph
        this.confirmationEmail = null;
        this.confirmationSubject = null;
        this.confirmationMessage = null;
        this.confirmationNewsletterField = null;
        this.confirmBtn = null;
        
        this.init();
        this.bindValidationListener();
        this.bindLanguageChangeListener();
    }

    /**
     * Initialize the contact modal manager
     */
    init() {
        this.createContactModal();
        this.cacheDOMElements();
        this.bindEvents();
    }

    /**
     * Cache frequently accessed DOM elements to avoid repeated queries
     * Called after modal is created
     */
    cacheDOMElements() {
        if (!this.contactModal) return;
        
        // Header elements
        this.contactTitle = this.contactModal.querySelector('.contact-title');
        this.contactDescription = this.contactModal.querySelector('.contact-description');
        
        // Form elements
        this.contactForm = this.contactModal.querySelector('#contact-form');
        this.subjectSelect = this.contactModal.querySelector('#contact-subject');
        this.subjectOtherWrapper = this.contactModal.querySelector('.subject-other-wrapper');
        this.subjectOtherInput = this.contactModal.querySelector('#contact-subject-other');
        this.subjectChangeBtn = this.contactModal.querySelector('.subject-change-btn');
        this.emailInput = this.contactModal.querySelector('#contact-email');
        this.emailLabel = this.contactModal.querySelector('#contact-email-label');
        this.sendButton = this.contactModal.querySelector('.contact-submit-btn');
        this.deleteButton = this.contactModal.querySelector('.contact-delete-btn');
        
        // View elements (formView is the same as contactForm, so reuse it)
        this.formView = this.contactForm; // Alias for clarity when toggling views
        this.confirmationView = this.contactModal.querySelector('#contact-confirmation-view');
        
        // Confirmation view elements
        if (this.confirmationView) {
            this.confirmationEmail = this.confirmationView.querySelector('#confirmation-email');
            this.confirmationSubject = this.confirmationView.querySelector('#confirmation-subject');
            this.confirmationMessage = this.confirmationView.querySelector('#confirmation-message');
            this.confirmationNewsletterField = this.confirmationView.querySelector('#confirmation-newsletter-field');
            this.confirmBtn = this.confirmationView.querySelector('.contact-confirm-btn');
        }

        // Initialize subject field component
        if (this.subjectSelect && this.subjectOtherInput) {
            this.subjectFieldManager = new SelectOtherField({
                selectElement: this.subjectSelect,
                textInputElement: this.subjectOtherInput,
                textInputWrapper: this.subjectOtherWrapper,
                changeButton: this.subjectChangeBtn,
                otherValue: 'other',
                formType: ContactModalManager.FORM_TYPE,
                selectFieldName: 'subject',
                textFieldName: 'subject_other',
                focusDelay: ContactModalManager.FOCUS_DELAY
            });
        }
    }

    /**
     * Create the contact modal HTML structure
     */
    createContactModal() {
        // Create modal background
        const modalBackground = document.createElement('div');
        modalBackground.className = 'contact-modal-background display-none';
        modalBackground.setAttribute('data-contact-modal', 'hidden');

        // Create modal content
        const modalContent = document.createElement('div');
        modalContent.className = 'contact-modal-content';

        // Check if user is logged in
        const isLoggedIn = this.isUserLoggedIn();

        modalContent.innerHTML = `
            <div class="contact-modal-header">
                <h1 class="contact-title" data-i18n="contact.title">Contact Us</h1>
                <button class="contact-modal-close" aria-label="Close contact modal">
                    <span class="icon" data-svg="close"></span>
                </button>
            </div>
            <div class="contact-modal-body">
                <div class="contact-content">

                    <p class="contact-description" data-i18n="contact.description" data-i18n-html="true">Please write to me! Questions, concerns, etc.</p>
                    
                    <form class="contact-form" id="contact-form" data-modal-form-type="contact">
                        <label id="contact-subject-label">
                            <div class="subject-label-wrapper">
                                <span class="headline" data-i18n="contact.subject_label">Subject</span>
                                <button type="button" class="subject-change-btn display-none" data-i18n-title="contact.change_subject" title="Change subject" aria-label="Change subject">
                                    <span class="chevron-icon">${SVGManager.chevronDownSVG}</span>
                                </button>
                            </div>
                            <div class="subject-input-container">
                                <select name="subject" id="contact-subject" required>
                                    <option value="" data-i18n="contact.subject_select">Select a subject...</option>
                                    <option value="love_this" data-i18n="contact.subject_love_this">Love this!</option>
                                    <option value="question" data-i18n="contact.subject_question">Question</option>
                                    <option value="feedback" data-i18n="contact.subject_feedback">Feedback</option>
                                    <option value="other" data-i18n="contact.subject_other">Other</option>
                                </select>
                                <div class="subject-other-wrapper display-none">
                                    <input type="text" name="subject_other" id="contact-subject-other" data-i18n-placeholder="contact.subject_other_placeholder" placeholder="Enter your subject...">
                                </div>
                            </div>
                        </label>

                        <label>
                            <span class="headline" data-i18n="contact.message_label">Message</span>
                            <textarea name="message" id="contact-message" rows="8" cols="50" data-i18n-placeholder="contact.message_placeholder" placeholder="Your message here..." required></textarea>
                        </label>

                        <label id="contact-email-label" class="${isLoggedIn ? 'display-none' : ''}">
                            <span class="headline" data-i18n="contact.email_label">Email Address</span>
                            <input type="email" name="email" id="contact-email" data-i18n-placeholder="contact.email_placeholder" placeholder="your.email@example.com" required>
                        </label>

                        ${!isLoggedIn ? `
                        <label class="contact-newsletter-label">
                            <input type="checkbox" name="newsletter" id="contact-newsletter" checked>
                            <span data-i18n="contact.newsletter_label">I would like to receive information about events including game launch, in person workshops, etc.</span>
                        </label>
                        ` : ''}

                        <div class="form-btns contact-form-buttons">
                            <button type="submit" class="contact-submit-btn publish" data-i18n-title="contact.send_tooltip">
                                <span class="icon" data-svg="publish"></span>
                                <span class="title" data-i18n="contact.send">Send</span>
                            </button>
                            <button type="button" class="delete contact-delete-btn" data-i18n-title="contact.delete_tooltip">
                                <span class="icon" data-svg="delete"></span>
                                <span class="title" data-i18n="contact.delete">Delete</span>
                            </button>
                            <button type="button" class="cancel contact-cancel-btn" data-i18n-title="general.cancel_tooltip">
                                <span class="icon" data-svg="cancel"></span>
                                <span class="title" data-i18n="general.cancel">Cancel</span>
                            </button>
                        </div>
                    </form>
                    
                    <!-- Confirmation View (hidden by default) -->
                    <div class="contact-confirmation-view display-none" id="contact-confirmation-view">
                        <div class="contact-confirmation-content">
                            <div class="contact-confirmation-field">
                                <span class="contact-confirmation-label" data-i18n="contact.email_label">Email Address</span>
                                <span class="contact-confirmation-value" id="confirmation-email"></span>
                            </div>
                            <div class="contact-confirmation-field">
                                <span class="contact-confirmation-label" data-i18n="contact.subject_label">Subject</span>
                                <span class="contact-confirmation-value" id="confirmation-subject"></span>
                            </div>
                            <div class="contact-confirmation-field">
                                <span class="contact-confirmation-label" data-i18n="contact.message_label">Message</span>
                                <div class="contact-confirmation-message" id="confirmation-message"></div>
                            </div>
                            <div class="contact-confirmation-field display-none" id="confirmation-newsletter-field">
                                <span class="contact-confirmation-label" data-i18n="contact.newsletter_label">Newsletter</span>
                                <span class="contact-confirmation-value" data-i18n="contact.newsletter_confirmed">Yes, I would like to receive information about events</span>
                            </div>
                        </div>
                        <div class="form-btns contact-confirmation-buttons">
                            <button type="button" class="contact-confirm-btn publish" data-i18n-title="contact.confirm_tooltip">
                                <span class="icon" data-svg="publish"></span>
                                <span class="title" data-i18n="contact.confirm">Confirm & Send</span>
                            </button>
                            <button type="button" class="contact-return-btn cancel" data-i18n-title="contact.return_tooltip">
                                <span class="icon" data-svg="cancel"></span>
                                <span class="title" data-i18n="contact.return">Return to Edit</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        modalBackground.appendChild(modalContent);
        document.body.appendChild(modalBackground);
        
        this.contactModal = modalBackground;
    }

    /**
     * Bind event listeners
     * Most listeners are attached to the modal element for automatic cleanup
     * Only global triggers (Escape key, open buttons) use document listeners
     */
    bindEvents() {
        // Form-related events - attached to modal element (auto-cleanup when modal removed)
        this.contactModal.addEventListener('input', this.handleFormInput.bind(this));
        this.contactModal.addEventListener('change', this.handleFormChange.bind(this));
        this.contactModal.addEventListener('submit', this.handleFormSubmitEvent.bind(this));
        
        // Single delegated click handler for all modal clicks (close buttons, background, form buttons)
        this.contactModal.addEventListener('click', this.handleModalClick.bind(this));

        // Document-level listeners - store bound handlers for cleanup
        this.boundHandlers.handleEscape = this.handleEscape.bind(this);
        this.boundHandlers.handleOpenTrigger = this.handleOpenTrigger.bind(this);
        
        document.addEventListener('keydown', this.boundHandlers.handleEscape);
        document.addEventListener('click', this.boundHandlers.handleOpenTrigger);
    }

    /**
     * Handle Escape key to close modal
     */
    handleEscape(e) {
        if (e.key === 'Escape' && this.isOpen) {
            this.closeModal();
        }
    }

    /**
     * Handle clicks on contact buttons (nav/footer) to open modal
     */
    handleOpenTrigger(e) {
        const contactLink = e.target.closest('.overflow-menu .nav-link.contact, .footer-contact-btn');
        
        if (contactLink) {
            e.preventDefault();
            this.showModal();
        }
    }

    /**
     * Handle form input events - emit validation events and save state
     */
    handleFormInput(e) {
        if (this.contactForm?.contains(e.target) && this.isOpen) {
            const target = e.target;
            // Emit inputChanged event for validation (similar to FormManager)
            if (target.matches('input, textarea, select')) {
                eventBus.emit('inputChanged', {
                    formType: ContactModalManager.FORM_TYPE,
                    fieldName: target.name,
                    fieldValue: target.value
                });
                // Save contact form state on input change
                this.saveContactFormData();
                
                // Update delete button state based on form content
                this.updateDeleteButton();
            }
        }
    }

    /**
     * Handle form change events - update subject visibility and emit validation
     */
    handleFormChange(e) {
        if (e.target.id === 'contact-subject' && this.isOpen) {
            const previousValue = e.target.dataset.previousValue || '';
            const currentValue = e.target.value;
            
            // Store current value for next change
            e.target.dataset.previousValue = currentValue;
            
            // Update visibility (handled by SelectOtherField component)
            if (this.subjectFieldManager) {
                this.subjectFieldManager.updateVisibility();
            }
            
            // Validation will be triggered automatically by the inputChanged event
            // The validation listener will update the button state
            
            // Update delete button state based on form content
            this.updateDeleteButton();
        }
    }

    /**
     * Handle form submit event - prevent default and show confirmation
     */
    handleFormSubmitEvent(e) {
        if (e.target.id === 'contact-form' && this.isOpen) {
            e.preventDefault();
            this.handleFormSubmit();
        }
    }

    /**
     * Handle clicks within modal - delegated handler for all modal clicks
     * Handles: close buttons, background click, subject change, cancel, return, confirm
     */
    handleModalClick(e) {
        if (!this.isOpen) return;

        // Background click to close (click on modal background, not content)
        if (e.target === this.contactModal) {
            this.closeModal();
            return;
        }

        // Close button (header close button)
        if (e.target.closest('.contact-modal-close, .contact-modal-close-btn')) {
            this.closeModal();
            return;
        }

        // Subject change button
        // Handle change button click (delegated to SelectOtherField component)
        const changeBtn = e.target.closest('.subject-change-btn');
        if (changeBtn && this.subjectFieldManager) {
            e.preventDefault();
            this.subjectFieldManager.switchToSelect();
            return;
        }

        // Delete button
        if (e.target.closest('.contact-delete-btn')) {
            this.handleDelete();
            return;
        }
        
        // Cancel button
        if (e.target.closest('.contact-cancel-btn')) {
            this.closeModal();
            return;
        }
        
        // Return to edit button
        if (e.target.closest('.contact-return-btn')) {
            this.showFormView();
            return;
        }
        
        // Confirm and send button
        if (e.target.closest('.contact-confirm-btn')) {
            this.submitContactForm();
            return;
        }
    }

    /**
     * Cleanup method to remove all event listeners
     * Called when manager is destroyed or page unloads
     */
    cleanup() {
        // Remove document-level listeners
        if (this.boundHandlers.handleEscape) {
            document.removeEventListener('keydown', this.boundHandlers.handleEscape);
            delete this.boundHandlers.handleEscape;
        }
        if (this.boundHandlers.handleOpenTrigger) {
            document.removeEventListener('click', this.boundHandlers.handleOpenTrigger);
            delete this.boundHandlers.handleOpenTrigger;
        }

        // Remove EventBus validation listener
        if (this.boundValidationHandler) {
            eventBus.off('validationChanged', this.boundValidationHandler);
            this.boundValidationHandler = null;
        }
        
        // Remove EventBus language change listener
        if (this.boundLanguageChangeHandler) {
            eventBus.off('languageChanged', this.boundLanguageChangeHandler);
            this.boundLanguageChangeHandler = null;
        }

        // Cleanup subject field component
        if (this.subjectFieldManager) {
            this.subjectFieldManager.destroy();
            this.subjectFieldManager = null;
        }

        // Modal element listeners are automatically cleaned up when modal is removed from DOM
    }

    /**
     * Show the contact modal
     */
    async showModal() {
        if (!this.contactModal) {
            console.error('ContactModalManager: Modal not found');
            return;
        }

        // Initialize modal state (show modal, set attributes, prevent scroll)
        this.initializeModalState();
        
        // Setup UI (translations, SVGs, form context, form view)
        this.setupUI();
        
        // Restore form state (restore data, update subject visibility, auto-fill email)
        await this.restoreFormState();
        
        // Setup validation state (send button, validation check)
        this.setupValidationState();
    }

    /**
     * Initialize modal state - show modal, set attributes, prevent body scroll
     */
    initializeModalState() {
        this.contactModal.classList.remove('display-none');
        this.contactModal.setAttribute('data-contact-modal', 'visible');
        this.isOpen = true;
        
        // Prevent body scroll
        document.body.classList.add('contact-modal-open');
    }

    /**
     * Setup UI - translations, SVGs, form context, form view
     * Cache button references here (matching ButtonUpdateManager.init() pattern)
     */
    setupUI() {
        // Cache button references first (matching ButtonUpdateManager pattern)
        this.ensureButtonReferences();
        
        // Update translations for dynamically created modal (pattern from searchManager/filterManager)
        if (window.i18n) {
            window.i18n.updatePageTranslations(this.contactModal);
        }
        
        // Populate SVGs via eventBus (simple pattern from uiManager)
        const svgElements = this.contactModal.querySelectorAll('[data-svg]');
        if (svgElements.length > 0) {
            eventBus.emit('populateSvgs', { elements: Array.from(svgElements) });
        }
        
        // Switch context to contact form FIRST (before restoring data)
        // This ensures ValidationManager knows which form to validate
        if (this.contactForm) {
            eventBus.emit('formContextChanged', {
                formType: ContactModalManager.FORM_TYPE,
                formElement: this.contactForm
            });
        }
        
        // Ensure we start with form view (not confirmation view)
        this.showFormView();
    }

    /**
     * Restore form state - restore data, update subject visibility, auto-fill email
     */
    async restoreFormState() {
        // Restore contact form state if available (email field will be skipped if user is logged in)
        this.restoreContactFormData();
        
        // Update subject field visibility after restore (in case subject was "other")
        if (this.subjectFieldManager) {
            this.subjectFieldManager.updateVisibility();
        }
        
        // Auto-fill email if user is logged in (after restore, since restore skips email for logged-in users)
        await this.autoFillEmail();
        
        // Notify ValidationManager that modal form is now available
        eventBus.emit('contactModalOpened');
    }

    /**
     * Ensure button references are cached
     */
    ensureButtonReferences() {
        if (!this.contactModal) return;
        
        if (!this.sendButton) {
            this.sendButton = this.contactModal.querySelector('.contact-submit-btn');
        }
        if (!this.deleteButton) {
            this.deleteButton = this.contactModal.querySelector('.contact-delete-btn');
        }
    }

    /**
     * Setup validation state - initialize button states
     * Checks current validation state or preserves last known state
     */
    setupValidationState() {
        // Button references should already be cached from setupUI()
        
        // Check if there's existing validation state (e.g., from page refresh or saved form)
        let initialCanPublish = false;
        if (window.validationManager) {
            // Check last known validation status first (preserved state)
            const lastStatus = window.validationManager.lastValidationStatus?.[ContactModalManager.FORM_TYPE];
            if (lastStatus) {
                initialCanPublish = lastStatus.canPublish;
            } else {
                // If no last status, check current form validity state
                const formValidity = window.validationManager.formValidity?.[ContactModalManager.FORM_TYPE] || {};
                const hasFields = Object.keys(formValidity).length > 0;
                if (hasFields) {
                    initialCanPublish = Object.values(formValidity).every(field => field.canPublish);
                }
            }
        }
        
        // Set initial button state based on current validation state
        if (this.sendButton) {
            this.sendButton.classList.toggle('disabled', !initialCanPublish);
        }
        
        // Update delete button state based on form content
        this.updateDeleteButton();
        
        // Trigger validation check - the validation listener will handle button updates
        // This ensures button state is correct even if validation state changed during restore
        if (window.validationManager) {
            setTimeout(() => {
                // Initialize validation for all contact form fields (even if empty)
                // This ensures formValidity is populated and empty forms are correctly marked as invalid
                const isLoggedIn = this.isUserLoggedIn();
                const fieldsToValidate = ['subject', 'message'];
                
                // Only validate email if user is not logged in (it's auto-filled and hidden for logged-in users)
                if (!isLoggedIn) {
                    fieldsToValidate.push('email');
                }
                
                // Trigger validation for each field to populate formValidity
                fieldsToValidate.forEach(fieldName => {
                    const field = this.contactForm?.querySelector(`[name="${fieldName}"]`);
                    if (field) {
                        eventBus.emit('inputChanged', {
                            formType: ContactModalManager.FORM_TYPE,
                            fieldName: fieldName,
                            fieldValue: field.value || ''
                        });
                    }
                });
                
                // Also validate subject_other if subject is "other"
                if (this.subjectSelect?.value === 'other' && this.subjectOtherInput) {
                    eventBus.emit('inputChanged', {
                        formType: ContactModalManager.FORM_TYPE,
                        fieldName: 'subject_other',
                        fieldValue: this.subjectOtherInput.value || ''
                    });
                }
                
                // Check overall validity after initializing all field validations
                window.validationManager.checkOverallValidity(ContactModalManager.FORM_TYPE);
            }, ContactModalManager.VALIDATION_INIT_DELAY);
        }
    }

    /**
     * Close the contact modal
     */
    closeModal() {
        if (!this.contactModal || !this.isOpen) return;

        this.contactModal.classList.add('display-none');
        this.contactModal.setAttribute('data-contact-modal', 'hidden');
        this.isOpen = false;
        
        // Restore body scroll
        document.body.classList.remove('contact-modal-open');
        
        // Switch context back to main form (if it exists)
        const mainForm = document.querySelector('#main-form');
        if (mainForm) {
            const mainFormType = mainForm.getAttribute('data-form-type');
            eventBus.emit('formContextChanged', {
                formType: mainFormType,
                formElement: mainForm
            });
        } else {
            // No main form, clear context
            eventBus.emit('formContextChanged', {
                formType: null,
                formElement: null
            });
        }
        
        // Save contact form data before closing (in case user wants to reopen later)
        this.saveContactFormData();
        
        // Clear contact modal open state from localStorage (but keep the data)
        const pageState = JSON.parse(localStorage.getItem('pageState') || '{}');
        if (pageState.contactForm) {
            pageState.contactForm.isOpen = false;
            // Keep contactForm.data - user might reopen modal and continue
            localStorage.setItem('pageState', JSON.stringify(pageState));
        }
    }

    /**
     * Bind language change listener to update translations when language changes
     * Pattern from treeVisualizer.js and textSwitcherManager.js
     */
    bindLanguageChangeListener() {
        if (window.eventBus) {
            this.boundLanguageChangeHandler = () => {
                // Only update translations if modal is open
                if (this.isOpen && this.contactModal && window.i18n) {
                    window.i18n.updatePageTranslations(this.contactModal);
                }
            };
            eventBus.on('languageChanged', this.boundLanguageChangeHandler);
        }
    }

    /**
     * Bind validation listener to update send button state
     * Simple pattern matching ButtonUpdateManager
     */
    bindValidationListener() {
        // Store bound handler for cleanup
        this.boundValidationHandler = (results) => {
            // Only respond to validation events for the contact form
            if (results.formType === ContactModalManager.FORM_TYPE) {
                this.updateSendButton(results.canPublish);
            }
        };
        eventBus.on('validationChanged', this.boundValidationHandler);
    }

    /**
     * Update send button disabled state based on form validity
     * Simple pattern matching ButtonUpdateManager.updatePublishButton()
     * @param {boolean} canPublish - Whether the form is valid and can be submitted
     */
    updateSendButton(canPublish) {
        if (this.sendButton) {
            this.sendButton.classList.toggle('disabled', !canPublish);
        }
    }
    
    /**
     * Check if user is logged in
     * @returns {boolean} - True if user is logged in, false otherwise
     */
    isUserLoggedIn() {
        const userMeta = document.querySelector('meta[name="user"]');
        return userMeta?.dataset.userId !== 'null';
    }

    /**
     * Check if form has any content to delete
     * @returns {boolean} - True if form has content, false otherwise
     */
    hasFormContent() {
        if (!this.contactForm) return false;
        
        // Check email (skip if user is logged in - it's auto-filled and hidden)
        const isLoggedIn = this.isUserLoggedIn();
        
        if (!isLoggedIn && this.emailInput && this.emailInput.value.trim()) {
            return true;
        }
        
        // Check subject
        if (this.subjectSelect && this.subjectSelect.value) {
            return true;
        }
        
        // Check custom subject (if "other" is selected)
        if (this.subjectOtherInput && this.subjectOtherInput.value.trim()) {
            return true;
        }
        
        // Check message
        const messageInput = this.contactForm.querySelector('#contact-message');
        if (messageInput && messageInput.value.trim()) {
            return true;
        }
        
        // Note: Newsletter checkbox is not considered "content" since it starts checked by default
        // Only user-entered content (email, subject, message) should enable the delete button
        
        return false;
    }
    
    /**
     * Update delete button disabled state based on whether form has content
     * Simple pattern matching ButtonUpdateManager.updateDeleteButton()
     */
    updateDeleteButton() {
        if (this.deleteButton) {
            const hasContent = this.hasFormContent();
            this.deleteButton.classList.toggle('disabled', !hasContent);
        }
    }

    /**
     * Strip HTML tags from text (for cleaning up accidentally saved WYSIWYG content)
     * @param {string} text - Text that may contain HTML
     * @returns {string} - Plain text with HTML removed
     */
    stripHtmlFromText(text) {
        if (!text) return '';
        // Create a temporary DOM element to parse HTML
        const doc = new DOMParser().parseFromString(text, 'text/html');
        // Get text content (automatically strips HTML tags)
        let plainText = doc.body.textContent || doc.body.innerText || '';
        // Replace HTML entities like &nbsp; with spaces
        plainText = plainText.replace(/\u00A0/g, ' '); // Replace non-breaking spaces
        return plainText.trim();
    }

    /**
     * Auto-fill email if user is logged in
     * Fetches email from backend API endpoint and hides the email field
     */
    async autoFillEmail() {
        const isLoggedIn = this.isUserLoggedIn();
        
        if (!isLoggedIn || !this.emailInput) {
            return; // User not logged in or email input not found
        }

        try {
            // Fetch email from backend
            const endpoint = 'writer/getCurrentUserEmail';
            const url = window.i18n?.createUrl ? window.i18n.createUrl(endpoint) : 
                       `${window.location.origin}/public/index.php?controller=writer&action=getCurrentUserEmail`;
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                credentials: 'same-origin' // Include cookies for session
            });

            if (!response.ok) {
                // Log error but fail silently - this is a background operation
                // User can still enter email manually if auto-fill fails
                console.warn('ContactModalManager: Failed to fetch user email', response.status);
                return;
            }

            const responseData = await response.json();
            
            if (responseData.success && responseData.email) {
                // Auto-fill the email field (hidden, but value is set for form submission)
                this.emailInput.value = responseData.email;
                
                // Hide the email label completely
                this.emailLabel?.classList.add('display-none');
                
                // Trigger input event for validation (email is now filled)
                const event = new Event('input', { bubbles: true, cancelable: true });
                this.emailInput.dispatchEvent(event);
            } else {
                // API returned unsuccessful response
                console.warn('ContactModalManager: Failed to fetch user email - invalid response', responseData);
            }
        } catch (error) {
            // Log error but fail silently - this is a background operation
            // User can still enter email manually if auto-fill fails
            console.error('ContactModalManager: Error fetching user email:', error);
        }
    }

    /**
     * Handle form submission - show confirmation view first
     */
    handleFormSubmit() {
        const form = this.contactModal?.querySelector('#contact-form');
        if (!form) return;

        // Validate form before showing confirmation
        if (!this.isFormValid()) {
            console.warn('ContactModalManager: Form is not valid, cannot submit');
            return;
        }

        // Get form data and prepare for confirmation view
        const formData = new FormData(form);
        const formDataObj = Object.fromEntries(formData);

        // Get subject value using SelectOtherField component
        let finalSubject = '';
        if (this.subjectFieldManager) {
            finalSubject = this.subjectFieldManager.getDisplayValue();
        } else {
            // Fallback if component not initialized
            const subjectSelect = form.querySelector('#contact-subject');
            if (subjectSelect && subjectSelect.selectedIndex >= 0) {
                const selectedOption = subjectSelect.options[subjectSelect.selectedIndex];
                finalSubject = selectedOption.text || selectedOption.value;
            }
        }
        
        // Store form data for submission
        this.pendingFormData = {
            email: formDataObj.email || '',
            subject: finalSubject,
            message: formDataObj.message || '',
            newsletter: formDataObj.newsletter === 'on' || formDataObj.newsletter === true
        };
        
        // Show confirmation view
        this.showConfirmationView();
    }
    
    /**
     * Check if form is valid before submission
     */
    isFormValid() {
        if (!window.validationManager) return false;
        
        const formValidity = window.validationManager.formValidity?.[ContactModalManager.FORM_TYPE] || {};
        const hasFields = Object.keys(formValidity).length > 0;
        const canPublish = hasFields && Object.values(formValidity).every(field => field.canPublish);
        
        return canPublish;
    }
    
    /**
     * Show confirmation view with formatted message preview
     */
    showConfirmationView() {
        if (!this.formView || !this.confirmationView || !this.pendingFormData) return;
        
        // Update header title to "Review Your Message"
        if (this.contactTitle) {
            this.contactTitle.setAttribute('data-i18n', 'contact.confirmation_title');
            if (window.i18n) {
                this.contactTitle.textContent = window.i18n.translate('contact.confirmation_title');
            } else {
                this.contactTitle.textContent = 'Review Your Message';
            }
        }
        
        // Hide description
        if (this.contactDescription) {
            this.contactDescription.classList.add('display-none');
        }
        
        // Populate confirmation view with form data
        if (this.confirmationEmail) this.confirmationEmail.textContent = this.pendingFormData.email;
        if (this.confirmationSubject) this.confirmationSubject.textContent = this.pendingFormData.subject;
        if (this.confirmationMessage) {
            // Preserve line breaks in message
            this.confirmationMessage.textContent = this.pendingFormData.message;
        }
        
        // Show/hide newsletter field based on selection
        if (this.confirmationNewsletterField) {
            this.confirmationNewsletterField.classList.toggle('display-none', !this.pendingFormData.newsletter);
        }
        
        // Hide form, show confirmation
        this.formView.classList.add('display-none');
        this.confirmationView.classList.remove('display-none');
        
        // Update translations for confirmation view (pattern from searchManager/filterManager)
        if (window.i18n) {
            window.i18n.updatePageTranslations(this.confirmationView);
            // Also update header title translation
            if (this.contactTitle) {
                window.i18n.updatePageTranslations(this.contactTitle);
            }
        }
        
        // Populate SVGs for confirmation buttons
        const svgElements = this.confirmationView.querySelectorAll('[data-svg]');
        if (svgElements.length > 0) {
            eventBus.emit('populateSvgs', { elements: Array.from(svgElements) });
        }
    }
    
    /**
     * Show form view (return from confirmation)
     */
    showFormView() {
        if (!this.formView || !this.confirmationView) return;
        
        // Restore header title to "Contact Us"
        if (this.contactTitle) {
            this.contactTitle.setAttribute('data-i18n', 'contact.title');
            if (window.i18n) {
                this.contactTitle.textContent = window.i18n.translate('contact.title');
            } else {
                this.contactTitle.textContent = 'Contact Us';
            }
        }
        
        // Show description
        if (this.contactDescription) {
            this.contactDescription.classList.remove('display-none');
        }
        
        // Show form, hide confirmation
        this.formView.classList.remove('display-none');
        this.confirmationView.classList.add('display-none');
        
        // Update translations for form view
        if (window.i18n && this.contactTitle) {
            window.i18n.updatePageTranslations(this.contactTitle);
        }
        
        // Clear pending form data
        this.pendingFormData = null;
    }
    
    /**
     * Submit contact form to backend
     */
    async submitContactForm() {
        if (!this.pendingFormData) {
            console.error('ContactModalManager: No pending form data to submit');
            return;
        }
        
        try {
            // Disable confirm button during submission
            if (this.confirmBtn) {
                this.confirmBtn.disabled = true;
                this.confirmBtn.classList.add('disabled');
            }
            
            // Prepare data for submission
            const submitData = {
                email: this.pendingFormData.email.trim(),
                subject: this.pendingFormData.subject.trim(),
                message: this.pendingFormData.message.trim(),
                newsletter: this.pendingFormData.newsletter
            };
            
            // Submit to backend
            const endpoint = 'contact/submit';
            const url = window.i18n?.createUrl ? window.i18n.createUrl(endpoint) : 
                       `${window.location.origin}/public/index.php?controller=contact&action=submit`;
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                credentials: 'same-origin',
                body: JSON.stringify(submitData)
            });
            
            const responseData = await response.json();
            
            if (responseData.success) {
                // Show success message
                eventBus.emit('showToast', {
                    message: responseData.toastMessage || 'contact.submit_success',
                    type: responseData.toastType || 'success'
                });
                
                // Clear form data from localStorage
                const pageState = JSON.parse(localStorage.getItem('pageState') || '{}');
                if (pageState.contactForm) {
                    delete pageState.contactForm.data;
                    pageState.contactForm.isOpen = false;
                    localStorage.setItem('pageState', JSON.stringify(pageState));
                }
                
                // Reset form and close modal
                this.resetForm();
                this.closeModal();
            } else {
                // Show error message
                eventBus.emit('showToast', {
                    message: responseData.toastMessage || 'contact.submit_error',
                    type: 'error'
                });
                
                // Re-enable confirm button
                if (this.confirmBtn) {
                    this.confirmBtn.disabled = false;
                    this.confirmBtn.classList.remove('disabled');
                }
            }
        } catch (error) {
            console.error('ContactModalManager: Error submitting form', error);
            
            // Show error message
            eventBus.emit('showToast', {
                message: 'contact.submit_error',
                type: 'error'
            });
            
            // Re-enable confirm button
            if (this.confirmBtn) {
                this.confirmBtn.disabled = false;
                this.confirmBtn.classList.remove('disabled');
            }
        }
    }
    
    /**
     * Handle delete button click - clear form and saved data
     */
    handleDelete() {
        // Reset form to initial state
        this.resetForm();
        
        // Clear saved form data from localStorage
        const pageState = JSON.parse(localStorage.getItem('pageState') || '{}');
        if (pageState.contactForm) {
            delete pageState.contactForm.data;
            localStorage.setItem('pageState', JSON.stringify(pageState));
        }
        
        // Update validation state (form is now empty, so should be invalid)
        if (window.validationManager) {
            // Clear validation state for contact form
            if (window.validationManager.formValidity?.[ContactModalManager.FORM_TYPE]) {
                Object.keys(window.validationManager.formValidity[ContactModalManager.FORM_TYPE]).forEach(fieldName => {
                    window.validationManager.formValidity[ContactModalManager.FORM_TYPE][fieldName] = { canAutosave: false, canPublish: false };
                });
            }
            // Trigger validation check to update button state
            window.validationManager.checkOverallValidity(ContactModalManager.FORM_TYPE);
        }
        
        // Update subject visibility
        if (this.subjectFieldManager) {
            this.subjectFieldManager.updateVisibility();
        }
        
        // Update delete button state (form is now empty, so disable delete button)
        this.updateDeleteButton();
    }
    
    /**
     * Reset form to initial state
     */
    resetForm() {
        if (!this.contactForm) return;
        
        // Check if user is logged in (email will be re-auto-filled after reset)
        const isLoggedIn = this.isUserLoggedIn();
        
        // Reset all form fields (email field is in the form, validation handles requirements)
        this.contactForm.reset();
        
        // Reset subject field using component
        if (this.subjectFieldManager) {
            this.subjectFieldManager.reset();
        }
        
        // Re-auto-fill email if user is logged in (email field is in form, just needs value)
        if (isLoggedIn) {
            this.autoFillEmail();
        }
        
        // Clear pending form data
        this.pendingFormData = null;
    }

    /**
     * Save contact form data to localStorage
     * Stores separately from page form state to avoid conflicts
     */
    saveContactFormData() {
        if (!this.contactForm) return;

        const formData = new FormData(this.contactForm);
        const formDataObj = Object.fromEntries(formData);

        // Get current pageState or create new one
        const pageState = JSON.parse(localStorage.getItem('pageState') || '{}');
        
        // Store contact form data separately
        if (!pageState.contactForm) {
            pageState.contactForm = {};
        }
        pageState.contactForm.data = formDataObj;

        // Save to localStorage
        localStorage.setItem('pageState', JSON.stringify(pageState));
    }

    /**
     * Get saved form data from localStorage
     * @returns {Object|null} Saved form data or null if not found
     */
    getSavedFormData() {
        const pageState = JSON.parse(localStorage.getItem('pageState') || '{}');
        return pageState.contactForm?.data || null;
    }

    /**
     * Get current value from a form input element
     * @param {HTMLElement} input - The input element
     * @returns {string} Current value (normalized for checkboxes)
     */
    getCurrentFormValue(input) {
        if (input.type === 'checkbox') {
            return input.checked ? 'on' : '';
        }
        return input.value || '';
    }

    /**
     * Normalize a saved value for comparison with current form value
     * @param {*} savedValue - The saved value from localStorage
     * @param {HTMLElement} input - The input element
     * @param {string} key - The field name
     * @returns {string} Normalized value for comparison
     */
    normalizeValueForComparison(savedValue, input, key) {
        if (input.type === 'checkbox') {
            return (savedValue === 'on' || savedValue === true || savedValue === '1') ? 'on' : '';
        }
        
        if (typeof savedValue === 'string' && key === 'message' && savedValue.includes('<')) {
            // Strip HTML from saved message for comparison
            return this.stripHtmlFromText(savedValue);
        }
        
        return String(savedValue || '');
    }

    /**
     * Check if form needs to be restored by comparing current values with saved values
     * @param {Object} savedFormData - Saved form data from localStorage
     * @param {boolean} isLoggedIn - Whether user is logged in
     * @returns {boolean} True if form needs restoration
     */
    needsFormRestore(savedFormData, isLoggedIn) {
        for (const [key, savedValue] of Object.entries(savedFormData)) {
            // Skip email field if user is logged in (will be auto-filled from account)
            if (key === 'email' && isLoggedIn) {
                continue;
            }
            
            const input = this.contactForm.elements[key];
            if (!input) continue;
            
            const currentValue = this.getCurrentFormValue(input);
            const normalizedSavedValue = this.normalizeValueForComparison(savedValue, input, key);
            
            // If values don't match, we need to restore
            if (currentValue !== normalizedSavedValue) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * Restore a single form field value
     * @param {string} key - Field name
     * @param {*} value - Value to restore
     * @param {boolean} isLoggedIn - Whether user is logged in
     */
    restoreFormField(key, value, isLoggedIn) {
        // Skip email field if user is logged in (will be auto-filled from account)
        if (key === 'email' && isLoggedIn) {
            return;
        }
        
        const input = this.contactForm?.elements[key];
        if (!input) return;
        
        // Handle checkboxes separately
        if (input.type === 'checkbox') {
            input.checked = value === 'on' || value === true || value === '1';
        } else {
            let textValue = value;
            // If this is the message field and it contains HTML (from accidental WYSIWYG),
            // strip the HTML to get plain text
            if (key === 'message' && typeof textValue === 'string' && textValue.includes('<')) {
                textValue = this.stripHtmlFromText(textValue);
            }
            input.value = textValue;
            
            // If this is subject_other, save it to the component for preservation
            if (key === 'subject_other' && textValue && this.subjectFieldManager) {
                this.subjectFieldManager.setSavedValue(textValue);
            }
        }
        
        // Trigger input event for validation
        const event = new Event('input', { bubbles: true, cancelable: true });
        input.dispatchEvent(event);
    }

    /**
     * Restore contact form data from localStorage
     * Restores form values when modal is opened
     * Only restores if form is empty or if saved data differs from current form values
     */
    restoreContactFormData() {
        if (!this.contactForm) return;

        // Get saved form data
        const savedFormData = this.getSavedFormData();
        if (!savedFormData) return;

        // Check if user is logged in (don't restore email if logged in - use account email instead)
        const isLoggedIn = this.isUserLoggedIn();
        
        // Check if form already has values that match saved data
        if (!this.needsFormRestore(savedFormData, isLoggedIn)) {
            // Still need to update subject visibility in case "other" was selected
            if (this.subjectFieldManager) {
                this.subjectFieldManager.updateVisibility();
            }
            return;
        }
        
        // Restore form values
        Object.entries(savedFormData).forEach(([key, value]) => {
            this.restoreFormField(key, value, isLoggedIn);
        });

        // Update subject field visibility in case "other" was selected
        if (this.subjectFieldManager) {
            this.subjectFieldManager.updateVisibility();
        }
        
        // Update delete button state after restoring form data
        this.updateDeleteButton();
    }
}

