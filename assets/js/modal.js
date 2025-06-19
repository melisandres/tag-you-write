import { SVGManager } from './svgManager.js';
import { createColorScale } from './createColorScale.js';
import { eventBus } from './eventBus.js';

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
      let winner = window.i18n ? window.i18n.translate("modal.winner") : "WINNER";
      let noteHtml = data.note ? `<p class="ps" data-i18n="modal.ps">${ps}</p> ${data.note}` : '';
      const untitledText = window.i18n && window.i18n.translate("general.untitled") || "Untitled";
      const untitledDataI18n = data.title ? '' : 'data-i18n="general.untitled"';

      // log the values
      console.log("untitledText", untitledText);
      console.log("untitledDataI18n", untitledDataI18n);
      console.log("data.title", data.title);

      // build the modal content
      this.modalContent.innerHTML = `
            <div class="top-info ${data.text_status}">
              <div class="top-info-left">
                ${this.getNumberOfVotes(data)}
              </div>
              <div class="top-info-middle">
               ${data.text_status=='draft' || data.text_status=='incomplete_draft' ? `<span class="status draft" data-i18n="modal.draft">${draft}</span>` : ''}
                ${data.isWinner ? `<span class="status winner" data-i18n="modal.winner">${winner}</span>` : ''}
              </div>
              <button class="close-modal top-info-close">×</button>
            </div>
            <h2 class="headline" ${untitledDataI18n}>${data.title || untitledText}</h2>
            <h3 class="author"> -&nbsp${data.firstName} ${data.lastName}&nbsp- </h3>
            <div class="writing">${data.writing}</div>
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
    this.applySVGColors();
    
    // Add event listener to the dynamically created close button
    const closeButton = this.modalElement.querySelector('.close-modal');
    if (closeButton) {
      closeButton.addEventListener('click', this.hideModal.bind(this));
    }
    
    // Emit event after modal is fully drawn
    eventBus.emit('modalDrawComplete', {
        container: this.modalElement,
        textId: data.id
    });
  }

  getNumberOfVotes(data) {
    const maxVotes = (data.playerCount || 1) - 1;
    const voteCount = parseInt(data.voteCount || 0);
    const colorScale = createColorScale(maxVotes);
    const fillColor = colorScale(voteCount);
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
