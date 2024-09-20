import { eventBus } from './eventBus.js';
import { SVGManager } from './svgManager.js';

export class ShelfUpdateManager {
  constructor(path) {
    this.path = path;
    this.initEventListeners();
  }

  initEventListeners() {
    eventBus.on('instaPublish', this.handleInstaPublish.bind(this));
    eventBus.on('instaDelete', this.handleInstaDelete.bind(this));
    eventBus.on('chooseWinner', this.handleChooseWinner.bind(this));
    eventBus.on('voteToggle', this.handleVoteToggle.bind(this));
  }

  handleInstaPublish({ textId, newStatus }) {
    const container = document.querySelector('#showcase[data-showcase="shelf"]');
    if (container) {
      const drawer = container.querySelector(`li[data-story-id="${textId}"]`);
      if (drawer) {
        // Update the drawer's status
        drawer.classList.remove('draft');
        drawer.classList.add(newStatus);

        // Remove "draft" text and add vote count
        const statusSpan = drawer.querySelector('.status');
        if (statusSpan) {
          statusSpan.innerHTML = `
            <span>
              <i>${SVGManager.votesSVG}</i>
              <span class="small" data-vote-count="0" data-player-count="0">
                0/0
              </span>
            </span>
          `;
        }

        // Update available actions
        const nodeButtons = drawer.querySelector('.node-buttons');
        if (nodeButtons) {
          // Remove all existing buttons
          nodeButtons.innerHTML = '';
          
          // Add the note button
          nodeButtons.innerHTML = `
            <form action="${this.path}text/edit" method="POST">
              <input type="hidden" name="id" value="${textId}">
              <button type="submit" class="note" value="Edit">
                ${SVGManager.addNoteSVG}
              </button>
            </form>
          `;
        }
      }
    }
  }

  handleInstaDelete({ textId }) {
    const container = document.querySelector('#showcase[data-showcase="shelf"]');
    if (container) {
      const drawer = container.querySelector(`li[data-story-id="${textId}"]`);
      if (drawer) {
        drawer.remove();
      } 
    }
  } 

  handleChooseWinner({ textId }) {
    const container = document.querySelector('#showcase[data-showcase="shelf"]');
    if (container) {
      const drawers = container.querySelectorAll('li');
      if (drawers) {
        drawers.forEach(drawer => {
            const nodeButtons = drawer.querySelector('.node-buttons');
            if (nodeButtons) {
              // Keep only the delete button if it exists
              const deleteButton = nodeButtons.querySelector('.delete');
              nodeButtons.innerHTML = '';
              if (deleteButton) {
                nodeButtons.appendChild(deleteButton);
              }
            }
            if (drawer.dataset.storyId === textId) {
                drawer.querySelector('.node-title').classList.add('isWinner');
                drawer.querySelector('.writing').classList.add('isWinner');
            }
        });
        
      }
    }
  }

  handleVoteToggle({ data }) {
    if (data.textId) {
        const shelfNode = document.querySelector(`.node[data-story-id="${data.textId}"]`);
        if (shelfNode) {
            const shelfResultsSpan = shelfNode.querySelector('[data-vote-count]');
            const shelfVoteButton = shelfNode.querySelector(`.vote[data-vote="${data.textId}"]`);

            // Update the vote count and button appearance for the shelf view
            shelfResultsSpan.innerHTML = `${data.voteCount} / ${data.playerCountMinusOne}`;
            shelfResultsSpan.setAttribute('data-vote-count', data.voteCount);

            if (data.voted) {
                shelfVoteButton.classList.add('voted');
            } else {
                shelfVoteButton.classList.remove('voted');
            }
        }
    }
  }


}