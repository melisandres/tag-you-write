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
      this.modalContent.innerHTML = `
        <div class="modal-text">
            <h2 class="headline">${data.title}</h2>
            <h3 class="author"> -&nbsp${data.firstName} ${data.lastName}&nbsp- </h3>
            <p>${data.writing}</p>
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
    `;

    }
  
    hideModal() {
      this.modalElement.classList.add('display-none');
    }
  }
  