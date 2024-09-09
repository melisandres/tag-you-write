import { WarningManager } from './warningManager.js';

export class InstaDeleteManager {
    constructor(path, storyManager, refreshManager) {
        this.path = path;
        this.container = document.querySelector('#showcase');
        this.storyManager = storyManager;
        this.refreshManager = refreshManager;
        this.warningManager = new WarningManager();

        this.initEventListeners();
    }

    initEventListeners() {
        document.addEventListener('click', this.handleButtonClick.bind(this));
    }

    handleButtonClick(event) {
        const button = event.target.closest('#instaDeleteButton');
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

            const response = await fetch(`${this.path}text/delete`, {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                const rawText = await response.text();

                try {
                    const result = JSON.parse(rawText);
                    if (result.success) {
                        //this.refreshManager.saveState();
                        this.removeViews(textId);
                    } else {
                        console.log('Error:', result.message);
                        // Handle error
                    }
                } catch (jsonError) {
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

    removeViews(textId) {
        // Remove from tree view
        this.removeFromTreeView(textId);

        // Remove from shelf view
        this.removeFromShelfView(textId);

        // Close modal if open
        this.closeModal(textId);

        // Dispatch event for any other parts of the application that need to know
        const event = new CustomEvent('textDeleted', {
            detail: { textId }
        });
        document.dispatchEvent(event);
    }

    removeFromTreeView(textId) {
        if (this.container.classList.contains('with-tree')) {
            const nodeGroup = this.container.querySelector(`g[data-id="${textId}"]`);
            if (nodeGroup) {
                nodeGroup.remove();
            }
        }
    }

    removeFromShelfView(textId) {
        if (this.container.classList.contains('with-shelf')) {
            const drawer = this.container.querySelector(`li[data-story-id="${textId}"]`);
            drawer.remove();
        }
    }

    closeModal(textId) {
        const modal = document.querySelector(`.modal-background[data-text-id="${textId}"]`);
        if (modal) {
            modal.remove();
        }
    }
}
