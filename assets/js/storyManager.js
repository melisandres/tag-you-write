import { ShelfVisualizer } from './shelfVisualizer.js';
/* this may create some issues... to require the modal the constructor. I'm going to initialize it as an empty string... there are pages where I will surely call the story manager where the modal will be innaccessible? or I should put the modal in the header? */

export class StoryManager {
  constructor(path, modal, seenManager) {
    this.path = path;
    this.seenManager = seenManager;
    this.modal = modal;
    this.storyTreeData = [];
     // Add event listener for the custom event
     // TODO: Add this event to the eventBus? 
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
    eventBus.emit('drawTree', { container, data: this.storyTreeData });
}

  async drawShelf(id, container) {
    const datas = await this.fetchTree(id);
    this.storyTreeData = datas[0];
    const shelfVisualizer = new ShelfVisualizer(container, this.path);
    shelfVisualizer.drawShelf(this.storyTreeData);
  }

  async showStoryInModal(id) {
    try {
      const data = await this.fetchStoryNode(id);
      if (data){
        this.modal.showModal(data);
        this.seenManager.markAsSeen(id);
        this.seenManager.updateReadStatus(id);
      }
    } catch (error) {
      //console.error('Error in showStoryInModal:', error);
    }
  }

  async updateDrawer(id){
    const data = await this.fetchStoryNode(id);
    const container = document.querySelector("#showcase.with-shelf");
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