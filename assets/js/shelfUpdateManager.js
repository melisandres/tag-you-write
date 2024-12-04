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
    eventBus.on('gamePlayerCountUpdate', this.handleGamePlayerCountUpdate.bind(this));
  }

  handleInstaPublish({ textId, newStatus }) {
    const container = document.querySelector('#showcase[data-showcase="shelf"]');
    if (container) {
      const drawer = container.querySelector(`li[data-story-id="${textId}"]`);
      if (drawer) {
        // Update the drawer's status
        drawer.classList.remove('draft');
        drawer.classList.add(newStatus);

        // Update vote count display using existing data attributes
        const votesDiv = drawer.querySelector('.votes');
        if (votesDiv) {
          const voteCountSpan = votesDiv.querySelector('.vote-count');
          const playerCount = voteCountSpan.dataset.playerCount;
          
          // Update visibility and colors
          voteCountSpan.classList.remove('hidden');
          
          // Use same color logic as ShelfVisualizer
          const colorScale = createColorScale(playerCount);
          const fillColor = colorScale(0);  // Start with 0 votes
          
          votesDiv.setAttribute('data-fill-color', fillColor);
          const svgPath = votesDiv.querySelector('svg path');
          if (svgPath) {
            svgPath.setAttribute('fill', fillColor);
            svgPath.setAttribute('stroke', 'black');
            svgPath.setAttribute('stroke-width', '2');
          }
        }

        // Remove "draft" text
        const statusSpan = drawer.querySelector('[data-status]');
        if (statusSpan) {
          statusSpan.innerHTML = '';
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
    if ( data.id) {
      const playerCountMinusOne = data.playerCountMinusOne || data.playerCount - 1;
      const shelfNode = document.querySelector(`.node[data-story-id="${data.id}"]`);
      if (shelfNode) {
            // Need to update vote count display to match new structure
            const votesDiv = shelfNode.querySelector('.votes');
            if (votesDiv) {
                const voteCountSpan = votesDiv.querySelector('.vote-count');
                voteCountSpan.textContent = `${data.voteCount}/${playerCountMinusOne} votes`;
                voteCountSpan.setAttribute('data-vote-count', data.voteCount);
                
                // Need to update color scale
                const maxVotes = playerCountMinusOne;
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
            const shelfVoteButton = shelfNode.querySelector(`.vote[data-vote="${data.id}"]`);

            if (data.hasVoted) {
                shelfVoteButton.classList.add('voted');
            } else {
                shelfVoteButton.classList.remove('voted');
            }
        }
    }
  }

  handleGamePlayerCountUpdate({ gameId, newPlayerCount }) {
    const container = document.querySelector('#showcase[data-showcase="shelf"]');
    if (!container) return;
    
    // Update all vote displays in the shelf
    const voteDisplays = container.querySelectorAll('.votes');
    voteDisplays.forEach(votesDiv => {
      const voteCountSpan = votesDiv.querySelector('.vote-count');
      if (voteCountSpan) {
        const currentVotes = parseInt(voteCountSpan.dataset.voteCount);
        const maxVotes = newPlayerCount - 1;
        
        // Update the display
        voteCountSpan.textContent = `${currentVotes}/${maxVotes} votes`;
        voteCountSpan.dataset.playerCount = maxVotes;
        
        // Update colors
        const colorScale = createColorScale(maxVotes);
        const fillColor = colorScale(currentVotes);
        votesDiv.setAttribute('data-fill-color', fillColor);
        
        const svgPath = votesDiv.querySelector('svg path');
        if (svgPath) {
          svgPath.setAttribute('fill', fillColor);
        }
      }
    });
    // Add vote buttons to all published nodes
    const nodeGroups = container.querySelectorAll('li.node');
    nodeGroups.forEach(nodeGroup => {
        // Check if published
        if (!nodeGroup.classList.contains('published')) return;
        
        // TODO: replace with user id check
        // Check if not user's own text
        const authorSpan = nodeGroup.querySelector('span.author');
        console.log("authorSpan", authorSpan)
        if (authorSpan?.textContent === 'by you') return;
        
        const nodeButtons = nodeGroup.querySelector('.node-buttons');
        if (!nodeButtons) return;

        const existingVoteButton = nodeButtons.querySelector('.vote');
        if (existingVoteButton) return;

        // Find the iterate form
        const iterateForm = nodeButtons.querySelector('form');
        if (!iterateForm) return;

        const textId = nodeGroup.dataset.storyId;
        if (!textId) return;

        const voteButton = document.createElement('button');
        voteButton.className = 'vote';
        voteButton.setAttribute('data-vote', textId);
        voteButton.innerHTML = SVGManager.voteSVG;
        
        iterateForm.parentNode.insertBefore(voteButton, iterateForm.nextSibling);
    });
  }

}
