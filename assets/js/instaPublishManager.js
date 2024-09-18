import { eventBus } from './eventBus.js';

export class InstaPublishManager {
    constructor(path, warningManager) {
      this.warningManager = warningManager;
      this.path = path;
      this.initEventListeners();
    }
  
    initEventListeners() {
      document.addEventListener('click', this.handleButtonClick.bind(this));
    }
  
    handleButtonClick(event) {
      const button = event.target.closest('#instaPublishButton');
      if (button) {
        const textId = button.getAttribute('data-text-id');
        this.showPublishWarning(textId);
      }
    }

    showPublishWarning(textId) {
        this.warningManager.createWarningModal(
            "Are you sure you want to publish this text? This action cannot be undone.",
            () => this.instaPublish(textId),
            () => console.log("Publish cancelled")
        );
    }
  
    async instaPublish(textId) {
      try {
        const formData = new FormData();
        formData.append('id', textId);

        const response = await fetch(`${this.path}text/instaPublish`, {
          method: 'POST',
          body: formData
        });
        
        if (response.ok) {
          const rawText = await response.text(); // Get the raw response text
          //console.log('Raw server response:', rawText); // Log the raw response

          try {
            const result = JSON.parse(rawText); // Try to parse it as JSON
            if (result.success) {
              // create an event that will update the views and the modal
              eventBus.emit('instaPublish', { textId, newStatus: 'published' });
            } else {
              //console.error('Insta-publish failed:', result.message);
            }
          } catch (jsonError) {
            //console.error('Error parsing JSON:', jsonError);
            //console.error('Raw response was:', rawText);
          }
        } else {
          //console.error('Server responded with an error:', response.status);
        }
      } catch (error) {
        //console.error('Error publishing text:', error);
      }
    }
  }