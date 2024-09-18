import { eventBus } from './eventBus.js';
import { SVGManager } from './svgManager.js';

export class ShelfUpdateManager {
  constructor(path) {
    this.path = path;
    this.initEventListeners();
  }

  initEventListeners() {
    eventBus.on('instaPublish', this.handleInstaPublish.bind(this));
  }

  handleInstaPublish({ textId, newStatus }) {
    const container = document.querySelector('#showcase[data-showcase="shelf"]');
    if (container) {
      const drawer = container.querySelector(`li[data-story-id="${textId}"]`);
      if (drawer) {
        // Update the drawer's status
        drawer.classList.remove('draft');
        drawer.classList.add(newStatus);

        // Remove "draft" text and add vote count
        const statusSpan = drawer.querySelector('.status');
        if (statusSpan) {
          statusSpan.innerHTML = `
            <span>
              <i>${SVGManager.votesSVG}</i>
              <span class="small" data-vote-count="0" data-player-count="0">
                0/0
              </span>
            </span>
          `;
        }

        // Update available actions
        const nodeButtons = drawer.querySelector('.node-buttons');
        if (nodeButtons) {
          // Remove all existing buttons
          nodeButtons.innerHTML = '';
          
          // Add the note button
          nodeButtons.innerHTML = `
            <form action="${this.path}text/edit" method="POST">
              <input type="hidden" name="id" value="${textId}">
              <button type="submit" class="note" value="Edit">
                ${SVGManager.addNoteSVG}
              </button>
            </form>
          `;
        }
      }
    }
  }
}