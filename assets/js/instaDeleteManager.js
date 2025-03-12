/* import { WarningManager } from './warningManager.js'; */
import { eventBus } from './eventBus.js';

export class InstaDeleteManager {
    constructor(warningManager) {
        this.warningManager = warningManager;
        this.initEventListeners();
    }

    initEventListeners() {
        document.addEventListener('click', this.handleButtonClick.bind(this));
    }

    handleButtonClick(event) {
        const button = event.target.closest('[data-insta-delete-button]');
        if (button) {
            const textId = button.getAttribute('data-text-id');
            this.showDeleteWarning(textId);
        }
    }

    showDeleteWarning(textId) {
        this.warningManager.createWarningModal(
            "Are you sure you want to delete this text? This action cannot be undone.",
            () => this.instaDelete(textId),
            () => console.log("Delete cancelled")
        );
    }

    async instaDelete(textId) {
        try {
            const formData = new FormData();
            formData.append('id', textId);
            formData.append('insta', '1');
            const endpoint = 'text/delete';
            const actionUrl = window.i18n.createUrl(endpoint);

            const response = await fetch(actionUrl, {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                const rawText = await response.text();

                try {
                    const result = JSON.parse(rawText);
                    if (result.success) {
                        // Delete the node from the data cache
                        eventBus.emit('deleteNode', textId);

                        // Show toast message
                        eventBus.emit('showToast', { 
                            message: result.toastMessage, 
                            type: result.toastType 
            });
                        // Update the tree, shelf and modal views
                        eventBus.emit('instaDelete', { textId });
                    } else {
                        console.log('Error:', result.message);
                        // Handle error
                    }
                } catch (jsonError) {
                    console.log('Problematic JSON string:', rawText); 
                    console.log('JSON parsing error:', jsonError);
                    // Handle JSON parsing error

                }
            } else {
                console.log('Server error:', response.statusText);
                // Handle server error
            }
        } catch (error) {
            console.log('Network error:', error); 
            // Handle network error
        }
    }
}
