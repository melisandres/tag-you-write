import { eventBus } from './eventBus.js';
import { SVGManager } from './svgManager.js';
import { createColorScale } from './createColorScale.js';

export class ModalUpdateManager {
  constructor() {
    this.initEventListeners();
  }

  initEventListeners() {
    eventBus.on('instaPublish', this.handleInstaPublish.bind(this));
    eventBus.on('instaDelete', this.handleInstaDelete.bind(this));
    eventBus.on('chooseWinner', this.handleChooseWinner.bind(this));
    eventBus.on('voteToggle', this.handleVoteToggle.bind(this));
    eventBus.on('gamePlayerCountUpdate', this.handleGamePlayerCountUpdate.bind(this));
    eventBus.on('modalDrawComplete', ({ container, textId }) => {
        const searchTerm = window.dataManager.getSearch();
        if (searchTerm) {
            this.highlightModalContent(container, textId, searchTerm);
        }
        
        // Apply current activity indicators after modal rendering
        this.applyCurrentActivityIndicators(container, textId);
    });
    eventBus.on('searchApplied', this.handleSearchApplied.bind(this));
    eventBus.on('nodeTextContentUpdate', this.handleNodeTextContentUpdate.bind(this));
    eventBus.on('updateNodeWinner', this.handleChooseWinner.bind(this));
    eventBus.on('nodePermissionsChanged', this.handlePermissionsChanged.bind(this));
    eventBus.on('textActivityChanged', this.handleTextActivityChanged.bind(this));
  }

  handleSearchApplied(searchTerm) {
    const modal = document.querySelector(`.modal-background[data-tree-modal="visible"]`);
    if (modal) {
      this.highlightModalContent(modal, modal.dataset.textId, searchTerm);
    }
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

      // translate the "titles"
      const iterateTitle = window.i18n.translate('general.iterate');
      const noteTitle = window.i18n.translate('general.add_note');

      if (modalBtns) {
        const editAction = window.i18n.createUrl('text/edit');
        modalBtns.innerHTML = `
          <form action="${editAction}" method="POST" class="note-form">
            <input type="hidden" name="id" value="${textId}">
            <button type="submit" class="note" data-i18n-title="general.add_note" title="${noteTitle}">
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

  handleChooseWinner({ textId, nodeData = null }) {
    const modal = document.querySelector(`.modal-background[data-text-id='${textId}'][data-tree-modal="visible"]`);

    if (!modal) return;
  
    // Remove all buttons except the close button
    const modalBtns = modal.querySelector('.modal-dynamic-btns');
    if (modalBtns) {
      modalBtns.innerHTML = '';
    }

    // Update status to indicate it's the winning text
    const topInfo = modal.querySelector('.top-info');
    if (topInfo) {

      // translate the strings
      const winnerTitle = window.i18n.translate('general.winner');

      // add winner class
      topInfo.classList.add('winner');

      // add winner status span with localization
      const statusSpan = topInfo.querySelector('.status') || document.createElement('span');
      statusSpan.className = 'status winner';
      statusSpan.setAttribute('data-i18n', 'general.winner');
      statusSpan.textContent = winnerTitle;
      topInfo.appendChild(statusSpan);

      // change the vote count to +1
      const voteCountSpan = topInfo.querySelector('.vote-count');
      if (voteCountSpan) {
        // TODO: May need to revisit this logic... even just to centralize win condition logic. right now, it allows the winning vote to update the modal immediately for the person casting it... which doesn't happen otherwise... although it should be happening via voteToggle... 
        voteCountSpan.innerHTML = `${voteCountSpan.dataset.playerCount}/${voteCountSpan.dataset.playerCount} votes`;
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

  handleVoteToggle({ data }) {
    const container = document.querySelector("[data-tree-modal='visible']");
    if (!container) {
        return;
    }

    const modalTextId = container.dataset.textId;
    if (String(modalTextId) !== String(data.id)) {
      return;
    }

    const resultsSpan = container.querySelector('.vote-count.small');
    const votesIcon = container.querySelector('.votes i svg path');
    const button = container.querySelector('.vote[data-vote]');
    const playerCountMinusOne = data.playerCountMinusOne || data.playerCount - 1;

    // Update vote button state
    if (data.hasVoted === "1" || 
        data.hasVoted === 1 ||
        data.hasVoted === true) {
      if (button) button.classList.add('voted');
    }
    if (data.hasVoted === "0" || 
        data.hasVoted === 0 ||
        data.hasVoted === false) {
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

  handleGamePlayerCountUpdate({ newPlayerCount, gameId }) {
    const modal = document.querySelector('.modal-background[data-tree-modal="visible"]');
    if (!modal) return;

    const votesDiv = modal.querySelector('.votes');
    if (!votesDiv) return;

    const voteCountSpan = votesDiv.querySelector('.vote-count');
    if (!voteCountSpan) return;

    const modalGameId = modal.dataset.gameId;
    if (modalGameId !== gameId){
      console.warn("Game ID mismatch in modal update manager");
      return;
    } 

    // Get current vote count
    const currentVotes = parseInt(voteCountSpan.dataset.voteCount || '0');
    
    // Update the display with new player count
    voteCountSpan.textContent = `${currentVotes}/${newPlayerCount - 1} votes`;
    voteCountSpan.dataset.playerCount = (newPlayerCount - 1).toString();
  }

  handleNodeTextContentUpdate({ data }) {
    console.log('Node text content update received:', data);
    const { id, changes } = data;
    const modal = document.querySelector(`.modal-background[data-text-id='${id}'][data-tree-modal="visible"]`);
    if (!modal) return;

    // First, update the node in dataManager to ensure it has latest data
    const currentNode = window.dataManager.getNode(id);
    if (currentNode) {
        Object.entries(changes).forEach(([prop, value]) => {
            currentNode[prop] = value;
        });
        // Force update the node in dataManager
        window.dataManager.updateNode(id, currentNode);
    }

    // Then update the modal content
    Object.entries(changes).forEach(([prop, value]) => {
        switch(prop) {
            case 'title':
                const headlineEl = modal.querySelector('.headline');
                if(headlineEl.dataset.i18n === 'general.untitled'){
                    headlineEl.innerHTML = window.i18n ? window.i18n.translate("general.untitled") : "Untitled";
                }
                else{
                    headlineEl.innerHTML = value;
                }
                break;
            case 'writing':
                const writingEl = modal.querySelector('.writing');
                writingEl.innerHTML = value;
                break;
            case 'note':
                const noteElement = modal.querySelector('.note:not(button)');
                if (noteElement) {
                    noteElement.innerHTML = `<p>P.S... </p> ${value}`;
                } else {
                    // If note didn't exist before, add it
                    const modalText = modal.querySelector('.modal-text');
                    modalText.insertAdjacentHTML('beforeend', `<div class="note"><p class="ps">P.S... </p>${value}</div>`);
                }
                break;
        }
    });

    // Finally, apply search highlighting if needed
    const searchTerm = window.dataManager.getSearch();
    if (searchTerm) {
        // Use a new method specifically for content updates
        this.highlightUpdatedContent(modal, changes, searchTerm);
    }
  }

  // New method specifically for highlighting updated content
  highlightUpdatedContent(modal, changes, searchTerm) {
    Object.entries(changes).forEach(([prop, value]) => {
        let element;
        switch(prop) {
            case 'title':
                element = modal.querySelector('.headline');
                if (element) {
                    element.innerHTML = this.highlightText(value, searchTerm);
                }
                break;
            case 'writing':
                element = modal.querySelector('.writing');
                if (element) {
                    element.innerHTML = this.highlightText(value, searchTerm);
                }
                break;
            case 'note':
                element = modal.querySelector('.note:not(button)');
                if (element) {
                    element.innerHTML = `<p>P.S... </p>${this.highlightText(value, searchTerm)}`;
                }
                break;
        }
    });
  }

  highlightModalContent(container, textId, searchTerm) {
    // Get the original node data from dataManager
    const node = window.dataManager.getNode(textId);
    console.log('Node data:', { textId, node, searchTerm });
    if (!node) return;

    // translate the title if it is untitled
    if(node.title === ''){
      node.title = window.i18n ? window.i18n.translate("general.untitled") : "Untitled";
    }

    // First, clear all existing highlights by restoring original content
    const elements = {
        headline: { selector: '.headline', content: node.title },
        writing: { selector: '.writing', content: node.writing },
        note: { selector: '.note:not(button)', content: node.note ? `<p>P.S... </p>${node.note}` : '' },
        author: { selector: '.author', content: node.writer_name }
    };

    // Debug log the elements and their content
    console.log('Elements to process:', elements);

    // Reset all elements to their original content
    Object.values(elements).forEach(({ selector, content }) => {
        const element = container.querySelector(selector);
        if (element && content !== undefined) {  // Check for undefined
            // Special handling for the headline with data-i18n attribute
            if (selector === '.headline' && element.dataset.i18n === 'general.untitled') {
                element.innerHTML = window.i18n ? window.i18n.translate("general.untitled") : "Untitled";
            } else {
                element.innerHTML = content;
            }
        }
    });

    // If no search term, we're done (just cleared highlights)
    if (!searchTerm) return;

    const searchResults = window.dataManager.getSearchResults();
    console.log('Search results:', { searchResults, textId });
    if (!searchResults || !searchResults.nodes?.[textId]) return;

    const nodeMatches = searchResults.nodes[textId];
    
    if (nodeMatches?.matches) {
        // Apply highlights based on match types
        if (nodeMatches.titleMatches && node.title) {  // Check if content exists
            const element = container.querySelector('.headline');
            if (element) {
                element.innerHTML = this.highlightText(node.title, searchTerm);
            }
        }

        if (nodeMatches.writingMatches && node.writing) {  // Check if content exists
            const element = container.querySelector('.writing');
            if (element) {
                element.innerHTML = this.highlightText(node.writing, searchTerm);
            }
        }

        if (nodeMatches.noteMatches && node.note) {  // Check if content exists
            const element = container.querySelector('.note:not(button)');
            if (element) {
                const originalNote = node.note;
                element.innerHTML = `<p>P.S... </p>${this.highlightText(originalNote, searchTerm)}`;
            }
        }

        if (nodeMatches.writerMatches && (node.firstName || node.lastName)) {  // Check if content exists
            const element = container.querySelector('.author');
            if (element) {
                element.innerHTML = this.highlightText("- " + node.firstName + " " + node.lastName + " -", searchTerm);
            }
        }
    }
  }

  // Helper function to highlight text
  highlightText(text, searchTerm) {
    // Add defensive checks
    if (!text || !searchTerm) {
        console.warn('Invalid input to highlightText:', { text, searchTerm });
        return text || '';
    }
    
    try {
        // Escape special characters in search term for regex
        const escapedSearchTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        // Create a temporary div to work with the HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = text;
        
        // Recursive function to process text nodes only
        const highlightTextNodes = (node) => {
            if (node.nodeType === Node.TEXT_NODE) {
                const regex = new RegExp(`(${escapedSearchTerm})`, 'gi');
                if (regex.test(node.textContent)) {
                    const span = document.createElement('span');
                    span.innerHTML = node.textContent.replace(regex, '<mark>$1</mark>');
                    node.parentNode.replaceChild(span, node);
                }
            } else {
                Array.from(node.childNodes).forEach(highlightTextNodes);
            }
        };
        
        // Process the content
        highlightTextNodes(tempDiv);
        
        return tempDiv.innerHTML;
    } catch (error) {
        console.error('Error in highlightText:', error, { text, searchTerm });
        return text;
    }
  }

  handlePermissionsChanged({ textId, data }) {
    console.log('Handling permissions change for node in modal view:', textId);
    
    const modal = document.querySelector(`.modal-background[data-text-id='${textId}'][data-tree-modal="visible"]`);
    if (!modal) return;

    const modalBtns = modal.querySelector('.modal-dynamic-btns');
    if (!modalBtns) return;

    // Get the edit endpoint with Language
    const iterateAction = window.i18n.createUrl('text/iterate');
    const editAction = window.i18n.createUrl('text/edit');
    const noteAction = window.i18n.createUrl('text/edit');

    // translate the "titles"
    const iterateTitle = window.i18n.translate('general.iterate');
    const editTitle = window.i18n.translate('general.edit');
    const noteTitle = window.i18n.translate('general.add_note');
    const publishTitle = window.i18n.translate('general.publish');
    const deleteTitle = window.i18n.translate('general.delete');
    const voteTitle = window.i18n.translate('general.vote');

    // Clear existing buttons and rebuild based on new permissions
    modalBtns.innerHTML = `
      ${data.permissions.canIterate ? `
        <form action="${iterateAction}" method="POST" class="iterate-form">
          <input type="hidden" name="id" value="${data.id}">
          <button type="submit" class="iterate" data-i18n-title="general.iterate" title="${iterateTitle}">
            ${SVGManager.iterateSVG}
          </button>
        </form>
      ` : ''}

      ${data.permissions.canEdit ? `
        <form action="${editAction}" method="POST" class="edit-form">
          <input type="hidden" name="id" value="${data.id}">
          <button type="submit" class="edit" data-i18n-title="general.edit" title="${editTitle}">
            ${SVGManager.editSVG}
          </button>
        </form>
      ` : ''}

      ${data.permissions.canAddNote ? `
        <form action="${noteAction}" method="POST" class="note-form">
          <input type="hidden" name="id" value="${data.id}">
          <button type="submit" class="note" data-i18n-title="general.add_note" title="${noteTitle}">
            ${SVGManager.addNoteSVG}
          </button>
        </form>
      ` : ''}

       ${data.permissions.canPublish ? `
        <button data-text-id="${data.id}" data-insta-publish-button class="publish" data-i18n-title="general.publish" title="${publishTitle}">
          ${SVGManager.publishSVG}
        </button>
      ` : ''}

      ${data.permissions.canDelete ? `
        <button data-insta-delete-button data-text-id="${data.id}" class="delete" data-i18n-title="general.delete" title="${deleteTitle}">
          ${SVGManager.deleteSVG}
        </button>
      ` : ''}

      ${data.permissions.canVote ? `
        <button class="vote ${data.hasVoted == 1 ? 'voted' : ''}" data-vote=${data.id} data-i18n-title="general.vote" title="${voteTitle}">
          ${SVGManager.voteSVG}
        </button>
      ` : ''}
    `;
  }

  // === Text Activity Indicator Methods ===

  /**
   * Handle text activity changes for modals
   */
  handleTextActivityChanged(activityData) {
    const { textId, activity_type, user_id, source } = activityData;
    
    // Only handle user-centric events
    if (source !== 'user-centric') return;
    
    // Check if the activity is for the currently visible modal
    const modal = document.querySelector(`.modal-background[data-tree-modal="visible"]`);
    if (!modal || modal.dataset.textId !== String(textId)) return;
    
    if (activity_type === 'adding_note') {
        // Show adding note indicator in modal
        this.showAddingNoteIndicator(modal, textId, user_id);
    } else {
        // Remove indicators if activity stopped
        this.removeTextActivityIndicators(modal, textId);
    }
    
    console.log(`📝 ModalUpdateManager: Handled text activity - textId: ${textId}, type: ${activity_type}, userId: ${user_id}`);
  }

  /**
   * Show visual indicator that someone is adding a note
   * Shows the pulsating dot and adds the activity text next to author name
   */
  showAddingNoteIndicator(modal, textId, userId) {
    if (!modal) return;

    // Add activity class and data attributes to modal
    modal.classList.add('adding-note-activity');
    modal.setAttribute('data-activity-user-id', userId);

    // Find the author element
    const authorElement = modal.querySelector('.author');
    if (!authorElement) return;

    // Add the activity text if it doesn't exist
    let activityText = modal.querySelector('.activity-text');
    if (!activityText) {
      activityText = document.createElement('span');
      activityText.className = 'activity-text';
      activityText.textContent = 'adding a note';
      // Append after the author text
      authorElement.appendChild(activityText);
    }

    // Ensure the activity dot exists (always present but invisible by default)
    let activityDot = modal.querySelector('.activity-dot');
    if (!activityDot) {
      activityDot = document.createElement('span');
      activityDot.className = 'activity-dot';
      // Insert before the activity text (so it appears between author and activity text)
      authorElement.insertBefore(activityDot, activityText);
    }

    console.log(`📝 ModalUpdateManager: Added note indicator for text ${textId} by user ${userId}`);
  }

  /**
   * Remove all text activity indicators for a given text in modal
   * Cleans up when user stops editing
   */
  removeTextActivityIndicators(modal, textId) {
    if (!modal) return;

    // Remove adding note indicator with fade-out transition
    if (modal.classList.contains('adding-note-activity')) {
      // Add removing class for fade-out animation
      modal.classList.add('removing');
      
      // Wait for animation to complete before removing classes and text
      setTimeout(() => {
        modal.classList.remove('adding-note-activity', 'removing');
        modal.removeAttribute('data-activity-user-id');
        
        // Remove only the activity text (keep the dot for reuse)
        const activityText = modal.querySelector('.activity-text');
        if (activityText) {
          activityText.remove();
        }
        
        // Note: We keep the activity-dot element but it becomes invisible via CSS
      }, 300); // Match CSS animation duration
    }

    console.log(`📝 ModalUpdateManager: Removed activity indicators for text ${textId}`);
  }

  /**
   * Apply current activity indicators to newly rendered modal
   * Similar to how search highlighting works and shelf activity application
   */
  applyCurrentActivityIndicators(modal, textId) {
    console.log('🔍 ModalUpdateManager: applyCurrentActivityIndicators called for textId:', textId);
    
    if (!window.userActivityDataManager) {
      console.log('❌ ModalUpdateManager: No userActivityDataManager found');
      return;
    }

    // Get current text activity for this specific text
    const textActivity = window.userActivityDataManager.getTextActivity(textId);
    console.log('🔍 ModalUpdateManager: Found text activity:', textActivity);
    
    if (textActivity && textActivity.activity_type === 'adding_note' && textActivity.user_id) {
      // Apply adding note indicator
      this.showAddingNoteIndicator(modal, textId, textActivity.user_id);
      console.log('📝 ModalUpdateManager: Applied adding note indicator for existing activity');
    }
  }
}
