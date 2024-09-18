import { eventBus } from './eventBus.js';
import { SVGManager } from './svgManager.js';

export class IndexUpdateManager {
  constructor() {
    this.initEventListeners();
  }

  initEventListeners() {
    eventBus.on('instaPublish', this.handleInstaPublish.bind(this));
  }

  handleInstaPublish({ textId, newStatus }) {
    // TODO: You'll eventually have a style for drafts of root stories, and you'll update the style of the root story/game on the index level here
  }
}