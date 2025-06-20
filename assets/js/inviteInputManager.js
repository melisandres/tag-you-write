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
            id: this.generateInviteeId()
        };

        // Add to array
        this.invitees.push(invitee);

        // Update UI
        this.renderInvitees();
        this.updateHiddenField();

        // Clear input
        this.inviteeInput.value = '';

        // Emit event for form validation (ValidationManager will handle validation)
        eventBus.emit('inputChanged', {
            formType: 'root',
            fieldName: 'invitees',
            fieldValue: JSON.stringify(this.invitees)
        });
    }

    removeInvitee(inviteeId) {
        this.invitees = this.invitees.filter(invitee => invitee.id !== inviteeId);
        this.renderInvitees();
        this.updateHiddenField();

        // Emit event for form validation
        eventBus.emit('inputChanged', {
            formType: 'root',
            fieldName: 'invitees',
            fieldValue: JSON.stringify(this.invitees)
        });
    }

    // Validation is now handled by ValidationManager

    inviteeExists(input) {
        return this.invitees.some(invitee => invitee.input.toLowerCase() === input.toLowerCase());
    }

    generateInviteeId() {
        return 'invitee_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

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
        wrapper.dataset.inviteeId = invitee.id;

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
        removeBtn.addEventListener('click', () => this.removeInvitee(invitee.id));

        return wrapper;
    }

    updateHiddenField() {
        this.inviteesDataInput.value = JSON.stringify(this.invitees);
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