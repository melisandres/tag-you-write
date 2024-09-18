import { eventBus } from './eventBus.js';
import { SVGManager } from './svgManager.js';

export class ModalUpdateManager {
  constructor(path) {
    this.path = path;
    this.initEventListeners();
  }

  initEventListeners() {
    eventBus.on('instaPublish', this.handleInstaPublish.bind(this));
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
      }

      // Update buttons
      const modalBtns = modal.querySelector('.modal-dynamic-btns');
      if (modalBtns) {
        modalBtns.innerHTML = `
          <form action="${this.path}text/edit" method="POST" class="note-form">
            <input type="hidden" name="id" value="${textId}">
            <button type="submit" class="note">
              ${SVGManager.addNoteSVG}
            </button>
          </form>
        `;
      }
    }
  }
}