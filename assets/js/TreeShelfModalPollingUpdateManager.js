import { eventBus } from './eventBus.js';

export class TreeShelfModalPollingUpdateManager {
  constructor() {
    this.initEventListeners();
  }

  initEventListeners() {
    eventBus.on('nodeUpdated', this.handleNodeUpdate.bind(this));
    eventBus.on('nodesAdded', this.handleNodesAdded.bind(this));
  }

  handleNodeUpdate({ oldNode, newNode }) {
    // Compare old and new node vote data
    if (oldNode && oldNode.voteCount !== newNode.voteCount) {
        eventBus.emit('voteToggle', { data: newNode });
    }
  }

  handleNodesAdded(nodes) {
    console.log('New nodes detected:', nodes);
    eventBus.emit('newNodesDiscovered', nodes);
  }


/*   getCurrentViews() {
    // Extract the 'showcase' parameter from the URL
    const urlParams = new URLSearchParams(window.location.search);
    const showcase = urlParams.get('showcase');
  
    // Check if the modal is visible
    const isModalVisible = document.querySelector('.modal-background[data-tree-modal="visible"]') !== null;
  
    if (isModalVisible) {
      return 'modal';
    }

    return {
        modal: isModalVisible,
        showcase: showcase === 'tree' || showcase === 'shelf' ? showcase : null
    }
  } */
}