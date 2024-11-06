import { eventBus } from './eventBus.js';
import { SVGManager } from './svgManager.js';
import { createColorScale } from './createColorScale.js';

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

        // Update vote count display - needs to match new getNumberOfVotes structure
        const votesDiv = drawer.querySelector('.votes');
        if (votesDiv) {
          votesDiv.innerHTML = `
            <i>${SVGManager.votesSVG}</i>
            <span class="small vote-count" data-vote-count="0" data-player-count="0">
              0/0
            </span>
          `;
          // Need to add data-fill-color attribute and apply SVG colors
          votesDiv.setAttribute('data-fill-color', '');
        }

        // Remove "draft" text
        const statusSpan = drawer.querySelector('[data-status]');
        if (statusSpan) {
          statusSpan.innerHTML = '';
        }

        //Add the vote count to the node
        const voteCountSpan = drawer.querySelector('[data-vote-count]');
        if (voteCountSpan) {
          voteCountSpan.innerHTML = `
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
              drawer.querySelector('.node-headline').classList.add('isWinner');
              drawer.querySelector('.writing').classList.add('isWinner');

              // Add the winner status span
              const statusSpan = document.createElement('span');
              statusSpan.className = 'status';
              statusSpan.innerHTML = `
                <span data-status="" class="status winner">
                  WINNER
                </span>
              `;
              drawer.querySelector('.node-headline').appendChild(statusSpan);

              // Update the shelf heart to a star, and color it
              const shelfHeart = drawer.querySelector('.shelf-heart');
              if (shelfHeart) {
                shelfHeart.innerHTML = SVGManager.starSVG;
                const colorScale = createColorScale(1);
                const fillColor = colorScale(1);
                shelfHeart.querySelector('path').setAttribute('fill', fillColor);
              }
            }
        });
        
      }
    }
  }

  handleVoteToggle({ data }) {
    if (data.textId) {
        const shelfNode = document.querySelector(`.node[data-story-id="${data.textId}"]`);
        if (shelfNode) {
            // Need to update vote count display to match new structure
            const votesDiv = shelfNode.querySelector('.votes');
            if (votesDiv) {
                const voteCountSpan = votesDiv.querySelector('.vote-count');
                voteCountSpan.textContent = `${data.voteCount}/${data.playerCountMinusOne} votes`;
                voteCountSpan.setAttribute('data-vote-count', data.voteCount);
                
                // Need to update color scale
                const maxVotes = data.playerCountMinusOne;
                const colorScale = createColorScale(maxVotes);
                const fillColor = colorScale(data.voteCount);
                votesDiv.setAttribute('data-fill-color', fillColor);
                
                // Apply the new color
                const svgPath = votesDiv.querySelector('svg path');
                if (svgPath) {
                    svgPath.setAttribute('fill', fillColor);
                }
            }
            // Update the vote count and button appearance for the shelf view
            const shelfResultsSpan = shelfNode.querySelector('[data-vote-count]');
            const shelfVoteButton = shelfNode.querySelector(`.vote[data-vote="${data.textId}"]`);

            if (data.voted) {
                shelfVoteButton.classList.add('voted');
            } else {
                shelfVoteButton.classList.remove('voted');
            }
        }
    }
  }


}
