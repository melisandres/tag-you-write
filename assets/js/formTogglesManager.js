import { eventBus } from './eventBus.js';

export class FormTogglesManager {
    constructor() {
        this.visibilityToggle = null;
        this.visibilityHidden = null;
        this.visibilityLabels = null;
        this.joinabilityToggle = null;
        this.joinabilityHidden = null;
        this.joinabilityLabels = null;
        
        // Store previous joinability value for restoration
        this.previousJoinabilityValue = '1'; // Default to "all users"
        this.joinabilityMessageElement = null;
        
        this.init();
    }

    init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupToggles());
        } else {
            this.setupToggles();
        }
    }

    setupToggles() {
        this.findElements();
        if (this.elementsExist()) {
            this.createMessageElement();
            this.addEventListeners();
            this.setInitialStates();
            console.log('FormTogglesManager: Toggles initialized successfully');
        } else {
            console.log('FormTogglesManager: Toggle elements not found');
        }
    }

    findElements() {
        // Find visibility toggle elements
        this.visibilityToggle = document.querySelector('input[name="visible_to_all_toggle"]');
        this.visibilityHidden = document.querySelector('input[name="visible_to_all"]');
        if (this.visibilityToggle) {
            const visibilityControl = this.visibilityToggle.closest('.toggle-control');
            this.visibilityLabels = visibilityControl ? 
                Array.from(visibilityControl.querySelectorAll('.toggle-label-left, .toggle-label-right')) : 
                null;
        }

        // Find joinability toggle elements
        this.joinabilityToggle = document.querySelector('input[name="joinable_by_all_toggle"]');
        this.joinabilityHidden = document.querySelector('input[name="joinable_by_all"]');
        if (this.joinabilityToggle) {
            const joinabilityControl = this.joinabilityToggle.closest('.toggle-control');
            this.joinabilityLabels = joinabilityControl ? 
                Array.from(joinabilityControl.querySelectorAll('.toggle-label-left, .toggle-label-right')) : 
                null;
        }
    }

    /**
     * Create a message element to show when joinability is disabled
     */
    createMessageElement() {
        if (!this.joinabilityToggle) return;
        
        const joinabilitySetting = this.joinabilityToggle.closest('.toggle-setting');
        if (!joinabilitySetting) return;
        
        // Check if message element already exists
        this.joinabilityMessageElement = joinabilitySetting.querySelector('.joinability-disabled-message');
        
        if (!this.joinabilityMessageElement) {
            const translateMessage = window.i18n.translate('cr_it_ed.joinability_disabled_message');
            this.joinabilityMessageElement = document.createElement('div');
            this.joinabilityMessageElement.className = 'joinability-disabled-message';
            this.joinabilityMessageElement.dataset.i18n = 'cr_it_ed.joinability_disabled_message';
            this.joinabilityMessageElement.textContent = translateMessage;
            
            // Insert as child of the toggle-setting container for proper overlay positioning
            joinabilitySetting.appendChild(this.joinabilityMessageElement);
        }
    }

    elementsExist() {
        const hasVisibility = this.visibilityToggle && this.visibilityHidden && this.visibilityLabels && this.visibilityLabels.length >= 2;
        const hasJoinability = this.joinabilityToggle && this.joinabilityHidden && this.joinabilityLabels && this.joinabilityLabels.length >= 2;
        return hasVisibility && hasJoinability;
    }

    addEventListeners() {
        this.visibilityToggle.addEventListener('change', () => {
            console.log('Visibility toggle changed:', this.visibilityToggle.checked);
            this.updateToggleState('visibility');
            this.handleVisibilityDependency();
            this.triggerFormEvents('visible_to_all');
        });
        this.joinabilityToggle.addEventListener('change', () => {
            console.log('Joinability toggle changed:', this.joinabilityToggle.checked);
            this.updateToggleState('joinability');
            this.storeJoinabilityValue();
            this.triggerFormEvents('joinable_by_all');
        });
    }

    setInitialStates() {
        console.log('Setting initial states...');
        
        // Set toggles based on hidden field values (saved data)
        const visibilityValue = this.visibilityHidden.value;
        const joinabilityValue = this.joinabilityHidden.value;
        
        console.log('Hidden field values - Visibility:', visibilityValue, 'Joinability:', joinabilityValue);
        
        // Store the initial joinability value as the "previous" value
        this.previousJoinabilityValue = joinabilityValue;
        
        // Set checkbox states based on hidden field values
        // Value "1" = all users = checkbox unchecked (left position)
        // Value "0" = invitees only = checkbox checked (right position)
        this.visibilityToggle.checked = visibilityValue === '0';
        this.joinabilityToggle.checked = joinabilityValue === '0';
        
        console.log('Visibility toggle set to:', this.visibilityToggle.checked);
        console.log('Joinability toggle set to:', this.joinabilityToggle.checked);
        
        // Update visual states based on checkbox states
        this.updateToggleState('visibility');
        this.updateToggleState('joinability');
        
        // Handle initial dependency state
        this.handleVisibilityDependency();
    }

    /**
     * Handle the dependency between visibility and joinability
     */
    handleVisibilityDependency() {
        const visibilityValue = this.visibilityHidden.value;
        
        if (visibilityValue === '0') {
            // Visibility is "invitees only" - disable joinability
            this.disableJoinabilityToggle();
        } else {
            // Visibility is "all users" - enable joinability
            this.enableJoinabilityToggle();
        }
    }

    /**
     * Disable the joinability toggle when visibility is set to invitees only
     */
    disableJoinabilityToggle() {
        // Store current joinability value before disabling
        this.storeJoinabilityValue();
        
        // Set joinability to "invitees only" (0)
        this.joinabilityToggle.checked = true; // Checked = invitees only
        this.updateToggleState('joinability');
        
        // Disable the toggle
        this.joinabilityToggle.disabled = true;
        
        // Add disabled class to the toggle setting container
        const joinabilitySetting = this.joinabilityToggle.closest('.toggle-setting');
        if (joinabilitySetting) {
            joinabilitySetting.classList.add('disabled');
        }
        
        // Show the message
        if (this.joinabilityMessageElement) {
            this.joinabilityMessageElement.classList.add('show');
        }
        
        // Trigger form events for the forced change
        this.triggerFormEvents('joinable_by_all');
        
        console.log('Joinability toggle disabled - visibility is set to invitees only');
    }

    /**
     * Enable the joinability toggle when visibility is set to all users
     */
    enableJoinabilityToggle() {
        // Enable the toggle
        this.joinabilityToggle.disabled = false;
        
        // Remove disabled class from the toggle setting container
        const joinabilitySetting = this.joinabilityToggle.closest('.toggle-setting');
        if (joinabilitySetting) {
            joinabilitySetting.classList.remove('disabled');
        }
        
        // Hide the message
        if (this.joinabilityMessageElement) {
            this.joinabilityMessageElement.classList.remove('show');
        }
        
        // Restore previous joinability value
        this.restoreJoinabilityValue();
        
        console.log('Joinability toggle enabled - visibility is set to all users');
    }

    /**
     * Store the current joinability value for later restoration
     */
    storeJoinabilityValue() {
        // Only store if the toggle is not disabled
        if (!this.joinabilityToggle.disabled) {
            this.previousJoinabilityValue = this.joinabilityHidden.value;
            console.log('Stored joinability value:', this.previousJoinabilityValue);
        }
    }

    /**
     * Restore the previously stored joinability value
     */
    restoreJoinabilityValue() {
        // Set the toggle based on the stored value
        this.joinabilityToggle.checked = this.previousJoinabilityValue === '0';
        this.updateToggleState('joinability');
        
        // Trigger form events for the restored value
        this.triggerFormEvents('joinable_by_all');
        
        console.log('Restored joinability value:', this.previousJoinabilityValue);
    }

    /**
     * Universal toggle state updater
     * @param {string} type - Either 'visibility' or 'joinability'
     */
    updateToggleState(type) {
        let toggle, hiddenInput, labels, settingName;
        
        if (type === 'visibility') {
            toggle = this.visibilityToggle;
            hiddenInput = this.visibilityHidden;
            labels = this.visibilityLabels;
            settingName = 'Visibility';
        } else if (type === 'joinability') {
            toggle = this.joinabilityToggle;
            hiddenInput = this.joinabilityHidden;
            labels = this.joinabilityLabels;
            settingName = 'Joinability';
        } else {
            console.error('Invalid toggle type:', type);
            return;
        }

        // Clear all active classes from this toggle's labels
        labels.forEach(label => {
            label.classList.remove('active');
        });
        
        if (toggle.checked) {
            // Checked = circle on right = "invitees only" = value 0
            hiddenInput.value = '0';
            labels[1].classList.add('active'); // RIGHT label (invitees only)
            this.addBackgroundCircle(labels[1]);
            console.log(`${settingName}: Set to "invitees only" (value: 0)`);
        } else {
            // Unchecked = circle on left = "all users" = value 1
            hiddenInput.value = '1';
            labels[0].classList.add('active'); // LEFT label (all users)
            this.addBackgroundCircle(labels[0]);
            console.log(`${settingName}: Set to "all users" (value: 1)`);
        }
    }

    /**
     * Add a background circle behind the active label
     * @param {HTMLElement} label - The label element to add background to
     */
    addBackgroundCircle(label) {
        // Get the parent toggle-control container
        const toggleControl = label.closest('.toggle-control');
        if (!toggleControl) return;
        
        // Remove any existing background circle from THIS toggle only
        const existingCircles = toggleControl.querySelectorAll('.toggle-background-circle');
        existingCircles.forEach(circle => circle.remove());
        
        // Create the background circle
        const circle = document.createElement('div');
        circle.className = 'toggle-background-circle';
        
        // Determine if this is left or right label and add appropriate class
        if (label.classList.contains('toggle-label-left')) {
            circle.classList.add('left');
        } else if (label.classList.contains('toggle-label-right')) {
            circle.classList.add('right');
        }
        
        // Add as sibling within toggle-control
        toggleControl.appendChild(circle);
    }

    /**
     * Remove background circle from a label
     * @param {HTMLElement} label - The label element to remove background from
     */
    removeBackgroundCircle(label) {
        // This method is now just for backward compatibility
        this.removeAllBackgroundCircles();
    }

    /**
     * Remove all background circles from the toggle controls
     */
    removeAllBackgroundCircles() {
        // Remove from visibility control
        if (this.visibilityToggle) {
            const visibilityControl = this.visibilityToggle.closest('.toggle-control');
            const existingCircles = visibilityControl?.querySelectorAll('.toggle-background-circle');
            existingCircles?.forEach(circle => circle.remove());
        }
        
        // Remove from joinability control
        if (this.joinabilityToggle) {
            const joinabilityControl = this.joinabilityToggle.closest('.toggle-control');
            const existingCircles = joinabilityControl?.querySelectorAll('.toggle-background-circle');
            existingCircles?.forEach(circle => circle.remove());
        }
    }

    // Legacy methods for backward compatibility (just call the new method)
    updateVisibilityState() {
        this.updateToggleState('visibility');
    }

    updateJoinabilityState() {
        this.updateToggleState('joinability');
    }

    // Public method to manually update toggle states (if needed)
    updateToggles() {
        if (this.elementsExist()) {
            this.setInitialStates();
        }
    }

    // Public method to get current toggle values
    getValues() {
        return {
            visibleToAll: this.visibilityHidden?.value || '1',
            joinableByAll: this.joinabilityHidden?.value || '1'
        };
    }

    /**
     * Trigger form events for validation and change detection
     */
    triggerFormEvents(fieldName) {
        const hiddenInput = document.querySelector(`input[name="${fieldName}"]`);
        if (hiddenInput) {
            // Trigger native input event on the hidden field for form change detection
            const inputEvent = new Event('input', { bubbles: true, cancelable: true });
            hiddenInput.dispatchEvent(inputEvent);
            
            // Trigger the custom event bus for validation
            eventBus.emit('inputChanged', {
                formType: document.querySelector('#main-form')?.dataset.formType,
                fieldName: fieldName,
                fieldValue: hiddenInput.value
            });
        }
    }
}   