import { eventBus } from './eventBus.js';
import { SVGManager } from './svgManager.js';

/**
 * Manages the invitee input system for collaborative text creation.
 * 
 * Responsibilities:
 * - Handle user input for adding invitees (email/username)
 * - Maintain sync between visual display and hidden form field
 * - Coordinate with ValidationManager for real-time validation
 * - Support form restoration and edit mode
 * 
 * Data Flow:
 * 1. User adds invitee → updates internal array → updates hidden field → triggers validation
 * 2. ValidationManager validates → triggers render with validation status
 * 3. Form restoration → updates internal array → triggers validation → renders
 */
export class InviteInputManager {
    constructor() {
        // DOM elements
        this.inviteeInput = document.getElementById('invitees-input');
        this.inviteesDisplay = document.getElementById('invitees-display');
        this.inviteesDataInput = document.getElementById('invitees-data');
        
        // State management
        this.invitees = []; // Array of invitee objects: {input, type, userId?, validationStatus?}
        this.isUpdatingHiddenField = false; // Prevents infinite sync loops
        
        if (this.inviteeInput && this.inviteesDisplay) {
            this.init();
            // Make this instance available globally
            window.inviteInputManagerInstance = this;
        }
    }

    init() {
        this.setupInputListeners();
        this.setupFormRestorationListeners();
        this.setupValidationListeners();
    }

    /**
     * Set up listeners for user input events (Enter key, blur)
     */
    setupInputListeners() {
        // Add invitee on Enter key
        this.inviteeInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.addInvitee();
            }
        });

        // Add invitee on blur if there's content (UX: saves partial input)
        this.inviteeInput.addEventListener('blur', () => {
            if (this.inviteeInput.value.trim()) {
                this.addInvitee();
            }
        });
    }

    /**
     * Set up listeners for form restoration (autosave, page reload recovery)
     */
    setupFormRestorationListeners() {
        // Listen for form restoration events from autosave system
        eventBus.on('formRestored', (formData) => {
            if (formData.invitees) {
                this.restoreInviteesFromData(formData.invitees);
            }
        });

        // Monitor hidden field changes (belt and suspenders approach)
        if (this.inviteesDataInput) {
            // Watch for attribute changes (programmatic updates)
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'value') {
                        this.syncFromHiddenField();
                    }
                });
            });

            observer.observe(this.inviteesDataInput, { 
                attributes: true, 
                attributeFilter: ['value'] 
            });

            // Watch for input events (user/programmatic changes)
            this.inviteesDataInput.addEventListener('input', () => {
                this.syncFromHiddenField();
            });
        }
    }

    /**
     * Set up listeners for validation system coordination
     */
    setupValidationListeners() {
        // ValidationManager tells us when and how to render (single source of truth)
        eventBus.on('renderInviteesWithValidation', (data) => {
            this.handleRenderWithValidation(data.invitees, data.hasErrors);
        });
    }

    /**
     * Restore invitees from JSON data (used by form restoration)
     */
    restoreInviteesFromData(inviteesJson) {
        try {
            const restoredInvitees = JSON.parse(inviteesJson);
            if (Array.isArray(restoredInvitees)) {
                this.invitees = restoredInvitees;
                this.triggerValidation(); // Let validation system handle rendering
            }
        } catch (e) {
            console.warn('Failed to restore invitees from form data:', e);
        }
    }

    /**
     * Sync internal state from hidden field value
     * Prevents sync loops using isUpdatingHiddenField flag
     */
    syncFromHiddenField() {
        if (this.isUpdatingHiddenField) {
            return; // Prevent infinite loops
        }
        
        // Handle empty field
        if (!this.inviteesDataInput.value) {
            this.invitees = [];
            this.triggerValidation();
            return;
        }

        try {
            const hiddenFieldInvitees = JSON.parse(this.inviteesDataInput.value);
            if (Array.isArray(hiddenFieldInvitees)) {
                // Only update if there's a structural change (optimize performance)
                if (this.hasStructuralChange(hiddenFieldInvitees)) {
                    this.invitees = hiddenFieldInvitees;
                    this.triggerValidation();
                }
            }
        } catch (e) {
            console.warn('Failed to sync invitees from hidden field:', e);
        }
    }

    /**
     * Check if the hidden field data represents a structural change
     * (ignores validation status changes to prevent unnecessary updates)
     */
    hasStructuralChange(newInvitees) {
        const newStructure = JSON.stringify(newInvitees.map(inv => ({input: inv.input, type: inv.type})));
        const currentStructure = JSON.stringify(this.invitees.map(inv => ({input: inv.input, type: inv.type})));
        return newStructure !== currentStructure;
    }

    /**
     * Add a new invitee from user input
     */
    addInvitee() {
        const input = this.inviteeInput.value.trim();
        if (!input) return;

        // Prevent duplicates (case-insensitive)
        if (this.inviteeExists(input)) {
            this.inviteeInput.value = ''; // Clear input even for duplicates
            return;
        }

        // Create invitee object (input serves as unique identifier)
        const invitee = {
            input: input,
            type: input.includes('@') ? 'email' : 'username',
            userId: null // Will be populated by validation or selection
        };

        this.invitees.push(invitee);
        this.updateHiddenField(); // Triggers validation and re-render
        this.inviteeInput.value = ''; // Clear input for next entry
    }

    /**
     * Add a new invitee with known user data (from recent collaborators)
     */
    addInviteeWithData(input, userId = null, type = null) {
        // Prevent duplicates (case-insensitive)
        if (this.inviteeExists(input)) {
            return false;
        }

        // Create invitee object with known data
        const invitee = {
            input: input,
            type: type || (input.includes('@') ? 'email' : 'username'),
            userId: userId
        };

        this.invitees.push(invitee);
        this.updateHiddenField(); // Triggers validation and re-render
        return true;
    }

    /**
     * Remove invitee by input value (used as unique identifier)
     */
    removeInvitee(input) {
        this.invitees = this.invitees.filter(invitee => 
            invitee.input.toLowerCase() !== input.toLowerCase()
        );
        this.updateHiddenField(); // Triggers validation and re-render
    }

    /**
     * Check if invitee already exists (case-insensitive)
     */
    inviteeExists(input) {
        return this.invitees.some(invitee => 
            invitee.input.toLowerCase() === input.toLowerCase()
        );
    }

    /**
     * Render the invitees display (called by validation system)
     */
    renderInvitees() {
        this.inviteesDisplay.innerHTML = '';

        this.invitees.forEach(invitee => {
            const inviteeElement = this.createInviteeElement(invitee);
            this.inviteesDisplay.appendChild(inviteeElement);
        });
    }

    /**
     * Create DOM element for a single invitee
     */
    createInviteeElement(invitee) {
        const wrapper = document.createElement('div');
        wrapper.className = 'invitee-item';
        wrapper.dataset.inviteeInput = invitee.input; // Use input as identifier
        wrapper.classList.add(`invitee-${invitee.type}`);
        
        // Apply validation status classes
        this.applyValidationClasses(wrapper, invitee);
        
        // Create content
        const typeIcon = invitee.type === 'email' ? SVGManager.emailSVG : SVGManager.userSVG;
        const validationIndicator = this.createValidationIndicator(invitee);
        
        wrapper.innerHTML = `
            <div class="invitee-type-icon">${typeIcon}</div>
            <span class="invitees-input">${invitee.input}</span>
            ${validationIndicator}
            <button type="button" class="remove-invitee-btn" 
                    data-i18n-title="cr_it_ed.remove_invitee" 
                    title="${window.i18n ? window.i18n.translate('cr_it_ed.remove_invitee') : 'Remove invitee'}">
                ${SVGManager.xSVG}
            </button>
        `;

        // Add remove functionality
        const removeBtn = wrapper.querySelector('.remove-invitee-btn');
        removeBtn.addEventListener('click', () => this.removeInvitee(invitee.input));

        return wrapper;
    }

    /**
     * Apply validation status classes to invitee element
     */
    applyValidationClasses(element, invitee) {
        if (invitee.validationStatus) {
            if (invitee.validationStatus.isValid) {
                element.classList.add('invitee-valid');
            } else {
                element.classList.add('invitee-invalid');
                element.classList.add(`invitee-error-${invitee.validationStatus.errorType}`);
            }
        }
    }

    /**
     * Create validation indicator HTML
     */
    createValidationIndicator(invitee) {
        // No validation indicators - keep styling clean
        return '';
    }

    /**
     * Update hidden form field and trigger validation
     * Uses flag to prevent sync loops
     */
    updateHiddenField() {
        this.isUpdatingHiddenField = true;
        
        this.inviteesDataInput.value = JSON.stringify(this.invitees);
        
        // Trigger autosave and validation systems
        const event = new Event('input', { bubbles: true });
        this.inviteesDataInput.dispatchEvent(event);
        
        // Emit event for other components (like InviteeSuggestionsManager)
        eventBus.emit('inviteesChanged', {
            invitees: this.invitees,
            userIds: this.invitees.filter(inv => inv.userId).map(inv => inv.userId)
        });
        
        // Reset flag after brief delay to allow event propagation
        setTimeout(() => {
            this.isUpdatingHiddenField = false;
        }, 100);
    }

    /**
     * Trigger validation without updating hidden field (for sync scenarios)
     */
    triggerValidation() {
        const event = new Event('input', { bubbles: true });
        this.inviteesDataInput.dispatchEvent(event);
    }

    // === Public API Methods ===

    /**
     * Populate invitees from server data (used in edit mode)
     */
    populateInvitees(inviteesData) {
        if (Array.isArray(inviteesData)) {
            this.invitees = inviteesData;
            this.updateHiddenField(); // Triggers validation and rendering
        }
    }

    /**
     * Get current invitees array
     */
    getInvitees() {
        return this.invitees;
    }

    /**
     * Handle render command from ValidationManager (single source of truth)
     */
    handleRenderWithValidation(validatedInvitees, hasErrors) {
        this.invitees = validatedInvitees;
        this.renderInvitees();
    }
} 