import { ShelfVisualizer } from './shelfVisualizer.js';
import { TreeVisualizer } from './treeVisualizer.js';
import { Modal } from './modal.js';
/* this may create some issues... to require the modal the constructor. I'm going to initialize it as an empty string... there are pages where I will surely call the story manager where the modal will be innaccessible? or I should put the modal in the header? */

export class StoryManager {
  constructor(path, modal) {
    this.path = path;
    this.modal = modal;
  }

  async fetchTree(id) {
    const url = `${this.path}text/getTree/${id}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Error fetching tree data: ${response.status}`);
    }
    return await response.json();
  }

  async drawTree(id, container) {
    const datas = await this.fetchTree(id);
    const data = datas[0];
    const treeVisualizer = new TreeVisualizer(container, this.modal);
    treeVisualizer.drawTree(data);
  }

  async drawShelf(id, container) {
    const datas = await this.fetchTree(id);
    const data = datas[0];
    const shelfVisualizer = new ShelfVisualizer(container, this.path);
    shelfVisualizer.drawShelf(data);
  }

  /** review here... just starting to write this... must test and add the right code to the text-index page */
  async showStoryInModal(id){
    const datas = await this.fetchTree(id);
    const data = datas[0];
    this.modal.showModal(data);
  }
}
