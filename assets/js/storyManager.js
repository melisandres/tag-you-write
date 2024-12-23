import { ShelfVisualizer } from './shelfVisualizer.js';
//import { DataManager } from './dataManager.js';
/* this may create some issues... to require the modal the constructor. I'm going to initialize it as an empty string... there are pages where I will surely call the story manager where the modal will be innaccessible? or I should put the modal in the header? */

export class StoryManager {
  constructor(path, modal, seenManager) {
    this.path = path;
    this.seenManager = seenManager;
    this.modal = modal;
    this.storyTreeData = [];
    this.dataManager = window.dataManager;
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
    console.log("fetching tree;", id);
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

  async fetchTreeUpdates(treeId, lastTreeCheck) {
    console.log('Fetching updates with timestamp:', {
        timestamp: lastTreeCheck,
        timestampDate: new Date(lastTreeCheck).toISOString(),
        currentTime: new Date().toISOString()
    });
    const url = `${this.path}text/checkTreeUpdates`;
    const payload = {
        rootId: treeId,
        lastTreeCheck: lastTreeCheck,
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        const responseText = await response.text(); // Get the raw response text

        if (!response.ok) {
            console.error(`Failed to fetch tree updates: ${response.status} ${response.statusText}`);
            return null;
        }

        const data = JSON.parse(responseText); // Parse the JSON from the response

        return data;
    } catch (error) {
        console.error('Error fetching tree updates:', error);
        return null;
    }
  }

  // TODO: It might be nice to check in the dataManager.cache... to see if it exists there before fetching it from the server. 
  async fetchStoryNode(id){
    const url = `${this.path}text/getStoryNode/${id}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Error fetching story node data: ${response.status}`);
    }
    return await response.json();
  }

  // A tree is requested, this is where we check the cache
  async prepareData(id) {
    console.log(`prepareData called for ID: ${id}`);
    let cachedData = this.dataManager.getTree(id);

    // Showing a new tree/shelfmeans updating search results IF there's an active search
    if (this.dataManager.getSearch()) {
      const searchResults = await this.fetchSearchResults(id);
      if (searchResults) {
          this.dataManager.updateSearchResults(searchResults, id, true);
      }
    }

    // If no cached data, or if it's just the timestamp without data get tree from server
    if (!cachedData || !cachedData.data) {
        console.log(`No valid cached data, fetching fresh tree data`);
        const freshData = await this.fetchTree(id);

        if (!freshData || !freshData[0]) {
            console.error('No tree data received from server');
            return null;
        }

        this.dataManager.setFullTree(id, freshData[0]);
        return this.dataManager.getTree(id).data;
    }

    // If there is data in the cache, determine if updates are needed
    const gameId = cachedData.data.game_id;
    const gameData = this.dataManager.getGame(gameId);
    console.log('gameData:', gameData);

    // Add defensive check
    if (!gameData) {
        console.warn(`No game data found for gameId: ${gameId}`);
        return cachedData.data;
    }

    const lastGameUpdate = gameData.timestamp;
    const needsUpdate = lastGameUpdate && cachedData.timestamp 
        ? new Date(lastGameUpdate).getTime() > cachedData.timestamp
        : false;

    if (needsUpdate) {
        const updates = await this.fetchTreeUpdates(id, cachedData.timestamp);

        if (!updates || updates.length === 0) {
            console.warn('No updates found for tree, using cached data');
            return cachedData.data;
        }
        this.dataManager.updateTreeData(updates, id);
        return this.dataManager.getTree(id).data;
    }

    return cachedData.data;
  }

  async drawTree(id, container) {
    try {
        // Set the current viewed root story ID before preparing data
        this.dataManager.setCurrentViewedRootStoryId(id);
        
        // First, get the initial tree data and draw it
        const initialTreeData = this.dataManager.getTree(id)?.data;
        if (initialTreeData) {
            // Draw the initial tree first if we have cached data
            eventBus.emit('drawTree', { container, data: initialTreeData });
        }
        
        // Then prepare updated data (this might trigger polling updates)
        const updatedTreeData = await this.prepareData(id);
        if (!updatedTreeData) {
            console.error('Failed to prepare tree data for ID:', id);
            return;
        }

        // If we didn't have initial data, or if the data has changed, draw/update the tree
        if (!initialTreeData || JSON.stringify(initialTreeData) !== JSON.stringify(updatedTreeData)) {
            eventBus.emit('drawTree', { container, data: updatedTreeData });
        }
    } catch (error) {
        console.error('Error in drawTree:', error);
    }
  }

  async drawShelf(id, container) {
    this.dataManager.setCurrentViewedRootStoryId(id);
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
    console.log('updateDrawer', id);
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

  // Add new method to fetch search results
  async fetchSearchResults(rootId) {
    try {
        const searchTerm = this.dataManager.getSearch();
        if (!searchTerm) return null;

        const response = await fetch(`${this.path}text/searchNodes?term=${encodeURIComponent(searchTerm)}&rootStoryId=${rootId}`);
        if (!response.ok) return null;

        return await response.json();
    } catch (error) {
        console.error('Error fetching search results:', error);
        return null;
    }
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