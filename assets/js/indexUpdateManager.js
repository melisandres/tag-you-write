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
    eventBus.on('gamesUpdated', this.handleGamesUpdated.bind(this));
    eventBus.on('gameDataResponse', this.handleGameDataResponse.bind(this));
    this.makeTitlesShorter();
    eventBus.on('gameContributionStatusChanged', this.handleGameContributionStatusChanged.bind(this));
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


  handleInstaPublish({ textId, status}) {
    const textContainer = document.querySelector(`[data-story-id='${textId}']`);

    const gameContainer = textContainer ? textContainer.closest(`[data-game-id]`): document.querySelector(`.story.story-has-showcase`);
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

  handleChooseWinner({ textId }) {
    const textContainer = document.querySelector(`[data-id='${textId}']`) || document.querySelector(`[data-story-id='${textId}']`);

    const gameContainer = textContainer.closest(`[data-game-id]`);
    const statusIndicator = gameContainer.querySelector('.game-status-indicator');

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

  handleGamesUpdated(gameIds) {
    // Request the data for each updated game
    gameIds.forEach(gameId => {
        eventBus.emit('requestGameData', gameId);
    });
  }

 // TODO: handle game updates.
 handleGameDataResponse({gameId, data: gameData}) {
  const gameElement = document.querySelector(`[data-game-id="${gameId}"]`);
  if (gameElement && gameData) {
      const statusIndicator = gameElement.querySelector('.game-status-indicator');
      if (statusIndicator) {
          statusIndicator.className = `game-status-indicator ${
              gameData.pending ? 'pending' : 
              (gameData.openForChanges ? 'open' : 'closed')
          }`;
      }

      // TODO: added this-- it handles game updates... or should. Update other game elements using GameListRenderer
      if (this.renderer) {
          this.renderer.updateExistingGame(gameElement, gameData);
      }
    }
  }

  // TODO: I'm currently only triggering this on deleteNode, in the dataManager... that means, for now, we only ever go from contributed to not contributed, and we look for the .contributed class, rather than the h5 or whatever it is. 
  handleGameContributionStatusChanged({gameId, hasContributed}) {
    const gameElement = document.querySelector(`[data-game-id="${gameId}"] .contributed`);
    if(gameElement) {
      gameElement.classList.toggle('contributed', hasContributed);
    }
  }

 /*  // TODO: handle game updates. 
  handleGameDataResponse(gameId, gameData) {
    console.log("gameIds", gameIds);
    gameIds.forEach(gameId => {
      const gameElement = document.querySelector(`[data-game-id="${gameId}"]`);
      if (gameElement) {
        // Get updated game data from cache
        const gameData = window.dataManager.cache.games.get(gameId)?.data;
        if (gameData) {
          // Update status indicator
          const statusIndicator = gameElement.querySelector('.game-status-indicator');
          console.log("statusIndicator", statusIndicator);
          if (statusIndicator) {
            statusIndicator.className = `game-status-indicator ${gameData.pending ? 'pending' : (gameData.openForChanges ? 'open' : 'closed')}`;
            // Update status text...
          }
          
          // Update other UI elements as needed...
        }
      }
    });
  } */
}
