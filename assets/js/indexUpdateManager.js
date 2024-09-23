import { eventBus } from './eventBus.js';
import { SVGManager } from './svgManager.js';

export class IndexUpdateManager {
  constructor() {
    this.initEventListeners();
  }

  initEventListeners() {
    eventBus.on('instaDelete', this.handleInstaDelete.bind(this));
  }

  handleInstaDelete({ textId, status}) {
    const gameContainer = document.querySelector(`[data-stories]>[data-text-id="${textId}"]`);
    if (gameContainer) gameContainer.innerHTML = '';
  }
}