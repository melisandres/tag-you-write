import { SVGManager } from './svgManager.js';
import { createColorScale } from './createColorScale.js';
import { eventBus } from './eventBus.js';
import { DiffManager } from './diffManager.js';

export class Modal {
    constructor(modalElement) {
      this.modalElement = modalElement;
      this.modalContent = modalElement.querySelector('.modal-dynamic-content');
      this.modalBtns = modalElement.querySelector('.modal-dynamic-btns');
      // Note: closeButton will be found after content is populated since it's now dynamic
    }
  
    showModal(data) {
      console.log('Modal: showModal called with data:', data);
      this.modalElement.classList.remove('display-none');
      this.modalElement.dataset.treeModal = "visible";
      this.modalElement.dataset.textId = data.id;
      this.modalElement.dataset.gameId = data.game_id;

      // Emit modal opened event for activity tracking
      eventBus.emit('modalOpened', data.id);

      // translate some strings
      let ps = window.i18n ? window.i18n.translate("modal.ps") : "P.S...";
      let draft = window.i18n ? window.i18n.translate("modal.draft") : "DRAFT";
      let publishedLate = window.i18n ? window.i18n.translate("modal.published_late") : "PUBLISHED LATE";
      let winner = window.i18n ? window.i18n.translate("modal.winner") : "WINNER";
      let noteHtml = data.note ? `<p class="ps" data-i18n="modal.ps">${ps}</p> ${data.note}` : '';
      const untitledText = window.i18n && window.i18n.translate("general.untitled") || "Untitled";
      const untitledDataI18n = data.title ? '' : 'data-i18n="general.untitled"';

      // log the values
      console.log("untitledText", untitledText);
      console.log("untitledDataI18n", untitledDataI18n);
      console.log("data.title", data.title);

      // Check if diff data exists and render accordingly
      const hasDiff = DiffManager.hasDiff(data);
      const showDiffByDefault = hasDiff; // Default to diff view if available
      
      // Render diff HTML if available
      let diffHtml = '';
      if (hasDiff) {
        console.log('Modal: Rendering diff for text ID:', data.id, 'diff_json:', data.diff_json);
        diffHtml = DiffManager.renderDiff(data.diff_json, data.writing);
        console.log('Modal: Rendered diffHtml length:', diffHtml.length);
        // Only fall back to normal text if diffHtml is completely empty
        // Even if it's the same content, we want to show it with diff styling
        if (!diffHtml || diffHtml.trim() === '') {
          console.log('Modal: diffHtml is empty, using writing as fallback');
          diffHtml = data.writing || '';
        } else {
          console.log('Modal: Using rendered diffHtml');
        }
      }
      
      const normalHtml = data.writing || '';
      
      // Debug: Log what we're about to render
      console.log('Modal: hasDiff:', hasDiff, 'showDiffByDefault:', showDiffByDefault, 'will render:', showDiffByDefault ? 'diffHtml' : 'normalHtml');
      
      // Store original data for toggle
      this.currentModalData = data;

      // build the modal content
      this.modalContent.innerHTML = `
            <div class="top-info ${data.text_status}">
              <div class="top-info-left">
                ${this.getNumberOfVotes(data)}
              </div>
              <div class="top-info-middle">
               ${data.text_status=='draft' || data.text_status=='incomplete_draft' ? `<span class="status draft" data-i18n="modal.draft">${draft}</span>` : ''}
               ${data.text_status=='published_late' ? `<span class="status published-late" data-i18n="modal.published_late">${publishedLate}</span>` : ''}
                ${data.isWinner ? `<span class="status winner" data-i18n="modal.winner">${winner}</span>` : ''}
              </div>
              <button class="close-modal top-info-close">×</button>
            </div>
            <h2 class="headline" ${untitledDataI18n}>${data.title || untitledText}</h2>
            <h3 class="author"> -&nbsp${data.firstName} ${data.lastName}&nbsp- </h3>
            ${hasDiff ? `
              <div class="diff-toggle-container">
                <button class="diff-toggle ${showDiffByDefault ? 'active' : ''}" data-diff-mode="diff" data-i18n-title="modal.show_diff" title="Show diff">
                  <span data-i18n="modal.diff">Diff</span>
                  ${data.diff_count ? `<span class="diff-count">(${data.diff_count})</span>` : ''}
                </button>
                <button class="diff-toggle ${!showDiffByDefault ? 'active' : ''}" data-diff-mode="normal" data-i18n-title="modal.show_normal" title="Show normal text">
                  <span data-i18n="modal.normal">Normal</span>
                </button>
              </div>
            ` : ''}
            <div class="writing ${hasDiff && showDiffByDefault ? 'diff-view' : 'normal-view'}" data-diff-mode="${showDiffByDefault ? 'diff' : 'normal'}" data-text-id="${data.id}">
              ${showDiffByDefault ? diffHtml : normalHtml}
            </div>
            <div class="note">${noteHtml}</div>
        </div>
      `;

      // build the actions with language in the url
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

      this.modalBtns.innerHTML = 
      `
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

       ${(data.permissions.canPublish || data.permissions.canPublishTooLate) ? `
        <button data-text-id="${data.id}" data-insta-publish-button class="publish ${data.permissions.canPublishTooLate ? 'publish-late' : ''}" data-i18n-title="${data.permissions.canPublishTooLate ? 'general.publish_late' : 'general.publish'}" title="${data.permissions.canPublishTooLate ? (window.i18n ? window.i18n.translate('general.publish_late_tooltip') : 'Publish Late') : publishTitle}">
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
    this.applySVGColors();
    
    // Add event listener to the dynamically created close button
    const closeButton = this.modalElement.querySelector('.close-modal');
    if (closeButton) {
      closeButton.addEventListener('click', this.hideModal.bind(this));
    }
    
    // Add event listeners for diff toggle buttons
    const diffToggles = this.modalElement.querySelectorAll('.diff-toggle');
    diffToggles.forEach(toggle => {
      toggle.addEventListener('click', this.handleDiffToggle.bind(this));
    });
    
    // Emit event after modal is fully drawn
    eventBus.emit('modalDrawComplete', {
        container: this.modalElement,
        textId: data.id
    });
  }

  handleDiffToggle(event) {
    const button = event.currentTarget;
    const mode = button.dataset.diffMode;
    const writingDiv = this.modalElement.querySelector('.writing');
    const allToggles = this.modalElement.querySelectorAll('.diff-toggle');
    
    if (!writingDiv) return;
    
    // Get the text ID to retrieve data from DataManager
    const textId = writingDiv.dataset.textId;
    if (!textId) return;
    
    // Get node data from DataManager
    const nodeData = window.dataManager?.getNode(textId);
    if (!nodeData) {
      console.warn('Modal: Could not find node data for text ID:', textId);
      return;
    }
    
    // Update active state
    allToggles.forEach(toggle => toggle.classList.remove('active'));
    button.classList.add('active');
    
    // Update content based on mode
    if (mode === 'diff') {
      writingDiv.classList.remove('normal-view');
      writingDiv.classList.add('diff-view');
      writingDiv.dataset.diffMode = 'diff';
      const diffHtml = DiffManager.renderDiff(nodeData.diff_json, nodeData.writing);
      writingDiv.innerHTML = diffHtml;
    } else {
      writingDiv.classList.remove('diff-view');
      writingDiv.classList.add('normal-view');
      writingDiv.dataset.diffMode = 'normal';
      writingDiv.innerHTML = nodeData.writing || '';
    }
    
    // Re-apply search highlighting if there's an active search
    const searchTerm = window.dataManager?.getSearch();
    if (searchTerm) {
      // Emit targeted event that only triggers highlighting, not full search refresh
      eventBus.emit('rehighlightModalContent', { 
        container: this.modalElement, 
        textId: textId 
      });
    }
  }


  getNumberOfVotes(data) {
    const maxVotes = (data.playerCount || 1) - 1;
    const voteCount = parseInt(data.voteCount || 0);
    const colorScale = createColorScale(maxVotes);
    const fillColor = colorScale(voteCount);
    // Only show votes for 'published' status, not 'published_late' (they weren't in the running for winner)
    const published = data.text_status == 'published';

    return `
    <div class="votes ${published ? '' : 'hidden'}" data-fill-color="${fillColor}">
      <i>
        ${data.isWinner ? SVGManager.starSVG : SVGManager.votesSVG}
      </i>
      <span class="small vote-count" data-vote-count=${voteCount} data-player-count=${maxVotes}>
        ${voteCount}/${maxVotes} votes
      </span>
    </div>
    `;
  }

  applySVGColors() {
    const voteElement = this.modalElement.querySelector('.votes');
    if (voteElement) {
      const fillColor = voteElement.dataset.fillColor;
      const svgPath = voteElement.querySelector('svg path');
      if (svgPath) {
        svgPath.setAttribute('fill', fillColor);
      }
      if (fillColor == "") {
        svgPath.setAttribute('stroke', 'none');
        svgPath.setAttribute('fill', 'none');
      }
    }
  }

  hideModal() {
    this.modalElement.classList.add('display-none');
    this.modalElement.dataset.treeModal = "hidden";
    this.modalElement.dataset.textId = '';
    this.modalContent.innerHTML = '';
    this.modalBtns.innerHTML = '';

    // Emit modal closed event for activity tracking
    eventBus.emit('modalClosed');
  }
}
