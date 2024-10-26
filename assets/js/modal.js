import { SVGManager } from './svgManager.js';
import { createColorScale } from './createColorScale.js';

export class Modal {
    constructor(modalElement, path) {
      this.path = path;
      this.modalElement = modalElement;
      this.modalContent = modalElement.querySelector('.modal-dynamic-content');
      this.modalBtns = modalElement.querySelector('.modal-dynamic-btns');
      this.closeButton = modalElement.querySelector('.close-modal');
      this.closeButton.addEventListener('click', this.hideModal.bind(this));
    }
  
    showModal(data) {
      this.modalElement.classList.remove('display-none');
      this.modalElement.dataset.treeModal = "visible";
      this.modalElement.dataset.textId = data.id;
      let noteHtml = data.note ? `<p class="ps">P.S... ${data.note}</p>` : '';

      this.modalContent.innerHTML = `
        <div class="modal-text ${data.isWinner ? 'isWinner' : ''}">
            <div class="top-info ${data.text_status}">
              ${this.getNumberOfVotes(data)}
              ${data.text_status=='draft' || data.text_status=='incomplete_draft' ? '<span class="status draft">DRAFT</span>' : ''}
              ${data.isWinner ? '<span class="status winner">WINNER</span>' : ''}
            </div>
            <h2 class="headline">${data.title || "Untitled"}</h2>
            <h3 class="author"> -&nbsp${data.firstName} ${data.lastName}&nbsp- </h3>
            <p>${data.writing}</p>
            ${noteHtml}
        </div>
      `;

      this.modalBtns.innerHTML = `
      ${data.permissions.canIterate ? `
        <form action="${this.path}text/iterate" method="POST" class="iterate-form">
          <input type="hidden" name="id" value="${data.id}">
          <button type="submit" class="iterate">
            ${SVGManager.iterateSVG}
          </button>
        </form>
      ` : ''}

      ${data.permissions.canEdit ? `
        <form action="${this.path}text/edit" method="POST" class="edit-form">
          <input type="hidden" name="id" value="${data.id}">
          <button type="submit" class="edit">
            ${SVGManager.editSVG}
          </button>
        </form>
      ` : ''}

      ${data.permissions.canAddNote ? `
        <form action="${this.path}text/edit" method="POST" class="note-form">
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
  }

  getNumberOfVotes(data) {
    if (data.text_status === "published") {
      const maxVotes = data.playerCount - 1;
      const colorScale = createColorScale(maxVotes);
      const fillColor = colorScale(data.voteCount);
  
      return `
      <div class="votes" data-fill-color="${fillColor}">
        <i>
          ${data.isWinner ? SVGManager.starSVG : SVGManager.votesSVG}
        </i>
        <span class="small vote-count" data-vote-count=${data.voteCount} data-player-count=${data.playerCount - 1}>
          ${data.voteCount}/${data.playerCount - 1} votes
        </span>
      </div>
      `;
    } else {
      return `
        <div class="votes" data-fill-color="">
          <i>
            ${SVGManager.votesSVG}
          </i>
          <span class="small vote-count hidden" data-vote-count=${data.voteCount} data-player-count=${data.playerCount - 1}>
          </span>
        </div>
      `;
    }
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
  }
}
