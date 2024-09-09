import { SVGManager } from './svgManager.js';

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
/*       this.modalContent.closest('.modal-with-btns').classList.add(data.text_status); */
      this.modalContent.innerHTML = `
        <div class="modal-text ">
            <div class="top-info ${data.text_status}">
              <div class="vote-info">
                ${SVGManager.votesSVG}
                <span class="small">
                  ${data.voteCount}/${data.playerCount - 1}
                </span>
              </div>
              ${data.text_status=='draft'? '<span class="status">DRAFT</span>' : ''}
            </div>
            <h2 class="headline">${data.title}</h2>
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
        <button id="instaPublishButton" data-text-id="${data.id}" class="publish">
          ${SVGManager.publishSVG}
        </button>
      ` : ''}

      ${data.permissions.canDelete ? `
        <button id="instaDeleteButton" data-text-id="${data.id}" class="delete">
          ${SVGManager.deleteSVG}
        </button>
      ` : ''}

      ${data.permissions.canVote ? `
        <button class="vote ${data.hasVoted == 1 ? 'voted' : ''}" data-vote=${data.id}>
          ${SVGManager.voteSVG}
        </button>
      ` : ''}
    `;

    }
  
    hideModal() {
      this.modalElement.classList.add('display-none');
      this.modalElement.dataset.treeModal = "hidden";
    }
  }
  