export class FormTogglesManager {
    constructor() {
        this.visibilityToggle = null;
        this.visibilityHidden = null;
        this.visibilityLabels = null;
        this.joinabilityToggle = null;
        this.joinabilityHidden = null;
        this.joinabilityLabels = null;
        
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

    elementsExist() {
        const hasVisibility = this.visibilityToggle && this.visibilityHidden && this.visibilityLabels && this.visibilityLabels.length >= 2;
        const hasJoinability = this.joinabilityToggle && this.joinabilityHidden && this.joinabilityLabels && this.joinabilityLabels.length >= 2;
        return hasVisibility && hasJoinability;
    }

    addEventListeners() {
        this.visibilityToggle.addEventListener('change', () => {
            console.log('Visibility toggle changed:', this.visibilityToggle.checked);
            this.updateToggleState('visibility');
        });
        this.joinabilityToggle.addEventListener('change', () => {
            console.log('Joinability toggle changed:', this.joinabilityToggle.checked);
            this.updateToggleState('joinability');
        });
    }

    setInitialStates() {
        console.log('Setting initial states...');
        console.log('Visibility toggle checked:', this.visibilityToggle.checked);
        console.log('Joinability toggle checked:', this.joinabilityToggle.checked);
        this.updateToggleState('visibility');
        this.updateToggleState('joinability');
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

        // Clear all active classes first
        labels.forEach(label => {
            label.classList.remove('active');
            this.removeBackgroundCircle(label);
        });
        
        if (toggle.checked) {
            // Checked = circle on right = "all users" = value 1
            hiddenInput.value = '1';
            labels[1].classList.add('active'); // RIGHT label (all users)
            this.addBackgroundCircle(labels[1]);
            console.log(`${settingName}: Set to "all users" (value: 1)`);
        } else {
            // Unchecked = circle on left = "invitees only" = value 0
            hiddenInput.value = '0';
            labels[0].classList.add('active'); // LEFT label (invitees only)
            this.addBackgroundCircle(labels[0]);
            console.log(`${settingName}: Set to "invitees only" (value: 0)`);
        }
    }

    /**
     * Add a background circle behind the active label
     * @param {HTMLElement} label - The label element to add background to
     */
    addBackgroundCircle(label) {
        // Remove any existing background circle first
        this.removeBackgroundCircle(label);
        
        // Create the background circle
        const circle = document.createElement('div');
        circle.className = 'toggle-background-circle';
        
        // Insert it as the first child so it appears behind the text
        label.insertBefore(circle, label.firstChild);
    }

    /**
     * Remove background circle from a label
     * @param {HTMLElement} label - The label element to remove background from
     */
    removeBackgroundCircle(label) {
        const existingCircle = label.querySelector('.toggle-background-circle');
        if (existingCircle) {
            existingCircle.remove();
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
}   