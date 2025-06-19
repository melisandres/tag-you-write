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
    eventBus.on('nodePermissionsChanged', this.handlePermissionsChanged.bind(this));
    eventBus.on('textActivityChanged', this.handleTextActivityChanged.bind(this));

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
        console.log('🔍 ShelfUpdateManager: shelfDrawComplete event received with container:', container);
        console.trace('🔍 Call stack for shelfDrawComplete:');
        
        const searchTerm = this.dataManager.getSearch();
        if (searchTerm) {
            this.highlightShelfContent(container, searchTerm);
        }
        
        // Apply current activity indicators after shelf rendering
        this.applyCurrentActivityIndicators(container);
    });


  }

  handleTextActivityChanged(activityData) {
    const { textId, activity_type, parent_id, user_id } = activityData;
    
    if (activity_type === 'iterating') {
        // Show placeholder/ghost entry in shelf
        this.showIteratingPlaceholder(textId, parent_id, user_id);
    } else if (activity_type === 'adding_note') {
        // Show pulsing border or icon on shelf item
        this.showAddingNoteIndicator(textId, user_id);
    } else {
        // Remove indicators
        this.removeTextActivityIndicators(textId);
    }
  }

  highlightShelfContent(container, searchTerm) {
    const searchResults = this.dataManager.getSearchResults();
    if (!searchResults || !searchResults.nodes) return;
    
    // Handle both single node and multiple node containers
    let nodes;
    if (container.classList.contains('node')) {
      nodes = [container];
    } else {
      nodes = container.querySelectorAll('.node');
    }
    
    nodes.forEach(node => {
      const storyId = node.dataset.storyId;
      const nodeData = searchResults.nodes?.[storyId];
      
      if (nodeData) {
        // Add search match class
        if (nodeData.writingMatches || nodeData.noteMatches) {
          node.classList.add('has-search-match');
        } else {
          node.classList.remove('has-search-match');
        }

        // Highlight title if it matches
        if (nodeData.titleMatches) {
          const titleElement = node.querySelector('.title');
          if (titleElement) {
            titleElement.innerHTML = this.highlightText(titleElement.textContent, searchTerm);
          }
        }

        // Highlight writing if it matches
        if (nodeData.writingMatches) {
          // This is the critical part - filter out buttons and SVGs
          const writingElement = node.querySelector('.writing');
          if (writingElement) {
            const paragraphs = Array.from(writingElement.querySelectorAll('p'))
              .filter(p => !p.closest('button') && !p.closest('svg'));
            
            paragraphs.forEach(p => {
              p.innerHTML = this.highlightText(p.textContent, searchTerm);
            });
          }
        }
        
        // The note handling can also be simplified but keep the button exclusion
        if (nodeData.noteMatches) {
          const noteElement = node.querySelector('.note');
          if (noteElement && !noteElement.closest('button')) {
            const psPrefix = noteElement.querySelector('p');
            const noteContent = noteElement.textContent.replace('P.S... ', '');
            
            noteElement.innerHTML = '';
            
            const newPsPrefix = document.createElement('p');
            newPsPrefix.textContent = 'P.S... ';
            noteElement.appendChild(newPsPrefix);
            
            const contentElement = document.createElement('span');
            contentElement.innerHTML = this.highlightText(noteContent, searchTerm);
            noteElement.appendChild(contentElement);
          }
        }

        // Highlight author if it matches
        if (nodeData.writerMatches) {
          const authorElement = node.querySelector('.author');
          if (authorElement) {
            this.highlightAuthorText(authorElement, searchTerm, storyId);
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
      const drawers = container.querySelectorAll('li.node');
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
              const statusSpan = drawer.querySelector('.status');
              const statusText = window.i18n ? window.i18n.translate("general.winner") : "WINNER";
              statusSpan.innerHTML = `
                <span data-status="" class="status winner" data-i18n="general.winner">
                  ${statusText}
                </span>
              `;

              // Update the shelf heart to a star, and color it
              const shelfHeart = drawer.querySelector('.shelf-heart .votes i');
              if (shelfHeart) {
                console.log("shelfHeart", shelfHeart)
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
      console.log("shelfNode", shelfNode)
      if (shelfNode) {
            // Need to update vote count display to match new structure
            const votesDiv = shelfNode.querySelector('.votes');
            if (votesDiv) {
                const voteCountSpan = votesDiv.querySelector('.vote-count');
                voteCountSpan.textContent = `${data.voteCount}/${playerCountMinusOne} votes`;
                voteCountSpan.setAttribute('data-vote-count', data.voteCount);
                console.log("voteCountSpan", voteCountSpan)
                
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

            if (data.hasVoted === "1" || data.hasVoted === 1 || data.hasVoted === true) {
                if (shelfVoteButton) shelfVoteButton.classList.add('voted');
            } 
            if (data.hasVoted === "0" || data.hasVoted === 0 || data.hasVoted === false) {
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
                if (noteDiv) {
                    noteDiv.innerHTML = `<p>P.S... </p>${value}`;
                } else {
                    // If note element doesn't exist, create it
                    const writingDiv = nodeElement.querySelector('.writing');
                    if (writingDiv) {
                        const newNoteDiv = document.createElement('div');
                        newNoteDiv.className = 'note';
                        newNoteDiv.innerHTML = `<p>P.S... </p>${value}`;
                        writingDiv.appendChild(newNoteDiv);
                        
                        // Add note date if it exists in changes
                        if (changes.note_date) {
                            const noteDateSpan = document.createElement('span');
                            noteDateSpan.className = 'date';
                            noteDateSpan.textContent = `${changes.note_date}   (just edited)`;
                            writingDiv.appendChild(noteDateSpan);
                        }
                    }
                }
                break;
            case 'note_date':
                const noteDateSpan = nodeElement.querySelector('.note + .date');
                if (noteDateSpan) {
                    noteDateSpan.textContent = `${value}   (just edited)`;
                } else if (nodeElement.querySelector('.note')) {
                    // If note exists but date span doesn't, create it
                    const writingDiv = nodeElement.querySelector('.writing');
                    if (writingDiv) {
                        const newDateSpan = document.createElement('span');
                        newDateSpan.className = 'date';
                        newDateSpan.textContent = `${value}   (just edited)`;
                        writingDiv.appendChild(newDateSpan);
                    }
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
          // Keep this critical filtering logic
          const writingElement = nodeElement.querySelector('.writing');
          if (writingElement) {
            const paragraphs = Array.from(writingElement.querySelectorAll('p'))
              .filter(p => !p.closest('button') && !p.closest('svg'));
            
            paragraphs.forEach(el => {
              el.innerHTML = this.highlightText(el.textContent, searchTerm);
            });
          }
          break;
        case 'note':
          element = nodeElement.querySelector('.note');
          if (element && !element.closest('button')) {
            // Use a safer DOM-building approach
            element.innerHTML = '';
            
            const psElement = document.createElement('p');
            psElement.textContent = 'P.S... ';
            element.appendChild(psElement);
            
            const contentElement = document.createElement('span');
            contentElement.innerHTML = this.highlightText(value, searchTerm);
            element.appendChild(contentElement);
          }
          break;
      }
    });
  }

  handleSearchUpdate(searchData) {
    const container = document.querySelector('#showcase[data-showcase="shelf"]');
    if (!container) return;

    const searchTerm = searchData.searchTerm || this.dataManager.getSearch();
    if (!searchTerm) {
        // Clear all search highlights if search term is empty
        const nodes = container.querySelectorAll('.node');
        nodes.forEach(node => {
            node.classList.remove('has-search-match');
            
            // Reset any highlighted titles
            const title = node.querySelector('.title');
            if (title && title.innerHTML.includes('<mark>')) {
                title.textContent = title.textContent;
            }
            
            // Reset any highlighted content - carefully avoid buttons and SVG content
            const writingElement = node.querySelector('.writing');
            if (writingElement) {
                // Only process paragraphs that aren't inside buttons or SVGs
                const paragraphs = Array.from(writingElement.querySelectorAll('p'))
                    .filter(p => !p.closest('button') && !p.closest('svg'));
                
                paragraphs.forEach(p => {
                    if (p.innerHTML.includes('<mark>')) {
                        p.textContent = p.textContent;
                    }
                });
            }
            
            // Reset any highlighted notes, but skip any in buttons
            const note = node.querySelector('.note:not(button .note)');
            if (note && !note.closest('button') && note.innerHTML.includes('<mark>')) {
                // Preserve the P.S... format
                const psText = note.querySelector('p')?.textContent || 'P.S... ';
                const noteContent = note.textContent.replace(psText, '');
                
                // Clear the note element content
                while (note.firstChild) {
                    note.removeChild(note.firstChild);
                }
                
                // Rebuild the note structure properly
                const psElement = document.createElement('p');
                psElement.textContent = psText;
                note.appendChild(psElement);
                
                // Add the note content without highlighting
                const contentElement = document.createElement('span');
                contentElement.textContent = noteContent;
                note.appendChild(contentElement);
            }
            
            // Reset any highlighted authors - simple text replacement
            const authorSpan = node.querySelector('.author span.author');
            if (authorSpan && authorSpan.innerHTML.includes('<mark>')) {
                authorSpan.textContent = authorSpan.textContent; // This removes HTML and keeps just text
            }
        });
        return;
    }

    // Apply search highlighting to all nodes
    this.highlightShelfContent(container, searchTerm);
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

  handlePermissionsChanged({ textId, data }) {
    console.log('Handling permissions change for node in shelf view:', textId);
    
    const nodeElement = document.querySelector(`li[data-story-id="${textId}"]`);
    if (!nodeElement) return;

    const nodeButtons = nodeElement.querySelector('.node-buttons');
    if (!nodeButtons) return;

    // Clear existing buttons
    nodeButtons.innerHTML = '';

    // Add buttons based on new permissions
    if (data.permissions.canIterate) {
      nodeButtons.innerHTML += this.getIterateForm(data);
    }
    if (data.permissions.canEdit) {
      nodeButtons.innerHTML += this.getEditForm(data);
    }
    if (data.permissions.canAddNote) {
      nodeButtons.innerHTML += this.getNoteForm(data);
    }
    if (data.permissions.canVote) {
      nodeButtons.innerHTML += this.getVoteButton(data);
    }
    if (data.permissions.canPublish) {
      nodeButtons.innerHTML += this.getPublishForm(data);
    }
    if (data.permissions.canDelete) {
      nodeButtons.innerHTML += this.getDeleteForm(data);
    }
  }

  // Helper methods to generate button HTML, copied from ShelfVisualizer
  getIterateForm(node) {
    const endpoint = `text/iterate`;
    const actionUrl = window.i18n.createUrl(endpoint);
    const iterateTitle = window.i18n.translate('general.iterate');

    return `
    <form action="${actionUrl}" method="POST">
      <input type="hidden" name="id" value="${node.id}">
      <button type="submit" class="iterate" data-i18n-title="general.iterate" title="${iterateTitle}">
        ${SVGManager.iterateSVG}
      </button>
    </form>
    `;
  }

  getEditForm(node) {
    const endpoint = `text/edit`;
    const actionUrl = window.i18n.createUrl(endpoint);
    const editTitle = window.i18n.translate('general.edit');

    return `
      <form action="${actionUrl}" method="POST">
        <input type="hidden" name="id" value="${node.id}">
        <input type="hidden" name="parent_id" value="${node.parent_id}">
        <button type="submit" class="edit" value="Edit" data-i18n-title="general.edit" title="${editTitle}">
          ${SVGManager.editSVG}
        </button>
      </form>
    `;
  }

  getNoteForm(node) {
    const endpoint = `text/edit`;
    const actionUrl = window.i18n.createUrl(endpoint);
    const addNoteTitle = window.i18n.translate('general.add_note');

    return `
      <form action="${actionUrl}" method="POST">
        <input type="hidden" name="id" value="${node.id}">
        <button type="submit" class="note" value="Edit" data-i18n-title="general.add_note" title="${addNoteTitle}">
          ${SVGManager.addNoteSVG}
        </button>
      </form>
    `;
  }

  getVoteButton(node) {
    const voteTitle = window.i18n.translate('general.vote');

    return `
      <button class="vote ${node.hasVoted == 1 ? 'voted' : ''}" data-vote=${node.id} data-i18n-title="general.vote" title="${voteTitle}">
        ${SVGManager.voteSVG}
      </button>
    `;
  }

  getPublishForm(node) {
    const publishTitle = window.i18n.translate('general.publish');

    return `
        <button data-text-id="${node.id}" 
        data-insta-publish-button class="publish" data-i18n-title="general.publish" title="${publishTitle}">
          ${SVGManager.publishSVG}
        </button>
    `;
  }

  getDeleteForm(node) {
    const deleteTitle = window.i18n.translate('general.delete');

    return `
      <button
      data-insta-delete-button data-text-id="${node.id}" class="delete" data-i18n-title="general.delete" title="${deleteTitle}">
        ${SVGManager.deleteSVG}
      </button>
    `;
  }

  // === Text Activity Indicator Methods ===

  /**
   * Show a placeholder/ghost entry for iterating activity
   * Creates a visual indicator that someone is working on iterating a text
   */
  showIteratingPlaceholder(textId, parentId, userId) {
    const container = document.querySelector('#showcase[data-showcase="shelf"]');
    if (!container) return;

    // Remove any existing placeholder for this text
    this.removeIteratingPlaceholder(textId);

    // Find the parent node to insert the placeholder after
    const parentNode = container.querySelector(`li[data-story-id="${parentId}"]`);
    if (!parentNode) return;

    // Create the placeholder element
    const placeholder = document.createElement('li');
    placeholder.className = 'node iterating-placeholder';
    placeholder.setAttribute('data-story-id', textId);
    placeholder.setAttribute('data-parent-id', parentId);
    placeholder.setAttribute('data-user-id', userId);

    // Get user info for display
    const userName = this.getUserName(userId) || 'Someone';
    
    placeholder.innerHTML = `
      <div class="node-headline">
        <div class="arrow closed arrow-right"></div>
        <div class="shelf-heart">
          <i>
            ${SVGManager.votesSVG}
          </i>
        </div>
        <div class="headline-content">
          <h2 class="title">Someone is iterating...</h2>
        </div>
      </div>
      <div class="node-buttons">
        <!-- No buttons for placeholder -->
      </div>
    `;

    // Insert the placeholder after the parent node
    parentNode.insertAdjacentElement('afterend', placeholder);

    console.log(`📝 ShelfUpdateManager: Added iterating placeholder for text ${textId} by user ${userId}`);
  }

  /**
   * Show visual indicator that someone is adding a note
   * Shows the always-present dot and adds the activity text
   */
  showAddingNoteIndicator(textId, userId) {
    const container = document.querySelector('#showcase[data-showcase="shelf"]');
    if (!container) return;

    const nodeElement = container.querySelector(`li[data-story-id="${textId}"]`);
    if (!nodeElement) return;

    // Add activity class and data attributes
    nodeElement.classList.add('adding-note-activity');
    nodeElement.setAttribute('data-activity-user-id', userId);

    // Find the author element
    const authorElement = nodeElement.querySelector('.author');
    if (!authorElement) return;

    // Ensure the activity dot exists (always present)
    let activityDot = nodeElement.querySelector('.activity-dot');
    if (!activityDot) {
      activityDot = document.createElement('span');
      activityDot.className = 'activity-dot';
      // Insert before the author text (but within the author element)
      authorElement.insertBefore(activityDot, authorElement.firstChild);
    }

    // Add the activity text if it doesn't exist
    let activityText = nodeElement.querySelector('.activity-text');
    if (!activityText) {
      activityText = document.createElement('span');
      activityText.className = 'activity-text';
      activityText.textContent = '(adding a note)';
      // Append after the author text
      authorElement.appendChild(activityText);
    }

    console.log(`📝 ShelfUpdateManager: Added note indicator for text ${textId} by user ${userId}`);
  }

  /**
   * Remove all text activity indicators for a given text
   * Cleans up when user stops editing
   */
  removeTextActivityIndicators(textId) {
    const container = document.querySelector('#showcase[data-showcase="shelf"]');
    if (!container) return;

    // Remove iterating placeholder
    this.removeIteratingPlaceholder(textId);

    // Remove adding note indicator with fade-out transition
    const nodeElement = container.querySelector(`li[data-story-id="${textId}"]`);
    if (nodeElement && nodeElement.classList.contains('adding-note-activity')) {
      // Add removing class for fade-out animation
      nodeElement.classList.add('removing');
      
      // Wait for animation to complete before removing classes and text
      setTimeout(() => {
        nodeElement.classList.remove('adding-note-activity', 'removing');
        nodeElement.removeAttribute('data-activity-user-id');
        
        // Remove only the activity text (keep the dot for reuse)
        const activityText = nodeElement.querySelector('.activity-text');
        if (activityText) {
          activityText.remove();
        }
        
        // Note: We keep the activity-dot element but it becomes invisible via CSS
      }, 300); // Match CSS animation duration
    }

    console.log(`📝 ShelfUpdateManager: Removed activity indicators for text ${textId}`);
  }

  /**
   * Remove iterating placeholder for a specific text
   */
  removeIteratingPlaceholder(textId) {
    const container = document.querySelector('#showcase[data-showcase="shelf"]');
    if (!container) return;

    const placeholder = container.querySelector(`li.iterating-placeholder[data-story-id="${textId}"]`);
    if (placeholder) {
      placeholder.remove();
      console.log(`📝 ShelfUpdateManager: Removed iterating placeholder for text ${textId}`);
    }
  }

  /**
   * Apply current activity indicators to newly rendered shelf
   * Similar to how search highlighting works
   */
  applyCurrentActivityIndicators(container) {
    console.log('🔍 ShelfUpdateManager: applyCurrentActivityIndicators called with container:', container);
    
    if (!window.userActivityDataManager) {
      console.log('❌ ShelfUpdateManager: No userActivityDataManager found');
      return;
    }

    // Get current text activities
    const textActivities = window.userActivityDataManager.getDerivedTextActivities();
    console.log('🔍 ShelfUpdateManager: Found text activities:', textActivities);
    
    // Also check diagnostic info
    const diagnosticInfo = window.userActivityDataManager.getDiagnosticInfo();
    console.log('🔍 ShelfUpdateManager: Diagnostic info:', diagnosticInfo);
    
    textActivities.forEach(activity => {
      const { text_id, activity_type, user_id, parent_id } = activity;
      console.log(`🔍 ShelfUpdateManager: Processing activity - textId: ${text_id}, type: ${activity_type}, userId: ${user_id}`);
      
      if (activity_type === 'adding_note') {
        // Apply adding note indicator
        this.showAddingNoteIndicator(text_id, user_id);
      } else if (activity_type === 'iterating') {
        // Apply iterating placeholder
        this.showIteratingPlaceholder(text_id, parent_id, user_id);
      }
    });
    
    console.log('📝 ShelfUpdateManager: Applied current activity indicators for', textActivities.length, 'activities after shelf draw');
  }

  /**
   * Helper method to get user name from user ID
   * TODO: This should integrate with your user data system
   */
  getUserName(userId) {
    // Try to get from user data manager or other sources
    if (window.userActivityDataManager) {
      const userActivities = window.userActivityDataManager.getUserActivities();
      const user = userActivities.find(u => u.writer_id === userId);
      if (user && user.name) {
        return user.name;
      }
    }
    
    // Fallback to generic name
    return `User ${userId}`;
  }

  highlightAuthorText(authorElement, searchTerm, storyId) {
    // Get node data to check if this is current user's text  
    const nodeData = this.dataManager.getNode(storyId);
    
    // For "by you" - check if search matches user's actual name
    if (nodeData?.permissions?.isMyText) {
      const firstName = nodeData.firstName || '';
      const lastName = nodeData.lastName || '';
      const regex = new RegExp(`(${searchTerm})`, 'gi');
      
      if (firstName.match(regex) || lastName.match(regex)) {
        // Find the author span and highlight just "you"
        const authorSpan = authorElement.querySelector('span.author');
        if (authorSpan && authorSpan.textContent.includes('you')) {
          authorSpan.innerHTML = authorSpan.textContent.replace('you', '<mark>you</mark>');
        }
        return;
      }
    }
    
    // For other authors - simple text highlighting
    const authorSpan = authorElement.querySelector('span.author');
    if (authorSpan && authorSpan.textContent.toLowerCase().includes(searchTerm.toLowerCase())) {
      authorSpan.innerHTML = this.highlightText(authorSpan.textContent, searchTerm);
    }
  }

}
