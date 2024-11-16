import { eventBus } from './eventBus.js';

export class IndexUpdateManager {
  constructor() {
    this.maxTitleChars = 50;
    this.init();
  }

  init() {
    eventBus.on('instaDelete', this.handleInstaDelete.bind(this));
    eventBus.on('instaPublish', this.handleInstaPublish.bind(this));
    eventBus.on('chooseWinner', this.handleChooseWinner.bind(this));
    this.makeTitlesShorter();
  }

  makeTitlesShorter() {
    const titles = document.querySelectorAll('.story-title h2 a');
    titles.forEach(title => {
      const originalText = title.textContent;
      if (originalText.length > this.maxTitleChars) {
        const truncatedText = originalText.slice(0, this.maxTitleChars) + '...';
        title.textContent = truncatedText;
        title.title = originalText; // Add full title as tooltip
      }
      title.style.maxWidth = 'none';
    });
  }

  handleInstaDelete({ textId, status}) {
    // this is the container has the text id being deleted, the whole game needs to be removed
    // The modal and the showcase will both have the "textId" attibute, and may both need to be removed
    const gameContainers = document.querySelectorAll(`[data-text-id='${textId}']`);
    if (gameContainers.length > 0) gameContainers.forEach(container => container.remove());
  }

  // TODO: test this
  handleInstaPublish({ textId, status}) {
    const textContainer = document.querySelector(`[data-story-id='${textId}']`);

    const gameContainer = textContainer ? textContainer.closest(`[data-game-id]`): document.querySelector(`.story.story-has-showcase`);
    console.log("gameContainer", gameContainer);
    const statusIndicator = gameContainer.querySelector('.game-status-indicator');
    console.log("statusIndicator", statusIndicator);
    if (statusIndicator && statusIndicator.classList.contains('pending')) {
      statusIndicator.classList.remove('pending');
      statusIndicator.classList.add('open');
      statusIndicator.innerHTML = `
        <p class="game-status">    
          <span>GAME</span>
          <span>OPEN</span>  
        </p>`;
    }
  }

  handleChooseWinner({ textId }) {
    console.log("textId", textId);
    const textContainer = document.querySelector(`[data-id='${textId}']`) || document.querySelector(`[data-story-id='${textId}']`);

    console.log("textContainer", textContainer);
    const gameContainer = textContainer.closest(`[data-game-id]`);
    console.log("gameContainer", gameContainer);
    const statusIndicator = gameContainer.querySelector('.game-status-indicator');
    console.log("statusIndicator", statusIndicator);
    if (statusIndicator && statusIndicator.classList.contains('open')) {
      statusIndicator.classList.remove('open');
      statusIndicator.classList.add('closed');
      statusIndicator.innerHTML = `
        <p class="game-status">    
          <span>GAME</span>
          <span>CLOSED</span>  
        </p>`;
    }
  }
}
