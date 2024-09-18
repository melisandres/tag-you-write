import { ShelfVisualizer } from './shelfVisualizer.js';
import { Modal } from './modal.js';
import { TreeVisualizer } from './treeVisualizer.js';
import { UIManager } from './uiManager.js';
/* this may create some issues... to require the modal the constructor. I'm going to initialize it as an empty string... there are pages where I will surely call the story manager where the modal will be innaccessible? or I should put the modal in the header? */

export class StoryManager {
  constructor(path, modal, seenManager, treeVisualizer) {
    this.path = path;
    this.seenManager = seenManager;
    this.modal = modal;
    //this.treeVisualizer = treeVisualizer;
    this.storyTreeData = [];

     // Add event listener for the custom event
     document.addEventListener('showStoryInModalRequest', this.handleShowStoryInModalRequest.bind(this));
  }

  getStoryTreeData(){
    return this.storyTreeData;
  }

  handleShowStoryInModalRequest(event) {
    const { id, container } = event.detail;
    this.showStoryInModal(id);
  }


  async fetchTree(id) {
    const url = `${this.path}text/getTree/${id}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Error fetching tree data: ${response.status}`);
    }
    return await response.json();
  }

  async fetchStoryNode(id){
    const url = `${this.path}text/getStoryNode/${id}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Error fetching story node data: ${response.status}`);
    }
    return await response.json();
  }

  async drawTree(id, container) {
    const datas = await this.fetchTree(id);
    this.storyTreeData = datas[0];
    const treeVisualizer = new TreeVisualizer(container);
    treeVisualizer.drawTree(this.storyTreeData, container);
}

  async drawShelf(id, container) {
    const datas = await this.fetchTree(id);
    this.storyTreeData = datas[0];
    const shelfVisualizer = new ShelfVisualizer(container, this.path);
    shelfVisualizer.drawShelf(this.storyTreeData);
  }


  /**TODO: I must have stopped coding before getting here, because I wrote: "review here... just starting to write this... must test and add the right code to the text-index page" don't know what it means but  */
  async showStoryInModal(id){
    const data = await this.fetchStoryNode(id);
    //console.log(data);
    this.modal.showModal(data);
    this.seenManager.markAsSeen(id);
    this.seenManager.updateReadStatus(id);
  }

  async updateDrawer(id){
    const data = await this.fetchStoryNode(id);
    const container = document.querySelector("#showcase.with-shelf");
    //console.log(data);
    const shelfVisualizer = new ShelfVisualizer(container, this.path);
    shelfVisualizer.updateOneDrawer(data);
  }
  
}
  /* getStoryDataById(id) {
    // Base case: If data is undefined or null, return undefined
    if (!data) {
      return undefined;
    }

    // Check if the current data has the matching ID
    if (data.id === id) {
      return data;
    }

    // If data is an array (representing branches), iterate recursively
    if (Array.isArray(data)) {
      for (const child of data) {
        const foundInChild = this.findStoryDataById(id, child);
        if (foundInChild) {
          return foundInChild;
        }
      }
    }

    // No match found in this branch
    return "meow";
  } */