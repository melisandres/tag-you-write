import { SVGManager } from './svgManager.js';
import { createColorScale } from './createColorScale.js';
import { eventBus } from './eventBus.js';

export class Modal {
    constructor(modalElement) {
      this.modalElement = modalElement;
      this.modalContent = modalElement.querySelector('.modal-dynamic-content');
      this.modalBtns = modalElement.querySelector('.modal-dynamic-btns');
      this.closeButton = modalElement.querySelector('.close-modal');
      this.closeButton.addEventListener('click', this.hideModal.bind(this));
    }
  
    showModal(data) {
      console.log('Modal: showModal called with data:', data);
      this.modalElement.classList.remove('display-none');
      this.modalElement.dataset.treeModal = "visible";
      this.modalElement.dataset.textId = data.id;
      this.modalElement.dataset.gameId = data.game_id;
      let noteHtml = data.note ? `<p class="ps">P.S... </p> ${data.note}` : '';

      this.modalContent.innerHTML = `
            <div class="top-info ${data.text_status}">
              ${this.getNumberOfVotes(data)}
              ${data.text_status=='draft' || data.text_status=='incomplete_draft' ? '<span class="status draft">DRAFT</span>' : ''}
              ${data.isWinner ? '<span class="status winner">WINNER</span>' : ''}
            </div>
            <h2 class="headline">${data.title || "Untitled"}</h2>
            <h3 class="author"> -&nbsp${data.firstName} ${data.lastName}&nbsp- </h3>
            <div class="writing">${data.writing}</div>
            <div class="note">${noteHtml}</div>
        </div>
      `;

      const iterateAction = window.i18n.createUrl('text/iterate');
      const editAction = window.i18n.createUrl('text/edit');
      const noteAction = window.i18n.createUrl('text/edit');

      this.modalBtns.innerHTML = 
      `
      ${data.permissions.canIterate ? `
        <form action="${iterateAction}" method="POST" class="iterate-form">
          <input type="hidden" name="id" value="${data.id}">
          <button type="submit" class="iterate">
            ${SVGManager.iterateSVG}
          </button>
        </form>
      ` : ''}

      ${data.permissions.canEdit ? `
        <form action="${editAction}" method="POST" class="edit-form">
          <input type="hidden" name="id" value="${data.id}">
          <button type="submit" class="edit">
            ${SVGManager.editSVG}
          </button>
        </form>
      ` : ''}

      ${data.permissions.canAddNote ? `
        <form action="${noteAction}" method="POST" class="note-form">
          <input type="hidden" name="id" value="${data.id}">
          <button type="submit" class="note">
            ${SVGManager.addNoteSVG}
          </button>
        </form>
      ` : ''}

       ${data.permissions.canPublish ? `
        <button data-text-id="${data.id}" data-insta-publish-button class="publish">
          ${SVGManager.publishSVG}
        </button>
      ` : ''}

      ${data.permissions.canDelete ? `
        <button data-insta-delete-button data-text-id="${data.id}" class="delete">
          ${SVGManager.deleteSVG}
        </button>
      ` : ''}

      ${data.permissions.canVote ? `
        <button class="vote ${data.hasVoted == 1 ? 'voted' : ''}" data-vote=${data.id}>
          ${SVGManager.voteSVG}
        </button>
      ` : ''}
    `;
    this.applySVGColors();
    
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
  }
}
