import { eventBus } from './eventBus.js';
import { SVGManager } from './svgManager.js';

export class InviteInputManager {
    constructor() {
        this.inviteeInput = document.getElementById('invitee-input');
        this.inviteesDisplay = document.getElementById('invitees-display');
        this.inviteesDataInput = document.getElementById('invitees-data');
        
        this.invitees = []; // Array to store invitee objects
        
        if (this.inviteeInput && this.inviteesDisplay) {
            this.init();
        }
    }

    init() {
        this.setupEventListeners();
        this.setupFormRestorationListeners();
    }

    setupEventListeners() {
        // Handle Enter key and blur events
        this.inviteeInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.addInvitee();
            }
        });

        this.inviteeInput.addEventListener('blur', () => {
            // Add invitee on blur if there's content
            if (this.inviteeInput.value.trim()) {
                this.addInvitee();
            }
        });

        // No need for real-time validation - ValidationManager handles this
    }

    setupFormRestorationListeners() {
        // Listen for form restoration events
        eventBus.on('formRestored', (formData) => {
            if (formData.invitees) {
                this.restoreInviteesFromData(formData.invitees);
            }
        });

        // Also listen for direct changes to the hidden field (belt and suspenders)
        if (this.inviteesDataInput) {
            // Create a MutationObserver to watch for value changes
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

            // Also listen for input events (for programmatic value changes)
            this.inviteesDataInput.addEventListener('input', () => {
                this.syncFromHiddenField();
            });
        }
    }

    restoreInviteesFromData(inviteesJson) {
        try {
            const restoredInvitees = JSON.parse(inviteesJson);
            if (Array.isArray(restoredInvitees)) {
                console.log('Restoring invitees from form data:', restoredInvitees);
                this.invitees = restoredInvitees;
                this.renderInvitees();
                // Don't call updateHiddenField() here - the hidden field already has the correct value
            }
        } catch (e) {
            console.warn('Failed to restore invitees from form data:', e);
        }
    }

    syncFromHiddenField() {
        if (!this.inviteesDataInput.value) {
            this.invitees = [];
            this.renderInvitees();
            return;
        }

        try {
            const hiddenFieldInvitees = JSON.parse(this.inviteesDataInput.value);
            if (Array.isArray(hiddenFieldInvitees) && 
                JSON.stringify(hiddenFieldInvitees) !== JSON.stringify(this.invitees)) {
                console.log('Syncing invitees from hidden field:', hiddenFieldInvitees);
                this.invitees = hiddenFieldInvitees;
                this.renderInvitees();
            }
        } catch (e) {
            console.warn('Failed to sync invitees from hidden field:', e);
        }
    }

    addInvitee() {
        const input = this.inviteeInput.value.trim();
        if (!input) return;

        // Check if already exists
        if (this.inviteeExists(input)) {
            return; // Silently ignore duplicates
        }

        // Determine type (simple heuristic)
        const type = input.includes('@') ? 'email' : 'username';

        // Create invitee object
        const invitee = {
            input: input,
            type: type,
/*             id: this.generateInviteeId() */
        };

        // Add to array
        this.invitees.push(invitee);

        // Update UI
        this.renderInvitees();
        this.updateHiddenField(); // This now triggers autosave automatically

        // Clear input
        this.inviteeInput.value = '';

        // No need to manually emit - updateHiddenField() now dispatches input event
    }

    removeInvitee(inviteeId) {
        this.invitees = this.invitees.filter(invitee => invitee.id !== inviteeId);
        this.renderInvitees();
        this.updateHiddenField(); // This now triggers autosave automatically

        // No need to manually emit - updateHiddenField() now dispatches input event
    }

    // Validation is now handled by ValidationManager

    inviteeExists(input) {
        return this.invitees.some(invitee => invitee.input.toLowerCase() === input.toLowerCase());
    }

/*     generateInviteeId() {
        return 'invitee_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    } */

    renderInvitees() {
        this.inviteesDisplay.innerHTML = '';

        this.invitees.forEach(invitee => {
            const inviteeElement = this.createInviteeElement(invitee);
            this.inviteesDisplay.appendChild(inviteeElement);
        });
    }

    createInviteeElement(invitee) {
        const wrapper = document.createElement('div');
        wrapper.className = 'invitee-item';
        
        // Use id if available, otherwise use input as identifier
        const identifier = invitee.id || invitee.input;
        wrapper.dataset.inviteeId = identifier;

        const typeIcon = invitee.type === 'email' ? '📧' : '👤';
        
        wrapper.innerHTML = `
            <span class="invitee-type-icon">${typeIcon}</span>
            <span class="invitee-input">${invitee.input}</span>
            <button type="button" class="remove-invitee-btn" data-i18n-title="cr_it_ed.remove_invitee" title="${window.i18n ? window.i18n.translate('cr_it_ed.remove_invitee') : 'Remove invitee'}">
                ${SVGManager.xSVG}
            </button>
        `;

        // Add remove button event listener
        const removeBtn = wrapper.querySelector('.remove-invitee-btn');
        removeBtn.addEventListener('click', () => this.removeInviteeByIdentifier(identifier));

        return wrapper;
    }

    removeInviteeByIdentifier(identifier) {
        // Try to remove by id first, then by input
        this.invitees = this.invitees.filter(invitee => 
            invitee.id !== identifier && invitee.input !== identifier
        );
        this.renderInvitees();
        this.updateHiddenField(); // This now triggers autosave automatically
    }

    updateHiddenField() {
        this.inviteesDataInput.value = JSON.stringify(this.invitees);
        
        // Dispatch input event to trigger autosave
        const event = new Event('input', { bubbles: true });
        this.inviteesDataInput.dispatchEvent(event);
    }

    // Error handling is now managed by ValidationManager

    // Method to populate invitees from server data (for edit mode)
    populateInvitees(inviteesData) {
        if (Array.isArray(inviteesData)) {
            this.invitees = inviteesData;
            this.renderInvitees();
            this.updateHiddenField();
        }
    }

    // Method to get current invitees
    getInvitees() {
        return this.invitees;
    }
} 