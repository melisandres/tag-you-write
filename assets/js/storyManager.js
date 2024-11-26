import { ShelfVisualizer } from './shelfVisualizer.js';
import { DataManager } from './dataManager.js';
/* this may create some issues... to require the modal the constructor. I'm going to initialize it as an empty string... there are pages where I will surely call the story manager where the modal will be innaccessible? or I should put the modal in the header? */

export class StoryManager {
  constructor(path, modal, seenManager) {
    this.path = path;
    this.seenManager = seenManager;
    this.modal = modal;
    this.storyTreeData = [];
    this.dataManager = new DataManager(this.path);
    this.currentFetch = null;
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
    // Abort any existing fetch
    if (this.currentFetch) {
      this.currentFetch.abort();
    }

    // Create new abort controller
    this.currentFetch = new AbortController();
    
    try {
      const response = await fetch(`${this.path}text/getTree/${id}`, {
        signal: this.currentFetch.signal
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Fetch aborted');
        return null;
      }
      throw error;
    } finally {
      this.currentFetch = null;
    }
  }

  async fetchStoryNode(id){
    const url = `${this.path}text/getStoryNode/${id}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Error fetching story node data: ${response.status}`);
    }
    return await response.json();
  }

  async prepareData(id) {
    let cachedData = this.dataManager.getTree(id);
    let needsUpdate = false;

    // Get the game data to compare timestamps
    const gameData = this.dataManager.cache.games.get(id);
    
    if (gameData && cachedData) {
        // Convert date string to UTC timestamp
        const gameDate = new Date(gameData.data.modified_at + ' UTC');
        const gameModifiedAt = gameDate.getTime();
        const dataTimestamp = cachedData.timestamp;
        
        console.log('Game date string:', gameData.data.modified_at);
        console.log('Game timestamp:', gameModifiedAt);
        console.log('Cache timestamp:', dataTimestamp);
        
        needsUpdate = gameModifiedAt > dataTimestamp;
    }

    if (!cachedData || needsUpdate) {
        console.log(`Fetching fresh tree data`);
        const datas = await this.fetchTree(id);
        const freshData = datas[0];

        if (!freshData) {
          console.error('No tree data received from server');
          return null;
        }

        // Compare old and new tree data if we had cached data
        if (cachedData && freshData) {
          const differences = this.dataManager.compareTreeData(cachedData.data, freshData);
          console.log('Tree differences:', differences);
        }
        
        // I should probably call this something other than Tree... like storyHierarchy? 
        this.dataManager.setTree(id, freshData);
        this.dataManager.setTreeLastCheck(id);
        return freshData;
    } else {
        // Unwrap the cached data
        console.log(`Using cached tree data`, cachedData.data);
        cachedData = cachedData.data;
        return cachedData;
    }
  }

  /* // TODO: this is where we will start!
  async drawTree(id, container) {
    let treeData = this.dataManager.getTree(id);
    let needsUpdate = false;

    if (treeData) {
        // Get the game data to compare timestamps
        const gameData = this.dataManager.cache.games.get(id);
        
        if (gameData) {
            // Convert both timestamps to numbers for comparison
            const gameModifiedAt = new Date(gameData.data.modified_at).getTime();
            const treeTimestamp = treeData.timestamp;

            // Compare timestamps
            needsUpdate = gameModifiedAt > treeTimestamp;

            console.log('Game Modified At:', gameModifiedAt);
            console.log('Tree Timestamp:', treeTimestamp);
            console.log('Needs Update:', needsUpdate);
        }
    }

    if (!treeData || needsUpdate) {
        console.log('Fetching fresh tree data');
        const datas = await this.fetchTree(id);
        treeData = datas[0];
        this.dataManager.setTree(id, treeData);
        this.dataManager.setTreeLastCheck(id);
    } else {
        // Unwrap the cached data
        console.log('using cached tree data');
        treeData = treeData.data;
    }
    
    eventBus.emit('drawTree', { container, data: treeData });
} */

  async drawTree(id, container) {
    const treeData = await this.prepareData(id);
    eventBus.emit('drawTree', { container, data: treeData });
  }

/*   async drawShelf(id, container) {
    const datas = await this.fetchTree(id);
    this.storyTreeData = datas[0];
    const shelfVisualizer = new ShelfVisualizer(container, this.path);
    shelfVisualizer.drawShelf(this.storyTreeData);
  } */

  async drawShelf(id, container) {
    const shelfData = await this.prepareData(id);
    const shelfVisualizer = new ShelfVisualizer(container, this.path);
    shelfVisualizer.drawShelf(shelfData);
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
  
  // Add pagination methods
  async loadPage(pageNumber) {
    this.dataManager.setPage(pageNumber);
    const paginatedData = this.dataManager.getPaginatedData();
    eventBus.emit('updateStoryList', paginatedData);
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