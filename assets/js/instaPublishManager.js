export class InstaPublishManager {
    constructor(path, storyManager, refreshManager) {
      this.path = path;
      this.container = document.querySelector('#showcase');
      this.storyManager = storyManager;
      this.refreshManager = refreshManager;

      this.initEventListeners();
    }
  
    initEventListeners() {
      document.addEventListener('click', this.handleButtonClick.bind(this));
    }
  
    handleButtonClick(event) {
      const button = event.target.closest('#instaPublishButton');
      if (button) {
        const textId = button.getAttribute('data-text-id');
        this.instaPublish(textId);
      }
    }
  
    async instaPublish(textId) {
      try {
        const formData = new FormData();
        formData.append('id', textId);
        // Append another variable to tell the Controller that this is an async request
        // TODO: handle async requests in the Controller
        //formData.append('async', true);

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
              this.refreshManager.saveState();
              this.updateViews(textId, 'published');
              this.updateModal(textId, 'published');
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
  
    updateViews(textId, newStatus) {
      // Update tree view
      this.updateTreeView(textId, newStatus);
  
      // Update shelf view
      this.updateShelfView(textId, newStatus);
  
      // Update modal (if open)
      this.updateModal(textId, newStatus);
  
      // Dispatch event for any other parts of the application that need to know
      const event = new CustomEvent('textStatusChanged', {
        detail: { textId, newStatus }
      });
      document.dispatchEvent(event);
    }
  
    updateTreeView(textId, newStatus) {
        if (this.container.classList.contains('with-tree')) {
            const circle = this.container.querySelector(`circle[data-id="${textId}"]`);
            const nodeGroup = circle.closest('g');

            // Update circle
            d3.select(circle)
            .classed('tree-node-draft', newStatus === 'draft')
            .classed('tree-node-published', newStatus === 'published');

            // Update title
            const titleText = nodeGroup.querySelector('text:not(.text-by)');
            d3.select(titleText)
            .classed('tree-title-draft', newStatus === 'draft')
            .classed('tree-title-published', newStatus === 'published');

            // Update author text
            const authorText = nodeGroup.querySelector('text.text-by');
            d3.select(authorText)
            .classed('tree-author-draft', newStatus === 'draft')
            .classed('tree-author-published', newStatus === 'published');

            // Update the "DRAFT" text in the author line if necessary
            if (authorText) {
                let authorContent = authorText.textContent;
                if (newStatus === 'draft' && !authorContent.startsWith('DRAFT')) {
                    authorText.textContent = 'DRAFT ' + authorContent;
                } else if (newStatus === 'published' && authorContent.startsWith('DRAFT')) {
                    authorText.textContent = authorContent.replace('DRAFT ', '');
                }
            }
        }
    
    }
  
    updateShelfView(textId) {
        // only update the auto-updated element
        if (this.container.classList.contains('with-shelf')) {
            this.storyManager.updateDrawer(textId);
        }
    }
  
    updateModal(textId) {
      const modal = document.querySelector('.modal-background[data-text-id="' + textId + '"]');
      if (modal) {
        this.storyManager.showStoryInModal(textId);
      }
    }
  }