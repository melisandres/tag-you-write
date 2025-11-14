import { eventBus } from '../eventBus.js';

/**
 * SelectOtherField - Reusable component for select dropdown with "other" option
 * 
 * Handles the pattern where a select dropdown has an "other" option that switches
 * to a text input field. Manages visibility, value preservation, and validation.
 * 
 * @example
 * const field = new SelectOtherField({
 *     selectElement: document.querySelector('#subject'),
 *     textInputElement: document.querySelector('#subject-other'),
 *     otherValue: 'other',
 *     formType: 'contact'
 * });
 */
export class SelectOtherField {
    /**
     * @param {Object} options - Configuration options
     * @param {HTMLElement} options.selectElement - The select dropdown element
     * @param {HTMLElement} options.textInputElement - The text input element (shown when "other" is selected)
     * @param {HTMLElement} [options.textInputWrapper] - Wrapper element for text input (optional, for styling)
     * @param {HTMLElement} [options.changeButton] - Button to switch back to select (optional)
     * @param {string} [options.otherValue='other'] - Value in select that triggers text input
     * @param {string} [options.formType] - Form type for validation events (optional)
     * @param {string} [options.selectFieldName] - Field name for select validation (defaults to select name attribute)
     * @param {string} [options.textFieldName] - Field name for text validation (defaults to text input name attribute)
     * @param {number} [options.focusDelay=100] - Delay before focusing text input (ms)
     * @param {Function} [options.onValueChange] - Callback when value changes (value) => {}
     * @param {Function} [options.onVisibilityChange] - Callback when visibility changes (isTextVisible) => {}
     */
    constructor(options) {
        // Validate required elements
        if (!options.selectElement || !options.textInputElement) {
            throw new Error('SelectOtherField: selectElement and textInputElement are required');
        }

        // Store references
        this.selectElement = options.selectElement;
        this.textInputElement = options.textInputElement;
        this.textInputWrapper = options.textInputWrapper || null;
        this.changeButton = options.changeButton || null;

        // Configuration
        this.otherValue = options.otherValue || 'other';
        this.formType = options.formType || null;
        this.selectFieldName = options.selectFieldName || this.selectElement.name || 'select';
        this.textFieldName = options.textFieldName || this.textInputElement.name || 'text_input';
        this.focusDelay = options.focusDelay || 100;

        // Callbacks
        this.onValueChange = options.onValueChange || null;
        this.onVisibilityChange = options.onVisibilityChange || null;

        // State
        this.savedValue = ''; // Preserve text input value when switching away
        this.isTextVisible = false;

        // Bind event handlers
        this.boundHandleSelectChange = this.handleSelectChange.bind(this);
        this.boundHandleTextInput = this.handleTextInput.bind(this);
        this.boundHandleChangeButton = this.handleChangeButton.bind(this);

        // Initialize
        this.init();
    }

    /**
     * Initialize the component
     * Sets up event listeners and initial visibility state
     */
    init() {
        // Listen to select changes
        this.selectElement.addEventListener('change', this.boundHandleSelectChange);

        // Listen to text input changes (for value preservation)
        this.textInputElement.addEventListener('input', this.boundHandleTextInput);

        // Listen to change button clicks
        if (this.changeButton) {
            this.changeButton.addEventListener('click', this.boundHandleChangeButton);
        }

        // Set initial visibility based on current select value
        this.updateVisibility();
    }

    /**
     * Handle select dropdown change event
     * @param {Event} e - Change event
     */
    handleSelectChange(e) {
        this.updateVisibility();
    }

    /**
     * Handle text input changes (for value preservation)
     * @param {Event} e - Input event
     */
    handleTextInput(e) {
        // Save value as user types (for preservation when switching away)
        this.savedValue = e.target.value;

        // Emit validation event
        this.emitValidationEvent(this.textFieldName, e.target.value);

        // Call value change callback
        if (this.onValueChange) {
            this.onValueChange(this.getValue());
        }
    }

    /**
     * Handle change button click (switch back to select)
     * @param {Event} e - Click event
     */
    handleChangeButton(e) {
        e.preventDefault();
        this.switchToSelect();
    }

    /**
     * Update visibility based on current select value
     */
    updateVisibility() {
        const isOtherSelected = this.selectElement.value === this.otherValue;

        if (isOtherSelected) {
            this.showTextInput();
        } else {
            this.hideTextInput();
        }
    }

    /**
     * Show text input, hide select
     */
    showTextInput() {
        if (this.isTextVisible) return; // Already visible

        // Hide select, show text input
        this.selectElement.classList.add('display-none');
        if (this.textInputWrapper) {
            this.textInputWrapper.classList.remove('display-none');
        } else {
            this.textInputElement.classList.remove('display-none');
        }
        if (this.changeButton) {
            this.changeButton.classList.remove('display-none');
        }

        // Make text input required
        this.textInputElement.setAttribute('required', 'required');

        // Restore saved value if available
        if (this.savedValue) {
            this.textInputElement.value = this.savedValue;
        }

        // Focus text input after a short delay (allows DOM to update)
        setTimeout(() => {
            this.textInputElement.focus();
            // Emit validation event for text input
            this.emitValidationEvent(this.textFieldName, this.textInputElement.value);
        }, this.focusDelay);

        this.isTextVisible = true;

        // Call visibility change callback
        if (this.onVisibilityChange) {
            this.onVisibilityChange(true);
        }
    }

    /**
     * Hide text input, show select
     */
    hideTextInput() {
        if (!this.isTextVisible) return; // Already hidden

        // Show select, hide text input
        this.selectElement.classList.remove('display-none');
        if (this.textInputWrapper) {
            this.textInputWrapper.classList.add('display-none');
        } else {
            this.textInputElement.classList.add('display-none');
        }
        if (this.changeButton) {
            this.changeButton.classList.add('display-none');
        }

        // Remove required attribute
        this.textInputElement.removeAttribute('required');

        // Save text input value before hiding (preserve for toggle back)
        if (this.textInputElement.value) {
            this.savedValue = this.textInputElement.value;
        }
        // Don't clear the value - just hide it (value is preserved in savedValue)

        // Mark text field as valid since it's not required when hidden
        // This prevents validation errors when field is hidden
        if (window.validationManager && this.formType) {
            if (!window.validationManager.formValidity[this.formType]) {
                window.validationManager.formValidity[this.formType] = {};
            }
            window.validationManager.formValidity[this.formType][this.textFieldName] = {
                canAutosave: true,
                canPublish: true
            };
        }

        // Emit validation event for select
        this.emitValidationEvent(this.selectFieldName, this.selectElement.value);

        this.isTextVisible = false;

        // Call visibility change callback
        if (this.onVisibilityChange) {
            this.onVisibilityChange(false);
        }
    }

    /**
     * Switch back to select dropdown (used by change button)
     */
    switchToSelect() {
        // Reset select to empty to show the dropdown again
        this.selectElement.value = '';
        this.updateVisibility();

        // Focus the select after a short delay
        setTimeout(() => {
            this.selectElement.focus();
        }, this.focusDelay);
    }

    /**
     * Get current value (select value or text input value if "other" is selected)
     * @returns {string} Current value
     */
    getValue() {
        if (this.selectElement.value === this.otherValue) {
            return this.textInputElement.value || '';
        }
        return this.selectElement.value || '';
    }

    /**
     * Get display value (select option text or text input value)
     * @returns {string} Display value
     */
    getDisplayValue() {
        if (this.selectElement.value === this.otherValue) {
            return this.textInputElement.value || '';
        }
        // Get the text of the selected option
        const selectedOption = this.selectElement.options[this.selectElement.selectedIndex];
        return selectedOption ? (selectedOption.text || selectedOption.value) : '';
    }

    /**
     * Set saved value (for restoration from localStorage)
     * @param {string} value - Value to save
     */
    setSavedValue(value) {
        if (value) {
            this.savedValue = value;
            // If text input is currently visible, also set its value
            if (this.isTextVisible) {
                this.textInputElement.value = value;
            }
        }
    }

    /**
     * Reset component to initial state
     */
    reset() {
        this.selectElement.value = '';
        this.textInputElement.value = '';
        this.savedValue = '';
        this.updateVisibility();
    }

    /**
     * Emit validation event for the validation system
     * @param {string} fieldName - Field name
     * @param {string} fieldValue - Field value
     */
    emitValidationEvent(fieldName, fieldValue) {
        if (!eventBus) return;

        const eventData = {
            fieldName: fieldName,
            fieldValue: fieldValue
        };

        // Add formType if specified
        if (this.formType) {
            eventData.formType = this.formType;
        }

        eventBus.emit('inputChanged', eventData);
    }

    /**
     * Cleanup event listeners
     */
    destroy() {
        this.selectElement.removeEventListener('change', this.boundHandleSelectChange);
        this.textInputElement.removeEventListener('input', this.boundHandleTextInput);
        if (this.changeButton) {
            this.changeButton.removeEventListener('click', this.boundHandleChangeButton);
        }
    }
}

