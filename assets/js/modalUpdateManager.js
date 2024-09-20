import { eventBus } from './eventBus.js';
import { SVGManager } from './svgManager.js';

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
      modal.dataset.treeModal = "hidden";
      modal.classList.add('display-none');
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
        topInfo.classList.add('winner');
        const statusSpan = topInfo.querySelector('.status') || document.createElement('span');
        statusSpan.className = 'status';
        statusSpan.textContent = 'Winner';
        topInfo.appendChild(statusSpan);
      }
    }
  }

  handleVoteToggle({ data }) {
    const container = document.querySelector("[data-tree-modal='visible']");
    if (!container) {
        return;
    }

    //TODO: should I really be sending the button? I can probably get .vote-info .small without it.
    //const resultsSpan = button.closest(".modal-with-btns").querySelector('.vote-info .small');
    const resultsSpan = container.querySelector('.vote-info .small');
    const numberOfVotes = data.voteCount;
    const numberOfPlayers = data.playerCountMinusOne;
    const button = container.querySelector('.vote[data-vote]');

    if (data.voted) {
        button.classList.add('voted');
    } else {
        button.classList.remove('voted');
    }

    resultsSpan.innerHTML = `${numberOfVotes} / ${numberOfPlayers}`;
    resultsSpan.setAttribute('data-vote-count', numberOfVotes);
  }
}