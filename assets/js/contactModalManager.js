/**
 * ContactModalManager - Handles the contact modal functionality
 * Maintains separation of concerns for contact form display
 */
export class ContactModalManager {
    constructor() {
        this.contactModal = null;
        this.isOpen = false;
        this.init();
    }

    /**
     * Initialize the contact modal manager
     */
    init() {
        this.createContactModal();
        this.bindEvents();
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
        const userMeta = document.querySelector('meta[name="user"]');
        const isLoggedIn = userMeta && userMeta.dataset.userId !== 'null';

        modalContent.innerHTML = `
            <div class="contact-modal-header">
                <button class="contact-modal-close" aria-label="Close contact modal">
                    <span class="icon" data-svg="close"></span>
                </button>
            </div>
            <div class="contact-modal-body">
                <div class="contact-content">
                    <h1 class="contact-title" data-i18n="contact.title">Contact Us</h1>
                    <p class="contact-description" data-i18n="contact.description" data-i18n-html="true">Please write to me! Questions, concerns, etc.</p>
                    
                    <form class="contact-form" id="contact-form" data-modal-form-type="contact">
                        <label>
                            <span class="headline" data-i18n="contact.email_label">Email Address</span>
                            <input type="email" name="email" id="contact-email" data-i18n-placeholder="contact.email_placeholder" placeholder="your.email@example.com" required>
                        </label>

                        <label>
                            <span class="headline" data-i18n="contact.subject_label">Subject</span>
                            <select name="subject" id="contact-subject" required>
                                <option value="" data-i18n="contact.subject_select">Select a subject...</option>
                                <option value="love_this" data-i18n="contact.subject_love_this">Love this!</option>
                                <option value="question" data-i18n="contact.subject_question">Question</option>
                                <option value="feedback" data-i18n="contact.subject_feedback">Feedback</option>
                                <option value="other" data-i18n="contact.subject_other">Other</option>
                            </select>
                        </label>

                        <label id="contact-subject-other-label" class="display-none">
                            <span class="headline" data-i18n="contact.subject_other_custom_label">Custom Subject</span>
                            <input type="text" name="subject_other" id="contact-subject-other" data-i18n-placeholder="contact.subject_other_placeholder" placeholder="Enter your subject...">
                        </label>

                        <label>
                            <span class="headline" data-i18n="contact.message_label">Message</span>
                            <textarea name="message" id="contact-message" rows="8" cols="50" data-i18n-placeholder="contact.message_placeholder" placeholder="Your message here..." required></textarea>
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
                            <button type="button" class="cancel contact-cancel-btn" data-i18n-title="general.cancel_tooltip">
                                <span class="icon" data-svg="cancel"></span>
                                <span class="title" data-i18n="general.cancel">Cancel</span>
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        modalBackground.appendChild(modalContent);
        document.body.appendChild(modalBackground);
        
        this.contactModal = modalBackground;
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Close button events
        const closeButtons = this.contactModal.querySelectorAll('.contact-modal-close, .contact-modal-close-btn');
        closeButtons.forEach(button => {
            button.addEventListener('click', () => this.closeModal());
        });

        // Background click to close
        this.contactModal.addEventListener('click', (e) => {
            if (e.target === this.contactModal) {
                this.closeModal();
            }
        });

        // Escape key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.closeModal();
            }
        });

        // Contact button event listeners - open contact modal
        document.addEventListener('click', (e) => {
            const contactLink = e.target.closest('.overflow-menu .nav-link.contact, .footer-contact-btn');
            
            if (contactLink) {
                e.preventDefault();
                this.showModal();
            }
        });

        // Use event delegation for form elements (they're created dynamically)
        document.addEventListener('change', (e) => {
            if (e.target.id === 'contact-subject' && this.isOpen) {
                const otherLabel = this.contactModal.querySelector('#contact-subject-other-label');
                const otherInput = this.contactModal.querySelector('#contact-subject-other');
                
                if (e.target.value === 'other') {
                    if (otherLabel) otherLabel.classList.remove('display-none');
                    if (otherInput) otherInput.setAttribute('required', 'required');
                } else {
                    if (otherLabel) otherLabel.classList.add('display-none');
                    if (otherInput) {
                        otherInput.removeAttribute('required');
                        otherInput.value = '';
                    }
                }
            }
        });

        document.addEventListener('submit', (e) => {
            if (e.target.id === 'contact-form' && this.isOpen) {
                e.preventDefault();
                this.handleFormSubmit();
            }
        });

        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('contact-cancel-btn') && this.isOpen) {
                this.closeModal();
            }
        });
    }

    /**
     * Show the contact modal
     */
    showModal() {
        if (!this.contactModal) {
            console.error('ContactModalManager: Modal not found');
            return;
        }

        this.contactModal.classList.remove('display-none');
        this.contactModal.setAttribute('data-contact-modal', 'visible');
        this.isOpen = true;
        
        // Prevent body scroll
        document.body.classList.add('contact-modal-open');
        
        // Update translations first
        this.updateTranslations();
        
        // Populate SVGs via eventBus (simple pattern from uiManager)
        const svgElements = this.contactModal.querySelectorAll('[data-svg]');
        if (svgElements.length > 0 && window.eventBus) {
            window.eventBus.emit('populateSvgs', { elements: Array.from(svgElements) });
        }
        
        // Auto-fill email if user is logged in (will be implemented in todo #8)
        this.autoFillEmail();
        
        console.log('ContactModalManager: Modal opened');
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
        
        console.log('ContactModalManager: Modal closed');
    }

    /**
     * Update translations in the modal
     */
    updateTranslations() {
        if (!window.i18n) {
            console.error('ContactModalManager: i18n not available');
            return;
        }

        // Use the localization system's updatePageTranslations method
        // which properly handles HTML content when data-i18n-html="true" is set
        window.i18n.updatePageTranslations(this.contactModal);
    }

    /**
     * Toggle modal visibility
     */
    toggleModal() {
        if (this.isOpen) {
            this.closeModal();
        } else {
            this.showModal();
        }
    }

    /**
     * Check if modal is currently open
     */
    isModalOpen() {
        return this.isOpen;
    }

    /**
     * Get modal element
     */
    getModal() {
        return this.contactModal;
    }

    /**
     * Auto-fill email if user is logged in
     * TODO: Implement in todo #8 - fetch email from backend or meta tag
     */
    autoFillEmail() {
        const userMeta = document.querySelector('meta[name="user"]');
        const isLoggedIn = userMeta && userMeta.dataset.userId !== 'null';
        const emailInput = this.contactModal?.querySelector('#contact-email');
        
        if (isLoggedIn && emailInput) {
            // TODO: Fetch email from backend or get from meta tag
            // For now, just mark it as required for logged-in users
            // emailInput.value = userEmail;
            // emailInput.disabled = true;
        }
    }

    /**
     * Handle form submission
     * TODO: Implement form submission to backend in todo #11
     */
    handleFormSubmit() {
        const form = this.contactModal?.querySelector('#contact-form');
        if (!form) return;

        const formData = new FormData(form);
        const formDataObj = Object.fromEntries(formData);

        // Get subject value (either selected option or custom "other" value)
        const subjectSelect = form.querySelector('#contact-subject');
        const subjectOther = form.querySelector('#contact-subject-other');
        
        if (subjectSelect.value === 'other' && subjectOther.value) {
            formDataObj.subject = subjectOther.value;
        } else {
            formDataObj.subject = subjectSelect.options[subjectSelect.selectedIndex].text;
        }
        
        // Remove the subject_other field from final data
        delete formDataObj.subject_other;

        console.log('ContactModalManager: Form submitted with data:', formDataObj);
        
        // TODO: Show confirmation view (todo #10)
        // TODO: Submit to backend (todo #11)
    }
}

