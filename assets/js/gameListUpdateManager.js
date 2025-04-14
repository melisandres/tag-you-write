import { eventBus } from './eventBus.js';

export class GameListUpdateManager {
  constructor() {
    this.maxTitleChars = 50;
    this.init();
  }

  init() {
    eventBus.on('instaDelete', this.handleInstaDelete.bind(this));
    eventBus.on('instaPublish', this.handleInstaPublish.bind(this));
    eventBus.on('chooseWinner', this.handleChooseWinner.bind(this));
    
    /* DEPRECATED: Old event system replaced by specific event handlers
     * These events were part of an old polling/request system that has been
     * replaced by a more granular event system handled by GamesModifiedHandler.
     * The functionality is now covered by specific event handlers below.
     */
    /* eventBus.on('gamesUpdated', this.handleGamesUpdated.bind(this)); */
    /* eventBus.on('gameDataResponse', this.handleGameDataResponse.bind(this)); */
    this.makeTitlesShorter();

    /* eventBus.on('gamesModified', (games) => this.handleGameUpdates(games)); */
    
    // New event listeners for specific game updates
    eventBus.on('gameContributionStatusChanged', this.handleGameContributionStatusChanged.bind(this));
    eventBus.on('updateGameStatus', this.handleGameStatusUpdate.bind(this));
    eventBus.on('updateGameCounts', this.handleGameCountsUpdate.bind(this));
    eventBus.on('updateGameTitle', this.handleGameTitleUpdate.bind(this));
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

      // translate the strings
      const gameText = window.i18n.translate('general.game');
      const openText = window.i18n.translate('general.open');

      // update the status indicator
      statusIndicator.innerHTML = `
        <p class="game-status">    
          <span data-i18n="general.game">${gameText}</span>
          <span data-i18n="general.open">${openText}</span>  
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
      const gameText = window.i18n.translate('general.game');
      const closedText = window.i18n.translate('general.closed');
      statusIndicator.innerHTML = `
        <p class="game-status">    
          <span data-i18n="general.game">${gameText}</span>
          <span data-i18n="general.closed">${closedText}</span>  
        </p>`;
    }
  }

/*   handleGamesUpdated(gameIds) {
    // Request the data for each updated game
    gameIds.forEach(gameId => {
        eventBus.emit('requestGameData', gameId);
    });
  } */

/*  // TODO: handle game updates.
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

      // TODO: added this-- it would handle game updates... if there were a this.renderer or should. Update other game elements using GameListRenderer. The thing would be to create an event in the eventBus to handle this. but... I thought the logic was in place, so the following line may not be needed for functionality. to be investigated. 
      if (this.renderer) {
          this.renderer.updateExistingGame(gameElement, gameData);
      }
    }
  } */

  // TODO: I'm currently only triggering this on deleteNode, in the dataManager... that means, for now, we only ever go from contributed to not contributed, and we look for the .contributed class, rather than the h5 or whatever it is. 
  handleGameContributionStatusChanged({gameId, hasContributed}) {
    const gameElement = document.querySelector(`[data-game-id="${gameId}"] .contributed`);
    if(gameElement) {
      gameElement.classList.toggle('contributed', hasContributed);
      gameElement.setAttribute('data-i18n-tooltip', hasContributed ? 'tooltips.contributor' : '');
    }

  }

  /* DEPRECATED: Old game update handling system
   * This method has been replaced by specific handlers (handleGameStatusUpdate,
   * handleGameCountsUpdate, handleGameTitleUpdate) that are triggered by
   * the GamesModifiedHandler class. The old system used a single method to
   * handle all updates, while the new system breaks down updates into specific
   * events for better maintainability and clarity.
   */
  /* handleGameUpdates(games) {
    // Update the UI directly without emitting events that would trigger DataManager again
     if (Array.isArray(games)) {
        games.forEach(game => {
            // Find the game element in the DOM
            const gameElement = document.querySelector(`.story[data-game-id="${game.game_id}"]`);
            if (gameElement) {
                // Update the game status indicator
                const gameStatusIndicator = gameElement.querySelector('.game-status-indicator');
                if (gameStatusIndicator) {
                    const isOpen = game.openForChanges === '1' || game.openForChanges === true || game.openForChanges === 1;
                    
                    // Update the game status indicator CSS class
                    gameStatusIndicator.classList.toggle('open', isOpen);
                    gameStatusIndicator.classList.toggle('closed', !isOpen);
                    
                    // Update the game status text
                    const gameText = window.i18n.translate('general.game');
                    if (isOpen) {
                        const openText = window.i18n.translate('general.open');
                        gameStatusIndicator.querySelector('.game-status').innerHTML = 
                            `<span data-i18n="general.game">${gameText}</span>
                            <span data-i18n="general.open">${openText}</span>`;
                    } else {
                        const closedText = window.i18n.translate('general.closed');
                        gameStatusIndicator.querySelector('.game-status').innerHTML = 
                            `<span data-i18n="general.game">${gameText}</span>
                            <span data-i18n="general.closed">${closedText}</span>`;
                    }
                }
                
                // Update counts
                if (game.unseen_count !== undefined) {
                    gameElement.dataset.unseenCount = game.unseen_count;
                }
                if (game.seen_count !== undefined) {
                    gameElement.dataset.seenCount = game.seen_count;
                }
                if (game.text_count !== undefined) {
                    gameElement.dataset.textCount = game.text_count;
                }
                
                // Update title and unreads status
                const titleDiv = gameElement.querySelector('.story-title');
                if (titleDiv && this.userLoggedIn && game.unseen_count !== undefined) {
                    titleDiv.classList.toggle('unreads', game.unseen_count > 0);
                }
            }
        });
    } 
} */

  // New method to handle game status updates
  handleGameStatusUpdate({ game_id, changes }) {
    const gameElement = document.querySelector(`.story[data-game-id="${game_id}"]`);
    if (!gameElement) return;
    
    const gameStatusIndicator = gameElement.querySelector('.game-status-indicator');
    if (!gameStatusIndicator) return;
    
    const isOpen = changes.status === '1' || changes.status === true || changes.status === 1;
    
    // Update the game status indicator CSS class
    gameStatusIndicator.classList.toggle('open', isOpen);
    gameStatusIndicator.classList.toggle('closed', !isOpen);
    
    // Update the game status text
    const gameText = window.i18n.translate('general.game');
    if (isOpen) {
        const openText = window.i18n.translate('general.open');
        gameStatusIndicator.querySelector('.game-status').innerHTML = 
            `<span data-i18n="general.game">${gameText}</span>
            <span data-i18n="general.open">${openText}</span>`;
    } else {
        const closedText = window.i18n.translate('general.closed');
        gameStatusIndicator.querySelector('.game-status').innerHTML = 
            `<span data-i18n="general.game">${gameText}</span>
            <span data-i18n="general.closed">${closedText}</span>`;
    }
  }
  
  // New method to handle game counts updates
  handleGameCountsUpdate({ game_id, changes }) {
    const gameElement = document.querySelector(`.story[data-game-id="${game_id}"]`);
    if (!gameElement) return;
    
    // Update counts
    if (changes.counts.unseen !== undefined) {
        gameElement.dataset.unseenCount = changes.counts.unseen;
    }
    if (changes.counts.seen !== undefined) {
        gameElement.dataset.seenCount = changes.counts.seen;
    }
    if (changes.counts.text !== undefined) {
        gameElement.dataset.textCount = changes.counts.text;
    }
    
    // Update title and unreads status
    const titleDiv = gameElement.querySelector('.story-title');
    if (titleDiv && this.userLoggedIn && changes.counts.unseen !== undefined) {
        titleDiv.classList.toggle('unreads', changes.counts.unseen > 0);
    }
  }
  
  // New method to handle game title updates
  handleGameTitleUpdate({ game_id, changes }) {
    const gameElement = document.querySelector(`.story[data-game-id="${game_id}"]`);
    if (!gameElement) return;
    
    const titleElement = gameElement.querySelector('.story-title h2 a');
    if (!titleElement) return;
    
    // Update the title
    const originalText = changes.title || window.i18n.translate("general.untitled");
    titleElement.textContent = originalText;
    
    // Apply the same title shortening logic
    if (originalText.length > this.maxTitleChars) {
        const truncatedText = originalText.slice(0, this.maxTitleChars) + '...';
        titleElement.textContent = truncatedText;
        titleElement.title = originalText; // Add full title as tooltip
    }
    
    // Reapply search highlighting if there's an active search
    this.reapplySearchHighlighting();
  }

  
  // New method to reapply search highlighting after updates
  reapplySearchHighlighting() {
    const activeSearch = window.dataManager.getSearch();
    if (activeSearch) {
      eventBus.emit('highlightSearchMatches', {
        container: document.querySelector('.stories'),
        searchTerm: activeSearch
      });
    }
  }
}
