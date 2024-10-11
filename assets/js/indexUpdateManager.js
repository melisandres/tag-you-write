import { eventBus } from './eventBus.js';

export class IndexUpdateManager {
  constructor() {
    this.maxTitleChars = 50;
    this.init();
  }

  init() {
    eventBus.on('instaDelete', this.handleInstaDelete.bind(this));
    eventBus.on('instaPublish', this.handleInstaPublish.bind(this));
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
    const gameContainer = document.querySelector(`[data-stories]>[data-text-id="${textId}"]`);
    if (gameContainer) gameContainer.innerHTML = '';
  }

  // TODO: test this
  handleInstaPublish({ textId, status}) {
    const gameContainer = document.querySelector(`[data-stories]>[data-text-id="${textId}"]`);
    const statusIndicator = gameContainer.querySelector('.game-status-indicator');
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
}