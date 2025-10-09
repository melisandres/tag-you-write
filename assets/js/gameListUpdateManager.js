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
    eventBus.on('gameStatusChanged', this.handleGameStatusUpdate.bind(this));
    eventBus.on('gameCountsChanged', this.handleGameCountsUpdate.bind(this));
    eventBus.on('gameTitleChanged', this.handleGameTitleUpdate.bind(this));
    eventBus.on('gameActivityChanged', this.handleGameActivityUpdate.bind(this));
    eventBus.on('gamesRemovedFromView', this.handleGamesRemoved.bind(this));
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
  handleGameContributionStatusChanged(newGame) {
    const gameElement = document.querySelector(`[data-game-id="${newGame.game_id}"]`);
    if (!gameElement) return;
    
    const h2Element = gameElement.querySelector('h2');
    if (h2Element) {
      const hasContributed = newGame.hasContributed === '1' || newGame.hasContributed === true || newGame.hasContributed === 1;
      h2Element.classList.toggle('contributed', hasContributed);
      if (hasContributed) {
        const translatedTooltip = window.i18n ? window.i18n.translate('tooltips.contributor') : '☆ contributor';
        h2Element.setAttribute('data-i18n-tooltip', 'tooltips.contributor');
        h2Element.setAttribute('data-tooltip-text', translatedTooltip);
      } else {
        h2Element.removeAttribute('data-i18n-tooltip');
        h2Element.removeAttribute('data-tooltip-text');
      }
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
  handleGameStatusUpdate(newGame) {
    console.log('handleGameStatusUpdate', { newGame });
    const gameElement = document.querySelector(`.story[data-game-id="${newGame.game_id}"]`);
    console.log('gameElement for status update', gameElement);
    if (!gameElement) return;
    
    const gameStatusIndicator = gameElement.querySelector('.game-status-indicator');
    if (!gameStatusIndicator) return;
    
    const isOpen = newGame.openForChanges === '1' || newGame.openForChanges === true || newGame.openForChanges === 1;
    
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
  handleGameCountsUpdate(newGame) {
    const gameElement = document.querySelector(`.story[data-game-id="${newGame.game_id}"]`);
    if (!gameElement) return;
    
    // Update counts
    if (newGame.unseen_count !== undefined) {
        gameElement.dataset.unseenCount = newGame.unseen_count;
    }
    if (newGame.seen_count !== undefined) {
        gameElement.dataset.seenCount = newGame.seen_count;
    }
    if (newGame.text_count !== undefined) {
        gameElement.dataset.textCount = newGame.text_count;
    }
    
    // Update title and unreads status
    const titleDiv = gameElement.querySelector('.story-title');
    if (titleDiv && newGame.unseen_count !== undefined) {
        titleDiv.classList.toggle('unreads', newGame.unseen_count > 0);
    }
  }
  
  // To be fair, a title update will probably never happen... unless a user is logged in on two devices... and we want the title to update on the device they are not working from... but there may be reasons to keep this. 
  handleGameTitleUpdate(newGame) {
    const gameElement = document.querySelector(`.story[data-game-id="${newGame.game_id}"]`);
    if (!gameElement) return;
    
    const titleElement = gameElement.querySelector('.story-title h2 a');
    if (!titleElement) return;
    
    // Update the title
    const originalText = newGame.title || window.i18n.translate("general.untitled");
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

  
  // New method to handle game activity updates
  handleGameActivityUpdate(activityData) {
    console.log('🎮 GameListUpdateManager: handleGameActivityUpdate called with:', activityData);
    
    const { gameId, browsing, writing } = activityData;
    const gameElement = document.querySelector(`.story[data-game-id="${gameId}"]`);
    
    console.log('🎮 GameListUpdateManager: Looking for game element with gameId:', gameId);
    console.log('🎮 GameListUpdateManager: Found game element:', !!gameElement);
    
    if (!gameElement) {
      console.warn('🎮 GameListUpdateManager: No game element found for gameId:', gameId);
      return;
    }
    
    const activityIndicator = gameElement.querySelector('.game-activity-indicator');
    console.log('🎮 GameListUpdateManager: Found activity indicator:', !!activityIndicator);
    
    if (!activityIndicator) {
      console.warn('🎮 GameListUpdateManager: No activity indicator found in game element');
      return;
    }
    
    // Update activity numbers
    const activityNumbers = activityIndicator.querySelector('.activity-numbers');
    console.log('🎮 GameListUpdateManager: Found activity numbers element:', !!activityNumbers);
    
    if (activityNumbers) {
      const newText = `${browsing || 0}:${writing || 0}`;
      console.log('🎮 GameListUpdateManager: Updating activity numbers from', activityNumbers.textContent, 'to', newText);
      activityNumbers.textContent = newText;
    }
    
    // Update activity state classes
    const hasActivity = (browsing > 0 || writing > 0);
    console.log('🎮 GameListUpdateManager: hasActivity:', hasActivity, 'browsing:', browsing, 'writing:', writing);
    
    activityIndicator.classList.toggle('has-activity', hasActivity);
    activityIndicator.classList.toggle('no-activity', !hasActivity);
    
    console.log('🎮 GameListUpdateManager: Activity indicator classes after update:', Array.from(activityIndicator.classList));
    console.log('🎮 GameListUpdateManager: Activity update completed for game:', gameId);
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

  // Test function for debugging activity updates
 /*  testActivityUpdate(gameId = null, browsing = 2, writing = 1) {
    // If no gameId provided, use the first game found
    if (!gameId) {
      const firstGame = document.querySelector('[data-game-id]');
      if (firstGame) {
        gameId = firstGame.dataset.gameId;
      } else {
        console.error('No games found on page');
        return;
      }
    }
    
    console.log('🧪 Testing activity update for game:', gameId);
    console.log('🧪 Available games on page:', Array.from(document.querySelectorAll('[data-game-id]')).map(el => el.dataset.gameId));
    console.log('🧪 Activity indicators on page:', document.querySelectorAll('.game-activity-indicator').length);
    
    // Test the event emission and handling
    console.log('🧪 Testing via eventBus emission...');
    eventBus.emit('gameActivityChanged', {
      gameId: gameId,
      browsing: browsing,
      writing: writing
    });
    
    // Also test direct method call for comparison
    console.log('🧪 Testing via direct method call...');
    this.handleGameActivityUpdate({
      gameId: gameId,
      browsing: browsing,
      writing: writing
    });
    
    console.log('🧪 Activity update test completed');
  }
  
  // Test function to simulate SSE data
  testSSEData(gameId = null, browsing = 2, writing = 1) {
    if (!gameId) {
      const firstGame = document.querySelector('[data-game-id]');
      if (firstGame) {
        gameId = firstGame.dataset.gameId;
      } else {
        console.error('No games found on page');
        return;
      }
    }
    
    console.log('🧪 Testing SSE-style data flow for game:', gameId);
    
    // Simulate SSE data structure (like what you're seeing)
    const sseData = {
      game_id: gameId,  // Note: game_id not gameId
      browsing: browsing,
      writing: writing,
      timestamp: Math.floor(Date.now() / 1000)
    };
    
    console.log('🧪 Emitting gameActivityUpdate event with SSE-style data:', sseData);
    eventBus.emit('gameActivityUpdate', sseData);
    
    console.log('🧪 SSE data test completed');
  } */

  handleGamesRemoved(gameIds) {
    console.log('🎮 GameListUpdateManager: handleGamesRemoved called with:', gameIds);
    
    if (!Array.isArray(gameIds) || gameIds.length === 0) {
      console.warn('🎮 GameListUpdateManager: No game IDs provided for removal');
      return;
    }
    
    gameIds.forEach(gameId => {
      const gameElement = document.querySelector(`.story[data-game-id="${gameId}"]`);
      
      if (!gameElement) {
        console.warn(`�� GameListUpdateManager: Game element not found for gameId: ${gameId}`);
        return;
      }
      
      // Show removal message/transition before removing
      this.showRemovalMessage(gameElement, gameId);
      
      // Remove the game element after a brief delay for UX
      setTimeout(() => {
        gameElement.remove();
        console.log(`🎮 GameListUpdateManager: Removed game element for gameId: ${gameId}`);
        
        // Check if list is now empty and show empty message
        this.checkForEmptyList();
      }, 5000); // 5 second delay for user to see the message
    });
  }
  
  showRemovalMessage(gameElement, gameId) {
    // Create overlay message
    const overlay = document.createElement('div');
    overlay.className = 'game-removal-overlay';
    overlay.innerHTML = `
      <div class="removal-message">
        <p>${window.i18n.translate('general.gameRemoved') || 'Game removed from view'}</p>
      </div>
    `;
    
    // Add overlay to game element
    gameElement.appendChild(overlay);
    
    // Add removal animation class
    gameElement.classList.add('removing');
  }
  
  checkForEmptyList() {
    // Check if the stories container is empty
    const storiesContainer = document.querySelector('.stories');
    if (!storiesContainer) return;
    
    const gameElements = storiesContainer.querySelectorAll('.story');
    
    if (gameElements.length === 0) {
      console.log('🎮 GameListUpdateManager: List is now empty, showing empty message');
      
      // Show the same empty message that gameListRenderer uses
      const message = window.i18n.translate('games.noGamesMessage');
      storiesContainer.insertAdjacentHTML('beforeend', `<p class="no-games" data-i18n="games.noGamesMessage">${message}</p>`);
    }
  }
  
}
