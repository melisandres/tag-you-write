import { eventBus } from './eventBus.js';

export class InstaPublishManager {
    constructor(warningManager) {
      this.warningManager = warningManager;
      this.path = document.querySelector('[data-base-url]').getAttribute('data-base-url');
      this.initEventListeners();
    }
  
    initEventListeners() {
      document.addEventListener('click', this.handleButtonClick.bind(this));
    }
  
    handleButtonClick(event) {
      const button = event.target.closest('[data-insta-publish-button]');
      if (button) {
        const textId = button.getAttribute('data-text-id');
        this.showPublishWarning(textId);
      }
    }

    showPublishWarning(textId) {
        this.warningManager.createWarningModal(
            "warning.publish",
            null,
            () => this.instaPublish(textId),
            () => console.log("Publish cancelled")
        );
    }
  
    async instaPublish(textId) {
      try {
        const formData = new FormData();
        formData.append('id', textId);
        const endpoint = 'text/instaPublish';
        const actionUrl = window.i18n.createUrl(endpoint);

        const response = await fetch(actionUrl, {
          method: 'POST',
          body: formData
        });
        
        if (response.ok) {
          const rawText = await response.text(); // Get the raw response text

          try {
            const result = JSON.parse(rawText); // Try to parse it as JSON
            if (result.success) {
              // Emit multiple events for different aspects of the update
              eventBus.emit('instaPublish', { 
                textId, 
                newStatus: 'published',
                gameData: result.gameData
              });
              
              // Update player counts if this was a new player
              if (result.gameData.isNewPlayer) {
                eventBus.emit('gamePlayerCountUpdate', {
                  newPlayerCount: result.gameData.playerCount,
                  gameId: result.gameData.gameId
                });
              }

              eventBus.emit('updateNode', {
                id: textId,
                playerCount: result.playerCount, 
                text_status: 'published'
              });

              // update the game data
              eventBus.emit('updateGame', result.gameData[0]);

              eventBus.emit('showToast', { 
                message: result.toastMessage, 
                type: result.toastType 
              });
            } else {
              console.error('Insta-publish failed:', result.message);
              // an event to show a toast for failure
              eventBus.emit('showToast', { 
                message: result.message, 
                type: 'error' // or any type you want for failure
              });
            }
          } catch (jsonError) {
            console.error('Error parsing JSON:', jsonError, 'Raw response:', rawText);
          }
        } else {
          console.error('Server responded with an error:', response.status);
        }
      } catch (error) {
        console.error('Error publishing text:', error);
      }
    }
  }