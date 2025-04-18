import { eventBus } from './eventBus.js';
import { SVGManager } from './svgManager.js';
import { createColorScale } from './createColorScale.js';
import { SearchHighlighter } from './searchHighlighter.js';

export class ShelfUpdateManager {
  constructor() {
    this.initEventListeners();
    this.dataManager = window.dataManager;
  }

  initEventListeners() {
    eventBus.on('instaPublish', this.handleInstaPublish.bind(this));
    eventBus.on('instaDelete', this.handleInstaDelete.bind(this));
    eventBus.on('chooseWinner', this.handleChooseWinner.bind(this));
    eventBus.on('voteToggle', this.handleVoteToggle.bind(this));
    eventBus.on('gamePlayerCountUpdate', this.handleGamePlayerCountUpdate.bind(this));
    eventBus.on('nodeTextContentUpdate', this.handleNodeTextContentUpdate.bind(this));
    eventBus.on('searchApplied', this.handleSearchUpdate.bind(this));
    eventBus.on('updateNodeWinner', this.handleChooseWinnerFromPolling.bind(this));

    //TODO: can the following two be cleaned up? so that they point to methods? 
    eventBus.on('searchChanged', ({ searchTerm }) => {
        // Only handle if we're in shelf view
        const container = document.querySelector('#showcase[data-showcase="shelf"]');
        if (!container) return;
        
        if (!searchTerm) {
            eventBus.emit('removeSearchHighlights', container);
            return;
        }
        
        // Wait for search results before highlighting
        const searchResults = window.dataManager.getSearchResults();
        if (searchResults) {
            eventBus.emit('highlightSearchMatches', {
                container,
                searchTerm
            });
        }
    });

    // Listen for shelf draw completion
    eventBus.on('shelfDrawComplete', (container) => {
        const searchTerm = this.dataManager.getSearch();
        if (searchTerm) {
            this.highlightShelfContent(container, searchTerm);
        }
    });


  }

  highlightShelfContent(container, searchTerm) {
    const searchResults = this.dataManager.getSearchResults();
    if (!searchResults) return;

    const nodes = container.querySelectorAll('.node');
    console.log('nodes:', nodes);
    nodes.forEach(node => {
        const storyId = node.dataset.storyId;
        const nodeData = searchResults.nodes?.[storyId];
        
        if (nodeData?.matches) {
          if (nodeData.writingMatches || nodeData.noteMatches) {
            node.classList.add('has-search-match');
          }

            // Highlight title if it matches
            if (nodeData.titleMatches) {
                const titleElement = node.querySelector('.title');
                if (titleElement) {
                    titleElement.innerHTML = this.highlightText(titleElement.textContent, searchTerm);
                }
            }

            // Highlight writing or note if they match
            if (nodeData.writingMatches || nodeData.noteMatches) {
                const writingElement = node.querySelectorAll('.writing p');
                if (writingElement.length > 0) {
                    for (let i = 0; i < writingElement.length; i++) {
                        writingElement[i].innerHTML = this.highlightText(writingElement[i].textContent, searchTerm);
                    }
                }
            }

            // Highlight if author matches
            if (nodeData.writerMatches) {
                const authorElement = node.querySelector('.author');
                console.log("authorElement", authorElement)
                if (authorElement) {
                    authorElement.innerHTML = this.highlightText(authorElement.textContent, searchTerm);
                }
            }
        }
    });
  }

  // Helper function to highlight text
  highlightText(text, searchTerm) {
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
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
        const statusSpan = drawer.querySelector('.status');
        if (statusSpan) {
          statusSpan.innerHTML = '';
        }

        // Update available actions
        const nodeButtons = drawer.querySelector('.node-buttons');
        if (nodeButtons) {
          // Remove all existing buttons
          nodeButtons.innerHTML = '';

          // Get the edit endpoint with Language
          const endpoint = `text/edit`;
          const actionUrl = window.i18n.createUrl(endpoint);
          
          // translate the "titles"
          const addNoteTitle = window.i18n.translate('general.add_note');

          // Add the note button
          nodeButtons.innerHTML = `
            <form action="${actionUrl}" method="POST">
              <input type="hidden" name="id" value="${textId}">
              <button type="submit" class="note" value="Edit" data-i18n-title="general.add_note" title="${addNoteTitle}">
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

  handleChooseWinnerFromPolling({ data }) {
    const textId = data.id;
    this.handleChooseWinner({ textId });
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
            if (String(drawer.dataset.storyId) === String(textId)) {
              drawer.querySelector('.node-headline').classList.add('isWinner');
              drawer.querySelector('.writing').classList.add('isWinner');

              // Add the winner status span
              const statusSpan = document.createElement('span');
              const statusText = window.i18n ? window.i18n.translate("general.winner") : "WINNER";
              statusSpan.className = 'status';
              statusSpan.innerHTML = `
                <span data-status="" class="status winner" data-i18n="general.winner">
                  ${statusText}
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
                if (shelfVoteButton) shelfVoteButton.classList.add('voted');
            } else {
                if (shelfVoteButton) shelfVoteButton.classList.remove('voted');
            }
        }
    }
  }

  handleGamePlayerCountUpdate({ newPlayerCount, gameId }) {
    const container = document.querySelector('#showcase[data-showcase="shelf"]');
    if (!container) return;

    const showCaseGameId = container.closest('[data-game-id]').dataset.gameId;
    if (showCaseGameId !== gameId){
      console.warn("Game ID mismatch in shelf update manager");
      return;
    } 
    
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
        
        // TODO:  eventually, I could check with the user id. but for now, this works.
        // Check if not user's own text
        const authorSpan = nodeGroup.querySelector('span.author');
        console.log("authorSpan", authorSpan)
        if (authorSpan?.dataset.i18n === 'general.by_you') return;
        
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

  handleNodeTextContentUpdate({ data }) {
    const { id, changes } = data;
    const nodeElement = document.querySelector(`li[data-story-id="${id}"]`);
    const heart = nodeElement?.querySelector('.shelf-heart');
    if (heart) heart.classList.add('unread');
    
    if (!nodeElement) return;
    
    Object.entries(changes).forEach(([prop, value]) => {
        switch(prop) {
            case 'title':
                nodeElement.querySelector('.title').innerHTML = value;
                break;
            case 'writing':
                // Find the writing div but preserve the node-buttons
                const writingDiv = nodeElement.querySelector('.writing');
                const nodeButtons = writingDiv.querySelector('.node-buttons');
                const dateSpan = writingDiv.querySelector('.date');
                // Clear existing content except buttons
                writingDiv.innerHTML = '';
                // Add back the buttons
                writingDiv.appendChild(nodeButtons);
                // Add the new content
                writingDiv.insertAdjacentHTML('beforeend', value);
                // Add the old date
                writingDiv.appendChild(dateSpan);
                break;
            case 'date':
                const writingDateSpan = nodeElement.querySelector('.writing .date');
                if (writingDateSpan) {
                    writingDateSpan.textContent = `${value}   (just edited)`;
                }
                break;
            case 'note':
                const noteDiv = nodeElement.querySelector('.note');
                if (noteDiv) noteDiv.innerHTML = `<p>P.S... </p>${value}`;
                break;
            case 'note_date':
                const noteDateSpan = nodeElement.querySelector('.note + .date');
                if (noteDateSpan) {
                    noteDateSpan.textContent = `${value}   (just edited)`;
                }
                break;
        }
    });

    // Finally, apply search highlighting if needed
    const searchTerm = this.dataManager.getSearch();
    if (searchTerm) {
        this.highlightUpdatedContent(nodeElement, changes, searchTerm);
    }
  }

  // New method specifically for highlighting updated content
  highlightUpdatedContent(nodeElement, changes, searchTerm) {
    Object.entries(changes).forEach(([prop, value]) => {
        let element;
        switch(prop) {
            case 'title':
                element = nodeElement.querySelector('.title');
                if (element) {
                    element.innerHTML = this.highlightText(value, searchTerm);
                }
                break;
            case 'writing':
                const writingElements = nodeElement.querySelectorAll('.writing p');
                writingElements.forEach(el => {
                    el.innerHTML = this.highlightText(el.textContent, searchTerm);
                });
                break;
            case 'note':
                element = nodeElement.querySelector('.note');
                if (element) {
                    element.innerHTML = `<p>P.S... </p>${this.highlightText(value, searchTerm)}`;
                }
                break;
        }
    });
  }

  // TODO: This was suggested. Not sure why... look into it. 
  handleSearchUpdate(searchData) {
    console.log("a method was suggested here... for applying search to shelf... but I think it's already being handled... I just need to make sure... so if you read this, and you see search isn't being updated.... what does that mean? it means you have a shelf open... and it has been changed... a text has been updated via polling, and some of the new text added corresponds to an active search term... then the newly added text would need to be highlighted where it matches, righ? ")
    /* const container = document.querySelector('#showcase[data-showcase="shelf"]');
    if (!container) return;

    const searchTerm = searchData.searchTerm;
    if (!searchTerm) {
        eventBus.emit('removeSearchHighlights', container);
        return;
    }

    // Wait for search results before highlighting
    const searchResults = this.dataManager.getSearchResults();
    if (searchResults) {
        eventBus.emit('highlightSearchMatches', {
            container,
            searchTerm
        });
    } */
  }

  handleShelfGameUpdate(gameData) {
    const container = document.querySelector('#showcase[data-showcase="shelf"]');
    if (!container) return;

    // Check if this is the game being displayed in the shelf
    const showCaseGameId = container.closest('[data-game-id]').dataset.gameId;
    if (showCaseGameId !== gameData.game_id) {
      return;
    }

    // TODO: Update the winning node... so that it says "winner" and has a star svg? 

    // Update the game status indicator
/*     const isOpen = gameData.openForChanges === '1' || gameData.openForChanges === true || gameData.openForChanges === 1;
    const gameStatusIndicator = container.querySelector('.game-status-indicator');
    
    if (gameStatusIndicator) {
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
    } */
  }

}
