import { eventBus } from './eventBus.js';
import { SVGManager } from './svgManager.js';
import { createColorScale } from './createColorScale.js';

export class ModalUpdateManager {
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
    const modal = document.querySelector(`.modal-background[data-text-id='${textId}'][data-tree-modal="visible"]`);
    if (modal) {
      // Update status
      const topInfo = modal.querySelector('.top-info');
      if (topInfo) {
        topInfo.classList.remove('draft');
        topInfo.classList.add('published');
        const statusSpan = topInfo.querySelector('.status');
        if (statusSpan) statusSpan.remove();

        // Update the votes section instead of replacing it
        const votesDiv = topInfo.querySelector('.votes');
        if (votesDiv) {
          // Keep existing player count
          const playerCount = votesDiv.querySelector('.vote-count').dataset.playerCount;
          
          // Just update visibility and initial vote count
          votesDiv.classList.remove('hidden');
          votesDiv.setAttribute('data-fill-color', 'rgb(255, 255, 255)');
          
          const voteCountSpan = votesDiv.querySelector('.vote-count');
          voteCountSpan.classList.remove('hidden');
          voteCountSpan.textContent = `0/${playerCount} votes`;
          voteCountSpan.setAttribute('data-vote-count', '0');
          
          // Set the SVG colors
          const svgPath = votesDiv.querySelector('svg path');
          if (svgPath) {
            svgPath.setAttribute('fill', 'rgb(255, 255, 255)');
            svgPath.setAttribute('stroke', 'black');
            svgPath.setAttribute('stroke-width', '2');
          }
        }
      }

      // Update buttons
      const modalBtns = modal.querySelector('.modal-dynamic-btns');
      if (modalBtns) {
        modalBtns.innerHTML = `
          <form action="${this.path}text/edit" method="POST" class="note-form">
            <input type="hidden" name="id" value="${textId}">
            <button type="submit" class="note">
              ${SVGManager.addNoteSVG}
            </button>
          </form>
        `;
      }
    }
  }

  handleInstaDelete({ textId }) {
    const modal = document.querySelector(`.modal-background[data-text-id='${textId}'][data-tree-modal="visible"]`);
    if (modal) {
      modal.dataset.textId = '';
      modal.dataset.treeModal = "hidden";
      modal.classList.add('display-none');
      
      // Clear content
      const modalContent = modal.querySelector('.modal-dynamic-content');
      const modalBtns = modal.querySelector('.modal-dynamic-btns');
      if (modalContent) modalContent.innerHTML = '';
      if (modalBtns) modalBtns.innerHTML = '';
    }
  }

  handleChooseWinner({ textId }) {
    const modal = document.querySelector(`.modal-background[data-text-id='${textId}'][data-tree-modal="visible"]`);
    if (modal) {
      // Remove all buttons except the close button
      const modalBtns = modal.querySelector('.modal-dynamic-btns');
      if (modalBtns) {
        modalBtns.innerHTML = '';
      }

      // Update status to indicate it's the winning text
      const topInfo = modal.querySelector('.top-info');
      if (topInfo) {
        // add winner class
        topInfo.classList.add('winner');
        const statusSpan = topInfo.querySelector('.status') || document.createElement('span');
        statusSpan.className = 'status winner';
        statusSpan.textContent = 'WINNER';
        topInfo.appendChild(statusSpan);

        // change the vote count to +1
        const voteCountSpan = topInfo.querySelector('.vote-count');
        if (voteCountSpan) {
          voteCountSpan.dataset.voteCount = parseInt(voteCountSpan.dataset.voteCount) + 1;
          voteCountSpan.innerHTML = `${voteCountSpan.dataset.voteCount}/${voteCountSpan.dataset.playerCount} votes`;
        }

        // create max color
        const colorScale = createColorScale(1);
        const fillColor = colorScale(1);

        // Replace the votes SVG with the star SVG
        const votesIcon = topInfo.querySelector('.votes i');
        if (votesIcon) {
          votesIcon.innerHTML = SVGManager.starSVG;
          votesIcon.querySelector('path').setAttribute('fill', fillColor);
        }
      }

      // Add 'isWinner' class to modal-text
      const modalText = modal.querySelector('.modal-text');
      if (modalText) {
        modalText.classList.add('isWinner');
      }
    }
  }

  handleVoteToggle({ data }) {
    const container = document.querySelector("[data-tree-modal='visible']");
    if (!container) {
        return;
    }
    const modalTextId = container.dataset.textId;
    if (modalTextId !== data.id) {
      return;
    }

    const resultsSpan = container.querySelector('.vote-count.small');
    const votesIcon = container.querySelector('.votes i svg path');
    const button = container.querySelector('.vote[data-vote]');
    const playerCountMinusOne = data.playerCountMinusOne || data.playerCount - 1;

    // Update vote button state
    if (data.hasVoted) {
      if (button) button.classList.add('voted');
    } else {
      if (button) button.classList.remove('voted');
    }

    // Update vote count display
    resultsSpan.innerHTML = `${data.voteCount}/${playerCountMinusOne} votes`;
    resultsSpan.setAttribute('data-vote-count', data.voteCount);

    // Update color based on vote count
    const colorScale = createColorScale(playerCountMinusOne);
    const fillColor = colorScale(data.voteCount);
    
    // Update the votes icon color
    if (votesIcon) {
        votesIcon.setAttribute('fill', fillColor);
    }

    // Update the parent div's data attribute
    const votesDiv = container.querySelector('.votes');
    if (votesDiv) {
        votesDiv.setAttribute('data-fill-color', fillColor);
    }
  }

  handleGamePlayerCountUpdate({ gameId, newPlayerCount }) {
    const modal = document.querySelector('.modal-background[data-tree-modal="visible"]');
    if (!modal) return;

    const votesDiv = modal.querySelector('.votes');
    if (!votesDiv) return;

    const voteCountSpan = votesDiv.querySelector('.vote-count');
    if (!voteCountSpan) return;

    // Get current vote count
    const currentVotes = parseInt(voteCountSpan.dataset.voteCount || '0');
    
    // Update the display with new player count
    voteCountSpan.textContent = `${currentVotes}/${newPlayerCount - 1} votes`;
    voteCountSpan.dataset.playerCount = (newPlayerCount - 1).toString();
  }
}
